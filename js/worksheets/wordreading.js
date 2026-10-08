// ============ WORD READING (Rung 3) ============
// docs/LETTERS_TO_WORDS.md "Rung 3 — Words: the rebuild contract".
// One engine parameterised by a spec (WORD_READING_SPECS below); showTwoLetter(),
// showThreeLetter() and showUrdu2Letter() (their own worksheet files) are thin
// wrappers that call showWordReading(WORD_READING_SPECS.<skillId>).
//
// The honesty rule (docs/LETTERS_TO_WORDS.md): teaching is passive
// (recordPassiveResponse); every check — right or wrong, every attempt — goes
// through recordResponse with honest isFirstTry/attemptCount. Score counts
// first-try-correct only.
//
// House style copied from joining.js:
//  (a) Arabic-script "apart" is one <span> per letter (here: per letter+harakat
//      chunk, since these are composed dictionary words, not table letters);
//      "joined" is the word exactly as URDU_WORDS already spells it — never
//      built from initial/medial/final forms.
//  (b) Distractors come from bounded, single-pass shuffles — no while/do loop
//      anywhere in this file. An item that can't fill a format is not offered
//      for that word (see wrAvailableFormats) rather than looped on.
//  (c) Options are disabled synchronously on pick, closing the double-tap race.

// ---------- word-list helpers ----------

function wrShuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// Bounded distractor pick, mirroring joining.js's joiningPickDistractors: one
// shuffle pass, take up to n distinct entries (by keyFn) not already in
// excludeKeys/already picked. Never rejection-samples against a pool that
// might be too small — returns fewer than n if the pool runs out.
function wrPickDistractors(pool, excludeKeys, n, keyFn) {
    const seen = new Set(excludeKeys);
    const out = [];
    const shuffled = wrShuffle(pool);
    for (let i = 0; i < shuffled.length && out.length < n; i++) {
        const k = keyFn(shuffled[i]);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(shuffled[i]);
    }
    return out;
}

// Arabic-script combining harakat: fathatan/dammatan/kasratan, fatha, damma,
// kasra, shadda, sukun (U+064B-U+0652). Used to strip marks (urdu_2letter
// Level 3, "the same words without harakat") and to group a composed word
// into per-letter "apart" chunks.
const HARAKAT_MARK_RE = /[ً-ْ]/;
const HARAKAT_MARKS_RE = /[ً-ْ]/g;

function stripHarakat(word) {
    return word.replace(HARAKAT_MARKS_RE, '');
}

// Groups a composed Arabic-script word into per-letter chunks: one base
// letter plus any harakat mark(s) immediately following it, e.g.
// 'اَب' -> ['اَ','ب']. Only for the "apart" teaching view — one <span> per
// chunk, so the shaping engine has no adjacent glyph to join to (same
// principle as joining.js's joiningSeparateHTML, applied to a composed word
// string instead of a letters table).
function urduWordChunks(word) {
    const chars = Array.from(word);
    const chunks = [];
    for (let i = 0; i < chars.length; i++) {
        if (chunks.length && HARAKAT_MARK_RE.test(chars[i])) {
            chunks[chunks.length - 1] += chars[i];
        } else {
            chunks.push(chars[i]);
        }
    }
    return chunks;
}

// Hamming distance between two same-length words, by Unicode codepoint (so a
// harakat mark counts as its own position). Different-length words are
// "not comparable".
function wrHamming(a, b) {
    const ca = Array.from(a), cb = Array.from(b);
    if (ca.length !== cb.length) return Infinity;
    let d = 0;
    for (let i = 0; i < ca.length; i++) if (ca[i] !== cb[i]) d++;
    return d;
}

// Text-option distractors (Hear it, find it): prefer a real minimal pair —
// differs from correctWord by exactly one character — restricted to
// vowelIndex only when given (three_letter_words Level 4: "distractors
// differ only in the vowel"). Tops up from any other distinct word in the
// pool when fewer than n minimal pairs exist (this app's small, curated word
// lists don't always have a full vowel-family for every word — see build
// report). Two bounded passes, no while/do loop.
function wrPickWordDistractors(correctWord, pool, n, vowelIndex) {
    const others = pool.filter(w => w !== correctWord);
    const minimal = others.filter(w => {
        if (vowelIndex != null) {
            const ca = Array.from(correctWord), cb = Array.from(w);
            if (ca.length !== cb.length || vowelIndex >= ca.length) return false;
            for (let i = 0; i < ca.length; i++) {
                if (i === vowelIndex) continue;
                if (ca[i] !== cb[i]) return false;
            }
            return ca[vowelIndex] !== cb[vowelIndex];
        }
        return wrHamming(correctWord, w) === 1;
    });
    const picked = wrPickDistractors(minimal, [correctWord], n, w => w);
    if (picked.length < n) {
        picked.push(...wrPickDistractors(others, [correctWord, ...picked], n - picked.length, w => w));
    }
    return picked;
}

// Picture-option distractors (Read it, find the picture): any other word in
// the full cross-level pool that has an emoji, keyed by identityFn so a word
// re-shown in a different form (urdu_2letter Level 3 strips harakat) never
// gets offered as its own distractor. Deduplicated by safeEmoji()'s RESOLVED
// value, not the raw character — on a device missing two of these emoji,
// both could fall back to the same substitute (or '❓'), which would be an
// honest Hamming-distinct pick but a visually identical, unanswerable pair
// of options for the child looking at the screen.
function wrPickEmojiDistractors(correctEntry, allEntries, n, identityFn) {
    const correctId = identityFn(correctEntry);
    const pool = allEntries.filter(e => e.emoji && identityFn(e) !== correctId);
    return wrPickDistractors(pool, [safeEmoji(correctEntry.emoji)], n, e => safeEmoji(e.emoji));
}

// ---------- specs ----------
// levelWords(level) -> entries taught/checked AT that level (1-indexed).
// allWords()        -> the full cross-level pool, used only for picture
//                       (emoji) distractors, which need more candidates than
//                       a single level reliably has (docs/LETTERS_TO_WORDS.md:
//                       "only where a 4-year-old would name the picture" left
//                       some levels emoji-sparse — see build report).
// vowelIndex(level)  -> the character index distractors must match everywhere
//                       except itself, or null for the general one-letter-
//                       anywhere rule. Only three_letter_words Level 4 sets one.
const WORD_READING_SPECS = {
    two_letter_words: {
        skillId: 'two_letter_words',
        type: '2-Letter Words',
        lang: 'en',
        heading: 'Read the Word!',
        color: null,
        levelCount: 3,
        vowelIndex: () => null,
        levelWords: (level) => WORD_LISTS.two_letter_words.levels[level - 1] || [],
        allWords: () => WORD_LISTS.two_letter_words.levels.flat()
    },
    three_letter_words: {
        skillId: 'three_letter_words',
        type: '3-Letter Words',
        lang: 'en',
        heading: 'Read the Word!',
        color: null,
        levelCount: 4,
        vowelIndex: (level) => level === 4 ? 1 : null,
        levelWords: (level) => WORD_LISTS.three_letter_words.levels[level - 1] || [],
        // L4 reuses L1-L3 words verbatim; exclude it here so the emoji pool
        // isn't counting the same word twice.
        allWords: () => WORD_LISTS.three_letter_words.levels.slice(0, 3).flat()
    },
    urdu_2letter: {
        skillId: 'urdu_2letter',
        type: 'Urdu 2-Letter Words',
        lang: 'ur',
        heading: 'اردو Urdu — Read the Word!',
        color: '#FFD700',
        levelCount: 3,
        vowelIndex: () => null,
        levelWords: (level) => {
            const d = WORD_LISTS.urdu_2letter;
            if (level === 1) return d.zabar;
            if (level === 2) return d.zerPesh;
            // Level 3: the full 41-word vocabulary, harakat-free — the first
            // appearance of "do"/"jo", which never carried harakat to begin
            // with (see word_lists.js and the build report).
            return d.zabar.concat(d.zerPesh, d.unmarked).map(e => ({
                word: stripHarakat(e.word), sound: e.sound, meaning: e.meaning, emoji: e.emoji
            }));
        },
        allWords: () => {
            const d = WORD_LISTS.urdu_2letter;
            return d.zabar.concat(d.zerPesh, d.unmarked);
        }
    }
};

// ---------- engine ----------

function showWordReading(spec) {
    const skillId = spec.skillId;
    const level = Math.min(spec.levelCount, Math.max(1, getContentLevel(skillId) || 1));
    const total = Math.max(4, getQuestionCount(skillId));

    const levelWordsRaw = spec.levelWords(level);
    if (!levelWordsRaw.length) {
        // Degenerate case (shouldn't happen with the curated lists in
        // word_lists.js, but report rather than crash — same contract as
        // joining.js's empty-items guard).
        document.getElementById('app').innerHTML =
            '<button class="back" onclick="showMenu()">← Back</button><div class="card">' +
            '<div class="title"' + (spec.lang === 'ur' ? ' style="direction:rtl"' : '') + '>' + spec.heading + '</div>' +
            '<div style="text-align:center;color:#666;font-size:16px;margin:20px 0">Not enough words to build this level yet.</div>' +
            '<button class="btn green" onclick="showMenu()">Back to Menu</button></div>';
        return;
    }

    // total words for the session, sampled from the level's pool, cycling
    // (shuffle + modulo) if total exceeds the pool — same idiom as joining.js's
    // joiningBuildL1Items (`shuffledTable[i % shuffledTable.length]`).
    const shuffledLevel = wrShuffle(levelWordsRaw);
    const sessionWords = [];
    for (let i = 0; i < total; i++) sessionWords.push(shuffledLevel[i % shuffledLevel.length]);

    // Interleave with a lag of one so no check immediately follows its own
    // teaching (lead review, post-launch): T0, T1, C0, T2, C1, T3, C2, ...,
    // T(n-1), C(n-2), C(n-1). Every check has at least one other item — another
    // word's teaching, or (for the very last check) the second-to-last check —
    // between it and its own teaching, so "read to me" / "hear it" measure
    // discrimination rather than an echo of what was just spoken.
    const steps = [{ type: 'teach', word: 0 }];
    for (let i = 1; i < total; i++) {
        steps.push({ type: 'teach', word: i });
        steps.push({ type: 'check', word: i - 1 });
    }
    steps.push({ type: 'check', word: total - 1 });

    const identityFn = spec.lang === 'ur' ? (e => e.sound) : (e => e.word);
    const vowelIdx = spec.vowelIndex(level);
    const textPool = levelWordsRaw.map(e => e.word);
    const emojiPool = spec.allWords().filter(e => e.emoji);

    let stepIndex = 0, score = 0, attempt = 1, qStartMs = null;
    let currentFormat = null, currentTextDistractors = null, currentPictureDistractors = null;

    function cardOpen(extra) {
        const styleParts = [];
        if (spec.lang === 'ur') styleParts.push('direction:rtl');
        if (spec.color) styleParts.push('color:' + spec.color);
        const styleAttr = styleParts.length ? ' style="' + styleParts.join(';') + '"' : '';
        return '<button class="back" onclick="showMenu()">← Back</button><div class="card">' +
            '<div class="title"' + styleAttr + '>' + spec.heading + (extra || '') + '</div>';
    }

    // Which check number (1-indexed) stepIndex's check is — derived from the
    // steps list itself rather than a separately-incremented counter, so it
    // stays correct across retries (stepIndex doesn't move during a retry).
    function checkNumberAt(idx) {
        let n = 0;
        for (let i = 0; i <= idx; i++) if (steps[i].type === 'check') n++;
        return n;
    }

    function progressFooterCheck() {
        return '<div class="score">⭐ ' + score + ' / ' + total + ' — Check ' + checkNumberAt(stepIndex) + ' of ' + total + '</div>';
    }

    // Shared "apart, then joined" block used by both the teach card and the
    // wrong-answer reinforcement card (docs/LETTERS_TO_WORDS.md step 3: "a
    // wrong answer shows the word apart again"). Never speaks single English
    // letters — only a single "hear the whole word" trigger, wired separately
    // by wireTeachAudio.
    function wrApartJoinedBlock(entry) {
        let html = '<div style="text-align:center;color:#666;font-size:15px;margin-bottom:6px">Apart</div>';
        if (spec.lang === 'ur') {
            html += '<div style="text-align:center;margin:10px;direction:rtl">' +
                urduWordChunks(entry.word).map(c =>
                    '<span style="display:inline-block;margin:0 6px;font-size:52px;font-family:serif">' + c + '</span>'
                ).join('') + '</div>';
        } else {
            html += '<div style="text-align:center;margin:10px">' +
                entry.word.split('').map(c =>
                    '<span style="display:inline-block;margin:0 6px;padding:6px 10px;background:#333;color:white;border-radius:10px;font-size:40px;font-weight:bold">' + c + '</span>'
                ).join('') + '</div>';
        }
        html += '<div style="text-align:center;color:#666;font-size:15px;margin:14px 0 8px">Joined</div>';
        html += '<div id="wrTeachMain" class="bigword"' + (spec.lang === 'ur' ? ' style="direction:rtl"' : '') + '>' + entry.word + '</div>';
        html += '<div style="text-align:center;margin-top:10px"><button id="wrListenBtn" class="btn green" style="font-size:18px;padding:10px 22px;width:auto;display:inline-block">🔊 Listen</button></div>';
        return html;
    }

    // English audio is assumed always available (contract: "English always").
    // Urdu is gated on hasSpeechVoice('ur') checked fresh here (not cached —
    // voices load asynchronously), matching urduqaida.js's own word-audio gate.
    // No recording exists to hide a broken button behind, so when it's not
    // available the Listen button is simply not shown. Speaks the Urdu-SCRIPT
    // word (not the romanised `sound`): this only ever runs when a real Urdu
    // voice is installed, and that voice reads Urdu script correctly but can
    // only guess at Latin letters — the Qaida screens' romanised convention
    // predates this gate and doesn't apply here (lead review, post-launch).
    function wireTeachAudio(entry) {
        const main = document.getElementById('wrTeachMain');
        const btn = document.getElementById('wrListenBtn');
        const audible = spec.lang === 'ur' ? hasSpeechVoice('ur') : true;
        if (!audible) { if (btn) btn.style.display = 'none'; return; }
        const play = () => spec.lang === 'ur' ? speakUrdu(entry.word) : speak(entry.word);
        if (main) { main.style.cursor = 'pointer'; main.onclick = play; }
        if (btn) btn.onclick = play;
        play(); // teach cards auto-play, matching every other letter/word screen in the app
    }

    // ---------- step sequencing ----------
    function advanceStep() {
        stepIndex++;
        if (stepIndex >= steps.length) { finish(); return; }
        renderCurrentStep();
    }

    function renderCurrentStep() {
        const step = steps[stepIndex];
        if (step.type === 'teach') renderTeach(step.word);
        else enterCheckStep(step.word);
    }

    // ---------- teach ----------
    function renderTeach(wordIdx) {
        startItemTimer();
        const entry = sessionWords[wordIdx];
        let html = cardOpen(' — Learn (' + (wordIdx + 1) + '/' + total + ')');
        html += wrApartJoinedBlock(entry);
        html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin-top:14px" onclick="wordReadingNext()">Next →</button>';
        html += '</div>';
        document.getElementById('app').innerHTML = html;
        wireTeachAudio(entry);
    }

    window.wordReadingNext = () => {
        const wordIdx = steps[stepIndex].word;
        const entry = sessionWords[wordIdx];
        recordPassiveResponse(skillId, { type: 'word_teach', word: entry.word, level: level }, wordIdx, level);
        advanceStep();
    };

    // ---------- check: format selection ----------
    // "Formats mixed within one session" (contract): a format is chosen per
    // word from whatever is actually available for THAT word right now — an
    // item that can't support a format just doesn't offer it, rather than
    // showing a broken button. Picked once per check (here) and reused across
    // any retries of that same check by renderCheck().
    function enterCheckStep(wordIdx) {
        const entry = sessionWords[wordIdx];
        attempt = 1;
        const formats = ['read_to_me'];

        const audioOk = spec.lang === 'ur' ? hasSpeechVoice('ur') : true;
        if (audioOk) formats.push('hear_it');

        currentPictureDistractors = null;
        if (entry.emoji) {
            const d = wrPickEmojiDistractors(entry, emojiPool, 3, identityFn);
            if (d.length === 3) { currentPictureDistractors = d; formats.push('read_picture'); }
        }

        currentFormat = formats[Math.floor(Math.random() * formats.length)];
        currentTextDistractors = currentFormat === 'hear_it'
            ? wrPickWordDistractors(entry.word, textPool, 3, vowelIdx)
            : null;

        renderCheck(wordIdx);
    }

    function renderCheck(wordIdx) {
        qStartMs = Date.now();
        const entry = sessionWords[wordIdx];
        if (currentFormat === 'read_to_me') renderReadToMe(entry);
        else if (currentFormat === 'hear_it') renderHearIt(entry);
        else renderReadPicture(entry);
    }

    // ---------- check: renderers ----------
    // Read to me — for the grown-up, not the child: never spoken, large word,
    // an explicit label above two big judge buttons (contract: "make that
    // obvious").
    function renderReadToMe(entry) {
        let html = cardOpen(' — Read to Me');
        html += '<div class="bigword"' + (spec.lang === 'ur' ? ' style="direction:rtl"' : '') + '>' + entry.word + '</div>';
        html += '<div style="text-align:center;color:#666;font-size:16px;font-weight:bold;margin:16px 0 8px">Grown-up: did they read it?</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:10px">';
        html += '<button class="btn green wrJudge" style="font-size:20px;padding:16px 10px" onclick="wordReadingJudge(true)">✅ Read it</button>';
        html += '<button class="btn wrJudge" style="font-size:20px;padding:16px 10px;background:#ef4444;color:white" onclick="wordReadingJudge(false)">❌ Not yet</button>';
        html += '</div>' + progressFooterCheck() + '</div>';
        document.getElementById('app').innerHTML = html;
    }

    // Hear it, find it — word is spoken, never shown; 4 written options.
    // Never auto-played silently-only: a visible button always backs the
    // auto-play attempt, since autoplay can be blocked without a user gesture.
    function renderHearIt(entry) {
        const options = wrShuffle([entry.word, ...currentTextDistractors]);
        const dir = spec.lang === 'ur' ? 'direction:rtl;font-family:serif;' : '';
        let html = cardOpen(' — Listen');
        html += '<div style="text-align:center;color:#666;font-size:15px;margin-bottom:6px">Listen, then find the word</div>';
        html += '<div style="text-align:center;margin:14px 0"><button id="wrHearBtn" class="btn green" style="font-size:22px;padding:16px 30px;width:auto;display:inline-block">🔊 Hear it</button></div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:15px">';
        options.forEach(o => {
            html += '<div class="wrOpt" style="font-size:28px;font-weight:bold;text-align:center;padding:16px;background:#333;color:white;border-radius:14px;cursor:pointer;' + dir + '" onclick="wordReadingPick(\'' + o + '\')">' + o + '</div>';
        });
        html += '</div>' + progressFooterCheck() + '</div>';
        document.getElementById('app').innerHTML = html;
        // Urdu-SCRIPT word, not the romanised `sound` — see wireTeachAudio.
        const play = () => spec.lang === 'ur' ? speakUrdu(entry.word) : speak(entry.word);
        const btn = document.getElementById('wrHearBtn');
        if (btn) btn.onclick = play;
        play();
    }

    // Read it, find the picture — word is shown, never spoken; 4 emoji
    // options, each run through safeEmoji() so an unsupported glyph falls
    // back rather than showing a blank/tofu box (helpers.js's own emoji
    // compatibility system, used the same way CONFIG.categories already is).
    function renderReadPicture(entry) {
        const options = wrShuffle([entry, ...currentPictureDistractors]);
        let html = cardOpen(' — Read');
        html += '<div class="bigword"' + (spec.lang === 'ur' ? ' style="direction:rtl"' : '') + '>' + entry.word + '</div>';
        html += '<div style="text-align:center;color:#666;font-size:15px;margin:10px 0 6px">Find the picture</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:15px">';
        options.forEach(o => {
            const shown = safeEmoji(o.emoji);
            html += '<div class="wrOpt" style="font-size:52px;text-align:center;padding:16px;background:#333;border-radius:14px;cursor:pointer" onclick="wordReadingPick(\'' + shown + '\')">' + shown + '</div>';
        });
        html += '</div>' + progressFooterCheck() + '</div>';
        document.getElementById('app').innerHTML = html;
    }

    // Reinforcement shown before a retry (contract step 3). Reuses the same
    // apart/joined block and format as the original check.
    function renderApartAgain(entry, callback) {
        let html = cardOpen(' — Let’s look again');
        html += wrApartJoinedBlock(entry);
        html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin-top:14px" onclick="wordReadingRetry()">Try Again →</button>';
        html += '</div>';
        document.getElementById('app').innerHTML = html;
        wireTeachAudio(entry);
        window.wordReadingRetry = () => { qStartMs = Date.now(); callback(); };
    }

    // ---------- check: answer handling ----------
    function disableOptions() {
        document.querySelectorAll('.wrOpt, .wrJudge').forEach(el => { el.onclick = null; el.style.pointerEvents = 'none'; });
    }

    function submitAnswer(isCorrect, correctKey, finalKey) {
        const wordIdx = steps[stepIndex].word;
        const entry = sessionWords[wordIdx];
        const isFirstTry = attempt === 1;
        const responseTimeMs = qStartMs ? Date.now() - qStartMs : null;
        const questionData = { type: 'word_check', format: currentFormat, word: entry.word, level: level };
        if (currentFormat === 'read_to_me') questionData.judge = 'parent';

        recordResponse(skillId, questionData, correctKey, finalKey, isCorrect, isFirstTry, attempt, responseTimeMs, wordIdx, false, level);

        if (isCorrect) {
            if (isFirstTry) score++;
            currentAnswers.push({ q: entry.word, answer: finalKey, correct: true });
            showFeedback(true, () => {
                advanceStep(); // next step: another word's teach, another check, or finish()
            });
        } else {
            attempt++;
            showFeedback(false, () => {
                renderApartAgain(entry, () => renderCheck(wordIdx));
            });
        }
    }

    window.wordReadingPick = (choiceKey) => {
        disableOptions();
        const entry = sessionWords[steps[stepIndex].word];
        const correctKey = currentFormat === 'read_picture' ? safeEmoji(entry.emoji) : entry.word;
        submitAnswer(choiceKey === correctKey, correctKey, choiceKey);
    };

    window.wordReadingJudge = (isRead) => {
        disableOptions();
        const entry = sessionWords[steps[stepIndex].word];
        submitAnswer(isRead, entry.word, isRead ? entry.word : 'not_yet');
    };

    function finish() {
        completeWorksheet(spec.type, score, total);
    }

    renderCurrentStep();
}
