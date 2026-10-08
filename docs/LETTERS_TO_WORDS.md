# Letters → Joining → Words

Why this exists: goal (c) in `CLAUDE.md` asks for the *same* read/write/understand
depth in Arabic and Urdu as in English. The ladder below is the shape that depth
takes, and it is the same four rungs in every language. Workers build against this
file, not against each other's half-finished code.

Last update: 2026-09-23

## The four rungs

| Rung | English | Urdu | Arabic |
|---|---|---|---|
| 1. Letters — name and sound | `trace_upper`, `trace_lower` | `urdu_reading` | `arabic_qaida` L1–2 |
| 2. **Joining** — how letters combine | blending two or three sounds | connected forms | connected forms |
| 3. Words — read it *and* know it | `two_letter_words`, `three_letter_words` | `urdu_2letter` | `arabic_qaida` L6–7 |
| 4. Sight words — recognised, not sounded out | — | — | — |

Rung 2 does not exist in any language today. Rung 4 does not exist at all.
Rung 3 exists but does not teach or check — see "The honesty rule" below.

## The honesty rule

**No worksheet may record an answer the child did not give.**

`two_letter_words`, `three_letter_words` and `urdu_2letter` are flashcards that push
`{correct: true}` for every card the child clicks past, then write a
`worksheet_completions` row with a perfect score. Those per-card answers only ever
reach the device's local cache, never the `responses` table, so they did **not** feed
the mastery engine (an earlier version of this file said they did; that was wrong).
The completion rows are the problem: about 230 since March 2026, **every one a
perfect score**, so the parent dashboard has reported flawless reading on worksheets
that never once checked whether a child could read a word.

A rebuilt word worksheet shows the word, asks something a child can only answer by
reading it, and records the real answer. Anything genuinely passive (tracing, a
video, a book page, a teaching card) goes through `recordPassiveResponse`, which
marks it `is_passive` and keeps it out of mastery.

## Data contract — `js/config.js`

`URDU_LETTERS` and `ARABIC_LETTERS` entries now both carry the connected forms:

```js
{letter:'ب', name:'bay', aname:'بے', fatha:'بَ', kasra:'بِ', damma:'بُ',
 sf:'ba', sk:'bi', sd:'bu',
 initial:'بـ', medial:'ـبـ', final:'ـب', joins:true}
```

- `joins: false` marks a letter that never connects to what follows it —
  ا آ أ إ ٱ د ڈ ذ ر ڑ ز ژ و ؤ ے, plus Urdu ں, which Unicode calls dual-joining but
  Urdu only ever writes word-finally. For these, `initial` is the bare letter and
  `medial` equals `final`.
- `initial`/`medial`/`final` use the tatweel `ـ` (U+0640) as the visible joining
  stroke, matching how `ARABIC_LETTERS` already wrote them.
- A word is spelled by walking its letters left to right: the **first** letter takes
  `initial`, the **last** takes `final`, the rest take `medial` — except that any
  letter following a `joins:false` letter starts a fresh group and takes `initial`
  instead of `medial`.

## Worksheet contract — `js/helpers.js`

Every worksheet is a global `show<Name>()` that writes an HTML string into `#app`.
No modules, no router. Add the file to `index.html` **before** `js/menu.js`, with the
same `?v=` string as every other tag (see `CLAUDE.md` §5 Ritual 1).

```js
getContentLevel(skillId)              // the working level — what to teach today
getUnlockedLevel(skillId)             // the highest level reached — an achievement, never lowered
getQuestionCount(skillId, mode)       // 'practice' (default) or 'test'
recordResponse(skillId, questionData, correctAnswer, finalAnswer, isCorrect,
               isFirstTry, attemptCount, responseTimeMs, questionIndex, isSkipped, level)
recordPassiveResponse(skillId, questionData, itemIndex = null, level = null)
completeWorksheet(type, score, total) // ends the worksheet and returns to the queue
```

Audio, for any Arabic-script letter:

```js
canHearLetter(lang, letter)                 // 'ar' | 'ur' — gate the 🔊 button on this
playLetterSound(lang, letter)               // the letter's name
canHearHarakat(lang, letter, harakat)
playHarakatSound(lang, letter, harakat)     // 'fatha' | 'kasra' | 'damma'
```

`harakatStemFor` resolves which recording belongs to a letter; where the owner has
not settled an ambiguous file it returns `null` and the letter falls back to its own
recording. Never build a harakat path by hand.

`questionData` is free-form JSON stored with the answer. `purpose: 'check'` marks a
daily mini-test question and `purpose: 'review'` a weekend one; leave it unset for
ordinary practice. Do not use the key `mode` — subtraction already uses it.

## Wiring a new skill

1. `js/worksheets/<name>.js` defining `show<Name>()`.
2. A `<script>` tag in `index.html`, before `js/menu.js`, same `?v=`.
3. An entry in `SKILL_MAP` in `js/menu.js`: `skill_id: ['showName', 'Display Name']`.
4. A row in the `skills` table, added by a migration in `sql/migrations/` that the
   owner applies — never ad hoc (`CLAUDE.md` §5 Ritual 3). Set `mastery_type`,
   `max_level`, `domain` and `category`.

## Rung 3 — Words: the rebuild contract

One engine, three skills. `js/worksheets/wordreading.js` defines
`showWordReading(spec)`; `showTwoLetter()`, `showThreeLetter()` and
`showUrdu2Letter()` become thin wrappers that pass a spec. Word data lives in
`js/data/word_lists.js`, not in `config.js`.

### A session: teach, then check

1. **Teach** (passive, `recordPassiveResponse`): the word's letters shown **apart**,
   then **joined**, then the whole word spoken. "Separate, then joined" is the
   owner's explicit request. Do not voice single English letters: speech synthesis
   says letter *names* ("see-ay-tee"), which is wrong for blending — the parent,
   sitting alongside, voices the sounds. For Arabic-script words, "apart" is one
   `<span>` per letter and "joined" is plain concatenation, exactly as in
   `joining.js`.
2. **Check** (`recordResponse`), formats mixed within one session:
   - **Read to me** — the word is shown and not spoken; the child reads it aloud;
     the parent taps *Read it* or *Not yet*. This is how oral reading is assessed
     in classrooms, and the only honest oral check without speech recognition.
     Mark it `questionData.judge = 'parent'`.
   - **Hear it, find it** — the word is spoken; the child picks it from four
     written options whose distractors differ by one letter (cat / cot / cut / cap).
     Only when audio exists: English always, Urdu only when `hasSpeechVoice('ur')`
     is true *at the moment of asking* (voices load asynchronously).
   - **Read it, find the picture** — the word is shown and **not** spoken; the
     child picks the matching emoji from four. Only for words that have one.
3. A wrong answer shows the word apart again and retries. `isFirstTry` and
   `attemptCount` stay honest.

### Levels

| Skill | L1 | L2 | L3 | L4 |
|---|---|---|---|---|
| `three_letter_words` | short *a* (cat, map, bag) | short *i*, *o* | short *u*, *e* | mixed — distractors differ only in the vowel (cat / cot / cut) |
| `two_letter_words` | decodable: at in on it up an am us if | the vowel says its name: go no so he we me be hi | must be memorised: to do of is as or my by | — |
| `urdu_2letter` | zabar words (30) | zer and pesh words (9) | the same words **without harakat** | — |

Drop `ad ag ah al aw ax` from the English list — Scrabble words, not a child's.
Urdu level 3 exists because ordinary Urdu print omits zer/zabar/pesh, so reading
without them is the real next step; see the sight-words research below.

An emoji is attached only where a 4-year-old would name the picture with exactly
that word. When in doubt, leave it out — the word still gets the other two checks.

### Daily test and weekend

The daily mini-test (`docs/MASTERY.md`) is multiple choice with no retries, and
`buildDailyTest` only reaches a skill through a `makeAssessmentQs` case in
`js/assessment.js` plus an enabled `ASSESSMENT_SKILLS` entry. **None of the three
has one today**, which is why they could never take part in mastery. Add cases
for *hear it, find it* and *read it, find the picture*. *Read to me* does not fit
the multiple-choice runner and stays in practice.

### Mastery

All three become `mastery_type = 'mastery'` with the level counts above, by a
migration the lead writes. No level is carried forward: only three progress rows
exist across all three skills, every one at level 1.

## Rung 4 — Sight words: what the research found (2026-09-24)

The concept transfers to **Arabic**, not to **Urdu**. Arabic has a real research
lineage (Oweini & Hazoury 2010; Taha 2008; Zoghbor & Palfreyman 2021), and its true
irregular set is small: هٰذا، هٰذه، ذٰلك، لٰكن، الله — dagger-alif words, all in the
top 60 of a 30-million-word corpus. Urdu has no sight-word tradition; what is sold as
"Urdu sight words" is the English Dolch list with Urdu glosses. Urdu's real problem
is that print drops the harakat, and the reform direction is more phonics, not a
sight-word rung. Plan: a sight-words rung for Arabic, a short *irregular words* rung
for Urdu (خوش، خواب، خویش; and میں, which is both "main" and "mein"). The drafted
starter lists are **not native-validated** and wait on the owner's proofing.

