// ============ SUBTRACTION ============
function showSubtraction() {
    const problems = generateSubtractionProblems(getFocusNumber('subtraction'));
    let current = 0, score = 0;
    const solved = new Set();
    const answers = {};
    const attemptCounts = {};
    let questionStartMs = null;
    const MAX_DIGITS = 3;

    // ---- Operation signalling: red-orange + a "leaving" picture + the spoken words ----
    // The child must read the SIGN, not just see two numbers, so the operation has one
    // colour, one picture and one spoken word everywhere on this screen.
    const OP = {
        color: '#ef4444', dark: '#b91c1c', tint: '#fef2f2', word: 'TAKE AWAY', sign: '−', say: 'Take away',
        pic: '🟠🟠 🚶‍♂️➡️'   // a group with one walking off
    };
    const unlocked = {};   // question index -> true once the child has tapped the sign
    let alive = true;      // false once the child leaves this screen

    function stopSay() {
        if (typeof speechSynthesis !== 'undefined') { try { speechSynthesis.cancel(); } catch (e) {} }
    }
    function say(text) {
        if (typeof speak === 'function') { try { speak(text); } catch (e) {} }
    }
    function opSpeech(p) { return 'Take away. ' + p.a + ' take away ' + p.b + '.'; }
    window.stopSubSession = () => { alive = false; stopSay(); showMenu(); };
    window.replaySubOp = () => { if (!alive) return; stopSay(); say(opSpeech(problems[current])); };
    window.tapSubSign = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (!alive) return;
        stopSay();
        if (!unlocked[current]) {
            unlocked[current] = true;
            questionStartMs = Date.now();   // the response timer starts when the keypad unlocks
            const pad = document.getElementById('padBox');
            if (pad) {
                pad.style.opacity = '1'; pad.style.pointerEvents = '';
                pad.querySelectorAll('button').forEach(b => { b.disabled = false; });
            }
            const pr = document.getElementById('signPrompt'); if (pr) pr.style.display = 'none';
            const bd = document.getElementById('signBadge'); if (bd) bd.style.animation = 'none';
            say(OP.say + '!');
        } else {
            say(opSpeech(problems[current]));
        }
    };

    function render() {
        const p = problems[current];
        const open = !!unlocked[current];
        let html = '<style>@keyframes opPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(239,68,68,.6)}50%{transform:scale(1.12);box-shadow:0 0 0 14px rgba(239,68,68,0)}}</style>';
        html += '<button class="back" onclick="stopSubSession()">← Back</button><div class="card"><div class="title" style="color:'+OP.dark+'">Subtraction! ➖</div>';

        // Progress dots
        html += '<div style="text-align:center;margin:10px 0">';
        problems.forEach((_, i) => {
            const color = solved.has(i) ? '#00CC66' : (i === current ? '#FF6B35' : '#555');
            html += '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:'+color+';margin:3px"></span>';
        });
        html += '</div>';

        // Coloured band around the whole problem area
        html += '<div style="border:4px solid '+OP.color+';background:'+OP.tint+';border-radius:18px;padding:10px;margin:8px 0">';
        html += '<div style="text-align:center;font-size:26px;font-weight:bold;color:'+OP.dark+';letter-spacing:2px">'+OP.pic+' &nbsp;'+OP.word+'</div>';

        // Equation row: the sign is a big round badge, far larger than the digits
        const num = v => '<span style="font-size:48px;color:#333">'+v+'</span>';
        html += '<div onclick="replaySubOp()" style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:10px;margin:12px 0;cursor:pointer">';
        html += num(p.a);
        html += '<button id="signBadge" onclick="tapSubSign(event)" aria-label="Minus sign. Tap to hear it." style="width:96px;height:96px;border-radius:50%;border:none;background:'+OP.color+';color:white;font-size:80px;font-weight:bold;line-height:90px;padding:0;cursor:pointer;'+(open ? '' : 'animation:opPulse 1.2s ease-in-out infinite;')+'">'+OP.sign+'</button>';
        html += num(p.b);
        html += '<span style="font-size:44px;color:#333">=</span>';
        html += '<span class="answer-box" id="ansBox" style="font-size:44px;color:#333">'+(answers[current]!=null ? answers[current] : '?')+'</span>';
        html += '</div>';

        // Picture whenever the starting amount is small enough to draw: the taken-away items are crossed out
        if (p.a <= 12) {
            html += '<div style="text-align:center;font-size:32px;line-height:1.8;margin:5px">';
            for (let i = 0; i < p.a; i++) {
                if (i >= p.a - p.b) {
                    html += '<span style="opacity:0.25;position:relative;display:inline-block">'+p.emoji+'<span style="position:absolute;top:-2px;left:0;font-size:28px;color:red">✕</span></span> ';
                } else {
                    html += '<span>'+p.emoji+'</span> ';
                }
            }
            html += '</div>';
            html += '<div style="text-align:center;font-size:22px;color:'+OP.dark+';margin:5px">How many are left?</div>';
        }

        html += '<div id="signPrompt" style="text-align:center;font-size:24px;font-weight:bold;color:'+OP.dark+';margin-top:8px;'+(open ? 'display:none' : '')+'">👆 Tap the sign first!</div>';
        html += '</div></div>';

        // Keypad stays locked until the sign is tapped (and stays unlocked on a retry)
        html += '<div class="keypad" id="padBox" style="'+(open ? '' : 'opacity:.3;pointer-events:none')+'">';
        const dis = open ? '' : ' disabled';
        for (let n = 0; n <= 9; n++) html += '<button class="key"'+dis+' onclick="pressKey('+n+')">'+n+'</button>';
        html += '<button class="key red"'+dis+' onclick="clearKey()">⌫</button><button class="key green"'+dis+' onclick="checkKey()">✓</button></div>';
        html += '<div class="score">⭐ '+score+' / '+problems.length+'</div>';
        stopSay();
        document.getElementById('app').innerHTML = html;
        questionStartMs = open ? Date.now() : null;
        say(opSpeech(p));
    }

    window.pressKey = (n) => {
        if (solved.has(current) || !unlocked[current]) return;
        const box = document.getElementById('ansBox');
        const base = (box.textContent === '?' ? '' : box.textContent);
        if (base.length >= MAX_DIGITS) return;
        const next = base + n;
        answers[current] = next;
        box.textContent = next;
    };
    window.clearKey = () => {
        if (solved.has(current) || !unlocked[current]) return;
        const box = document.getElementById('ansBox');
        const base = (box.textContent === '?' ? '' : box.textContent);
        const next = base.slice(0, -1);
        answers[current] = next === '' ? null : next;
        box.textContent = next === '' ? '?' : next;
    };
    window.checkKey = () => {
        const ans = document.getElementById('ansBox').textContent;
        if (ans === '?' || ans === '' || solved.has(current) || !unlocked[current]) return;
        const responseTimeMs = Date.now() - questionStartMs;
        attemptCounts[current] = (attemptCounts[current] || 0) + 1;
        const p = problems[current];
        const ansNum = parseInt(ans, 10);
        const correct = ansNum === p.ans;
        if (attemptCounts[current] === 1) currentAnswers.push({q: p.a+'−'+p.b, answer: ansNum, correct: correct});

        recordResponse('subtraction', {type:'subtraction', a:p.a, b:p.b, answer:p.ans, mode:p.mode}, String(p.ans), ansNum, correct, attemptCounts[current]===1, attemptCounts[current], responseTimeMs, current);

        stopSay();
        // A wrong answer points the child back at the sign (showFeedback speaks it).
        const pointBack = (!correct && typeof speak === 'function') ? 'Look at the sign — take away!' : undefined;
        showFeedback(correct, () => {
            if (!alive) return;
            if (correct) {
                solved.add(current);
                score++;

                if (score === problems.length) { alive = false; stopSay(); completeWorksheet('Subtraction', score, problems.length); return; }
                for (let i = 0; i < problems.length; i++) if (!solved.has(i)) { current = i; break; }
                render();
            } else {
                render();   // same question: keypad stays unlocked, operation is spoken again
            }
        }, pointBack);
    };
    render();
}
