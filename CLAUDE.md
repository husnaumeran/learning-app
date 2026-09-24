# Tiny Thinkers — Working Context

> **Read this first.** It exists so a new session can pick up without re-asking the owner what this project is, who it serves, or how we work. Keep it current — see *Maintaining this document* at the bottom.

Last substantive update: 2026-09-23

---

## 1. What this is and who it's for

A static HTML/CSS/JS adaptive learning app, built by a parent for their own children. Primary learner is a **4-year-old**. The owner speaks of "the kids" in the plural, so **multi-child support is a real requirement, not a hypothetical.**

Live: https://husnaumeran.github.io/learning-app/

This is explicitly **not** a "hand the kid a tablet and walk away" app. It is a *do-it-with-your-child* app. Design decisions should assume a parent is sitting alongside.

## 2. The owner's goals — in their own framing

These are the requirements. When a design question comes up, resolve it against this list.

- **a. Get the kids into a gifted academy.** Concretely: CogAT / Naglieri-style preparation.
- **b. Solidify the basics.** Fluency and confidence in fundamentals, not just exposure.
- **c. Breadth across subjects and languages.** Math, science, and English (read, write, *understand*) — and the same depth for **Arabic** and **Urdu**. Not tacked-on language practice: the same read/write/comprehend treatment.
- **d. Teach advanced concepts early, in a fun and easy way.** Sophisticated ideas made accessible to a small child — that is the whole bet.
- **e. Advance strengths, remediate weaknesses.** Where a child is strong, keep pushing forward. Where weak, keep working at it. Both at once.
- **f. Per-subject pacing — this is the core differentiator.** An advanced homeschool program where **being weak in one subject must never hold back progress in a subject the child is strong in.** Progress is tracked and paced per subject, never as a single global "level."
- **g. Get smarter, and broaden the syllabus.** Incorporate **CBSE**, **Chinese**, and other national curricula.

**Implication to keep front of mind:** goal (f) means any global difficulty knob, single "grade level," or one-size queue is working *against* the product. Per-skill state is the right model. The existing `child_skill_settings` table and per-skill `difficulty_level` are aligned with this — preserve that shape.

## 3. How we work — orchestration model

The owner's explicit instruction: **Opus is the manager/lead/orchestrator. The other models are the workers.**

| Role | Model | Does |
|---|---|---|
| **Lead / orchestrator** | **Opus 5** | Plans, decomposes, delegates, reviews worker output, makes architecture and correctness calls, talks to the owner, decides what ships. |
| **Worker** | **Sonnet** | **The default.** Codebase research, bug audits, multi-file implementation, content generation, test writing. The bulk of the labor. |
| **Worker** | **Haiku** | Cheap mechanical passes — find/replace at scale, formatting, simple repetitive edits. |
| **Worker** | **Opus** | Only where it clearly earns it: subtle correctness, cross-cutting refactors, work where a wrong answer is expensive. Not a default — the owner watches usage and does not want limits hit. |

Rules of engagement:
- Delegate via the `Agent` tool with an explicit `model` override. Prompts must be **self-contained** — a worker starts cold with no session history, so include paths, context, and the *why*.
- Workers **report**; the lead **decides**. Never ship a worker's change unreviewed.
- **Trust but verify.** A worker's summary states intent, not outcome. Check the actual diff. This has already caught real errors — an early audit reported a bug that traced out to be a non-issue, and miscounted script tags as 6-of-32 when it is 6-of-40.
- Workers doing research must be told **research only, do not edit**. Keep write access with the lead unless a task is explicitly an implementation task.
- Parallelize independent work; do not let two agents touch the same files.
- **Define shared interfaces first, then parallelize.** The mastery build ran four workers at once by writing the helper API (exact names and signatures) into `docs/MASTERY.md` before any code existed. Each worker coded against the contract, not against each other's half-finished files.
- **Workers can die mid-task** (usage limits). Resume them with `SendMessage` — they keep their context. Snapshot the tree before launching (`git diff > patch`), so `find js -newer <patch>` shows exactly what a dead worker already changed.
- Give parallel workers **separate scratch folders**. A shared one produced confusing cross-talk between them.

## 4. Architecture — the essentials

Pure static site. **No framework, no build step, no bundler, no package.json, no tests, no CI.**

- All **40 JS files load as classic global `<script>` tags** from `index.html`. One shared global namespace; **load order = script tag order in `index.html`.** Nothing is a module.
- `js/config.js` — global `CONFIG`, word lists, Urdu/Arabic letter tables, Supabase client. Loads first.
- `js/helpers.js` — shared utilities, question generators, TTS (`speak`, `speakUrdu`, `speakArabic`), and the two central data functions: `recordResponse()` and `completeWorksheet()`.
- `js/menu.js` — home screen, adaptive queue construction, session start/resume. **Loads last and calls `checkAuth()` at the end — that is the app's actual bootstrap trigger.**
- `js/assessment.js` — weekend challenge mode. `ASSESSMENT_SKILLS` registry at the top gates which skills appear (only `.enabled` is read; the `type` field is currently decorative).
- `js/auth.js` — Supabase auth, child profile selection.
- `js/parent.js` — parent dashboard and analytics.
- `js/worksheets/*.js` — ~30 generators. Each defines a global `show<Name>()` that builds an HTML string with inline `onclick`s and assigns it to `#app`. `babyuniversity.js` is the outlier: a page-image book reader over `books/`, not a quiz generator.
- **Routing does not exist.** Navigation is `document.getElementById('app').innerHTML = ...` swaps.

**Data:** Supabase Postgres (project `qwcigjclpxnwtfjhjqgr`) is the source of truth. 12 tables in `public`, all with RLS enabled: `parents`, `children`, `skills` (reference: 32 skills, `category` is `challenge` or `fun`, `max_level` set only on leveled skills), `question_bank`, `sessions`, `responses`, `skill_stats`, `child_skill_settings`, `child_skill_progress`, `review_queue`, `worksheet_completions`, `learning_item_strength`. localStorage is a same-day cache, except where §7 notes it is the *only* copy of some progress.

- **`sql/schema.sql`** — full snapshot of the production schema. Never hand-edit it.
- **`sql/migrations/`** — every database change, as a reviewed file. See §5 Ritual 3.
- **`sql/dump_schema.sql`** — regenerates `schema.sql` from the live database (read-only, system catalogs only).
- `sql/diagnostics.sql` — ad-hoc analyst SQL, not a migration.

Server-side logic lives in 6 functions: `record_response` and `finalize_session` (the write path for every answer), `get_daily_status` (unused by the client), `parent_of_child` (called by every RLS policy), and triggers `update_updated_at` / `validate_response_session_child`.

**Supabase MCP gotcha:** `list_tables` reports *planner estimates* for row counts, which can read 0 on busy tables — it once showed 0 children while the real count was 3 with 5,249 responses. Use `select count(*)` before drawing any conclusion from a row count.

## 5. Deploy rituals — get these wrong and changes silently don't ship

**There is no CI and no build. A push to `main` is live on GitHub Pages immediately.** No gate, no tests, no rollback but a revert.

### Ritual 1 — cache busting
Scripts are cache-busted with `?v=<date>` query strings in `index.html`. This used to be applied to only 6 of 40 tags, which meant most edits never reached returning users. **As of 2026-09-14 all 39 local `<script>` tags and the `css/styles.css` link carry the same version string**, so there is no longer a per-file decision to get wrong.

> **The ritual: on every deploy, set every version string in `index.html` to the same new value, and commit it alongside the JS change.**

One command does it (change the date):

```bash
sed -i -E 's|(<script src="js/[^"?]+\.js)(\?v=[^"]*)?"|\1?v=20260914"|g; s|(href="css/styles\.css)(\?v=[^"]*)?"|\1?v=20260914"|g' index.html
```

Busting every file when one changed costs a few KB of re-download — far cheaper than a fix silently not reaching the child. Do not "optimize" this back into per-file versions.

`index.html` itself carries `no-cache` meta tags, and GitHub Pages serves HTML with a short max-age, so the version bumps do propagate. Note that a plain `python -m http.server` sends no cache headers, so a local preview will happily serve a stale `index.html` — force-reload when testing locally or you will debug a phantom.

### Ritual 2 — `APP_VERSION`
`js/config.js` (top) defines `APP_VERSION`. On mismatch it **wipes localStorage** except an allowlist. Bump it when you change the shape of what's stored client-side — and only then, since it costs every user their local cache.

> **Do not bump `APP_VERSION` until mastery is consolidated server-side (§9).** Numbers English and Numbers Arabic keep their level progress *only* in localStorage (`ne_level`/`ne_history`, `na_level`/`na_history`), and those keys are not in the keep-list. A bump today silently resets both to level 1.

### Ritual 3 — database changes
There is no Supabase CLI and no migration tooling. The database was built by hand in the dashboard, so discipline replaces tooling:

1. **Never change the database ad hoc.** Write the change as a file in `sql/migrations/`, named `YYYYMMDD_NN_description.sql`.
2. Every migration runs in **one transaction** and ends with a **verification block** that raises (rolling everything back) if the result isn't exactly as intended. It should be safe to run twice.
3. To change a function surgically, **patch it in place**: read `pg_get_functiondef`, `replace()` the exact line, `execute` the result, and abort unless the target text occurs exactly once. This avoids retyping long function bodies, where one transcription slip would break the path that records every answer. `20260914_01_security_hardening.sql` is the reference example.
4. **The owner reviews and applies it** in the Supabase SQL editor. The MCP connection is deliberately read-only; Claude does not apply migrations.
5. After it's applied, **regenerate `sql/schema.sql`** with `sql/dump_schema.sql`, and verify the file against the query's `normalized_md5`. The git diff of `schema.sql` then shows exactly what the migration did.

## 6. Environments

- **Production** — GitHub Pages serving `main`, against the prod Supabase project.
- **QA** — **retired** (owner's instruction, 2026-09-14). The `QA_MODE` block is gone from `js/config.js`; `SUPABASE_URL`/`SUPABASE_ANON_KEY` are now plain production constants and the `?qa=true` switch no longer exists. Two parts still outstanding: the remote `qa` branch (deletion blocked on push auth — see §7) and the Netlify site wired to it, which must be disconnected from Netlify's own dashboard.
- Supabase anon keys are committed in `js/config.js`. That is normal for a Supabase browser client — they are public by design and protected by Row Level Security. **RLS is therefore load-bearing; do not assume a key being public means the data is.**
- **Security state (audited 2026-09-14).** All 12 RLS policies hold: they compare against `auth.uid()`, and in an RLS `USING` clause a NULL result *hides* the row, so a signed-out visitor sees nothing. The weak point was the `SECURITY DEFINER` functions, which bypass RLS and were callable by `anon`. Their ownership checks were written `if v_parent_id <> auth.uid() then raise`, and in PL/pgSQL `IF NULL` does *not* raise, so signed-out callers passed. **The same NULL that makes a policy safe makes an `IF` check unsafe.** In any function, write ownership checks as `if auth.uid() is null or x is distinct from auth.uid()`. Fix: `sql/migrations/20260914_01_security_hardening.sql` — **written, not yet applied**.
- The Supabase advisor's "signed-in users can execute SECURITY DEFINER function" warning (lint 0029) is **expected**; the app calls those functions while signed in. Revoking that access breaks the app.
- **The owner must toggle manually:** leaked password protection (Authentication → Password security) is off.
- `.github/workflows/keepalive.yml` reads `/rest/v1/children` with the anon key every 5 days so the free-tier project doesn't pause. It is a table read, so function-permission changes don't affect it. Don't revoke the anon role's table access, though: the job only fails on HTTP 5xx, so a permissions error would pass *silently* while the ping may stop counting as database activity.

## 7. Known cruft — confirm before touching

- **`learning_app.html`** (root, 46KB) — a dead self-contained early prototype. Zero inbound references anywhere in the repo. Not live.
- **`learning-app/` (nested folder)** — a stale partial duplicate: an old `index.html` plus part of `audio/`, with no `css/` or `js/`. Would 404 half its assets if served. Accidental, never cleaned up.
- **`README.md` file-structure section** predates `arabictrace.js`, `babyuniversity.js`, `numbersall.js`, and `js/data/`.
- **`PROJECT_PLAN.md` is stale.** Its north star reads "By May/June 2026" and Phase 1A "NOW → April 2026" — both now in the past. Treat its Top 10 as historical until the owner refreshes it.

### Built but never connected (verified 2026-09-14)

Data is written to these but **nothing reads it back**. Don't assume a feature works because its table has rows.

- **`review_queue` — spaced repetition doesn't exist.** `record_response` inserts a row per wrong answer (910 so far), but no client code, database function, view or edge function reads it. It can't deduplicate either: the client never sends `question_id`, so every row has it NULL and no item's `wrong_count` has ever exceeded 1. The README's "spaced repetition for wrong answers" is not implemented.
- **`child_skill_progress` — server-side mastery is ignored.** `finalize_session` computes level unlocks and `mastery_state`, but no client code reads `unlocked_level` or `mastery_state` (`parent.js` fetches the table and never uses the result). The level a child actually sees comes from other mechanisms, and in production the two disagree on most leveled skills. See §9.
- `skill_stats.first_try_correct_count` and `responses.is_first_try` are recorded and never read.
- `get_daily_status` is never called by the client.
- `CHALLENGE_SKILLS` / `FUN_SKILLS` in `menu.js` are dead code. The real category lives in the `skills` table.
- **`DOMAINS` covers only 18 of 32 skills**, so the per-domain queue guarantee (§8) skips the other 14, including CogAT's `which_doesnt_belong` and Urdu's `urdu_reading`. It is being redesigned together with mastery.

## 8. Decisions log

Append here as decisions are made, newest first. This is the "why" that git history won't tell you.

- **2026-09-23** — **Harakat recordings assigned by ear, by the owner.** Several harakat files are named for a sound two letters share (ت/ط "taa", ح/ه "haa"), so the filename alone could not say which letter owned one. Playing the wrong file teaches the wrong pronunciation, which is worse than silence when pronunciation *is* the lesson. `HARAKAT_OVERRIDES` in `helpers.js` records the owner's decisions: Arabic ت and Urdu ت → `ur_tay`, ط → `ar_taa`, Arabic ح and Urdu ہ → `ar_haa`. Two of those cross languages, so stems now carry their own language prefix and `harakatStemFor()` returns a full `lang_stem`. A stem the owner assigned belongs to those letters *only* — otherwise Arabic ه, which also resolves to "ar_haa" by name, would quietly inherit ح's recording; it now correctly falls back to its own letter file. Anything not assigned by hand is used only when exactly one letter claims it. Verified: 68 letters, 244 audio URLs, none missing. **Still unrecorded: Urdu ں and ے have no audio at all.**
- **2026-09-23** — **Urdu letters gained their joining forms.** `ARABIC_LETTERS` already carried `initial`/`medial`/`final`; `URDU_LETTERS` did not, so the joining rung could not be built in Urdu. The forms are mechanically derivable — a dual-joining letter takes a tatweel on the joining side — so they were generated rather than hand-typed or guessed by a worker, and both tables now also carry `joins`. `joins:false` marks ا آ أ إ ٱ د ڈ ذ ر ڑ ز ژ و ؤ ے, **plus Urdu ں**: Unicode calls noon ghunna dual-joining, but Urdu only ever writes it word-finally, and teaching a 4-year-old an initial form they will never see would be wrong. See `docs/LETTERS_TO_WORDS.md` for the ladder this feeds.
- **2026-09-23** — **Color Patterns merged into one six-level skill.** `color_patterns` and `color_patterns_l2` taught the same thing at two fixed difficulties and **neither had levels** (`max_level` null on both). Production showed why that matters: both children practised across ~50 distinct days, 100+ first attempts each, still on level 1 of both, at 63–80% first-try accuracy — the generator serves seven-element ABBC patterns alongside trivial AB ones from the first session, so the hardest content arrives on day one and accuracy never settles. Migration `20260923_04_merge_color_patterns.sql` gives `color_patterns` six levels and retires L2 with `is_active = false` (not deleted — responses, sessions and `skill_stats` reference it, and that history is evidence). **No level is carried forward**, because none was earned: every child is at `unlocked_level` 1 on both rows, so starting the merged skill at level 1 takes nothing from anyone. Also killed a real bug: `colorsl2.js` passed a *difficulty* number where a *count* was expected, so a child on difficulty 1 received exactly one question.

- **2026-09-14** — **Unified mastery engine designed with the owner and built.** Contract and rationale: `docs/MASTERY.md`. Server side: `sql/migrations/20260914_02_mastery.sql`, not yet applied. Owner's decisions: first-try accuracy, an 80% bar, the last 15 answers spread across 3+ days, Qaida = 5 practice days plus a 10-question check, every session counts, the weekend also re-tests earlier material, and levels never drop automatically. The rules were dry-run against production before any client code existed. Two profiles had clearly mastered Numbers English level 1 (15/15 and 14/15 across 15 days) but were stuck, because the old rule needed 5 questions in one sitting and they got one a day; they unlock on their next practice. The dry run also showed the old one-good-session rule had promoted one profile to the top Numbers Urdu level, where it now answers 20% correctly. **Open question for the owner: a parent control to move a child back a level** (automatic demotion stays off).
- **2026-09-14** — **Database schema brought under version control.** Supabase had no migration history, so `sql/dump_schema.sql` reconstructs the schema from system catalogs into `sql/schema.sql`. The query emits a `normalized_md5` because the snapshot is transcribed into the file rather than piped: any file claiming to match production must reproduce that hash. Normalization strips `\r` and trailing whitespace, since dashboard-written function bodies contain CRLFs. A snapshot that silently differs from production is worse than none.
- **2026-09-14** — **Security migration written; owner applies it.** `sql/migrations/20260914_01_security_hardening.sql`. Choices worth keeping: (1) it **patches functions in place** instead of restating them, so the only diff is the flawed lines, and it aborts if a target line isn't found exactly once. (2) It revokes EXECUTE from **`public` as well as `anon`**, because Postgres grants EXECUTE to PUBLIC by default and `anon` inherits it; it then re-grants `authenticated` explicitly. (3) **`parent_of_child` is left alone** — every RLS policy calls it, so revoking it would turn signed-out table reads from "no rows" into errors. That needs its own tested change. (4) Trigger functions get `search_path = public`, not `''`, because `validate_response_session_child` refers to `sessions` unqualified. Before writing it, the blast radius was checked: the client calls these functions only while signed in, and the keepalive job doesn't call them.
- **2026-09-14** — **The accuracy-scale worry was a false alarm.** `finalize_session` returns accuracy as a 0–1 fraction (`correct::numeric / attempted`), and `adjustFocusNumbers` receives it unchanged via `data.slices`, so `>= 0.90` is on the right scale. It was worth confirming, because a 0–100 value would have pushed every skill to maximum difficulty.
- **2026-09-14** — **Browser-freezing infinite loops fixed** in `numbersenglish.js` (More Than / Less Than) and `numbersarabic.js` (cases 4 and 5). The distractor generators used rejection sampling against a pool that could be smaller than the 3 distinct values required — at `n∈{1,2,3}` on More Than and `n∈{98,99}` on Less Than the loop could never terminate, hard-hanging the tab. Replaced with bounded pools that skip to a different `n` when fewer than 3 distractors exist. A repo-wide sweep confirmed every other `while` loop is either attempt-capped or provably bounded; `nearNums()` is safe because every caller requests 3 and its worst-case pool is 9.
- **2026-09-14** — **Uniform cache-busting adopted.** See §5 Ritual 1. Chosen over per-file versioning because the per-file approach had already failed in practice — 34 of 40 files had no version at all.
- **2026-09-14** — **Day keys moved from UTC to the family's timezone** via a new `localDayKey()` in `helpers.js` (uses `CONFIG.timezone`, falls back to `America/Chicago`). Applied to `getToday()`, `getChallengeDayKey()`, `assessment.js` (the `daily_` write in `finishAssessment`), and the distinct-day arrays in `arabicqaida.js` / `urduqaida.js`. **`js/parent.js:140` was deliberately left on UTC** — it compares its date string against `started_at`, which is itself a UTC timestamp, so converting only the label would break the match. Fixing it properly means converting both sides; it is a display-only inaccuracy on the parent week-strip. Open follow-up.
- **2026-09-14** — **Weekend Challenge restored to weekend-only** (owner's choice among three options). It had been hardcoded `true` in two places as leftover `// TEMP:` debug code. Because `adjustFocusNumbers` is only ever called from `finishAssessment`, this also returns difficulty retuning to a weekly cadence over a full week of data — the sample size its 90%/60% thresholds and 2-session streaks were designed for.
- **2026-09-14** — **Per-domain coverage implemented in `buildAdaptiveQueue`.** `DOMAINS` had been defined but referenced nowhere, so the queue was a single global priority sort and a day could fill entirely from one subject. Now Phase 1 takes each domain's highest-priority skill (domains ranked by their best skill when slots are scarce), Phase 2 fills the remainder globally. **This is the direct implementation of goal (f)** — a weak subject can no longer crowd out a strong one. Treat it as load-bearing; do not "simplify" it back into a flat sort.

- **2026-09-14** — QA environment to be retired entirely. Investigated first: `qa` had 34 commits not on `main`, but they are all either already replicated on `main` (`assessment.js` is byte-identical on both) or *older* pre-refactor states (`verbalanalogies.js` on `qa` still inlines the data that `main` has since extracted to `js/data/verbal_analogies_data.js`). **Conclusion: `qa` holds no unique work; deletion loses nothing.** `main` is 1325 commits ahead.
- **2026-09-14** — Adopted Opus-as-lead / Sonnet-and-Haiku-as-workers model at owner's instruction. See §3.
- **2026-09-14** — Repo cloned locally to `C:\Users\Wuzaina\Learning-App`. `gh` CLI is **not** installed on this machine; only plain `git` is available. Push authentication unverified as of this writing.

## 9. Current priorities

1. **Owner applies `sql/migrations/20260923_04_merge_color_patterns.sql`**, then regenerate `sql/schema.sql` (§5 Ritual 3). `schema.sql` is currently **stale** — it predates migrations 02 and 03, so it does not show the mastery columns. Regenerate once, after 04 lands.
2. **The letters → joining → words ladder** — the owner's current build queue, to be worked through one item at a time without prompting. The contract is `docs/LETTERS_TO_WORDS.md`. Order: letter joining (Urdu + Arabic worksheets), then rebuild the word worksheets, then sight words (research first — the owner is not familiar with the concept in Urdu/Arabic), then a Quran section sourced from the owner's `quran-memorize` repo, then multiplication tables, then measurement basics.
3. **The honesty rule is not yet enforced.** `two_letter_words`, `three_letter_words` and `urdu_2letter` are flashcards that record `{correct: true}` for every card clicked past. That is not a reading check and it feeds the mastery engine evidence nobody earned. Rebuilding them is rung 3 of the ladder above.
4. **Refresh `PROJECT_PLAN.md`** against reality and the goals in §2. Still stale.
5. **Longer arc** — real spaced repetition (§7), syllabus breadth (goal g: CBSE, Chinese), science content, and Arabic/Urdu depth to match English.

### Done and live
- Security migration 01, mastery migration 02, and daily-test/working-level migration 03 are **applied and verified** in production.
- The client for all three is **pushed and live** (commit `5568044`, 2026-09-23). Ritual 1 was followed: all 40 version strings moved together to `?v=20260923b`.
- QA retirement: the `QA_MODE` block and the `?qa=true` switch are gone, and Netlify is disconnected. The remote `qa` branch still exists; it holds no unique work (§8) and can be deleted whenever.

---

## Maintaining this document

Update this file when any of the following change: the owner's goals or priorities, the orchestration model, a deploy ritual, an environment, or a decision worth remembering. Add to the **Decisions log** (§8) rather than silently rewriting history — the reasoning is the valuable part. Keep it dense; it loads into every session's context, so padding has a recurring cost.
