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
        const blankCycle = ['sum', 'sum', 'a', 'sum', 'b'];
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

    function render() {
        const p = problems[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Ways to Make '+focusNumber+'! ➕</div>';

        // Progress dots
        html += '<div style="text-align:center;margin:10px 0">';
        problems.forEach((_, i) => {
            const color = solved.has(i) ? '#00CC66' : (i === current ? '#FF6B35' : '#555');
            html += '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:'+color+';margin:3px"></span>';
        });
        html += '</div>';

        const boxHtml = '<span class="answer-box" id="ansBox">'+(answers[current]!=null ? answers[current] : '?')+'</span>';

        if (p.mode === 'visual') {
            html += '<div style="text-align:center;font-size:36px;margin:10px;color:#333">';
            html += p.a+' <span style="color:#FF6B35">+</span> '+p.b+' <span style="color:#FF6B35">=</span> <span style="color:#FF6B35">?</span></div>';
            html += '<div style="text-align:center;font-size:32px;line-height:1.8;margin:15px 5px">';
            for (let i = 0; i < p.a; i++) html += '<span>'+p.emoji+'</span> ';
            html += '<span style="font-size:28px;color:#FF6B35;margin:0 8px">+</span>';
            for (let i = 0; i < p.b; i++) html += '<span>'+p.emoji+'</span> ';
            html += '</div>';
            html += '<div style="text-align:center;font-size:22px;color:white;margin:5px">How many in all?</div>';
            html += '<div style="text-align:center;font-size:48px;margin:5px;color:#333">'+boxHtml+'</div>';
        } else {
            html += '<div style="text-align:center;font-size:48px;margin:20px;color:#333">';
            html += (p.blank==='a' ? boxHtml : p.a)+' <span style="color:#FF6B35">+</span> '+(p.blank==='b' ? boxHtml : p.b)+' <span style="color:#FF6B35">=</span> '+(p.blank==='sum' ? boxHtml : p.sum);
            html += '</div>';
        }

        html += '</div><div class="keypad">';
        for (let n = 0; n <= 9; n++) html += '<button class="key" onclick="pressKey('+n+')">'+n+'</button>';
        html += '<button class="key red" onclick="clearKey()">⌫</button><button class="key green" onclick="checkKey()">✓</button></div>';
        html += '<div class="score">⭐ '+score+' / '+problems.length+'</div>';
        document.getElementById('app').innerHTML = html;
        questionStartMs = Date.now();
    }

    window.pressKey = (n) => {
        if (solved.has(current)) return;
        const box = document.getElementById('ansBox');
        const base = (box.textContent === '?' ? '' : box.textContent);
        if (base.length >= MAX_DIGITS) return;
        const next = base + n;
        answers[current] = next;
        box.textContent = next;
    };
    window.clearKey = () => {
        if (solved.has(current)) return;
        const box = document.getElementById('ansBox');
        const base = (box.textContent === '?' ? '' : box.textContent);
        const next = base.slice(0, -1);
        answers[current] = next === '' ? null : next;
        box.textContent = next === '' ? '?' : next;
    };
    window.checkKey = () => {
        const ans = document.getElementById('ansBox').textContent;
        if (ans === '?' || ans === '' || solved.has(current)) return;
        const responseTimeMs = Date.now() - questionStartMs;
        attemptCounts[current] = (attemptCounts[current] || 0) + 1;
        const p = problems[current];
        const ansNum = parseInt(ans, 10);
        const correctVal = p.blank === 'sum' ? p.sum : (p.blank === 'a' ? p.a : p.b);
        const correct = ansNum === correctVal;
        const qLabel = (p.blank==='a'?'?':p.a)+'+'+(p.blank==='b'?'?':p.b)+'='+(p.blank==='sum'?'?':p.sum);
        if (attemptCounts[current] === 1) currentAnswers.push({q: qLabel, answer: ansNum, correct: correct});

        recordResponse('addition', {type:'addition', a:p.a, b:p.b, sum:p.sum, blank:p.blank}, String(correctVal), ansNum, correct, attemptCounts[current]===1, attemptCounts[current], responseTimeMs, current);

        showFeedback(correct, () => {
            if (correct) {
                solved.add(current);
                score++;
                if (score === problems.length) { completeWorksheet('Addition', score, problems.length); return; }
                for (let i = 0; i < problems.length; i++) if (!solved.has(i)) { current = i; break; }
                render();
            } else {
                render();
            }
        });
    };
    render();
}
