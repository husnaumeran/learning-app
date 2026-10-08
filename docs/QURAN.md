# Quran — memorisation

The owner asked for a Quran section built from their own earlier project,
`husnaumeran/quran-memorize` (a Python/FastAPI app, January 2026). That app
cannot drop into a static site, so we port its **method** and its **data
sources**, not its code. Workers build against this file.

Last update: 2026-09-24

## The method — the owner's own

In their words, before any code existed: *"repeat 1 verse x times then move on
to the next… and then before moving on to 3rd verse repeat 1 and 2 together x
times, then repeat 3rd verse x times then repeat 1,2,3 together x times."*

As shipped in their app (`main.py:130-135`), unchanged across every version:

```python
for i in range(1, n_verses + 1):
    pattern.append(([i], repeats))                          # the new verse alone
    if i > 1: pattern.append((list(range(1, i+1)), repeats))  # everything so far
```

The unit is a whole ayah. One repetition of a block plays each of its verses in
order, back to back; the block is played N times before moving on.

## What this section adds for a 4-year-old

Their app was built for an adult: no persistence, no definition of "memorised",
and a setup form that assumes the learner can read. So:

- **One surah is one level.** Order: Al-Fatiha, then Juz Amma from An-Nas
  backwards — the conventional children's sequence.

  | Lvl | Surah | Lvl | Surah | Lvl | Surah |
  |---|---|---|---|---|---|
  | 1 | Al-Fatiha (1) | 6 | An-Nasr (110) | 11 | Al-Fil (105) |
  | 2 | An-Nas (114) | 7 | Al-Kafirun (109) | 12 | Al-Humazah (104) |
  | 3 | Al-Falaq (113) | 8 | Al-Kawthar (108) | 13 | Al-Asr (103) |
  | 4 | Al-Ikhlas (112) | 9 | Al-Ma'un (107) | 14 | At-Takathur (102) |
  | 5 | Al-Masad (111) | 10 | Quraysh (106) | 15 | Al-Qari'ah (101) |

  Take verse counts from the API, never from this table.

- **Practice** is the owner's method, hands-free after one *Start* tap (browsers
  refuse to autoplay audio without a gesture). Large Arabic text, the verse being
  recited highlighted. Listening and repeating is not evidence of memory, so every
  practice step goes through `recordPassiveResponse`.
- **The check is "Recite it to me", judged by the parent.** No audio plays — that
  would turn recall into repetition. The child recites verse by verse; the parent,
  following a small copy of the text labelled for the grown-up, taps *✓* or *Not
  yet* for each verse. Each verse is one question recorded with
  `purpose: 'check'`, `judge: 'parent'`, on the first attempt only — the check has
  no retries.
- **The mastery engine needs no change.** `mastery_evidence` is runner-agnostic:
  it counts first-attempt, non-passive answers marked `purpose = 'check'` at a
  level, grouped by day, against the skill's own thresholds. With
  `mastery_questions = 3` (the shortest surahs have three verses),
  `mastery_accuracy = 0.80` and `mastery_days = 3`, a surah unlocks the next after
  three separate days of reciting it well. For a three-verse surah, 80% means all
  three.
- **The daily multiple-choice test never picks Quran.** It has no generator, so
  `canBuildDailyTest` refuses it — by design, because its check lives inside the
  worksheet.
- Any unlocked surah can be practised again; the current one is the default.

## Data — verified from the app's own origin, 2026-09-24

All four return 200 with `Access-Control-Allow-Origin: *`, so the browser calls
them directly; no server is needed.

| Need | Call |
|---|---|
| Verses | `GET https://api.quran.com/api/v4/verses/by_chapter/{surah}?fields=text_uthmani&per_page=50` |
| Audio manifest | `GET https://api.quran.com/api/v4/recitations/{reciter}/by_chapter/{surah}?per_page=300` |
| One verse's audio | `https://verses.quran.com/` + `audio_files[i].url` |

Cache each surah's text and manifest in `localStorage`, keyed by surah, script and
reciter. Show the Arabic in **Scheherazade New** (Google Fonts), loaded by the
worksheet on first open — the owner's own app uses it.

**Risk to know about:** Quran Foundation now also documents a separate,
OAuth-gated "Content APIs" product. The open v4 endpoints above work today; if
they are ever gated, this section stops loading. The mitigation, if it comes to
that, is to bundle the fifteen surahs' text into the repo **by script, from the
API, never by hand** — Quran text must never be transcribed.

## Defaults — each a single constant the owner can change

| Setting | Default | Why |
|---|---|---|
| Script | Uthmani (`text_uthmani`) | the owner's own app uses it. IndoPak (`text_indopak`) is common in South-Asian Qaida but is harder to render on the web |
| Reciter | Mishary al-Afasy (`7`) | the owner's app default. Al-Husary *Muallim* (`12`) recites at teaching pace |
| Repetitions | 3 | the owner's app default |
| Surahs | the fifteen above | the conventional children's order |

## Invariant this build exposed

**Every `mastery` or `qaida` skill needs a check path**, or it can never leave
level 1: a multiple-choice generator in `js/assessment.js` (with an enabled
`ASSESSMENT_SKILLS` entry), the Qaida check, or an in-worksheet check recording
`purpose: 'check'`. Joining shipped without one on 2026-09-24 and was stuck.
