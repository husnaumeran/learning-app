// ============ WHICH SIGN? ============
// Skill id: which_sign. The child sees/hears a tiny story and chooses + (ADD, more
// come) or - (TAKE AWAY, some go). No calculating, no number answer: telling the two
// signs apart IS the skill. Visual language matches addition.js / subtraction.js:
// add = green, take away = red. Plus is always on the left, minus on the right.
// No while/do loops anywhere in this file.

const WHICHSIGN_OBJECTS = [
    { e: '🦆', n: 'duck',    leave: ['go', 'fly', 'lost', 'give'] },
    { e: '🍎', n: 'apple',   leave: ['eaten', 'lost', 'give'] },
    { e: '🐦', n: 'bird',    leave: ['fly', 'go', 'lost'] },
    { e: '🍪', n: 'cookie',  leave: ['eaten', 'lost', 'give'] },
    { e: '🐝', n: 'bee',     leave: ['fly', 'go', 'lost'] },
    { e: '🎈', n: 'balloon', leave: ['fly', 'go', 'lost', 'give'] },
    { e: '🌸', n: 'flower',  leave: ['lost', 'give', 'go'] },
    { e: '🚗', n: 'car',     leave: ['go', 'lost', 'give'] },
    { e: '🐱', n: 'cat',     leave: ['go', 'lost', 'give'] },
    { e: '⭐', n: 'star',    leave: ['go', 'lost', 'give'] }
];
const WHICHSIGN_JOIN_WORDINGS = ['come', 'join', 'more', 'get'];

function whichSignPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function whichSignShuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
}
function whichSignNoun(obj, k) { return k === 1 ? obj.n : obj.n + 's'; }

// The sentence that is both spoken and shown. Digits in it are only the two quantities
// in the story (a and b) - never the total or the remainder.
function whichSignSentence(s) {
    const o = s.obj, a = s.a, b = s.b;
    const first = a + ' ' + whichSignNoun(o, a) + '.';
    const sg = b === 1;
    switch (s.wording) {
        case 'come':   return first + ' ' + b + ' more ' + whichSignNoun(o, b) + (sg ? ' comes.' : ' come.');
        case 'join':   return first + ' ' + b + ' more ' + whichSignNoun(o, b) + (sg ? ' joins them.' : ' join them.');
        case 'more':   return first + ' Then ' + b + ' more.';
        case 'get':    return first + ' You get ' + b + ' more.';
        case 'go':     return first + ' ' + b + (sg ? ' goes away.' : ' go away.');
        case 'fly':    return first + ' ' + b + (sg ? ' flies away.' : ' fly away.');
        case 'eaten':  return first + ' ' + b + (sg ? ' is eaten.' : ' are eaten.');
        case 'lost':   return first + ' ' + b + (sg ? ' is lost.' : ' are lost.');
        case 'give':   return first + ' You give away ' + b + '.';
    }
    return first;
}

// Builds the ordered list of story specs. Balanced exactly (half plus, half minus) and
// shuffled by a bounded construction: the set is made of pairs (one plus + one minus),
// each pair is ordered at random, so a run of the same sign can never exceed two.
// The final pair(s) are "same numbers, both ways".
function whichSignBuildSet(count) {
    let n = Math.max(6, count | 0);
    if (n % 2 === 1) n++;
    const pairs = n / 2;
    const bothWays = pairs >= 5 ? 2 : 1;
    const objDeck = whichSignShuffle(WHICHSIGN_OBJECTS.map((_, i) => i));
    let deckPos = 0;
    function nextObj() { const o = WHICHSIGN_OBJECTS[objDeck[deckPos % objDeck.length]]; deckPos++; return o; }

    function joinStory(obj, a, b) {
        return { story: 'join', sign: 'plus', obj, a, b, wording: whichSignPick(WHICHSIGN_JOIN_WORDINGS) };
    }
    function leaveStory(obj, a, b) {
        return { story: 'leave', sign: 'minus', obj, a, b, wording: whichSignPick(obj.leave) };
    }

    const out = [];
    for (let k = 0; k < pairs; k++) {
        let p, m;
        if (k >= pairs - bothWays) {
            // same numbers both ways: a > b, a + b <= 9
            const a = 3 + Math.floor(Math.random() * 4);               // 3..6
            const maxB = Math.min(a - 1, 9 - a);                        // >= 2 for a in 3..6
            const b = 1 + Math.floor(Math.random() * maxB);
            const obj = nextObj();
            p = joinStory(obj, a, b);
            m = leaveStory(obj, a, b);
            p.bothWays = true; m.bothWays = true;
        } else {
            const ja = 1 + Math.floor(Math.random() * 7);               // 1..7
            const jb = 1 + Math.floor(Math.random() * Math.min(8, 9 - ja)); // total <= 9
            const la = 2 + Math.floor(Math.random() * 8);               // 2..9
            const lb = 1 + Math.floor(Math.random() * (la - 1));        // 1..la-1, never negative
            p = joinStory(nextObj(), ja, jb);
            m = leaveStory(nextObj(), la, lb);
        }
        if (Math.random() < 0.5) out.push(p, m); else out.push(m, p);
    }
    return out;
}

function showWhichSign() {
    const COLORS = {
        plus:  { color: '#22c55e', dark: '#15803d', tint: '#f0fdf4', sign: '+', word: 'ADD' },
        minus: { color: '#ef4444', dark: '#b91c1c', tint: '#fef2f2', sign: '−', word: 'TAKE AWAY' }
    };
    const rawCount = (typeof getQuestionCount === 'function') ? getQuestionCount('which_sign') : 6;
    const set = whichSignBuildSet(rawCount);
    const total = set.length;
    let current = 0, score = 0, attempts = 0, qStart = 0;
    let alive = true, locked = false;
    const timers = [];

    function later(fn, ms) { timers.push(setTimeout(() => { if (alive) fn(); }, ms)); }
    function stopSay() { if (typeof speechSynthesis !== 'undefined') { try { speechSynthesis.cancel(); } catch (e) {} } }
    function say(t) { if (typeof speak === 'function') { try { speak(t); } catch (e) {} } }
    function leave() { alive = false; timers.forEach(clearTimeout); stopSay(); }

    window.stopWhichSign = () => { leave(); showMenu(); };

    // ---------- teach card ----------
    const TEACH = {
        plus:  { say: 'Plus means add. More come.',   text: 'means ADD: more come', pic: '🐥🐥 ⬅️ 🐥' },
        minus: { say: 'Minus means take away. Some go.', text: 'means TAKE AWAY: some go', pic: '🐥🐥 ➡️ 🐥' }
    };
    window.wsTeachSay = (which) => { if (!alive) return; stopSay(); say(TEACH[which].say); };

    function renderTeach() {
        stopSay();
        let html = '<button class="back" onclick="stopWhichSign()">← Back</button><div class="card">';
        html += '<div class="title" style="color:#333">Which sign? ➕ ➖</div>';
        html += '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin:12px 0">';
        ['plus', 'minus'].forEach(k => {
            const c = COLORS[k], t = TEACH[k];
            html += '<div onclick="wsTeachSay(\'' + k + '\')" style="flex:1 1 220px;max-width:320px;cursor:pointer;text-align:center;border:4px solid ' + c.color + ';background:' + c.tint + ';border-radius:18px;padding:14px">';
            html += '<div style="width:84px;height:84px;margin:0 auto 8px;border-radius:50%;background:' + c.color + ';color:white;font-size:70px;font-weight:bold;line-height:80px">' + c.sign + '</div>';
            html += '<div style="font-size:34px;line-height:1.6">' + t.pic + '</div>';
            html += '<div style="font-size:24px;font-weight:bold;color:' + c.dark + ';margin-top:6px">' + c.sign + ' ' + t.text + '</div>';
            html += '<div style="font-size:16px;color:#555;margin-top:4px">👆 tap to hear</div>';
            html += '</div>';
        });
        html += '</div>';
        html += '<div style="text-align:center"><button class="btn green" onclick="wsStart()" style="font-size:26px;padding:14px 36px">Let\'s play! ▶</button></div>';
        html += '</div>';
        document.getElementById('app').innerHTML = html;
        if (typeof recordPassiveResponse === 'function') {
            recordPassiveResponse('which_sign', { type: 'which_sign_teach' }, 0, 1);
        }
        say('Plus means add. Minus means take away.');
    }
    window.wsStart = () => { if (!alive) return; stopSay(); renderQuestion(); };

    // ---------- question ----------
    function groupHtml(obj, k, faded, dashedColor) {
        let g = '<span style="display:inline-block;padding:6px 12px;border:3px ' + (dashedColor ? 'dashed ' + dashedColor : 'solid #94a3b8') + ';border-radius:14px;background:white;margin:2px;' + (faded ? 'opacity:.4;filter:grayscale(.8);' : '') + '">';
        for (let i = 0; i < k; i++) g += '<span>' + obj.e + '</span> ';
        return g + '</span>';
    }
    function pictureHtml(s) {
        // Neutral frame colours: the picture must not hand over the answer by colour.
        let h = '<div onclick="wsReplay()" style="text-align:center;font-size:36px;line-height:1.7;margin:10px 0;cursor:pointer">';
        if (s.story === 'join') {
            h += groupHtml(s.obj, s.a, false) + ' <span style="font-size:40px">⬅️</span> ' + groupHtml(s.obj, s.b, false, '#64748b');
        } else {
            h += groupHtml(s.obj, s.a - s.b, false) + ' <span style="font-size:40px">➡️</span> ' + groupHtml(s.obj, s.b, true, '#64748b');
        }
        return h + '</div>';
    }
    function renderQuestion() {
        const s = set[current];
        locked = false; attempts = 0;
        let html = '<button class="back" onclick="stopWhichSign()">← Back</button><div class="card">';
        html += '<div class="title" id="wsTitle" style="color:#333">Which sign is it?</div>';
        html += '<div style="text-align:center;margin:8px 0">';
        set.forEach((_, i) => {
            const c = i < current ? '#00CC66' : (i === current ? '#FF6B35' : '#555');
            html += '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:' + c + ';margin:3px"></span>';
        });
        html += '</div>';
        html += pictureHtml(s);
        html += '<div id="storyText" onclick="wsReplay()" style="text-align:center;font-size:26px;font-weight:bold;color:#333;margin:6px 0 14px;cursor:pointer">🔊 ' + whichSignSentence(s) + '</div>';
        html += '<div style="display:flex;justify-content:center;gap:36px;margin:8px 0">';
        ['plus', 'minus'].forEach(k => {
            const c = COLORS[k];
            html += '<div style="text-align:center"><button id="ws_' + k + '" onclick="wsPick(\'' + k + '\')" aria-label="' + c.word + '" style="width:112px;height:112px;border-radius:50%;border:none;background:' + c.color + ';color:white;font-size:92px;font-weight:bold;line-height:104px;padding:0;cursor:pointer">' + c.sign + '</button>';
            html += '<div style="font-size:20px;font-weight:bold;color:' + c.dark + ';margin-top:6px">' + c.word + '</div></div>';
        });
        html += '</div>';
        html += '<div id="wsMsg" style="min-height:34px;text-align:center;font-size:24px;font-weight:bold;color:#333;margin-top:10px"></div>';
        html += '<div class="score">⭐ ' + score + ' / ' + total + '</div></div>';
        stopSay();
        document.getElementById('app').innerHTML = html;
        qStart = Date.now();
        say(whichSignSentence(s));
    }
    window.wsReplay = () => { if (!alive || !set[current]) return; stopSay(); say(whichSignSentence(set[current])); };

    function setButtons(disabled) {
        ['plus', 'minus'].forEach(k => {
            const b = document.getElementById('ws_' + k);
            if (b) { b.disabled = disabled; b.style.opacity = disabled ? '.55' : '1'; }
        });
    }

    window.wsPick = (chosen) => {
        if (!alive || locked) return;
        locked = true;
        setButtons(true);                       // synchronous: no double-tap can slip through
        const s = set[current];
        attempts++;
        const ms = Date.now() - qStart;
        const ok = chosen === s.sign;
        const first = attempts === 1;
        recordResponse('which_sign',
            { type: 'which_sign', story: s.story, a: s.a, b: s.b, wording: s.wording },
            s.sign, chosen, ok, first, attempts, ms, current, false, 1);
        const msg = document.getElementById('wsMsg');
        stopSay();
        if (ok) {
            if (first) score++;
            const t = s.sign === 'plus' ? 'Yes — ADD, more came!' : 'Yes — TAKE AWAY, some went!';
            if (msg) { msg.style.color = COLORS[s.sign].dark; msg.textContent = '⭐ ' + t; }
            say(t);
            later(() => {
                current++;
                if (current >= total) { leave(); completeWorksheet('Which Sign?', score, total); return; }
                renderQuestion();
            }, 1800);
        } else {
            const t = s.sign === 'plus' ? 'Look — more came. That is add.' : 'Look — some went AWAY. That is take away.';
            if (msg) { msg.style.color = '#b45309'; msg.textContent = '🤔 ' + t; }
            say(t);
            later(() => { locked = false; setButtons(false); if (msg) msg.textContent = 'Try again!'; qStart = Date.now(); }, 2600);
        }
    };

    renderTeach();
}
