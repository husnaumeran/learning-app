# Mastery — design spec

Status: **approved by the owner 2026-09-14. Client implemented and verified the same day; waiting for the owner to apply migrations 01 and 02.** This is the contract that the database migration (`sql/migrations/20260914_02_mastery.sql`) and the client work both build against. If code and this document disagree, one of them is a bug.

## Why this exists

Before this change, "mastery" was decided in nine places by six different rules, stored in two tables plus device-only localStorage, and the server system built for it (`child_skill_progress`) was never read. The evidence was also polluted: tracing, videos and book pages were recorded as *correct answers*. See `CLAUDE.md` §7–§9 for the audit.

The goal is **one engine, one place levels are stored, and separate rules for skills with right answers and skills without them.**

## The owner's decisions

**Revised 2026-09-23** after the owner tested v1. The revision is below; v1's rule (practice evidence alone unlocked a level) is superseded.

| Question | Decision |
|---|---|
| What counts as knowing it | **First-try** accuracy (attempt 1 of each question). Skips count as wrong. |
| The bar | **80%** |
| What unlocks a level | **The daily mini-test**, passed on **3 different days**. Practice alone never unlocks anything. |
| The daily mini-test | 5–6 questions on recently practiced material. **No hints, no retries**, and deliberately *not* the practice format — it must test understanding, not repetition. |
| Which practice counts | **Every session** — daily and weekend |
| Weekend challenge | A different job: **retention and consolidation**. Harder and cumulative — current *and* older material, fewer clues, mixed formats, presented differently from practice. |
| Levels going down | **The badge never moves.** Repeated weak weekends lower the *practice* level only — see "Two levels" below. |
| Moving levels to the server | **Never lower a level a child has reached**, anywhere |

### Two levels, not one

This is the load-bearing distinction, and the reason no parent "demote" button is needed.

- **`unlocked_level`** — the highest level ever earned. A permanent achievement. **It never decreases**, by any automatic rule.
- **`current_level`** — the working level: what the app actually serves today. Normally equal to `unlocked_level`. It steps **down** on a *pattern* of weak weekends and climbs back as the child recovers, and it never exceeds `unlocked_level`.

So a child can hold level 8 while practising level 6 material, and neither the child nor the parent loses the record of what they achieved. This is what fixes the real case that prompted it: a profile sitting at the top Numbers Urdu level while answering 20% correctly now gets pulled back to prerequisite material automatically.

**One weak weekend is never enough.** A tired or distracted 4-year-old has bad days. Only repeated weak weekends move the working level.

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

**A test day.** A daily mini-test is a group of `purpose:'check'` answers recorded for one skill at one level inside one session. It is a **qualifying day** when it holds at least `mastery_questions` (5) first-try answers and at least `mastery_accuracy` (80%) of them are correct. Skips count as wrong. Several tests on the same local day still count as **one** day — the best one — so a level cannot be farmed by retaking.

**Unlocking, for `mastery` and `qaida` alike.** Level L is mastered once the child has **`mastery_days` (3) qualifying days at level L**. Practice answers never unlock anything; they decide what the test may cover and feed the strength and weakness signals.

**On mastery:** if L < `max_level`, `unlocked_level` becomes L+1 and `current_level` follows it. If L = `max_level`, `mastery_state` becomes `'mastered'`. At most one level per evaluation, always evaluated at the child's `current_level`.

**Failing a test costs nothing but time.** No streak reset, no step back. The level simply isn't unlocked yet, and the weak material gets more practice.

**Choosing the day's test.** One skill per day, drawn from those practised recently: prefer the skill with the fewest qualifying days at its current level, breaking ties by least recently tested. Questions come from the weekend challenge's generators (`makeAssessmentQs`), which already present material differently from the practice worksheets. That difference is the point — a test that repeats the practice format measures recall of a layout, not understanding.

**Weekend retention.** After a weekend challenge, each skill's weekend answers at its working level are scored:
- **Strong** (at least the bar): `weak_weekend_streak` resets to 0, and `current_level` climbs one step back toward `unlocked_level` if it had been lowered.
- **Weak** (below the bar over at least `mastery_questions` answers): `weak_weekend_streak` increments and the level is flagged for review.
- **Two weak weekends in a row:** `current_level` drops by one (floor 1), the streak resets, and the child practises prerequisite material. **`unlocked_level` is never touched.**

**Levels needing review** — earlier levels whose recent review answers fall below the bar — raise the skill's queue priority, focus the next weekend's review, and show as a flag on the parent dashboard.

---

## Data contracts

### Tables

- **`child_skill_progress.unlocked_level`** — the permanent achievement. Written only by the engine on mastery or by a parent override, and **never lowered**. Backfilled to the highest level known anywhere: `greatest(existing unlocked_level, child_skill_settings.content_level)`, capped at `max_level`.
- **`child_skill_progress.current_level`** — the **working level**, what the app actually serves. Starts equal to `unlocked_level`, steps down on repeated weak weekends, climbs back on strong ones, and never exceeds `unlocked_level`. This column already existed but nothing read it.
- **`child_skill_progress.weak_weekend_streak`** (new) — consecutive weak weekends for this skill. Two in a row lower `current_level` by one, then the streak resets.
- **How many questions a worksheet serves** comes from `getQuestionCount` alone. Eight worksheets used to size their content from the *difficulty* number instead, which is why 38% of worksheet runs served a single question. `child_skill_settings` rows now exist for every child × skill so nothing silently falls back to 1.
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
| `unlocked_level`, `current_level`, `mastery_state` | mastery/qaida only, else null |
| `questions_needed`, `days_needed`, `accuracy_needed` | the thresholds: 5 questions per test, 3 qualifying days, 80% |
| `qualifying_days` | qualifying test days so far at `current_level` — "2 of 3 test days" |
| `last_test_questions`, `last_test_correct` | the most recent test at `current_level`, for "you got 5 of 6" |
| `practice_days` | distinct days with any activity at `current_level` |
| `weak_weekend_streak` | consecutive weak weekends; 2 lowers the working level |
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
getContentLevel(skillId)                // the WORKING level to serve right now (current_level). Non-leveled skills: unchanged
getUnlockedLevel(skillId)               // the highest level ever earned — for the picker's achievement display only
buildDailyTest(skillId, level, count)   // -> question objects for the mini-test, tagged purpose:'check'
                                        // uses makeAssessmentQs where a generator exists; Qaida supplies its own
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

**The shape of a session**

1. **Practice** — the adaptive queue of worksheets, as today. Hints and retries. Unlocks nothing.
2. **The daily mini-test** — one skill, 5–6 questions, no hints, no retries, a different presentation from the practice. This is the only thing that unlocks levels.
3. **A book** — closes the day (`baby_university`).
4. **The "done for today" screen** — deliberately a wall. Nothing worth reaching is behind it now that books are in the flow.

**Domains come from the database, not the client.** `skills.domain` already holds one of six values for every skill, enforced by a check constraint, and `helpers.js` already loads the skills table for `base_weight`. **Delete the hardcoded `DOMAINS` map in `menu.js` and read `SKILLS[skillId].domain`.** The hardcoded copy had already drifted — the database puts `connect_dots` in nonverbal and `trace_numbers` in literacy, the client map had both under quantitative. Reading the table means a new skill gets its domain for free, and there is one place to change it.

Practice-only skills still belong in domains: tracing *is* writing practice. Whether a skill is scored matters for accuracy insights, not for the daily schedule.

## Implementation notes (as built)

Details settled during the build that the sections above don't spell out:

- **Weekend review count:** `reviewCount = earlierMaterialExists ? min(max(1, floor(n/3)), n-1) : 0`. A single-question skill keeps its one question on current material.
- **No review for `which_doesnt_belong`.** It has no level or difficulty to step back to, so a "review" question would be identical to a current one. This applied to `color_patterns` and `color_patterns_l2` too until 2026-09-24, when the two merged into one six-level skill (`sql/migrations/20260923_04_merge_color_patterns.sql`) — `color_patterns` now has levels to review against and takes part in the weekend challenge.
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
