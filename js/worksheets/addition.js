// ============ ADDITION ============
function showAddition() {
    const focusNumber = getFocusNumber('addition');
    const problems = buildAdditionProblems(focusNumber);
    let current = 0, score = 0;
    const solved = new Set();
    const answers = {};
    const attemptCounts = {};
    let questionStartMs = null;
    const MAX_DIGITS = 3;

    // Builds "a + b = sum" facts for focusNumber, excluding a zero addend whenever the
    // target sum allows it (only sum===1 forces 0+1), and varying which of a/b/sum is
    // the blank the child solves for. Every pair comes straight off a fixed-size array
    // (pool-and-pick, not reject-and-retry), so this always terminates.
    function buildAdditionProblems(focus, count) {
        if (count == null) count = focus;
        const n = Math.max(1, count);
        const catNames = Object.keys(CONFIG.categories);
        function pickEmoji() {
            const cat = catNames[Math.floor(Math.random() * catNames.length)];
            return CONFIG.categories[cat][Math.floor(Math.random() * CONFIG.categories[cat].length)];
        }
        function nonZeroPairsFor(target) {
            const pairs = [];
            for (let a = 1; a < target; a++) pairs.push([a, target - a]);
            return pairs;
        }
        const numFocusTarget = Math.max(1, Math.ceil(n / 3));
        // "4 + ? = 5" asks a child to run addition backwards. Owner, 2026-10-07: too
        // hard while plain addition is still being mastered, so the missing addend
        // only appears once the child is working with sums of 10 or more.
        const blankCycle = focus >= 10 ? ['sum', 'sum', 'a', 'sum', 'b'] : ['sum'];
        const built = [];

        for (let i = 0; i < n; i++) {
            const target = i < numFocusTarget ? focus : (Math.floor(Math.random() * focus) + 1);
            const pairs = nonZeroPairsFor(target);
            let a, b;
            if (pairs.length) {
                const pick = pairs[Math.floor(Math.random() * pairs.length)];
                a = pick[0]; b = pick[1];
            } else {
                a = 0; b = target; // target === 1: a zero addend can't be avoided
            }
            const blank = blankCycle[i % blankCycle.length];
            const mode = (blank === 'sum' && i % 2 === 0) ? 'visual' : 'equation';
            built.push({ a, b, sum: a + b, blank, mode, emoji: pickEmoji() });
        }

        for (let i = built.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [built[i], built[j]] = [built[j], built[i]];
        }
        return built;
    }

    // ---- Operation signalling: green + a "joining" picture + the spoken word ----
    // The child must read the SIGN, not just see two numbers, so the operation has one
    // colour, one picture and one spoken word everywhere on this screen.
    const OP = {
        color: '#22c55e', dark: '#15803d', tint: '#f0fdf4', word: 'ADD', sign: '+', say: 'Add',
        pic: '🟢🟢 ➡️⬅️ 🟢'   // two groups moving together
    };
    const unlocked = {};   // question index -> true once the child has tapped the sign
    let alive = true;      // false once the child leaves this screen

    function stopSay() {
        if (typeof speechSynthesis !== 'undefined') { try { speechSynthesis.cancel(); } catch (e) {} }
    }
    function say(text) {
        if (typeof speak === 'function') { try { speak(text); } catch (e) {} }
    }
    function opSpeech(p) {
        if (p.blank === 'a') return 'Add. What and ' + p.b + ' make ' + p.sum + '.';
        if (p.blank === 'b') return 'Add. ' + p.a + ' and what make ' + p.sum + '.';
        return 'Add. ' + p.a + ' and ' + p.b + '.';
    }
    window.stopAddSession = () => { alive = false; stopSay(); showMenu(); };
    window.replayAddOp = () => { if (!alive) return; stopSay(); say(opSpeech(problems[current])); };
    window.tapAddSign = (e) => {
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
        let html = '<style>@keyframes opPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(34,197,94,.6)}50%{transform:scale(1.12);box-shadow:0 0 0 14px rgba(34,197,94,0)}}</style>';
        html += '<button class="back" onclick="stopAddSession()">← Back</button><div class="card"><div class="title" style="color:'+OP.dark+'">Ways to Make '+focusNumber+'! ➕</div>';

        // Progress dots
        html += '<div style="text-align:center;margin:10px 0">';
        problems.forEach((_, i) => {
            const color = solved.has(i) ? '#00CC66' : (i === current ? '#FF6B35' : '#555');
            html += '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:'+color+';margin:3px"></span>';
        });
        html += '</div>';

        const boxHtml = '<span class="answer-box" id="ansBox" style="font-size:44px;color:#333">'+(answers[current]!=null ? answers[current] : '?')+'</span>';
        const num = v => '<span style="font-size:48px;color:#333">'+v+'</span>';

        // Coloured band around the whole problem area
        html += '<div style="border:4px solid '+OP.color+';background:'+OP.tint+';border-radius:18px;padding:10px;margin:8px 0">';
        html += '<div style="text-align:center;font-size:26px;font-weight:bold;color:'+OP.dark+';letter-spacing:2px">'+OP.pic+' &nbsp;'+OP.word+'</div>';

        // Equation row: the sign is a big round badge, far larger than the digits
        html += '<div onclick="replayAddOp()" style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:10px;margin:12px 0;cursor:pointer">';
        html += (p.blank==='a' ? boxHtml : num(p.a));
        html += '<button id="signBadge" onclick="tapAddSign(event)" aria-label="Plus sign. Tap to hear it." style="width:96px;height:96px;border-radius:50%;border:none;background:'+OP.color+';color:white;font-size:80px;font-weight:bold;line-height:90px;padding:0;cursor:pointer;'+(open ? '' : 'animation:opPulse 1.2s ease-in-out infinite;')+'">'+OP.sign+'</button>';
        html += (p.blank==='b' ? boxHtml : num(p.b));
        html += '<span style="font-size:44px;color:#333">=</span>';
        html += (p.blank==='sum' ? boxHtml : num(p.sum));
        html += '</div>';

        // Picture whenever the numbers are small enough to draw
        if (p.sum <= 12) {
            const group = n => { let g = '<span style="display:inline-block;padding:4px 10px;border:2px solid '+OP.color+';border-radius:14px;background:white;margin:2px">'; for (let i = 0; i < n; i++) g += '<span>'+p.emoji+'</span> '; return g + '</span>'; };
            const unknown = '<span style="display:inline-block;padding:4px 18px;border:2px dashed '+OP.dark+';border-radius:14px;color:'+OP.dark+';background:white;margin:2px">?</span>';
            html += '<div style="text-align:center;font-size:32px;line-height:1.8;margin:5px">';
            html += (p.blank==='a' ? unknown : group(p.a));
            html += '<span style="font-size:28px;color:'+OP.dark+';margin:0 8px">+</span>';
            html += (p.blank==='b' ? unknown : group(p.b));
            html += '</div>';
            if (p.blank === 'sum') html += '<div style="text-align:center;font-size:22px;color:'+OP.dark+';margin:5px">How many in all?</div>';
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
        const correctVal = p.blank === 'sum' ? p.sum : (p.blank === 'a' ? p.a : p.b);
        const correct = ansNum === correctVal;
        const qLabel = (p.blank==='a'?'?':p.a)+'+'+(p.blank==='b'?'?':p.b)+'='+(p.blank==='sum'?'?':p.sum);
        if (attemptCounts[current] === 1) currentAnswers.push({q: qLabel, answer: ansNum, correct: correct});

        recordResponse('addition', {type:'addition', a:p.a, b:p.b, sum:p.sum, blank:p.blank}, String(correctVal), ansNum, correct, attemptCounts[current]===1, attemptCounts[current], responseTimeMs, current);

        stopSay();
        // A wrong answer points the child back at the sign (showFeedback speaks it).
        const pointBack = (!correct && typeof speak === 'function') ? 'Look at the sign — add!' : undefined;
        showFeedback(correct, () => {
            if (!alive) return;
            if (correct) {
                solved.add(current);
                score++;
                if (score === problems.length) { alive = false; stopSay(); completeWorksheet('Addition', score, problems.length); return; }
                for (let i = 0; i < problems.length; i++) if (!solved.has(i)) { current = i; break; }
                render();
            } else {
                render();   // same question: keypad stays unlocked, operation is spoken again
            }
        }, pointBack);
    };
    render();
}
