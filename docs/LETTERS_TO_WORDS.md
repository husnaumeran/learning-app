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
`{correct: true}` for every card the child clicks past. That is not a reading check,
and it feeds the mastery engine evidence that was never earned — the same pollution
`recordPassiveResponse` was introduced to keep out. A rebuilt word worksheet shows
the word, asks something a child can only answer by reading it, and records the real
answer. Anything genuinely passive (tracing, a video, a book page) goes through
`recordPassiveResponse`, which marks it `is_passive` and keeps it out of mastery.

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
