# Mastery — design spec

Status: **approved by the owner 2026-09-14. Client implemented and verified the same day; waiting for the owner to apply migrations 01 and 02.** This is the contract that the database migration (`sql/migrations/20260914_02_mastery.sql`) and the client work both build against. If code and this document disagree, one of them is a bug.

## Why this exists

Before this change, "mastery" was decided in nine places by six different rules, stored in two tables plus device-only localStorage, and the server system built for it (`child_skill_progress`) was never read. The evidence was also polluted: tracing, videos and book pages were recorded as *correct answers*. See `CLAUDE.md` §7–§9 for the audit.

The goal is **one engine, one place levels are stored, and separate rules for skills with right answers and skills without them.**

## The owner's decisions

| Question | Decision |
|---|---|
| What counts as knowing it | **First-try** accuracy (attempt 1 of each question). Skips count as wrong. |
| The bar | **80%** |
| Evidence before moving up | The **last 15** first-try answers at the level, spread across **at least 3 different days** |
| Qaida (nothing was scored) | **5 days of practice at the level, plus a 10-question hear-it-tap-it check at 80%** |
| Which practice counts | **Every session** — daily and weekend |
| Weekend challenge | Must **also re-test earlier material** as the child moves forward, to check retention |
| Levels going down | **Never automatically.** A skill with weak retention gets more practice and a flag for the parent instead. |
| Moving levels to the server | **Never lower a level a child has reached**, anywhere |

Why these, from production data (3 profiles, 1,538 session-skill results): only 30% of sessions give a skill 5+ questions, so a per-session minimum starves the engine, and pooling answers across sessions fixes that. Retries are just 8% of answers, so first-try costs nothing today. First-try accuracy averages 83%, which makes 80% achievable but meaningful.

---

## Skill types

Stored in the new column `skills.mastery_type`:

| Type | Skills | How levels move |
|---|---|---|
| `mastery` | `verbal_analogies`, `figure_matrices`, `numbers_english`, `numbers_urdu`, `numbers_arabic` | The evidence rule above |
| `qaida` | `arabic_qaida`, `urdu_qaida` | Practice days + check |
| `practice` | `arabic_trace`, `trace_upper`, `trace_lower`, `trace_numbers`, `urdu_trace`, `urdu_videos`, `connect_dots`, `find_pairs`, `numbers_all`, `urdu_2letter`, `two_letter_words`, `three_letter_words` | No scoring. Keep their existing behavior. **Excluded from all accuracy insights.** |
| `adaptive` | everything else | No discrete levels. Difficulty retunes weekly via `adjustFocusNumbers`, unchanged. `urdu_reading` keeps its own letter-by-letter check. |

The thresholds live in the `skills` table (`mastery_questions`, `mastery_days`, `mastery_accuracy`) so the owner can tune them per skill in the Supabase table editor without code. Defaults are 15 / 3 / 0.80; Qaida rows use 10 / 5 / 0.80.

## The rules, precisely

**`mastery` — level L is mastered when**, over the child's most recent 15 answers at skill S, level L, that are first attempts (`attempt_count = 1`), not passive, and not review or check questions:
- there are at least 15 of them, **and**
- at least 80% are correct, **and**
- they fall on at least 3 distinct local calendar days (the parent's timezone, default `America/Chicago`).

**`qaida` — level L is mastered when:**
- the child has activity at level L on at least 5 distinct local days (practice counts), **and**
- their most recent 10 first-try **check** answers at level L are at least 80% correct.

**On mastery:** if L < `max_level`, set `unlocked_level` to L+1. If L = `max_level`, set `mastery_state = 'mastered'`. **At most one level per evaluation.** Evidence is always evaluated at the child's current `unlocked_level`.

**Retention:** an earlier level L needs review when the child's most recent up-to-10 *review* answers at L number at least 5 and fall below the skill's bar. This never lowers a level. It raises the skill's queue priority, focuses the next weekend's review on that level, and shows the parent a flag.

---

## Data contracts

### Tables

- **`child_skill_progress.unlocked_level`** is the single source of truth for `mastery` and `qaida` levels. The migration backfills every child × leveled skill to the highest level known anywhere: `greatest(existing unlocked_level, child_skill_settings.content_level)`, capped at `max_level`.
- **`responses.is_passive`** (new, not null). Set **automatically by a trigger** when `correct_answer = 'seen'`, which is what `recordPassiveResponse` sends. **Clients never pass it.** History is backfilled (all `'seen'` rows, all `numbers_all` rows, and only the memory-game `find_pairs` rows — those whose `question_data` has `total_pairs`; weekend-challenge `find_pairs` rows are real answers).
- `child_skill_progress.sessions_at_80_plus` and `current_level` are legacy. Nothing reads them and the engine stops writing `sessions_at_80_plus`.

### `question_data.purpose`

| Value | Meaning | Extra keys |
|---|---|---|
| `'check'` | A Qaida check question | — |
| `'review'` | Weekend re-test of earlier material | `review_of_level` (mastery/qaida) or `review_difficulty` (adaptive) |
| absent | Normal practice | — |

**Do not use `question_data.mode`** — subtraction already uses it for `'visual'` / `'equation'`.

### RPCs

All four exist after migration 02. Call them with `sb.rpc(...)`.

**1. `finalize_session(p_session_id uuid) → jsonb`** — existing, rewritten.
```js
{ session_id, status,
  slices: [{ skill_id, level, category, attempted, correct, accuracy, qualifies, level_unlocked }],
  levels_unlocked: { "<skill_id>": <new_level>, ... } }   // NEW key
```
Changed meaning: `attempted` counts distinct questions (first attempts), `accuracy` is first-try, and passive and review answers are excluded, so `adjustFocusNumbers` never retunes difficulty from easy review questions. It runs the unlock step for every `mastery`/`qaida` skill practiced in the session.

**2. `get_skill_progress(p_child_id uuid) → rows`** — new. One row per skill in `skills`:

| Column | Meaning |
|---|---|
| `skill_id`, `mastery_type`, `max_level` | from `skills` |
| `unlocked_level`, `mastery_state` | mastery/qaida only, else null |
| `questions_needed`, `days_needed`, `accuracy_needed` | the thresholds |
| `window_questions`, `window_correct`, `window_days` | mastery: evidence so far at `unlocked_level` |
| `practice_days` | qaida: distinct active days at `unlocked_level` |
| `check_questions`, `check_correct` | qaida: latest check answers at `unlocked_level` |
| `check_ready` | qaida: `practice_days >= days_needed` |
| `levels_needing_review` | int[], mastery/qaida: earlier levels below the bar on review |
| `review_questions`, `review_correct` | any type: the last up-to-10 review answers |

**3. `raise_skill_level(p_child_id uuid, p_skill_id text, p_level int) → int`** — new. Raises `unlocked_level` to `p_level` if that is higher, capped at `max_level`. **Never lowers.** Returns the resulting level, or null for a skill that isn't `mastery`/`qaida`. Used by the parent 3-second-hold override and the one-time legacy sync.

**4. `evaluate_skill_mastery(p_child_id uuid, p_skill_id text) → jsonb`** — new. Runs the unlock step for one skill right now and returns `{ skill_id, unlocked_level, level_unlocked, mastery_state }`. Used immediately after a Qaida check, so a passed check unlocks without waiting for the session to end. `finalize_session` uses the same step internally.

---

## Client helper API

Implemented by the core worker in `js/helpers.js` / `js/auth.js`. Every other file calls these; **none re-implement them.**

```js
CONFIG.skillProgress                    // { [skill_id]: row from get_skill_progress }, loaded at login
async refreshSkillProgress()            // reload CONFIG.skillProgress; if the RPC fails, log and keep going
getSkillProgress(skillId)               // -> row | null
getContentLevel(skillId)                // mastery/qaida: Math.max(progress unlocked_level || 1, settings content_level || 1)
                                        // everything else: unchanged
async raiseSkillLevel(skillId, level)   // -> resulting level; refreshes progress
async evaluateSkillMastery(skillId)     // -> RPC result; refreshes progress
recordPassiveResponse(skillId, questionData, itemIndex = null, level = null)   // `level` param is NEW
celebrateLevelUnlock(skillId, newLevel) // shared, kid-friendly "New level unlocked!" moment
levelProgressHTML(skillId)              // short text for level pickers: "12 of 15 questions · 2 of 3 days", "Check ready!", or ''
async syncLegacyLevels()                // retried at each login until it succeeds, see below
```

**Degrade, never break.** If migration 02 isn't applied yet, the RPCs don't exist. `getContentLevel` then falls back to `content_level`, nothing crashes, and practice is never blocked.

**`syncLegacyLevels()`** runs after login and sets its flag (localStorage `legacy_levels_synced_v2`) **only once every upload has succeeded**, so it keeps retrying at each login until migration 02 exists. The key is `_v2` because an earlier build set the flag even when every upload failed. Levels that lived only in localStorage are pushed up through `raiseSkillLevel`, which never lowers:
- `numbers_english` ← `ne_level`; `numbers_arabic` ← `na_level`
- `arabic_qaida` ← the highest level L that the old logic considered unlocked: L = 1, or `qaida_unlocked >= L-1`, or `qaida_l{L-1}` holds at least 5 dates. **The old override stored a zero-based level index** (holding level 3 saved `2`). The first version of this spec said `>= L`, which would have dropped a skipped-ahead child one level.
- `urdu_qaida` ← the same, using the `urdu_qaida_unlocked` / `urdu_qaida_l*` keys

Only call it for values > 1. Known limitation: these keys were never per-child, so a device's saved levels go to **the first child who logs in** on it after the update.

**After any `finalize_session`** (daily in `menu.js`, weekend in `assessment.js`): `await refreshSkillProgress()`, then `celebrateLevelUnlock` for each entry in `levels_unlocked`.

---

## Work split — one owner per file

| Worker | Files | Responsibilities |
|---|---|---|
| **Core** | `js/helpers.js`, `js/auth.js`, `js/config.js`, `js/menu.js`, `js/parent.js` | The helper API above. Load progress and run the legacy sync at login. Remove the global floor in `getDifficultyLevel` (use `Math.max(skillLevel, floor)`; `CONFIG.focusNumber` stays only as the fallback default). Add `ne_level`, `ne_history`, `na_level`, `na_history` to the `APP_VERSION` keep-list. Queue: passive rows count for recency but not accuracy; boost skills with review needs; complete `DOMAINS` (below); remove the `what_comes_next_letters` phantom from `SKILL_MAP`. Daily finalize → refresh + celebrate. Parent dashboard: drop `practice` skills from strong/weak; add a levels view (level / max, progress to next, mastered, needs-review flags, review accuracy). |
| **Leveled** | `js/worksheets/verbalanalogies.js`, `figurematrices.js`, `numbersenglish.js`, `numbersurdu.js`, `numbersarabic.js`, `jora.js`, `numbersall.js` | Pass `level` on every `recordResponse`. The level picker's highest unlocked level = `getContentLevel`. Remove local unlock logic (`ne_level`/`na_level` gating, VA/FM "qualifies" history, `numbersurdu`'s `content_level` upserts). "Best" labels may stay as display only. Show progress toward the next level. Any parent override → `raiseSkillLevel`. `jora.js` and `numbersall.js` → `recordPassiveResponse`. |
| **Qaida** | `js/worksheets/arabicqaida.js`, `js/worksheets/urduqaida.js` | Record every practiced item with `recordPassiveResponse(..., level)`. Gate on `getContentLevel`; remove localStorage day-counting and `qaida_unlocked` gating; parent override → `raiseSkillLevel`. Show "3 of 5 days". When `check_ready`, offer the check: 10 hear-it-tap-it questions from that level's content (sound via `speakArabic` / `speakUrdu`, 4 written choices), each recorded with `purpose: 'check'` and the level. Afterwards call `evaluateSkillMastery` and celebrate on unlock, or show the score encouragingly. |
| **Weekend** | `js/assessment.js` | Pass the level for `mastery` questions. Remove the VA/FM `content_level` upsert block. Re-test earlier material: `floor(n/3)` of each skill's `n` questions (at least 1 when earlier material exists) become review, prioritizing `levels_needing_review`. Mastery/qaida review at earlier levels; adaptive review at a lower difficulty in `[floor, difficulty-1]`. Tag them `purpose: 'review'` and shuffle them in. After finalize: keep `adjustFocusNumbers(data.slices)`, then refresh + celebrate. Results screen shows current and review scores separately. |

**Complete `DOMAINS`** (31 skills — every `SKILL_MAP` skill except the removed phantom):
- `quantitative`: addition, subtraction, counting, match_numbers, more_less, bigger_smaller, what_comes_next_numbers, numbers_english, numbers_all, trace_numbers, connect_dots
- `nonverbal`: figure_matrices, color_patterns, color_patterns_l2, which_doesnt_belong, find_pairs
- `verbal`: verbal_analogies
- `literacy`: two_letter_words, three_letter_words, trace_upper, trace_lower
- `urdu`: urdu_what_next, urdu_qaida, numbers_urdu, urdu_reading, urdu_2letter, urdu_trace, urdu_videos
- `arabic`: arabic_qaida, numbers_arabic, arabic_trace

Practice skills belong in domains: tracing *is* writing practice. Scoring matters for accuracy, not for the daily schedule.

## Implementation notes (as built)

Details settled during the build that the sections above don't spell out:

- **Weekend review count:** `reviewCount = earlierMaterialExists ? min(max(1, floor(n/3)), n-1) : 0`. A single-question skill keeps its one question on current material.
- **No review for `which_doesnt_belong`, `color_patterns`, `color_patterns_l2`.** They have no level or difficulty to step back to, so a "review" question would be identical to a current one.
- **Qaida check choices never sound like the answer.** Many letters share a transliteration — 18 Arabic and 15 Urdu harakat sounds belong to two or more letters (د/ض are both "da"; س ص ث; ز ذ ض ظ) — and a letter's connected forms share its name. Without this rule a question can have two right-sounding answers. Verified: 0 ambiguous questions across 120 generated.
- **Arabic level 3 (Connections) checks connected forms** (initial/medial/final), not isolated letters, so it tests what that level teaches.
- **The check does not call `completeWorksheet`.** It's launched from the level picker, not the daily queue, and calling it would advance the queue pointer.
- **`localDayKey(date)` takes an optional timestamp** and reuses one `Intl.DateTimeFormat`. The queue formats thousands of timestamps; 5,249 take ~11ms.
- **Fixed along the way:** `figurematrices.js` never declared `history`, so it silently used the browser's `window.history` and "Best" scores never persisted. The Numbers Arabic/Urdu level-1 quizzes recorded no answers at all, so level 1 could never produce mastery evidence. Three places in `menu.js` compared UTC dates to local "today", which in the evening showed a same-day session as "unfinished from tomorrow".

## Constraints for everyone

- Match the existing style exactly: plain globals, string-built HTML with inline `onclick`s, no modules, frameworks, or new dependencies.
- **Edit only your own files.** Nobody edits `index.html`; the lead bumps cache versions at the end (`CLAUDE.md` §5).
- **Do not bump `APP_VERSION`.** Its wipe runs at page load, *before* login, so it would destroy legacy levels before `syncLegacyLevels` can read them.
- Keep the argument shapes of `recordResponse` and `completeWorksheet` (adding a missing `level` is required, not a shape change).
- Any new global must be uniquely named. Grep `js/` before introducing it — every file shares one namespace.
- Never lower a level. Never block a child from practicing because an RPC failed.
- This is for a 4-year-old with a parent beside them: large touch targets, warm tone, no error text on screen.
- Answers are only recorded inside a session (`CONFIG.sessionId`). That's pre-existing and intentional.

## Deployment order

1. Owner applies `20260914_01_security_hardening.sql`.
2. Owner applies `20260914_02_mastery.sql`.
3. **Then** push the client. Pushing it before step 2 won't crash anything, but until the migration exists it hides Numbers English/Arabic and Qaida levels that were stored only on the device, and the Qaida "hold 3 seconds" override does nothing. The next login after step 2 restores those levels.

## Out of scope — follow-ups

- Practicing a *specific* earlier level during daily sessions (this release flags weak retention and targets it on weekends).
- Recording and checks for `two_letter_words`, `three_letter_words` and `urdu_2letter` — English and Urdu word reading is currently unmeasured, a gap against goal (c).
- Real spaced repetition through `review_queue`.
- A parent control to *lower* a level.
