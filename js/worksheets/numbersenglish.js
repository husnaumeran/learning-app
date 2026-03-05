// ============ NUMBERS ENGLISH ============
function showNumbersEnglish() {
    const QUESTIONS = CONFIG.focusNumber;
    const MIN_FOR_UNLOCK = 5;
    const LEVEL_NAMES = ['Hear & Tap','Closest','More Than','Less Than'];
    const STORAGE_KEY = 'ne_level';
    const HISTORY_KEY = 'ne_history';

    let level = parseInt(localStorage.getItem(STORAGE_KEY) || '1');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');

    function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

    function randNum() { return Math.floor(Math.random() * 100) + 1; }

    function nearNums(n, count) {
        const s = new Set();
        while (s.size < count) {
            const offset = Math.floor(Math.random() * 20) - 10;
            const v = n + offset;
            if (v >= 1 && v <= 100 && v !== n) s.add(v);
        }
        return [...s];
    }

    function displayNum(n) { return String(n); }

    function sayNum(n) { speak(String(n)); }

    function makeProblems(lvl) {
        const problems = [];
        const used = new Set();
        let attempts = 0;
        while (problems.length < QUESTIONS && attempts < 200) {
            const n = randNum();
            if (used.has(n)) { attempts++; continue; }
            used.add(n);

            let choices, correct, instruction;
            switch(lvl) {
                case 1: { // Hear & Tap
                    const wrong = nearNums(n, 3);
                    choices = shuffle([n, ...wrong]);
                    correct = n;
                    instruction = 'Tap the number you hear!';
                    break;
                }
                case 2: { // Closest
                    const target = n + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
                    const close = Math.min(100, Math.max(1, target));
                    const wrong = nearNums(n, 3).filter(w => Math.abs(w - n) > Math.abs(close - n));
                    while (wrong.length < 3) { const w = randNum(); if (w !== close && w !== n && !wrong.includes(w)) wrong.push(w); }
                    choices = shuffle([close, ...wrong.slice(0,3)]);
                    correct = close;
                    instruction = 'Which is closest to what you hear?';
                    break;
                }
                case 3: { // More Than
                    const bigger = n + Math.floor(Math.random() * 10) + 1;
                    const b = Math.min(100, bigger);
                    const wrong = [];
                    while (wrong.length < 3) { const w = Math.max(1, n - Math.floor(Math.random() * 15) - 1); if (w < n && !wrong.includes(w) && w !== b) wrong.push(w); }
                    choices = shuffle([b, ...wrong.slice(0,3)]);
                    correct = b;
                    instruction = 'Tap a number MORE than what you hear!';
                    break;
                }
                case 4: { // Less Than
                    const smaller = n - Math.floor(Math.random() * 10) - 1;
                    const s = Math.max(1, smaller);
                    const wrong = [];
                    while (wrong.length < 3) { const w = Math.min(100, n + Math.floor(Math.random() * 15) + 1); if (w > n && !wrong.includes(w) && w !== s) wrong.push(w); }
                    choices = shuffle([s, ...wrong.slice(0,3)]);
                    correct = s;
                    instruction = 'Tap a number LESS than what you hear!';
                    break;
                }
            }
            problems.push({n, choices, correct, instruction});
            attempts++;
        }
        return problems;
    }

    let problems=[], current=0, score=0, skips=0, tried=false;

    function startLevel(l) {
        level = l;
        problems = makeProblems(level);
        current = 0; score = 0; skips = 0; tried = false;
        renderGame();
    }

    function renderPicker() {
        const maxLevel = parseInt(localStorage.getItem(STORAGE_KEY) || '1');
        let html = '<button class="back" onclick="showMenu()">← Back</button>';
        html += '<div class="card"><div class="title">🔢 Numbers — English</div>';
        html += '<div class="inst">Pick a level!</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:15px 0">';
        for (let l = 1; l <= 4; l++) {
            const unlocked = l <= maxLevel;
            const h = history['L'+l] || [];
            const best = h.length ? Math.max(...h.map(s=>s.score)) : 0;
            const bg = !unlocked ? '#666' : (l === maxLevel ? '#22c55e' : '#0099FF');
            html += '<div onclick="'+(unlocked?'startNELevel('+l+')':'')+'" style="background:'+bg+';color:white;padding:15px;border-radius:12px;text-align:center;cursor:'+(unlocked?'pointer':'not-allowed')+';opacity:'+(unlocked?1:0.5)+'">';
            html += '<div style="font-size:22px;font-weight:bold">L'+l+'</div>';
            html += '<div style="font-size:13px;margin-top:3px">'+LEVEL_NAMES[l-1]+'</div>';
            if (unlocked && h.length) html += '<div style="font-size:11px;margin-top:2px">Best: '+best+'/'+QUESTIONS+' (×'+h.length+')</div>';
            html += '</div>';
        }
        html += '</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.startNELevel = startLevel;

    function renderGame() {
        if (current >= problems.length) {
            const key = 'L'+level;
            const h = history[key] || [];
            const answered = problems.length - skips;
            const skipRate = problems.length > 0 ? skips / problems.length : 1;
            const qualifies = answered >= MIN_FOR_UNLOCK && skipRate <= 0.25;
            h.push({score, qualifies});
            history[key] = h;
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

            const maxLevel = parseInt(localStorage.getItem(STORAGE_KEY) || '1');
            if (qualifies && level >= maxLevel && level < 4) {
                const recent = h.slice(-3);
                const threshold = Math.ceil(QUESTIONS * 0.8);
                if (recent.length >= 3 && recent.every(s => s.qualifies && s.score >= threshold)) {
                    localStorage.setItem(STORAGE_KEY, String(level + 1));
                }
            }
            completeWorksheet('Numbers English', score, problems.length);
            return;
        }

        const p = problems[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button>';
        html += '<div class="card"><div class="title">🔢 Numbers — English</div>';
        html += '<div class="inst">'+p.instruction+'</div>';
        html += '<div style="text-align:center;font-size:18px;color:#888;margin-bottom:8px">'+(current+1)+' / '+problems.length+'</div>';

        // Speaker button
        html += '<div style="text-align:center;margin:20px 0">';
        html += '<button onclick="playNESound()" style="font-size:60px;background:none;border:none;cursor:pointer;padding:15px">🔊</button>';
        html += '</div>';

        // 4 choices
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px">';
        p.choices.forEach((ch, i) => {
            html += '<div id="nech'+i+'" onclick="pickNEAnswer('+i+')" style="display:flex;align-items:center;justify-content:center;padding:20px;background:white;border:3px solid #ddd;border-radius:12px;cursor:pointer;font-size:clamp(28px,8vw,40px);font-weight:bold;transition:all 0.2s">';
            html += displayNum(ch);
            html += '</div>';
        });
        html += '</div>';

        // Skip
        html += '<div style="text-align:center;margin-top:12px"><a onclick="skipNE()" style="color:#999;font-size:14px;cursor:pointer">Skip →</a></div>';
        html += '</div>';

        document.getElementById('app').innerHTML = html;
        tried = false;

        // Auto-play sound
        setTimeout(() => sayNum(p.n), 400);
    }

    window.playNESound = function() { sayNum(problems[current].n); };

    window.pickNEAnswer = function(i) {
        const p = problems[current];
        const chosen = p.choices[i];
        const el = document.getElementById('nech'+i);

        let isCorrect = false;
        if (level === 1) isCorrect = (chosen === p.correct);
        else if (level === 2) isCorrect = (chosen === p.correct);
        else if (level === 3) isCorrect = (chosen > p.n);
        else if (level === 4) isCorrect = (chosen < p.n);

        if (isCorrect) {
            if (!tried) score++;
            currentAnswers.push({q: p.n, level, answer: chosen, correct: true, firstTry: !tried});
            el.style.borderColor = '#22c55e';
            el.style.background = '#dcfce7';
            showFeedback(true);
            setTimeout(() => { current++; renderGame(); }, 1200);
        } else {
            tried = true;
            el.style.borderColor = '#ef4444';
            el.style.background = '#fee2e2';
            el.style.opacity = '0.5';
            el.onclick = null;
            showFeedback(false);
        }
    };

    window.skipNE = function() {
        skips++;
        currentAnswers.push({q: problems[current].n, level, answer: 'skip', correct: false, firstTry: false});
        current++;
        renderGame();
    };

    renderPicker();
}