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

// ============ MAIN ============

function showMultiplication() {
    const skillId = 'multiplication';
    const level = multClampLevel(getContentLevel(skillId));
    const table = MULT_TABLE_BY_LEVEL[level];
    const total = Math.max(4, getQuestionCount(skillId) || 0);
    const items = multBuildItems(level, total);

    let current = 0, score = 0, attempt = 1, hint = false;
    let qStartMs = null;
    let teachStep = 0;

    const title = level === 1
        ? 'Equal Groups ✖️'
        : 'Times Tables — ×' + table + ' ✖️';

    function cardOpen(extra) {
        return '<button class="back" onclick="showMenu()">← Back</button><div class="card">' +
            '<div class="title">' + title + (extra || '') + '</div>';
    }

    // ---------- Teach ----------
    // L1: one screen (a worked picture). Table levels: two screens (skip-count line,
    // then the first few facts drawn as groups).
    const teachScreens = level === 1 ? ['example'] : ['skip', 'groups'];

    function renderTeach() {
        startItemTimer();
        const screen = teachScreens[teachStep];
        const last = teachStep === teachScreens.length - 1;
        let html = cardOpen();
        if (screen === 'example') {
            const ex = { a: 3, b: 2, food: '🍎', container: MULT_CONTAINERS[0] };
            html += '<div style="text-align:center;color:#555;font-size:20px;margin:6px">Equal groups</div>';
            html += '<div style="text-align:center;font-size:24px;color:#333;margin:6px">' + ex.a + ' ' + ex.container.word + ', ' + ex.b + ' ' + ex.food + ' on each</div>';
            html += multGroupsHTML(ex.a, ex.b, ex.food, ex.container.emoji);
            html += '<div style="text-align:center;color:#555;font-size:20px;margin:6px">Count by ' + ex.b + 's</div>';
            html += multSkipChips(ex.b, ex.a, true);
            html += '<div style="text-align:center;font-size:26px;color:#333;margin:8px">' + (ex.a * ex.b) + ' ' + ex.food + ' in all!</div>';
        } else if (screen === 'skip') {
            html += '<div style="text-align:center;color:#555;font-size:22px;margin:8px">Let\'s count by ' + table + 's</div>';
            html += multSkipChips(table, 10, false);
            html += '<div style="text-align:center;color:#555;font-size:16px;margin:8px">Count along out loud, one jump at a time.</div>';
        } else {
            const food = multPickOne(MULT_FOODS);
            html += '<div style="text-align:center;color:#555;font-size:20px;margin:6px">Groups of ' + table + '</div>';
            let rows = 0;
            for (let n = 1; n <= 10 && rows < 4; n++) {
                if (n * table > MULT_PICTURE_MAX) break;
                rows++;
                html += '<div style="text-align:center;font-size:30px;color:#333;margin-top:10px">' + n + ' × ' + table + ' = <span style="color:#FF6B35">' + (n * table) + '</span></div>';
                html += '<div style="text-align:center;color:#666;font-size:15px">' + n + (n === 1 ? ' group' : ' groups') + ' of ' + table + '</div>';
                html += multGroupsHTML(n, table, food, null);
            }
        }
        html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin-top:14px" onclick="multTeachNext()">' + (last ? 'Start Practice →' : 'Next →') + '</button>';
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    window.multTeachNext = () => {
        recordPassiveResponse(skillId, { type: 'multiplication_teach', level, table, screen: teachScreens[teachStep] }, teachStep, level);
        if (teachStep < teachScreens.length - 1) {
            teachStep++;
            renderTeach();
            return;
        }
        current = 0; score = 0; attempt = 1; hint = false;
        renderQuestion();
    };

    // ---------- Questions ----------
    function renderQuestion() {
        if (current >= items.length) { finish(); return; }
        startItemTimer();
        qStartMs = Date.now();
        const it = items[current];
        const showPicture = it.product <= MULT_PICTURE_MAX;
        let html = cardOpen(' — Level ' + level);

        if (it.kind === 'groups') {
            html += '<div style="text-align:center;font-size:24px;color:#333;margin:8px">' + it.a + ' ' + it.container.word + ', ' + it.b + ' ' + it.food + ' on each.<br>How many ' + it.food + ' in all?</div>';
        } else {
            html += '<div style="text-align:center;font-size:56px;margin:10px;color:#333">' + it.a + ' <span style="color:#FF6B35">×</span> ' + it.b + ' <span style="color:#FF6B35">=</span> <span style="color:#FF6B35">?</span></div>';
            html += '<div style="text-align:center;color:#555;font-size:18px">' + it.a + (it.a === 1 ? ' group' : ' groups') + ' of ' + it.b + '</div>';
        }
        if (showPicture) html += multGroupsHTML(it.a, it.b, it.food, it.kind === 'groups' ? it.container.emoji : null);
        if (hint) {
            html += '<div style="text-align:center;color:#555;font-size:18px;margin-top:8px">Count by ' + it.b + 's</div>';
            html += multSkipChips(it.b, it.a, false);
        }

        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:15px">';
        it.options.forEach(o => {
            html += '<div class="multOpt" style="font-size:44px;text-align:center;padding:18px;background:#333;border-radius:14px;cursor:pointer;color:white" onclick="multPick(' + o + ')">' + o + '</div>';
        });
        html += '</div>';
        html += '<div class="score">⭐ ' + score + ' / ' + items.length + ' — Question ' + (current + 1) + ' of ' + items.length + '</div></div>';
        document.getElementById('app').innerHTML = html;
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
            table: it.tableLevel ? MULT_TABLE_BY_LEVEL[it.tableLevel] : null,
            review: it.review
        };
        recordResponse(skillId, questionData, String(it.product), String(choice), isCorrect, isFirstTry, attempt, responseTimeMs, current, false, level);

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
            hint = true; // show the groups and the skip-count line, then let them retry
            const t = document.querySelector('.title');
            const card = document.querySelector('.card');
            if (t) { t.innerHTML = '🤔 Try again!'; t.style.color = '#ef4444'; }
            if (card) card.style.animation = 'shake 0.5s';
            setTimeout(() => renderQuestion(), 1200);
        }
    };

    function finish() {
        completeWorksheet('Multiplication', score, items.length);
    }

    renderTeach();
}

window.showMultiplication = showMultiplication;
