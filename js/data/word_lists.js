// ============ WORD LISTS — Rung 3 (docs/LETTERS_TO_WORDS.md) ============
// Levelled word data for two_letter_words, three_letter_words and urdu_2letter.
// Pure data: no functions, no DOM, no recording calls. js/worksheets/wordreading.js
// is the engine that reads this and does all the logic.
//
// English entries: {word, emoji}. emoji is omitted (not null) when no single
// picture is an honest match for a 4-year-old — "when in doubt, leave it out"
// (docs/LETTERS_TO_WORDS.md). All words below are drawn from CONFIG.twoLetterWords /
// CONFIG.threeLetterWords in js/config.js (read, not edited) and re-organised by the
// phonics categories the contract's level table asks for; see the build report for
// the two words that differ from a mechanical filter of CONFIG.twoLetterWords.
//
// Urdu entries: {word, sound, meaning, emoji}. word carries harakat exactly as
// URDU_WORDS in js/config.js spells it; sound is the same romanized transliteration
// already used elsewhere in this codebase to drive speakUrdu() (see urduqaida.js).
// wordreading.js derives the harakat-free display for Level 3 at runtime — it is
// not duplicated here.

const WORD_LISTS = {
    // ---- two_letter_words --------------------------------------------------
    // Contract's explicit level table, not a mechanical "drop 6 Scrabble words"
    // filter of CONFIG.twoLetterWords: L3 below includes "is" (not present in
    // CONFIG.twoLetterWords at all) and omits "oh" (present in CONFIG but not
    // listed anywhere in the contract's table). See build report.
    two_letter_words: {
        levels: [
            // L1 — decodable
            [
                { word: 'AT' }, { word: 'IN' }, { word: 'ON' }, { word: 'IT' },
                { word: 'UP' }, { word: 'AN' }, { word: 'AM' },
                { word: 'US' }, { word: 'IF' }
            ],
            // L2 — the vowel says its name
            [
                { word: 'GO' }, { word: 'NO' }, { word: 'SO' },
                { word: 'HE' }, { word: 'WE' }, { word: 'ME' },
                { word: 'BE' }, { word: 'HI' }
            ],
            // L3 — must be memorised
            [
                { word: 'TO' }, { word: 'DO' }, { word: 'OF' }, { word: 'IS' },
                { word: 'AS' }, { word: 'OR' }, { word: 'MY' }, { word: 'BY' }
            ]
        ]
    },

    // ---- three_letter_words -------------------------------------------------
    // L4 ("mixed") introduces no new vocabulary — every word is reused from
    // L1-L3 so the vowel-swap distractor rule in wordreading.js (Level 4:
    // "distractors differ only in the vowel") can find real in-pool minimal
    // pairs like hat/hit/hot/hut and pat/pit/pot/put.
    three_letter_words: {
        levels: [
            // L1 — short a
            [
                { word: 'CAT', emoji: '🐱' }, { word: 'BAT', emoji: '🦇' },
                { word: 'HAT', emoji: '🎩' }, { word: 'CAP', emoji: '🧢' },
                { word: 'MAP', emoji: '🗺️' }, { word: 'MAN', emoji: '👨' },
                { word: 'VAN' }, { word: 'CAN', emoji: '🥫' },
                { word: 'RAT' }, { word: 'BAG' }, { word: 'BAD' },
                { word: 'SAD' }, { word: 'PAT' }, { word: 'PAN' }
            ],
            // L2 — short i, o
            [
                { word: 'PIG', emoji: '🐷' }, { word: 'PIN', emoji: '📌' },
                { word: 'LIP' }, { word: 'KID' },
                { word: 'WIN' }, { word: 'HIT' }, { word: 'BIG' },
                { word: 'PIT' },
                { word: 'DOG', emoji: '🐶' }, { word: 'FOX', emoji: '🦊' },
                { word: 'BOX', emoji: '📦' }, { word: 'HOT' },
                { word: 'POT' }, { word: 'LOG' }
            ],
            // L3 — short u, e
            [
                { word: 'BUG', emoji: '🐛' }, { word: 'BUS', emoji: '🚌' },
                { word: 'CUT' }, { word: 'HUG' },
                { word: 'HUT' }, { word: 'NUT', emoji: '🥜' }, { word: 'PUT' },
                { word: 'SUN', emoji: '☀️' }, { word: 'TUB' },
                { word: 'BED', emoji: '🛏️' }, { word: 'EGG', emoji: '🥚' },
                { word: 'LEG', emoji: '🦵' }, { word: 'PEN', emoji: '🖊️' },
                { word: 'TEN', emoji: '🔟' }, { word: 'WEB', emoji: '🕸️' },
                { word: 'DEN' }, { word: 'MEN' }
            ],
            // L4 — mixed vowels, reused from L1-L3
            [
                { word: 'HAT', emoji: '🎩' }, { word: 'HIT' }, { word: 'HOT' }, { word: 'HUT' },
                { word: 'PAT' }, { word: 'PIT' }, { word: 'POT' }, { word: 'PUT' },
                { word: 'PAN' }, { word: 'PIN', emoji: '📌' }, { word: 'PEN', emoji: '🖊️' },
                { word: 'CAT', emoji: '🐱' }, { word: 'CUT' },
                { word: 'BAG' }, { word: 'BIG' }, { word: 'BUG', emoji: '🐛' }
            ]
        ]
    },

    // ---- urdu_2letter --------------------------------------------------------
    // L1 = zabar words (30), L2 = zer/pesh words (9), from URDU_WORDS in
    // js/config.js (41 entries; 2 — do/jo — carry no harakat at all). L3 is not
    // listed here: wordreading.js derives it as all 41 words with harakat
    // stripped (zabar ++ zerPesh ++ unmarked), which is the first time "do" and
    // "jo" appear in the worksheet at all — see build report.
    urdu_2letter: {
        zabar: [
            { word: 'اَب', sound: 'ab', meaning: 'now' },
            { word: 'جَب', sound: 'jab', meaning: 'when' },
            { word: 'سَب', sound: 'sab', meaning: 'all' },
            { word: 'نَل', sound: 'nal', meaning: 'tap', emoji: '🚰' },
            { word: 'کَل', sound: 'kal', meaning: 'tomorrow' },
            { word: 'پَر', sound: 'par', meaning: 'on/wing' },
            { word: 'نَو', sound: 'nau', meaning: 'nine', emoji: '9️⃣' },
            { word: 'بَس', sound: 'bas', meaning: 'enough' },
            { word: 'دَس', sound: 'das', meaning: 'ten', emoji: '🔟' },
            { word: 'ہَم', sound: 'hum', meaning: 'we' },
            { word: 'دَم', sound: 'dam', meaning: 'breath' },
            { word: 'رَب', sound: 'rab', meaning: 'lord' },
            { word: 'بَچ', sound: 'bach', meaning: 'child' },
            { word: 'گَر', sound: 'gar', meaning: 'but' },
            { word: 'شَد', sound: 'shad', meaning: 'became' },
            { word: 'کَم', sound: 'kam', meaning: 'less' },
            { word: 'زَر', sound: 'zar', meaning: 'gold' },
            { word: 'پَل', sound: 'pal', meaning: 'moment' },
            { word: 'تَک', sound: 'tak', meaning: 'until' },
            { word: 'سَد', sound: 'sad', meaning: 'century' },
            { word: 'ہَر', sound: 'har', meaning: 'every' },
            { word: 'یَر', sound: 'yar', meaning: 'friend' },
            { word: 'پَک', sound: 'pak', meaning: 'pure' },
            { word: 'جَگ', sound: 'jag', meaning: 'world' },
            { word: 'سَم', sound: 'sam', meaning: 'poison' },
            { word: 'دَن', sound: 'dan', meaning: 'day' },
            { word: 'مَت', sound: 'mat', meaning: 'opinion' },
            { word: 'رَت', sound: 'rat', meaning: 'night' },
            { word: 'تَر', sound: 'tar', meaning: 'swim' },
            { word: 'بَد', sound: 'bad', meaning: 'after' }
        ],
        zerPesh: [
            { word: 'اِس', sound: 'is', meaning: 'this' },
            { word: 'دِل', sound: 'dil', meaning: 'heart', emoji: '❤️' },
            { word: 'گُل', sound: 'gul', meaning: 'flower', emoji: '🌸' },
            { word: 'تُو', sound: 'tu', meaning: 'you' },
            { word: 'مِل', sound: 'mil', meaning: 'meet' },
            { word: 'تُم', sound: 'tum', meaning: 'you (plural)' },
            { word: 'بِل', sound: 'bil', meaning: 'cat' },
            { word: 'تِل', sound: 'til', meaning: 'sesame' },
            { word: 'کِر', sound: 'kir', meaning: 'ray' }
        ],
        // Never taught at L1/L2 (no harakat to begin with) — first appear at L3.
        unmarked: [
            { word: 'دو', sound: 'do', meaning: 'two', emoji: '2️⃣' },
            { word: 'جو', sound: 'jo', meaning: 'who' }
        ]
    }
};
