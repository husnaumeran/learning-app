// ============ LETTER JOINING (Urdu / Arabic) ============
// Rung 2 of docs/LETTERS_TO_WORDS.md: how isolated letters connect into words.
// One implementation parameterised by lang ('ur' | 'ar'); showUrduJoining() and
// showArabicJoining() are thin wrappers at the bottom of this file.
//
// CRITICAL: joined words are built by concatenating PLAIN l.letter characters and
// letting the font's own Arabic-script shaping engine pick the initial/medial/final
// glyph — never by concatenating the initial/medial/final strings themselves (those
// carry a tatweel and are only valid as a single-shape label). See docs/LETTERS_TO_WORDS.md.
//
// "Separate" letters (teaching apart-view, and every L4 option) are rendered as
// sibling DOM nodes so the shaping engine has no adjacent glyph to connect them to —
// that alone is what keeps them visually unjoined, no ZWNJ needed.

const JOINING_LANG_META = {
    ur: { skillId: 'urdu_joining', table: () => URDU_LETTERS, color: '#FFD700', title: 'اردو Urdu — Joining 🔗', displayName: 'Urdu Joining' },
    ar: { skillId: 'arabic_joining', table: () => ARABIC_LETTERS, color: '#22c55e', title: 'عربی Arabic — Joining 🔗', displayName: 'Arabic Joining' }
};

// Best-effort "same skeleton, different dots" groupings for L1 distractors.
// Letter DATA (glyphs, names, joins) always comes from URDU_LETTERS/ARABIC_LETTERS —
// this table only encodes which of those letters look alike, a judgment call the
// data itself doesn't carry (no "skeleton" field exists). See report for detail.
const JOINING_SHAPE_FAMILIES = {
    ur: [
        ['ب', 'پ', 'ت', 'ٹ', 'ث'],
        ['ج', 'چ', 'ح', 'خ'],
        ['د', 'ڈ', 'ذ'],
        ['ر', 'ڑ', 'ز', 'ژ'],
        ['س', 'ش'],
        ['ص', 'ض'],
        ['ط', 'ظ'],
        ['ع', 'غ'],
        ['ف', 'ق'],
        ['ک', 'گ'],
        ['ہ', 'ھ'],
        ['ی', 'ے']
    ],
    ar: [
        ['ب', 'ت', 'ث'],
        ['ج', 'ح', 'خ'],
        ['د', 'ذ'],
        ['ر', 'ز'],
        ['س', 'ش'],
        ['ص', 'ض'],
        ['ط', 'ظ'],
        ['ع', 'غ'],
        ['ف', 'ق'],
        ['و', 'ي']
    ]
};

function joiningShuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

// Letters sharing correct's shape family (if any), used to bias L1 distractors
// toward "genuinely similar" per the brief. Falls back to [] when the letter
// isn't in any family or has no family-mates in this table.
function joiningFamilyMates(lang, letter) {
    const families = JOINING_SHAPE_FAMILIES[lang] || [];
    const fam = families.find(f => f.includes(letter));
    if (!fam) return [];
    return fam.filter(l => l !== letter);
}

// Bounded distractor pick: one shuffle pass, take up to n distinct entries whose
// key (via keyFn) isn't excluded. Never rejection-samples against a pool that
// might be too small — it just returns fewer than n if the pool runs out.
function joiningPickDistractors(pool, excludeKeys, n, keyFn) {
    const seen = new Set(excludeKeys);
    const out = [];
    const shuffled = joiningShuffle(pool);
    for (let i = 0; i < shuffled.length && out.length < n; i++) {
        const k = keyFn(shuffled[i]);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(shuffled[i]);
    }
    return out;
}

function joiningShapeOf(letterObj, field) {
    return field === 'alone' ? letterObj.letter : letterObj[field];
}

// One <span> per letter so the shaping engine treats each as its own run —
// this is what keeps them visually unjoined, matching how the teaching
// "apart" view and every L4 option must look.
function joiningSeparateHTML(letters, size) {
    return letters.map(l =>
        '<span style="display:inline-block;margin:0 6px;font-size:' + size + 'px;font-family:serif">' + l.letter + '</span>'
    ).join('');
}

function joiningJoinedHTML(letters) {
    return letters.map(l => l.letter).join('');
}

function joiningKey(letters) {
    return letters.map(l => l.letter).join('');
}

async function joiningPlaySequence(lang, letters) {
    stopLetterAudio();
    for (let i = 0; i < letters.length; i++) {
        if (canHearLetter(lang, letters[i].letter)) {
            try { await playLetterSound(lang, letters[i].letter); } catch (e) {}
        }
    }
}

function joiningAnySoundable(lang, letters) {
    return letters.some(l => canHearLetter(lang, l.letter));
}

// ============ ITEM BUILDERS ============

function joiningBuildL1Items(lang, table, count) {
    const items = [];
    const fields = ['alone', 'initial', 'medial', 'final'];
    const shuffledTable = joiningShuffle(table);
    for (let i = 0; i < count; i++) {
        const letterObj = shuffledTable[i % shuffledTable.length];
        const field = fields[Math.floor(Math.random() * fields.length)];
        const familyMates = joiningFamilyMates(lang, letterObj.letter)
            .map(ch => table.find(l => l.letter === ch))
            .filter(Boolean);
        const rest = table.filter(l => l.letter !== letterObj.letter);
        // Family-mates first (genuinely similar shapes), then fill from the rest.
        const ordered = [...joiningShuffle(familyMates), ...joiningShuffle(rest)];
        const distractors = joiningPickDistractors(ordered, [letterObj.letter], 3, l => l.letter);
        if (distractors.length < 3) continue; // move on rather than loop — see brief
        items.push({ type: 'l1', letter: letterObj, field, distractors });
    }
    return items;
}

function joiningBuildL2Items(lang, table, count) {
    const items = [];
    for (let i = 0; i < count; i++) {
        const l1 = table[Math.floor(Math.random() * table.length)];
        const l2 = table[Math.floor(Math.random() * table.length)];
        const correct = [l1, l2];
        // Distractors: same first letter, different second letter (per brief).
        const others = table.filter(l => l.letter !== l2.letter);
        const picks = joiningPickDistractors(others, [l2.letter], 3, l => l.letter);
        if (picks.length < 3) continue;
        const distractors = picks.map(p => [l1, p]);
        items.push({ type: 'l2', letters: correct, distractors });
    }
    return items;
}

function joiningBuildL3Items(lang, table, count) {
    const items = [];
    const joinsFalse = table.filter(l => !l.joins);
    const joinsTrue = table.filter(l => l.joins);

    function randomTriple() {
        const l1 = table[Math.floor(Math.random() * table.length)];
        const l2 = table[Math.floor(Math.random() * table.length)];
        const l3 = table[Math.floor(Math.random() * table.length)];
        return [l1, l2, l3];
    }

    function buildDistractorsFor(correct) {
        // Vary the 2nd and/or 3rd letter, first letter fixed — same shape as L2.
        const candidates = [];
        const shuffled2 = joiningShuffle(table);
        const shuffled3 = joiningShuffle(table);
        for (let i = 0; i < shuffled2.length && candidates.length < 6; i++) {
            if (shuffled2[i].letter === correct[1].letter) continue;
            candidates.push([correct[0], shuffled2[i], correct[2]]);
        }
        for (let i = 0; i < shuffled3.length && candidates.length < 12; i++) {
            if (shuffled3[i].letter === correct[2].letter) continue;
            candidates.push([correct[0], correct[1], shuffled3[i]]);
        }
        const seen = new Set([joiningKey(correct)]);
        const out = [];
        for (const cand of joiningShuffle(candidates)) {
            const k = joiningKey(cand);
            if (seen.has(k)) continue;
            seen.add(k);
            out.push(cand);
            if (out.length === 3) break;
        }
        return out;
    }

    // Guarantee at least one item whose word breaks into two visual groups:
    // first letter joins:false, second letter joins:true (a clean 2-group split).
    if (joinsFalse.length && joinsTrue.length) {
        const l1 = joinsFalse[Math.floor(Math.random() * joinsFalse.length)];
        const l2 = joinsTrue[Math.floor(Math.random() * joinsTrue.length)];
        const l3 = table[Math.floor(Math.random() * table.length)];
        const correct = [l1, l2, l3];
        const distractors = buildDistractorsFor(correct);
        if (distractors.length === 3) items.push({ type: 'l3', letters: correct, distractors, breaksGroup: true });
    }

    for (let i = items.length; i < count; i++) {
        const correct = randomTriple();
        const distractors = buildDistractorsFor(correct);
        if (distractors.length < 3) continue;
        items.push({ type: 'l3', letters: correct, distractors });
    }
    // items.length is already <= count (one push per iteration, at most); shuffle
    // so the guaranteed group-break item isn't always question 1.
    return joiningShuffle(items);
}

function joiningBuildL4Items(lang, table, count) {
    const items = [];
    for (let i = 0; i < count; i++) {
        const n = Math.random() < 0.5 ? 2 : 3;
        const correct = [];
        for (let j = 0; j < n; j++) correct.push(table[Math.floor(Math.random() * table.length)]);

        const candidates = [];
        if (n >= 2) candidates.push([...correct].reverse());
        if (n === 3) {
            candidates.push([correct[1], correct[0], correct[2]]);
            candidates.push([correct[0], correct[2], correct[1]]);
            candidates.push([correct[2], correct[1], correct[0]]);
        }
        const shuffledTable = joiningShuffle(table);
        let ti = 0;
        for (let pos = 0; pos < n && candidates.length < 10; pos++) {
            for (let tries = 0; tries < 3 && ti < shuffledTable.length; tries++) {
                const repl = shuffledTable[ti++];
                if (repl.letter === correct[pos].letter) continue;
                const cand = [...correct];
                cand[pos] = repl;
                candidates.push(cand);
            }
        }
        const seen = new Set([joiningKey(correct)]);
        const distractors = [];
        for (const cand of candidates) {
            const k = joiningKey(cand);
            if (seen.has(k)) continue;
            seen.add(k);
            distractors.push(cand);
            if (distractors.length === 3) break;
        }
        if (distractors.length < 3) continue;
        items.push({ type: 'l4', letters: correct, distractors });
    }
    return items;
}

// ============ MAIN ============

function showLangJoining(lang) {
    const meta = JOINING_LANG_META[lang];
    const skillId = meta.skillId;
    const table = meta.table();
    const level = Math.min(4, Math.max(1, getContentLevel(skillId) || 1));
    const total = Math.max(3, getQuestionCount(skillId));

    let items = [];
    if (level === 1) items = joiningBuildL1Items(lang, table, total);
    else if (level === 2) items = joiningBuildL2Items(lang, table, total);
    else if (level === 3) items = joiningBuildL3Items(lang, table, total);
    else items = joiningBuildL4Items(lang, table, total);

    let current = 0, score = 0, attempt = 1;
    let qStartMs = null;

    function cardOpen(titleExtra) {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl;color:' + meta.color + '">' + meta.title + (titleExtra || '') + '</div>';
        return html;
    }

    // ---------- Teaching card ----------
    function renderTeach() {
        startItemTimer();
        let html;
        if (level === 1) html = renderTeachL1();
        else if (level === 2) html = renderTeachL2();
        else if (level === 3) html = renderTeachL3();
        else html = renderTeachL4();
        document.getElementById('app').innerHTML = html;
        wireTeachAudio();
    }

    function renderTeachL1() {
        const letterObj = (table.find(l => l.joins) || table[0]);
        window._joiningTeachLetters = [letterObj];
        const audible = canHearLetter(lang, letterObj.letter);
        let html = cardOpen(' — Level 1: Shapes');
        html += '<div style="text-align:center;color:#666;font-size:15px;margin-bottom:8px">One letter, four shapes</div>';
        html += '<div id="joiningTeachMain" style="text-align:center;font-size:90px;margin:10px;font-family:serif;direction:rtl;' + (audible ? 'cursor:pointer' : '') + '">' + letterObj.letter + '</div>';
        html += '<div style="text-align:center;color:#333;font-size:20px;margin-bottom:8px">' + letterObj.name + '</div>';
        if (audible) html += '<button id="joiningTeachListen" class="btn green" style="font-size:18px;padding:12px 24px;margin:8px auto;display:block">🔊 Listen</button>';
        html += '<div style="display:flex;justify-content:center;gap:14px;margin:16px 0;flex-wrap:wrap;direction:rtl">';
        [{ f: 'alone', label: 'Alone' }, { f: 'initial', label: 'Beginning' }, { f: 'medial', label: 'Middle' }, { f: 'final', label: 'End' }].forEach(f => {
            html += '<div style="text-align:center;padding:12px 14px;background:#333;border-radius:10px"><div style="font-size:44px;font-family:serif;color:white">' + joiningShapeOf(letterObj, f.f) + '</div><div style="color:' + meta.color + ';font-size:13px;margin-top:5px">' + f.label + '</div></div>';
        });
        html += '</div>';
        html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin-top:10px" onclick="joiningStartPractice()">Start Practice →</button>';
        html += '</div>';
        return html;
    }

    function joiningPickTeachLetters(n) {
        const picks = [];
        for (let i = 0; i < n; i++) picks.push(table[Math.floor(Math.random() * table.length)]);
        return picks;
    }

    function renderTeachL2() {
        const letters = joiningPickTeachLetters(2);
        window._joiningTeachLetters = letters;
        let html = cardOpen(' — Level 2: Join Two');
        html += '<div style="text-align:center;color:#666;font-size:15px;margin-bottom:8px">Apart</div>';
        html += '<div style="text-align:center;margin:10px;direction:rtl">' + joiningSeparateHTML(letters, 64) + '</div>';
        html += renderTeachAudioRow(letters);
        html += '<div style="text-align:center;color:#666;font-size:15px;margin:14px 0 8px">Joined</div>';
        html += '<div id="joiningTeachMain" style="text-align:center;font-size:72px;margin:10px;font-family:serif;direction:rtl;' + (joiningAnySoundable(lang, letters) ? 'cursor:pointer' : '') + '">' + joiningJoinedHTML(letters) + '</div>';
        html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin-top:14px" onclick="joiningStartPractice()">Start Practice →</button>';
        html += '</div>';
        return html;
    }

    function renderTeachL3() {
        const letters = joiningPickTeachLetters(3);
        window._joiningTeachLetters = letters;
        let html = cardOpen(' — Level 3: Join Three');
        html += '<div style="text-align:center;color:#666;font-size:15px;margin-bottom:8px">Apart</div>';
        html += '<div style="text-align:center;margin:10px;direction:rtl">' + joiningSeparateHTML(letters, 56) + '</div>';
        html += renderTeachAudioRow(letters);
        html += '<div style="text-align:center;color:#666;font-size:15px;margin:14px 0 8px">Joined</div>';
        html += '<div id="joiningTeachMain" style="text-align:center;font-size:64px;margin:10px;font-family:serif;direction:rtl;' + (joiningAnySoundable(lang, letters) ? 'cursor:pointer' : '') + '">' + joiningJoinedHTML(letters) + '</div>';
        html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin-top:14px" onclick="joiningStartPractice()">Start Practice →</button>';
        html += '</div>';
        return html;
    }

    function renderTeachL4() {
        const letters = joiningPickTeachLetters(3);
        window._joiningTeachLetters = letters;
        let html = cardOpen(' — Level 4: Break Apart');
        html += '<div style="text-align:center;color:#666;font-size:15px;margin-bottom:8px">Joined</div>';
        html += '<div id="joiningTeachMain" style="text-align:center;font-size:64px;margin:10px;font-family:serif;direction:rtl;' + (joiningAnySoundable(lang, letters) ? 'cursor:pointer' : '') + '">' + joiningJoinedHTML(letters) + '</div>';
        html += renderTeachAudioRow(letters);
        html += '<div style="text-align:center;color:#666;font-size:15px;margin:14px 0 8px">Separate letters</div>';
        html += '<div style="text-align:center;margin:10px;direction:rtl">' + joiningSeparateHTML(letters, 56) + '</div>';
        html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin-top:14px" onclick="joiningStartPractice()">Start Practice →</button>';
        html += '</div>';
        return html;
    }

    function renderTeachAudioRow(letters) {
        const audibleLetters = letters.filter(l => canHearLetter(lang, l.letter));
        if (!audibleLetters.length) return '';
        let html = '<div style="display:flex;justify-content:center;gap:10px;margin:8px 0">';
        audibleLetters.forEach(l => {
            html += '<button class="btn green" style="font-size:15px;padding:8px 14px;width:auto" onclick="playLetterSound(\'' + lang + '\',\'' + l.letter + '\')">🔊 ' + l.name + '</button>';
        });
        html += '</div>';
        return html;
    }

    function wireTeachAudio() {
        const main = document.getElementById('joiningTeachMain');
        const listenBtn = document.getElementById('joiningTeachListen');
        const letters = window._joiningTeachLetters || [];
        const play = () => joiningPlaySequence(lang, letters);
        if (main && joiningAnySoundable(lang, letters)) main.onclick = play;
        if (listenBtn) listenBtn.onclick = play;
        // Teaching cards auto-play, matching every other letter screen in the app.
        // Question prompts deliberately do NOT (see wireQuestionAudio) — for L1
        // especially, auto-playing the name would hand the child the answer before
        // they've looked at the shape.
        if (joiningAnySoundable(lang, letters)) play();
    }

    window.joiningStartPractice = () => {
        recordPassiveResponse(skillId, { type: 'joining_teach', lang, level, letters: (window._joiningTeachLetters || []).map(l => l.letter) }, 0, level);
        current = 0; score = 0; attempt = 1;
        renderQuestion();
    };

    // ---------- Questions ----------
    function renderQuestion() {
        if (current >= items.length) { finish(); return; }
        startItemTimer();
        qStartMs = Date.now();
        const item = items[current];
        let html;
        if (item.type === 'l1') html = renderQuestionL1(item);
        else if (item.type === 'l4') html = renderQuestionL4(item);
        else html = renderQuestionL2L3(item);
        document.getElementById('app').innerHTML = html;
        wireQuestionAudio(item);
    }

    function progressFooter() {
        return '<div class="score">⭐ ' + score + ' / ' + items.length + ' — Question ' + (current + 1) + ' of ' + items.length + '</div>';
    }

    function renderQuestionL1(item) {
        // Options are glyphs (the alone/isolated form), never the English name —
        // the child is pre-literate in the transliteration, and the point is shape
        // recognition, not reading "bay" vs "pay" as Latin text.
        const shape = joiningShapeOf(item.letter, item.field);
        const options = joiningShuffle([item.letter, ...item.distractors]);
        let html = cardOpen(' — Level 1');
        html += '<div style="text-align:center;color:#666;font-size:15px;margin-bottom:6px">Which letter is this?</div>';
        html += '<div id="joiningQPrompt" style="text-align:center;font-size:90px;margin:10px;font-family:serif;direction:rtl">' + shape + '</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:15px;direction:rtl">';
        options.forEach(o => {
            html += '<div class="joinOpt" style="font-size:48px;font-family:serif;text-align:center;padding:16px;background:#333;border-radius:14px;cursor:pointer;color:white" onclick="joiningPick(\'' + o.letter + '\')">' + o.letter + '</div>';
        });
        html += '</div>' + progressFooter() + '</div>';
        return html;
    }

    function renderQuestionL2L3(item) {
        const options = joiningShuffle([item.letters, ...item.distractors]);
        const size = item.letters.length === 2 ? 60 : 52;
        let html = cardOpen(' — Level ' + level);
        html += '<div style="text-align:center;color:#666;font-size:15px;margin-bottom:6px">Which one is these letters joined together?</div>';
        html += '<div id="joiningQPrompt" style="text-align:center;margin:10px;direction:rtl">' + joiningSeparateHTML(item.letters, size) + '</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:15px;direction:rtl">';
        options.forEach(o => {
            html += '<div class="joinOpt" style="font-size:' + (size - 8) + 'px;text-align:center;padding:16px;background:#333;border-radius:14px;cursor:pointer;color:white;font-family:serif" onclick="joiningPick(\'' + joiningKey(o) + '\')">' + joiningJoinedHTML(o) + '</div>';
        });
        html += '</div>' + progressFooter() + '</div>';
        return html;
    }

    function renderQuestionL4(item) {
        const options = joiningShuffle([item.letters, ...item.distractors]);
        const size = item.letters.length === 2 ? 52 : 44;
        let html = cardOpen(' — Level 4');
        html += '<div style="text-align:center;color:#666;font-size:15px;margin-bottom:6px">Which separate letters make this?</div>';
        html += '<div id="joiningQPrompt" style="text-align:center;font-size:64px;margin:10px;font-family:serif;direction:rtl">' + joiningJoinedHTML(item.letters) + '</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:15px;direction:rtl">';
        options.forEach(o => {
            html += '<div class="joinOpt" style="text-align:center;padding:14px 8px;background:#333;border-radius:14px;cursor:pointer;color:white" onclick="joiningPick(\'' + joiningKey(o) + '\')">' + joiningSeparateHTML(o, size) + '</div>';
        });
        html += '</div>' + progressFooter() + '</div>';
        return html;
    }

    function wireQuestionAudio(item) {
        const prompt = document.getElementById('joiningQPrompt');
        if (!prompt) return;
        if (item.type === 'l1') {
            if (canHearLetter(lang, item.letter.letter)) {
                prompt.style.cursor = 'pointer';
                prompt.onclick = () => playLetterSound(lang, item.letter.letter);
            }
            return;
        }
        const letters = item.letters;
        if (joiningAnySoundable(lang, letters)) {
            prompt.style.cursor = 'pointer';
            prompt.onclick = () => joiningPlaySequence(lang, letters);
        }
    }

    function correctKeyFor(item) {
        return item.type === 'l1' ? item.letter.letter : joiningKey(item.letters);
    }

    window.joiningPick = (choiceKey) => {
        // Disable immediately — a rapid double-tap during the 800/1200ms feedback
        // delay would otherwise fire a second joiningPick against a still-live
        // question while the first click's callback is pending.
        document.querySelectorAll('.joinOpt').forEach(el => { el.onclick = null; el.style.pointerEvents = 'none'; });
        const item = items[current];
        const correctKey = correctKeyFor(item);
        const isCorrect = choiceKey === correctKey;
        const isFirstTry = attempt === 1;
        const responseTimeMs = qStartMs ? Date.now() - qStartMs : null;
        const questionData = {
            type: 'joining_q',
            subtype: item.type,
            lang,
            level,
            letters: item.type === 'l1' ? [item.letter.letter] : item.letters.map(l => l.letter)
        };
        recordResponse(skillId, questionData, correctKey, choiceKey, isCorrect, isFirstTry, attempt, responseTimeMs, current, false, level);

        if (isCorrect) {
            if (isFirstTry) score++;
            currentAnswers.push({ q: 'joining_' + item.type, answer: choiceKey, correct: true });
            showFeedback(true, () => {
                current++;
                attempt = 1;
                renderQuestion();
            });
        } else {
            attempt++;
            const title = document.querySelector('.title');
            const card = document.querySelector('.card');
            if (title) { title.innerHTML = '🤔 Try again!'; title.style.color = '#ef4444'; }
            if (card) card.style.animation = 'shake 0.5s';
            setTimeout(() => { qStartMs = Date.now(); renderQuestion(); }, 1200);
        }
    };

    function finish() {
        completeWorksheet(meta.displayName, score, items.length);
    }

    if (!items.length) {
        // Degenerate case: distractor generation could not fill even one item
        // (would need a near-empty letter table). Report rather than crash.
        document.getElementById('app').innerHTML = cardOpen(' — Level ' + level) +
            '<div style="text-align:center;color:#666;font-size:16px;margin:20px 0">Not enough letters to build this level yet.</div>' +
            '<button class="btn green" onclick="showMenu()">Back to Menu</button></div>';
        return;
    }

    renderTeach();
}

window.showUrduJoining = () => showLangJoining('ur');
window.showArabicJoining = () => showLangJoining('ar');
