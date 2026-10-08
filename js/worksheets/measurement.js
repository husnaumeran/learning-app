// ============ MEASUREMENT BASICS (before units) ============
// Skill id: measurement. A topic picker, then per topic: a passive teach card and
// 6 questions. Five topics: length, counting blocks (non-standard units), weight,
// capacity, time of day / order. Everything is drawn with CSS and emoji.
//
// Question objects are produced by pure generators (measGen*) so they can be tested
// in bulk. Every option has { id, label }; q.correct is one option id. No while/do loops.

const MEAS_SKILL = 'measurement';
const MEAS_PER_TOPIC = 6;

const MEAS_TOPICS = {
    length:   { icon: '📏', name: 'Long & Short',     color: '#1d4ed8' },
    units:    { icon: '🧱', name: 'Count the Blocks', color: '#c2410c' },
    weight:   { icon: '⚖️', name: 'Heavy & Light',    color: '#6d28d9' },
    capacity: { icon: '🥤', name: 'Full & Empty',     color: '#0e7490' },
    time:     { icon: '🌅', name: 'Morning & Order',  color: '#15803d' }
};
const MEAS_TOPIC_ORDER = ['length', 'units', 'weight', 'capacity', 'time'];

const MEAS_COLORS = [
    { id: 'red',    name: 'red',    hex: '#dc2626' },
    { id: 'blue',   name: 'blue',   hex: '#2563eb' },
    { id: 'green',  name: 'green',  hex: '#16a34a' },
    { id: 'purple', name: 'purple', hex: '#7c3aed' },
    { id: 'orange', name: 'orange', hex: '#ea580c' }
];
const MEAS_LEN_MAX = 12;          // bar/tower lengths are 2..12 units out of 12
const MEAS_LEN_MIN_GAP = 3;       // every pair differs by >= 3 units (>= 25% of the full scale)
const MEAS_CAP_LEVELS = [0, 25, 50, 75, 100]; // distinct levels => every pair differs by >= 25 points

const MEAS_LEN_THEMES = [
    { e: '✏️', one: 'pencil' }, { e: '🐍', one: 'snake' }, { e: '🎀', one: 'ribbon' }, { e: '🚃', one: 'train' }
];
const MEAS_UNIT_OBJECTS = [
    { e: '✏️', one: 'pencil', color: '#eab308' }, { e: '🐍', one: 'snake', color: '#16a34a' },
    { e: '🎀', one: 'ribbon', color: '#db2777' }, { e: '🚃', one: 'train', color: '#2563eb' },
    { e: '🖍️', one: 'crayon', color: '#ea580c' }, { e: '🪱', one: 'worm', color: '#a16207' }
];
const MEAS_WEIGHT_PAIRS = [
    { heavy: ['🐘', 'elephant'],   light: ['🐭', 'mouse'] },
    { heavy: ['🍉', 'watermelon'], light: ['🍇', 'grape'] },
    { heavy: ['🚗', 'car'],        light: ['🎈', 'balloon'] },
    { heavy: ['🐻', 'bear'],       light: ['🐦', 'bird'] },
    { heavy: ['🎃', 'pumpkin'],    light: ['🍒', 'cherry'] },
    { heavy: ['🪨', 'rock'],       light: ['🪶', 'feather'] },
    { heavy: ['🚚', 'truck'],      light: ['🐜', 'ant'] },
    { heavy: ['🐋', 'whale'],      light: ['🐟', 'fish'] }
];
const MEAS_MORNING = [['🌅', 'sunrise'], ['🐓', 'rooster'], ['🥞', 'pancakes'], ['🪥', 'brushing teeth']];
const MEAS_NIGHT = [['🌙', 'moon'], ['⭐', 'stars'], ['🛌', 'sleeping'], ['🦉', 'owl'], ['🧸', 'bedtime teddy']];
const MEAS_SEQUENCES = [
    { name: 'day',     steps: [['😴', 'wake up'], ['🥣', 'breakfast'], ['🏫', 'school']] },
    { name: 'plant',   steps: [['🌰', 'seed'], ['🌱', 'plant'], ['🌸', 'flower']] },
    { name: 'chick',   steps: [['🥚', 'egg'], ['🐣', 'chick'], ['🐓', 'hen']] },
    { name: 'evening', steps: [['🍽️', 'dinner'], ['🛁', 'bath'], ['🛌', 'bed']] },
    { name: 'growing', steps: [['👶', 'baby'], ['🧒', 'child'], ['🧑', 'grown-up']] }
];

// ---------- small utilities ----------
function measShuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
}
function measPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function measSlug(s) { return String(s).replace(/[^a-z0-9]+/gi, '_').toLowerCase(); }

// ---------- generators ----------
// Greedy single pass over a shuffled list: returns n lengths pairwise >= MEAS_LEN_MIN_GAP apart.
function measSpacedLengths(n) {
    const pool = [];
    for (let v = 2; v <= MEAS_LEN_MAX; v++) pool.push(v);
    const out = [];
    const shuffled = measShuffle(pool);
    for (let i = 0; i < shuffled.length && out.length < n; i++) {
        if (out.every(x => Math.abs(x - shuffled[i]) >= MEAS_LEN_MIN_GAP)) out.push(shuffled[i]);
    }
    if (out.length < n) return measShuffle([3, 7, 11]).slice(0, n);
    return out;
}

function measGenLength() {
    const kind = measPick(['longer', 'shorter', 'longest', 'shortest', 'tallest', 'shortest_tower']);
    const tower = kind === 'tallest' || kind === 'shortest_tower';
    const n = (kind === 'longer' || kind === 'shorter') ? 2 : 3;
    const lens = measSpacedLengths(n);
    const cols = measShuffle(MEAS_COLORS).slice(0, n);
    const theme = measPick(MEAS_LEN_THEMES);
    const wantMax = kind === 'longer' || kind === 'longest' || kind === 'tallest';
    const options = lens.map((len, i) => ({ id: cols[i].id, label: cols[i].name, len, hex: cols[i].hex }));
    const target = wantMax ? Math.max.apply(null, lens) : Math.min.apply(null, lens);
    const correct = options.filter(o => o.len === target)[0].id;
    const prompts = {
        longer: 'Which one is longer?', shorter: 'Which one is shorter?',
        longest: 'Which one is the longest?', shortest: 'Which one is the shortest?',
        tallest: 'Which tower is the tallest?', shortest_tower: 'Which tower is the shortest?'
    };
    const hints = {
        longer: 'Look at the ends. The longer one goes further.', shorter: 'Look at the ends. The shorter one stops sooner.',
        longest: 'Look at the ends. The longest one goes the furthest.', shortest: 'Look at the ends. The shortest one stops first.',
        tallest: 'The tallest tower reaches the highest.', shortest_tower: 'The shortest tower stops the lowest.'
    };
    const lensById = {}; options.forEach(o => { lensById[o.id] = o.len; });
    return {
        topic: 'length', kind, layout: tower ? 'tower' : 'bar', theme, prompt: prompts[kind], hint: hints[kind],
        options: measShuffle(options), correct,
        data: { kind, lengths: lensById, object: theme.one }
    };
}

function measGenUnits() {
    const n = 1 + Math.floor(Math.random() * 10);
    const obj = measPick(MEAS_UNIT_OBJECTS);
    const near = [n - 2, n - 1, n + 1, n + 2].filter(v => v >= 1 && v <= 10);
    const rest = [];
    for (let v = 1; v <= 10; v++) if (v !== n && near.indexOf(v) < 0) rest.push(v);
    const distractors = measShuffle(near).concat(measShuffle(rest)).slice(0, 3);
    const options = [n].concat(distractors).map(v => ({ id: String(v), label: String(v) }));
    return {
        topic: 'units', kind: 'count', obj, n,
        prompt: 'How many blocks long is the ' + obj.one + '?',
        hint: 'Start at the end and count each block: 1 up to ' + n + '.',
        options: measShuffle(options), correct: String(n),
        data: { kind: 'count', blocks: n, object: obj.one }
    };
}

function measGenWeight() {
    const pair = measPick(MEAS_WEIGHT_PAIRS);
    const kind = measPick(['heavier', 'lighter']);
    const view = Math.random() < 0.5 ? 'names' : 'scale';
    const heavyLeft = Math.random() < 0.5;
    const options = [
        { id: pair.heavy[1], label: pair.heavy[1], emoji: pair.heavy[0], heavy: true },
        { id: pair.light[1], label: pair.light[1], emoji: pair.light[0], heavy: false }
    ];
    const correct = kind === 'heavier' ? pair.heavy[1] : pair.light[1];
    return {
        topic: 'weight', kind, view, heavyLeft, pair,
        prompt: kind === 'heavier' ? 'Which is heavier?' : 'Which is lighter?',
        hint: view === 'scale'
            ? 'Look at the scale. The heavier side goes down, the lighter side goes up.'
            : (kind === 'heavier' ? 'The ' + pair.heavy[1] + ' is much heavier.' : 'The ' + pair.light[1] + ' is much lighter.'),
        options: measShuffle(options), correct,
        data: { kind, view, heavy: pair.heavy[1], light: pair.light[1], heavyLeft }
    };
}

function measGenCapacity() {
    const kind = measPick(['more', 'less', 'full', 'empty']);
    const n = Math.random() < 0.5 ? 2 : 3;
    let levels;
    if (kind === 'full' || kind === 'empty') {
        const must = kind === 'full' ? 100 : 0;
        const others = measShuffle(MEAS_CAP_LEVELS.filter(l => l !== must && l !== (must === 100 ? 0 : 100)));
        // for "full"/"empty" keep the opposite extreme out so a child is not choosing between full and empty ambiguously
        levels = [must].concat(others.slice(0, n - 1));
    } else {
        levels = measShuffle(MEAS_CAP_LEVELS).slice(0, n);
    }
    const cols = measShuffle(MEAS_COLORS).slice(0, n);
    const options = levels.map((pct, i) => ({ id: cols[i].id, label: cols[i].name + ' juice', pct, hex: cols[i].hex }));
    let correct;
    if (kind === 'more') correct = options.filter(o => o.pct === Math.max.apply(null, levels))[0].id;
    else if (kind === 'less') correct = options.filter(o => o.pct === Math.min.apply(null, levels))[0].id;
    else if (kind === 'full') correct = options.filter(o => o.pct === 100)[0].id;
    else correct = options.filter(o => o.pct === 0)[0].id;
    const prompts = { more: 'Which glass has more juice?', less: 'Which glass has less juice?', full: 'Which glass is full?', empty: 'Which glass is empty?' };
    const hints = {
        more: 'The fuller glass has more juice.', less: 'The emptier glass has less juice.',
        full: 'A full glass is filled all the way to the top.', empty: 'An empty glass has no juice in it.'
    };
    const fills = {}; options.forEach(o => { fills[o.id] = o.pct; });
    return {
        topic: 'capacity', kind, prompt: prompts[kind], hint: hints[kind],
        options: measShuffle(options), correct,
        data: { kind, fills }
    };
}

function measGenTime() {
    const r = Math.random();
    if (r < 0.34) {
        // morning / night
        const askMorning = Math.random() < 0.5;
        const nOpts = Math.random() < 0.5 ? 2 : 3;
        const good = measPick(askMorning ? MEAS_MORNING : MEAS_NIGHT);
        const badPool = measShuffle(askMorning ? MEAS_NIGHT : MEAS_MORNING).slice(0, nOpts - 1);
        const mk = (p) => ({ id: measSlug(p[1]), label: p[1], emoji: p[0] });
        const options = [mk(good)].concat(badPool.map(mk));
        return {
            topic: 'time', kind: askMorning ? 'morning' : 'night',
            prompt: askMorning ? 'Which one is morning?' : 'Which one is night?',
            hint: askMorning ? 'Morning is when the sun comes up.' : 'Night is dark, with the moon and stars.',
            options: measShuffle(options), correct: measSlug(good[1]),
            data: { kind: askMorning ? 'morning' : 'night', options: options.map(o => o.id) }
        };
    }
    const si = Math.floor(Math.random() * MEAS_SEQUENCES.length);
    const seq = MEAS_SEQUENCES[si];
    const mkS = (p) => ({ id: measSlug(p[1]), label: p[1], emoji: p[0] });
    if (r < 0.67) {
        // what comes first
        const options = seq.steps.map(mkS);
        return {
            topic: 'time', kind: 'first', seq, shown: [],
            prompt: 'What happens first?',
            hint: 'First ' + seq.steps[0][1] + ', then ' + seq.steps[1][1] + ', then ' + seq.steps[2][1] + '.',
            options: measShuffle(options), correct: measSlug(seq.steps[0][1]),
            data: { kind: 'first', sequence: seq.name, options: options.map(o => o.id) }
        };
    }
    // what comes next: shown 1 or 2 steps, answer is the following step; distractors come from other sequences
    const k = Math.random() < 0.5 ? 1 : 2;
    const others = [];
    MEAS_SEQUENCES.forEach((s, i) => { if (i !== si) s.steps.forEach(p => others.push(p)); });
    const dis = measShuffle(others).slice(0, 2);
    const options = [mkS(seq.steps[k])].concat(dis.map(mkS));
    return {
        topic: 'time', kind: 'next', seq, shown: seq.steps.slice(0, k),
        prompt: 'What comes next?',
        hint: 'First ' + seq.steps[0][1] + ', then ' + seq.steps[1][1] + ', then ' + seq.steps[2][1] + '.',
        options: measShuffle(options), correct: measSlug(seq.steps[k][1]),
        data: { kind: 'next', sequence: seq.name, shown: k, options: options.map(o => o.id) }
    };
}

function measGenerate(topic) {
    if (topic === 'length') return measGenLength();
    if (topic === 'units') return measGenUnits();
    if (topic === 'weight') return measGenWeight();
    if (topic === 'capacity') return measGenCapacity();
    return measGenTime();
}

// Six distinct questions for a topic (bounded retries, no while).
function measBuildSession(topic) {
    const qs = [];
    const seen = new Set();
    for (let t = 0; t < 60 && qs.length < MEAS_PER_TOPIC; t++) {
        const q = measGenerate(topic);
        const key = JSON.stringify(q.data);
        if (seen.has(key)) continue;
        seen.add(key);
        qs.push(q);
    }
    for (let t = 0; qs.length < MEAS_PER_TOPIC && t < 20; t++) qs.push(measGenerate(topic)); // safety fill
    return qs;
}

// ---------- drawing helpers ----------
function measGlassHTML(pct, hex, w, h) {
    return '<div style="position:relative;width:' + w + 'px;height:' + h + 'px;border:4px solid #64748b;border-top-width:3px;border-radius:4px 4px 16px 16px;background:#f1f5f9;overflow:hidden;margin:0 auto">' +
        '<div style="position:absolute;left:0;right:0;bottom:0;height:' + pct + '%;background:' + hex + '"></div></div>';
}

function measBlocksHTML(n, numbered) {
    let html = '<div style="display:flex;width:100%">';
    for (let i = 1; i <= 10; i++) {
        const num = (numbered && i <= n) ? i : '';
        html += '<div style="flex:0 0 9%;height:38px;box-sizing:border-box;border:2px solid #b45309;background:#fbbf24;color:#1f2937;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center">' + num + '</div>';
    }
    return html + '</div>';
}

function measUnitsVisual(q, numbered) {
    const w = q.n * 9;
    return '<div style="position:relative;width:100%;max-width:420px;margin:14px auto 6px;padding-top:0">' +
        '<div style="width:' + w + '%;height:42px;background:' + q.obj.color + ';border-radius:12px;display:flex;align-items:center;justify-content:flex-end;font-size:24px;margin-bottom:8px;overflow:hidden">' + q.obj.e + '</div>' +
        measBlocksHTML(q.n, numbered) +
        '<div style="position:absolute;left:' + w + '%;top:0;bottom:0;border-left:3px dotted #dc2626"></div></div>';
}

// tilt: negative = left side down. deg 14 is clearly visible.
function measScaleHTML(leftEmoji, rightEmoji, tilt) {
    const deg = tilt;
    const pan = (emoji, side) =>
        '<div style="position:absolute;' + side + ':-32px;top:4px;width:64px;transform:rotate(' + (-deg) + 'deg);transform-origin:top center;text-align:center">' +
        '<div style="margin:0 auto;width:30px;height:30px;border-left:2px solid #475569;border-right:2px solid #475569;transform:perspective(40px) rotateX(-10deg)"></div>' +
        '<div style="font-size:42px;line-height:46px">' + (emoji || '') + '</div>' +
        '<div style="width:64px;height:10px;background:#475569;border-radius:0 0 32px 32px"></div></div>';
    return '<div style="position:relative;width:280px;height:200px;margin:8px auto 0">' +
        '<div style="position:absolute;left:50%;margin-left:-5px;top:40px;width:10px;height:150px;background:#92400e;border-radius:4px"></div>' +
        '<div style="position:absolute;left:50%;margin-left:-45px;bottom:0;width:90px;height:10px;background:#92400e;border-radius:6px"></div>' +
        '<div style="position:absolute;left:10px;top:36px;width:260px;height:10px;background:#b45309;border-radius:6px;transform:rotate(' + deg + 'deg);transform-origin:center">' +
        pan(leftEmoji, 'left') + pan(rightEmoji, 'right') + '</div></div>';
}

function measOptionStyle(extra) {
    return 'background:#f8fafc;border:3px solid #cbd5e1;border-radius:16px;padding:10px;cursor:pointer;color:#1f2937;font-family:inherit;' + (extra || '');
}

// Inner HTML of one option, by topic/layout.
function measOptionInner(q, o) {
    if (q.topic === 'length') {
        const pct = (o.len / MEAS_LEN_MAX) * 100;
        if (q.layout === 'bar') {
            return '<div style="display:flex;align-items:center;gap:8px;width:100%">' +
                '<div style="flex:0 0 58px;font-size:15px;font-weight:700;color:#1f2937;text-align:left">' + o.label + '</div>' +
                '<div style="flex:1;position:relative;height:44px"><div style="position:absolute;left:0;top:0;height:44px;width:' + pct + '%;background:' + o.hex + ';border-radius:22px;display:flex;align-items:center;justify-content:flex-end;font-size:24px;padding-right:6px;box-sizing:border-box">' + q.theme.e + '</div></div></div>';
        }
        return '<div style="height:' + (MEAS_LEN_MAX * 16) + 'px;display:flex;align-items:flex-end;justify-content:center">' +
            '<div style="width:56px;height:' + (o.len * 16) + 'px;background:' + o.hex + ';border-radius:10px 10px 0 0"></div></div>' +
            '<div style="border-top:4px solid #92400e"></div>' +
            '<div style="font-size:15px;font-weight:700;color:#1f2937;margin-top:4px">' + o.label + '</div>';
    }
    if (q.topic === 'units') {
        return '<div style="font-size:44px;font-weight:700;color:#1f2937">' + o.label + '</div>';
    }
    if (q.topic === 'weight') {
        return '<div style="font-size:64px;line-height:72px">' + o.emoji + '</div><div style="font-size:18px;font-weight:700;color:#1f2937">' + o.label + '</div>';
    }
    if (q.topic === 'capacity') {
        return measGlassHTML(o.pct, o.hex, 64, 120) + '<div style="font-size:14px;font-weight:700;color:#1f2937;margin-top:6px">' + o.label + '</div>';
    }
    return '<div style="font-size:56px;line-height:64px">' + o.emoji + '</div><div style="font-size:18px;font-weight:700;color:#1f2937">' + o.label + '</div>';
}

function measOptionsWrap(q) {
    if (q.topic === 'length' && q.layout === 'bar') return 'display:flex;flex-direction:column;gap:10px;margin:10px 4px';
    if (q.topic === 'units') return 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 4px';
    return 'display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-end;gap:12px;margin:12px 4px';
}

function measOptionBoxStyle(q) {
    if (q.topic === 'length' && q.layout === 'bar') return measOptionStyle('padding:8px 12px;width:100%;min-height:60px;text-align:left');
    if (q.topic === 'length') return measOptionStyle('padding:8px 10px;min-width:88px');
    if (q.topic === 'units') return measOptionStyle('padding:18px 10px;min-height:80px');
    if (q.topic === 'capacity') return measOptionStyle('padding:10px 12px;min-width:92px');
    return measOptionStyle('padding:10px 16px;min-width:110px;min-height:110px');
}

// Extra picture above the options, by topic.
function measQuestionVisual(q, hintOn) {
    if (q.topic === 'units') return measUnitsVisual(q, hintOn);
    if (q.topic === 'weight' && q.view === 'scale') {
        const heavyE = q.pair.heavy[0], lightE = q.pair.light[0];
        const left = q.heavyLeft ? heavyE : lightE, right = q.heavyLeft ? lightE : heavyE;
        return measScaleHTML(left, right, q.heavyLeft ? -14 : 14);
    }
    if (q.topic === 'time' && q.shown && q.shown.length) {
        let html = '<div style="display:flex;justify-content:center;align-items:center;gap:8px;margin:12px 0">';
        q.shown.forEach(p => {
            html += '<div style="text-align:center"><div style="font-size:48px;line-height:56px">' + p[0] + '</div><div style="font-size:15px;font-weight:700;color:#1f2937">' + p[1] + '</div></div><div style="font-size:28px;color:#475569">➜</div>';
        });
        return html + '<div style="width:56px;height:56px;border:4px dashed #94a3b8;border-radius:14px;font-size:34px;line-height:48px;text-align:center;color:#475569">?</div></div>';
    }
    if (q.topic === 'time' && q.kind === 'first') return '';
    return '';
}

// ---------- state + flow ----------
const MEAS = { topic: null, qs: [], index: 0, score: 0, attempt: 1, wrong: [], hint: false, locked: false, qStart: 0, token: 0, q: null };

function measStopSpeech() {
    try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch (e) {}
}
function measSay(text) {
    measStopSpeech();
    try { if (typeof speak === 'function') { const p = speak(text); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
}

function measCardOpen(topic) {
    const t = MEAS_TOPICS[topic];
    return '<button class="back" onclick="measBack()">← Back</button><div class="card">' +
        '<div class="title" style="color:' + t.color + '">' + t.icon + ' ' + t.name + '</div>';
}

function showMeasurement() {
    MEAS.token++;
    MEAS.topic = null;
    MEAS.q = null;
    measStopSpeech();
    let html = '<button class="back" onclick="measBack()">← Back</button><div class="card">' +
        '<div class="title" style="color:#1d4ed8">📏 Measurement</div>' +
        '<div style="text-align:center;color:#334155;font-size:18px;margin-bottom:8px">What shall we measure?</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:12px 4px">';
    MEAS_TOPIC_ORDER.forEach(k => {
        const t = MEAS_TOPICS[k];
        html += '<button onclick="measStartTopic(\'' + k + '\')" style="background:' + t.color + ';color:white;border:none;border-radius:20px;padding:22px 10px;cursor:pointer;font-family:inherit;min-height:130px">' +
            '<div style="font-size:56px;line-height:64px">' + t.icon + '</div><div style="font-size:19px;font-weight:700;margin-top:6px">' + t.name + '</div></button>';
    });
    html += '</div></div>';
    document.getElementById('app').innerHTML = html;
}

window.measBack = function () {
    MEAS.token++;
    measStopSpeech();
    if (MEAS.topic) showMeasurement();
    else if (typeof showMenu === 'function') showMenu();
};

// ---------- teach cards ----------
const MEAS_TEACH = {
    length: {
        say: 'The longer one goes further. The shorter one stops sooner. Line things up at the start.',
        lines: ['Line things up at the start.', 'The <b>longer</b> one goes further.', 'The <b>shorter</b> one stops sooner.'],
        visual: () => '<div style="max-width:320px;margin:10px auto">' +
            ['#dc2626:90', '#2563eb:45'].map(s => {
                const p = s.split(':');
                return '<div style="height:36px;width:' + p[1] + '%;background:' + p[0] + ';border-radius:18px;margin:8px 0;display:flex;align-items:center;justify-content:flex-end;font-size:22px;padding-right:6px;box-sizing:border-box">✏️</div>';
            }).join('') +
            '<div style="border-left:3px dotted #475569;height:0"></div></div>'
    },
    units: {
        say: 'To measure, start at the end. No gaps. Count the blocks.',
        lines: ['Start at the end.', 'No gaps.', 'Count the blocks.'],
        visual: () => measUnitsVisual({ n: 4, obj: MEAS_UNIT_OBJECTS[0] }, true)
    },
    weight: {
        say: 'The heavier side of the scale goes down. The lighter side goes up.',
        lines: ['The <b>heavier</b> side goes down.', 'The <b>lighter</b> side goes up.'],
        visual: () => measScaleHTML('🐘', '🐭', -14)
    },
    capacity: {
        say: 'A full glass has the most. An empty glass has none. More juice means a fuller glass.',
        lines: ['<b>Full</b> has the most.', '<b>Empty</b> has none.', 'More juice = a fuller glass.'],
        visual: () => '<div style="display:flex;justify-content:center;gap:22px;margin:12px 0;align-items:flex-end">' +
            [[100, 'full'], [50, 'half'], [0, 'empty']].map(p =>
                '<div style="text-align:center">' + measGlassHTML(p[0], '#ea580c', 64, 120) + '<div style="font-size:16px;font-weight:700;color:#1f2937;margin-top:6px">' + p[1] + '</div></div>').join('') + '</div>'
    },
    time: {
        say: 'Morning is when the sun comes up. Night is dark. Things happen in order: first, then next.',
        lines: ['<b>Morning</b>: the sun comes up.', '<b>Night</b>: the moon and stars.', 'Things happen in order: first, then next.'],
        visual: () => '<div style="display:flex;justify-content:center;align-items:center;gap:10px;margin:12px 0;flex-wrap:wrap">' +
            [['🌅', 'morning'], ['🌙', 'night']].map(p => '<div style="text-align:center;min-width:90px"><div style="font-size:52px;line-height:60px">' + p[0] + '</div><div style="font-size:16px;font-weight:700;color:#1f2937">' + p[1] + '</div></div>').join('') +
            '</div><div style="display:flex;justify-content:center;align-items:center;gap:8px;margin:6px 0">' +
            [['🌰', 'seed'], ['🌱', 'plant'], ['🌸', 'flower']].map(p => '<div style="text-align:center"><div style="font-size:40px;line-height:48px">' + p[0] + '</div><div style="font-size:14px;font-weight:700;color:#1f2937">' + p[1] + '</div></div>').join('<div style="font-size:24px;color:#475569">➜</div>') + '</div>'
    }
};

window.measStartTopic = function (topic) {
    MEAS.token++;
    MEAS.topic = topic;
    MEAS.qs = measBuildSession(topic);
    MEAS.index = 0; MEAS.score = 0; MEAS.attempt = 1; MEAS.wrong = []; MEAS.hint = false; MEAS.locked = false; MEAS.q = null;
    if (typeof startItemTimer === 'function') startItemTimer();
    const tc = MEAS_TEACH[topic];
    let html = measCardOpen(topic);
    html += '<div style="text-align:center;color:#475569;font-size:15px">Let\'s learn!</div>';
    html += tc.visual();
    html += '<div style="text-align:center;color:#1f2937;font-size:20px;line-height:1.5;margin:10px 6px">' + tc.lines.join('<br>') + '</div>';
    html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin-top:10px" onclick="measStartQuestions()">Start Practice →</button></div>';
    document.getElementById('app').innerHTML = html;
    measSay(tc.say);
};

window.measStartQuestions = function () {
    if (!MEAS.topic) return;
    recordPassiveResponse(MEAS_SKILL, { type: 'measurement_teach', topic: MEAS.topic }, 0, 1);
    MEAS.token++;
    MEAS.index = 0; MEAS.score = 0;
    measNextQuestion();
};

// ---------- questions ----------
function measNextQuestion() {
    if (MEAS.index >= MEAS.qs.length) { measFinish(); return; }
    MEAS.q = MEAS.qs[MEAS.index];
    MEAS.attempt = 1; MEAS.wrong = []; MEAS.hint = false; MEAS.locked = false;
    MEAS.qStart = Date.now();
    measRenderQuestion(true);
}

function measRenderQuestion(speakPrompt) {
    const q = MEAS.q;
    let html = measCardOpen(q.topic);
    html += '<div id="measPrompt" onclick="measReplay()" style="text-align:center;font-size:26px;font-weight:700;color:#1f2937;cursor:pointer;margin:6px 0">🔊 ' + q.prompt + '</div>';
    html += measQuestionVisual(q, MEAS.hint);
    html += '<div style="' + measOptionsWrap(q) + '">';
    q.options.forEach(o => {
        const isWrong = MEAS.wrong.indexOf(o.id) >= 0;
        let style = measOptionBoxStyle(q);
        if (isWrong) style += 'opacity:.35;';
        if (MEAS.hint && o.id === q.correct) style += 'border-color:#f59e0b;box-shadow:0 0 0 5px #fde68a;';
        html += '<button class="mOpt" data-id="' + o.id + '" style="' + style + '"' + (isWrong ? ' disabled' : '') + ' onclick="measChoose(\'' + o.id + '\')">' + measOptionInner(q, o) + '</button>';
    });
    html += '</div>';
    html += '<div id="measHint" style="text-align:center;font-size:19px;font-weight:600;color:#92400e;min-height:26px;margin:6px 8px">' + (MEAS.hint ? '💡 ' + q.hint : '') + '</div>';
    html += '<div class="score">⭐ ' + MEAS.score + ' / ' + MEAS.qs.length + ' — Question ' + (MEAS.index + 1) + ' of ' + MEAS.qs.length + '</div></div>';
    document.getElementById('app').innerHTML = html;
    if (speakPrompt) measSay(q.prompt);
    else if (MEAS.hint) measSay(q.hint);
}

window.measReplay = function () { if (MEAS.q) measSay(MEAS.q.prompt); };

window.measChoose = function (id) {
    if (!MEAS.q || MEAS.locked) return;
    MEAS.locked = true;
    document.querySelectorAll('.mOpt').forEach(el => { el.disabled = true; el.onclick = null; el.style.pointerEvents = 'none'; });
    const q = MEAS.q;
    const isCorrect = id === q.correct;
    const isFirstTry = MEAS.attempt === 1;
    const rt = Date.now() - MEAS.qStart;
    const qd = Object.assign({ type: 'measurement', topic: q.topic }, q.data);
    recordResponse(MEAS_SKILL, qd, q.correct, id, isCorrect, isFirstTry, MEAS.attempt, rt, MEAS.index, false, 1);
    MEAS.qStart = Date.now();
    const tok = MEAS.token;
    if (isCorrect) {
        if (isFirstTry) MEAS.score++;
        if (typeof currentAnswers !== 'undefined') currentAnswers.push({ q: 'measurement_' + q.topic, answer: id, correct: true });
        const advance = () => {
            if (tok !== MEAS.token) return;
            MEAS.index++;
            measNextQuestion();
        };
        if (typeof showFeedback === 'function') showFeedback(true, advance);
        else setTimeout(advance, 800);
    } else {
        MEAS.attempt++;
        MEAS.wrong.push(id);
        MEAS.hint = true;
        const title = document.querySelector('.title');
        const card = document.querySelector('.card');
        if (title) { title.innerHTML = '🤔 Try again!'; title.style.color = '#ef4444'; }
        if (card) card.style.animation = 'shake 0.5s';
        setTimeout(() => {
            if (tok !== MEAS.token) return;
            MEAS.locked = false;
            measRenderQuestion(false);
        }, 900);
    }
};

function measFinish() {
    MEAS.token++;
    measStopSpeech();
    completeWorksheet('Measurement', MEAS.score, MEAS.qs.length);
}

window.showMeasurement = showMeasurement;
