// ============ MULTIPLICATION (meaning first, then the tables) ============
// Ten levels, read from getContentLevel('multiplication'):
//   L1  equal groups, pictures only ("3 plates, 2 apples on each"), totals up to 10
//   L2 x2   L3 x10   L4 x5   L5 x3   L6 x4   L7 x6   L8 x7   L9 x8   L10 x9
// Each table runs 1..10. "a x b" is read "a groups of b", so a table level asks
// "n x T": n groups of T.
//
// Only ever "a x b = ?" - never a missing factor ("3 x ? = 6"): the owner removed
// that form from addition as too hard for this age.
//
// L1 = teach card, practice, then a 5-question "Now show me" check round (one try, no hints).
// L2-10 = one table only: parent-judged test first (from the second day), then recite
// (hear it, call and response, chart). No multiple choice, no review mix on table levels.
//
// No while/do loops anywhere in this file. Every pool is a fixed-size array that is
// shuffled and walked once, and every distractor list has more fallbacks than it needs,
// so generation always terminates. js/assessment.js reuses multBuildItems() for the
// daily test.

const MULT_TABLE_BY_LEVEL = [null, null, 2, 10, 5, 3, 4, 6, 7, 8, 9]; // index = level; L1 has no table
const MULT_MAX_LEVEL = 10;
const MULT_PICTURE_MAX = 20;   // draw the groups whenever the product is this small or smaller

const MULT_FOODS = ['🍎', '🍓', '🍊', '🍪', '🍌', '⭐'];
const MULT_CONTAINERS = [
    { emoji: '🍽️', word: 'plates' },
    { emoji: '🧺', word: 'baskets' },
    { emoji: '🥣', word: 'bowls' }
];

function multShuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

function multPickOne(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function multClampLevel(level) {
    const n = Math.floor(Number(level)) || 1;
    return Math.min(MULT_MAX_LEVEL, Math.max(1, n));
}

// Four distinct positive options: the product plus three distractors.
// Preferred distractors are the neighbouring multiples (p +/- b), the sum a+b (the
// classic mix-up of adding instead of multiplying) and p +/- 1. If those leave fewer
// than three after filtering, a fixed list of fallbacks fills the gap. The fallback
// list alone holds six positive values distinct from p, so this cannot come up short.
function multDistractors(a, b, p) {
    const preferred = multShuffle([p + b, p - b, a + b, p + 1, p - 1]);
    const fallback = [p + 2, p - 2, p + 3, p - 3, p + 4, p + 5, p + 6, p + 7];
    const out = [];
    const seen = new Set([p]);
    const all = preferred.concat(fallback);
    for (let i = 0; i < all.length && out.length < 3; i++) {
        const v = all[i];
        if (v <= 0 || seen.has(v)) continue;
        seen.add(v);
        out.push(v);
    }
    return out;
}

// Walks a shuffled copy of 1..10 for one table; wraps round if asked for more than 10.
function multNumberStream() {
    let pool = multShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    let idx = 0;
    return () => {
        if (idx >= pool.length) { pool = multShuffle(pool); idx = 0; }
        return pool[idx++];
    };
}

function multMakeItem(level, kind, a, b, tableLevel, review) {
    const p = a * b;
    const options = multShuffle([p, ...multDistractors(a, b, p)]);
    return {
        kind, level, tableLevel, a, b, product: p, options, review: !!review,
        food: multPickOne(MULT_FOODS),
        container: multPickOne(MULT_CONTAINERS)
    };
}

// opts.review (default true): mix roughly one question in four from earlier tables.
// The daily test passes review:false so a level's check is about that level alone.
function multBuildItems(level, count, opts) {
    level = multClampLevel(level);
    const review = !(opts && opts.review === false);
    const n = Math.max(1, Math.floor(count) || 1);
    const items = [];

    if (level === 1) {
        // a plates, b on each, total <= 10; 8 pairs, cycled if more are asked for.
        const pairs = [];
        for (let a = 2; a <= 5; a++) for (let b = 2; b <= 5; b++) if (a * b <= 10) pairs.push([a, b]);
        let pool = multShuffle(pairs);
        for (let i = 0; i < n; i++) {
            if (i > 0 && i % pool.length === 0) pool = multShuffle(pairs);
            const pr = pool[i % pool.length];
            items.push(multMakeItem(1, 'groups', pr[0], pr[1], null, false));
        }
        return items;
    }

    const earlier = [];
    for (let l = 2; l < level; l++) earlier.push(l);
    const streams = {};
    const nextFor = (lv) => { if (!streams[lv]) streams[lv] = multNumberStream(); return streams[lv](); };
    const earlierOrder = multShuffle(earlier);
    let earlierIdx = 0;

    for (let i = 0; i < n; i++) {
        let lv = level, isReview = false;
        if (review && earlier.length && i % 4 === 3) {
            lv = earlierOrder[earlierIdx % earlierOrder.length];
            earlierIdx++;
            isReview = true;
        }
        items.push(multMakeItem(level, 'table', nextFor(lv), MULT_TABLE_BY_LEVEL[lv], lv, isReview));
    }
    return multShuffle(items);
}

// ============ PICTURES ============

// a boxes, each holding b emoji. Larger totals get smaller emoji.
function multGroupsHTML(a, b, emoji, containerEmoji) {
    const size = a * b <= 10 ? 32 : 24;
    let html = '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:12px 6px">';
    for (let g = 0; g < a; g++) {
        html += '<div style="display:flex;flex-direction:column;align-items:center;padding:6px 10px;border:3px dashed #FF6B35;border-radius:14px;background:rgba(255,255,255,0.08);max-width:190px">';
        if (containerEmoji) html += '<div style="font-size:' + (size - 6) + 'px;line-height:1">' + containerEmoji + '</div>';
        html += '<div style="font-size:' + size + 'px;line-height:1.25;text-align:center">';
        for (let k = 0; k < b; k++) html += emoji;
        html += '</div></div>';
    }
    html += '</div>';
    return html;
}

// "2, 4, 6" - the first `steps` multiples of b.
function multSkipCountText(b, steps) {
    const nums = [];
    for (let i = 1; i <= steps; i++) nums.push(b * i);
    return nums.join(', ');
}

function multSkipChips(b, steps, highlightLast) {
    let html = '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:10px 4px">';
    for (let i = 1; i <= steps; i++) {
        const last = highlightLast && i === steps;
        html += '<span style="min-width:44px;padding:8px 12px;border-radius:12px;font-size:26px;text-align:center;color:white;background:' + (last ? '#FF6B35' : '#444') + '">' + (b * i) + '</span>';
    }
    html += '</div>';
    return html;
}

// ============ SPEECH / SMALL HELPERS ============

const MULT_NUMBER_WORDS = ['', 'ones', 'twos', 'threes', 'fours', 'fives', 'sixes', 'sevens', 'eights', 'nines', 'tens'];
const MULT_NUMBER_SINGULAR = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

// "3 twos are 6" (and "1 two is 2"). `answer` false gives the call half: "3 twos are".
function multSpokenLine(n, table, answer) {
    const word = n === 1 ? MULT_NUMBER_SINGULAR[table] : MULT_NUMBER_WORDS[table];
    const verb = n === 1 ? 'is' : 'are';
    return n + ' ' + word + ' ' + verb + (answer === false ? '' : ' ' + (n * table));
}

// Speech is a nicety: a missing or failing voice must never block the flow.
function multSay(text) {
    try {
        if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
        if (typeof speak === 'function') {
            const p = speak(text);
            if (p && typeof p.catch === 'function') p.catch(() => {});
        }
    } catch (e) {}
}

function multStopSpeech() {
    try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch (e) {}
}

// Proper Fisher-Yates (multShuffle above is a quick sort-shuffle, fine for distractors).
function multShuffleFair(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
}

// "Has this child recited this table before?" gates the test. Keyed by child and level.
function multRecitedKey(level) {
    return 'mult_recited_' + (CONFIG && CONFIG.childId ? CONFIG.childId : 'anon') + '_' + level;
}
function multHasRecitedBefore(level) {
    try { return localStorage.getItem(multRecitedKey(level)) === '1'; } catch (e) { return false; }
}
function multMarkRecited(level) {
    try { localStorage.setItem(multRecitedKey(level), '1'); } catch (e) {}
}

// ============ MAIN ============

function showMultiplication() {
    const skillId = 'multiplication';
    const level = multClampLevel(getContentLevel(skillId));
    const table = MULT_TABLE_BY_LEVEL[level];
    multStopSpeech();

    const title = level === 1
        ? 'Equal Groups ✖️'
        : 'Times Tables — ×' + table + ' ✖️';

    function cardOpen(extra) {
        return '<button class="back" onclick="multBack()">← Back</button><div class="card">' +
            '<div class="title">' + title + (extra || '') + '</div>';
    }
    function mount(html) {
        multStopSpeech();
        document.getElementById('app').innerHTML = html;
    }

    window.multBack = () => { multStopSpeech(); showMenu(); };

    if (level === 1) showGroupsLevel(); else showTableLevel();

    // =====================================================================
    // LEVEL 1: equal groups. Teach card, practice (retries + hints), then a
    // "Now show me" check round: fresh questions, one try, no hints.
    // =====================================================================
    function showGroupsLevel() {
        const practiceTotal = Math.max(4, getQuestionCount(skillId) || 0);
        const practiceItems = multBuildItems(1, practiceTotal);
        const CHECK_COUNT = 5;

        // Fresh pairs first: anything not already used in practice, then the rest.
        const used = new Set(practiceItems.map(it => it.a + 'x' + it.b));
        const candidates = multBuildItems(1, 8);
        const fresh = candidates.filter(it => !used.has(it.a + 'x' + it.b))
            .concat(candidates.filter(it => used.has(it.a + 'x' + it.b)));
        const checkItems = fresh.slice(0, CHECK_COUNT);

        let items = practiceItems, phase = 'practice';
        let current = 0, score = 0, attempt = 1, hint = false;
        let qStartMs = null;
        let practiceScore = 0, checkScore = 0;

        function renderTeach() {
            startItemTimer();
            const ex = { a: 3, b: 2, food: '🍎', container: MULT_CONTAINERS[0] };
            let html = cardOpen();
            html += '<div style="text-align:center;color:#555;font-size:20px;margin:6px">Equal groups</div>';
            html += '<div style="text-align:center;font-size:24px;color:#333;margin:6px">' + ex.a + ' ' + ex.container.word + ', ' + ex.b + ' ' + ex.food + ' on each</div>';
            html += multGroupsHTML(ex.a, ex.b, ex.food, ex.container.emoji);
            html += '<div style="text-align:center;color:#555;font-size:20px;margin:6px">Count by ' + ex.b + 's</div>';
            html += multSkipChips(ex.b, ex.a, true);
            html += '<div style="text-align:center;font-size:26px;color:#333;margin:8px">' + (ex.a * ex.b) + ' ' + ex.food + ' in all!</div>';
            html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin-top:14px" onclick="multTeachNext()">Start Practice →</button>';
            html += '</div>';
            mount(html);
        }

        window.multTeachNext = () => {
            recordPassiveResponse(skillId, { type: 'multiplication_teach', level, table, screen: 'example' }, 0, level);
            current = 0; score = 0; attempt = 1; hint = false;
            renderQuestion();
        };

        function renderCheckIntro() {
            let html = cardOpen(' — Now show me!');
            html += '<div style="text-align:center;font-size:24px;color:#333;margin:18px 8px">Now show me! ⭐</div>';
            html += '<div style="text-align:center;font-size:18px;color:#555;margin:8px 10px 18px">This round is the check: ' + CHECK_COUNT + ' new questions, one try each, no hints. Let your child do it on their own.</div>';
            html += '<button class="btn green" style="font-size:20px;padding:16px" onclick="multStartCheckRound()">Start 🎯</button>';
            html += '</div>';
            mount(html);
        }

        window.multStartCheckRound = () => {
            items = checkItems; phase = 'check';
            current = 0; score = 0; attempt = 1; hint = false;
            renderQuestion();
        };

        function renderQuestion() {
            if (current >= items.length) {
                if (phase === 'practice') {
                    practiceScore = score;
                    renderCheckIntro();
                } else {
                    checkScore = score;
                    multStopSpeech();
                    completeWorksheet('Multiplication', practiceScore + checkScore, practiceItems.length + checkItems.length);
                }
                return;
            }
            startItemTimer();
            qStartMs = Date.now();
            const it = items[current];
            let html = cardOpen(phase === 'check' ? ' — Now show me!' : ' — Level ' + level);
            html += '<div style="text-align:center;font-size:24px;color:#333;margin:8px">' + it.a + ' ' + it.container.word + ', ' + it.b + ' ' + it.food + ' on each.<br>How many ' + it.food + ' in all?</div>';
            html += multGroupsHTML(it.a, it.b, it.food, it.container.emoji);
            if (hint && phase === 'practice') {
                html += '<div style="text-align:center;color:#555;font-size:18px;margin-top:8px">Count by ' + it.b + 's</div>';
                html += multSkipChips(it.b, it.a, false);
            }
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:15px">';
            it.options.forEach(o => {
                html += '<div class="multOpt" style="font-size:44px;text-align:center;padding:18px;background:#333;border-radius:14px;cursor:pointer;color:white" onclick="multPick(' + o + ')">' + o + '</div>';
            });
            html += '</div>';
            html += '<div class="score">⭐ ' + score + ' / ' + items.length + ' — Question ' + (current + 1) + ' of ' + items.length + '</div></div>';
            mount(html);
        }

        window.multPick = (choice) => {
            // Disable at once: a double-tap during the feedback delay must not record twice.
            document.querySelectorAll('.multOpt').forEach(el => { el.onclick = null; el.style.pointerEvents = 'none'; });
            const it = items[current];
            const isCorrect = Number(choice) === it.product;
            const isFirstTry = attempt === 1;
            const responseTimeMs = qStartMs ? Date.now() - qStartMs : null;
            const questionData = {
                type: 'multiplication_q',
                subtype: it.kind,
                level,
                a: it.a,
                b: it.b,
                product: it.product,
                table: null,
                review: false
            };
            if (phase === 'check') questionData.purpose = 'check';
            recordResponse(skillId, questionData, String(it.product), String(choice), isCorrect, isFirstTry, attempt, responseTimeMs, current, false, level);

            if (phase === 'check') {
                // One try, no hints: right or wrong, show the answer and move on.
                if (isCorrect) score++;
                currentAnswers.push({ q: it.a + 'x' + it.b, answer: choice, correct: isCorrect });
                if (isCorrect) {
                    showFeedback(true, () => { current++; renderQuestion(); });
                } else {
                    const t = document.querySelector('.title');
                    if (t) { t.innerHTML = 'The answer is ' + it.product; t.style.color = '#f59e0b'; }
                    setTimeout(() => { current++; renderQuestion(); }, 1400);
                }
                return;
            }

            if (isCorrect) {
                if (isFirstTry) score++;
                currentAnswers.push({ q: it.a + 'x' + it.b, answer: choice, correct: true });
                showFeedback(true, () => {
                    current++;
                    attempt = 1;
                    hint = false;
                    renderQuestion();
                });
            } else {
                attempt++;
                hint = true; // show the skip-count line, then let them retry
                const t = document.querySelector('.title');
                const card = document.querySelector('.card');
                if (t) { t.innerHTML = '🤔 Try again!'; t.style.color = '#ef4444'; }
                if (card) card.style.animation = 'shake 0.5s';
                setTimeout(() => renderQuestion(), 1200);
            }
        };

        renderTeach();
    }

    // =====================================================================
    // LEVELS 2-10: one table. Test first (from the second day), then recite.
    // =====================================================================
    function showTableLevel() {
        const food = multPickOne(MULT_FOODS);
        let testOrder = [], testIdx = 0, testScore = 0, testTotal = 0, qStartMs = null;
        let reciteN = 1, line = '';
        let ranTest = false;

        function renderTestIntro() {
            let html = cardOpen(' — Test time! 🎤');
            html += '<div style="text-align:center;font-size:18px;color:#333;margin:10px 8px 6px">Ten quick questions on the <b>×' + table + '</b> table, in a mixed-up order.</div>';
            html += '<div style="text-align:center;font-size:16px;color:#555;margin:6px 10px 16px">👨‍👩‍👧 For the grown-up: your child says each answer out loud, from memory, with no pictures and no counting on fingers. You tap whether they knew it.</div>';
            html += '<button class="btn green" style="font-size:20px;padding:16px" onclick="multStartTest()">Start the test 🎤</button>';
            html += '<button class="btn" style="margin-top:8px" onclick="multSkipTest()">Skip test today →</button>';
            html += '</div>';
            mount(html);
        }

        window.multSkipTest = () => {
            ranTest = false; testScore = 0; testTotal = 0;
            startRecite();
        };

        window.multStartTest = () => {
            let order = multShuffleFair([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            // Astronomically unlikely, but never hand over the table in plain order.
            if (order.every((v, i) => v === i + 1)) { const t = order[0]; order[0] = order[1]; order[1] = t; }
            testOrder = order; testIdx = 0; testScore = 0; testTotal = order.length; ranTest = true;
            renderTestQuestion();
        };

        function renderTestQuestion() {
            startItemTimer();
            qStartMs = Date.now();
            const n = testOrder[testIdx];
            let html = cardOpen(' — Say it! 🎤');
            html += '<div class="score" style="margin-bottom:10px">Question ' + (testIdx + 1) + ' of ' + testTotal + '</div>';
            html += '<div id="multTestQ" style="text-align:center;font-size:72px;margin:24px 10px;color:#333">' + n + ' <span style="color:#FF6B35">×</span> ' + table + ' <span style="color:#FF6B35">=</span> <span id="multTestAns" style="color:#FF6B35">?</span></div>';
            html += '<div style="text-align:center;color:#888;font-size:14px;margin-bottom:12px">👨‍👩‍👧 For the grown-up — no picture, no audio. Wait for the answer, then tap.</div>';
            html += '<div style="display:flex;gap:12px">';
            html += '<button class="btn green multJudge" style="font-size:19px;flex:1" onclick="multJudge(true)">✓ Said it without counting</button>';
            html += '<button class="btn multJudge" style="font-size:19px;flex:1;background:#f59e0b;color:white" onclick="multJudge(false)">Not yet</button>';
            html += '</div></div>';
            mount(html);
        }

        window.multJudge = (isCorrect) => {
            document.querySelectorAll('.multJudge').forEach(el => { el.onclick = null; el.style.pointerEvents = 'none'; });
            const n = testOrder[testIdx];
            const product = n * table;
            const responseTimeMs = qStartMs ? Date.now() - qStartMs : null;
            const questionData = {
                type: 'multiplication_check',
                purpose: 'check',
                judge: 'parent',
                level,
                a: n,
                b: table,
                product,
                table
            };
            recordResponse(skillId, questionData, String(product), isCorrect ? String(product) : 'not_yet', isCorrect, true, 1, responseTimeMs, testIdx, false, level);
            if (isCorrect) testScore++;
            currentAnswers.push({ q: n + 'x' + table, answer: isCorrect ? product : 'not_yet', correct: isCorrect });
            // Show the answer briefly, then on to the next.
            const ans = document.getElementById('multTestAns');
            if (ans) ans.textContent = product;
            setTimeout(() => {
                // Back was tapped during the reveal: don't pull the child back into the test.
                if (!document.getElementById('multTestAns')) return;
                testIdx++;
                if (testIdx >= testOrder.length) startRecite();
                else renderTestQuestion();
            }, 1300);
        };

        // ---------- Recite: pass 1 (hear it), pass 2 (call and response), chart ----------
        function startRecite() {
            multMarkRecited(level);
            reciteN = 1;
            startItemTimer();
            renderReciteLine();
        }

        function renderReciteLine() {
            const n = reciteN;
            const p = n * table;
            line = multSpokenLine(n, table, true);
            let html = cardOpen(' — Listen & say 🎧');
            html += '<div class="score" style="margin-bottom:6px">Say it together — ' + n + ' of 10</div>';
            html += '<div onclick="multReplay()" style="cursor:pointer">';
            if (p <= MULT_PICTURE_MAX) html += multGroupsHTML(n, table, food, null);
            html += '<div style="text-align:center;font-size:56px;margin:12px;color:#333">' + n + ' × ' + table + ' = <span style="color:#FF6B35">' + p + '</span></div>';
            html += '<div style="text-align:center;font-size:30px;color:#555;margin-bottom:6px">' + line + '</div>';
            html += '<div style="text-align:center;color:#999;font-size:13px">tap to hear it again 🔊</div>';
            html += '</div>';
            html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin-top:14px" onclick="multReciteNext()">' + (n < 10 ? 'Next →' : 'Now you say it →') + '</button>';
            html += '</div>';
            mount(html);
            multSay(line);
        }

        window.multReplay = () => { multSay(line); };

        window.multReciteNext = () => {
            if (reciteN < 10) { reciteN++; renderReciteLine(); return; }
            recordPassiveResponse(skillId, { type: 'multiplication_recite', pass: 1, level, table }, 0, level);
            startItemTimer();
            reciteN = 1;
            renderCall();
        };

        function renderCall() {
            const n = reciteN;
            const call = multSpokenLine(n, table, false);
            line = call;
            let html = cardOpen(' — Your turn! 🗣️');
            html += '<div class="score" style="margin-bottom:6px">' + n + ' of 10</div>';
            html += '<div onclick="multReplay()" style="cursor:pointer">';
            html += '<div style="text-align:center;font-size:56px;margin:20px 12px 8px;color:#333">' + n + ' × ' + table + ' = <span id="multCallAns" style="color:#FF6B35">?</span></div>';
            html += '<div style="text-align:center;font-size:30px;color:#555;margin-bottom:6px">' + call + '<span id="multCallDots">…</span></div>';
            html += '<div style="text-align:center;color:#999;font-size:13px">tap to hear it again 🔊</div>';
            html += '</div>';
            html += '<div id="multCallBtns"><button class="btn" style="font-size:20px;padding:14px 28px;margin-top:14px;background:#f59e0b;color:white" onclick="multShowAnswer()">Show</button></div>';
            html += '</div>';
            mount(html);
            multSay(call);
        }

        window.multShowAnswer = () => {
            const n = reciteN;
            const full = multSpokenLine(n, table, true);
            line = full;
            const ans = document.getElementById('multCallAns');
            if (ans) ans.textContent = n * table;
            const dots = document.getElementById('multCallDots');
            if (dots) dots.textContent = ' ' + (n * table);
            const btns = document.getElementById('multCallBtns');
            if (btns) btns.innerHTML = '<button class="btn green" style="font-size:20px;padding:14px 28px;margin-top:14px" onclick="multCallNext()">' + (n < 10 ? 'Next →' : 'See the whole table →') + '</button>';
            multSay(full);
        };

        window.multCallNext = () => {
            if (reciteN < 10) { reciteN++; renderCall(); return; }
            recordPassiveResponse(skillId, { type: 'multiplication_recite', pass: 2, level, table }, 1, level);
            renderChart();
        };

        function renderChart() {
            let html = cardOpen(' — The ×' + table + ' table');
            html += '<div style="max-width:340px;margin:14px auto;padding:12px 18px;background:#fffdf5;border:4px solid #FF6B35;border-radius:16px">';
            for (let n = 1; n <= 10; n++) {
                html += '<div style="font-size:30px;line-height:1.5;color:#333;display:flex;justify-content:space-between;border-bottom:' + (n < 10 ? '1px dashed #ddd' : 'none') + '">' +
                    '<span>' + n + ' × ' + table + ' =</span><b style="color:#FF6B35">' + (n * table) + '</b></div>';
            }
            html += '</div>';
            html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin-top:10px" onclick="multFinishTable()">All done ✓</button>';
            html += '</div>';
            mount(html);
        }

        window.multFinishTable = () => {
            multStopSpeech();
            if (ranTest) completeWorksheet('Multiplication', testScore, testTotal);
            else completeWorksheet('Multiplication', 0, 0);
        };

        if (multHasRecitedBefore(level)) renderTestIntro();
        else startRecite();
    }
}

window.showMultiplication = showMultiplication;
