// ============ URDU QAIDA ============
function showUrduQaida() {
    const levels = [
        {name:'Letters (حروف)', key:'urdu_qaida_l1', icon:'🔤'},
        {name:'Harakat (حرکات)', key:'urdu_qaida_l2', icon:'🔊'},
        {name:'Trace (لکھیں)', key:'urdu_qaida_l3', icon:'✏️'},
        {name:'2-Letter Words (دو حرفی)', key:'urdu_qaida_l4', icon:'📖'},
        {name:'What Comes Next (اگلا حرف)', key:'urdu_qaida_l5', icon:'➡️'}
    ];
    const REQUIRED_COMPLETIONS = 5;

    function getCompletions(level) {
        return JSON.parse(localStorage.getItem(levels[level].key) || '[]');
    }
    function isUnlocked(level) {
        if (level === 0) return true;
        const override = parseInt(localStorage.getItem('urdu_qaida_unlocked') || '0');
        if (override >= level) return true;
        return getCompletions(level - 1).length >= REQUIRED_COMPLETIONS;
    }
    function addCompletion(level) {
        const key = levels[level].key;
        const completions = getCompletions(level);
        const today = new Date().toISOString().split('T')[0];
        if (!completions.includes(today)) { completions.push(today); localStorage.setItem(key, JSON.stringify(completions)); }
    }

    function showLevelPicker() {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl;color:#FFD700">📖 قاعدہ — Urdu Qaida</div>';
        levels.forEach((l, i) => {
            const unlocked = isUnlocked(i);
            const completions = getCompletions(i);
            const progress = Math.min(completions.length, REQUIRED_COMPLETIONS);
            const bgColor = unlocked ? '#5e4a00' : '#333';
            const cursor = unlocked ? 'pointer' : 'default';
            html += '<div style="background:'+bgColor+';padding:15px;border-radius:12px;margin:8px 0;cursor:'+cursor+';display:flex;align-items:center;gap:12px" ';
            if (unlocked) html += 'onclick="startUrduLevel('+i+')"';
            else html += 'data-level="'+i+'" ontouchstart="this.holdTimer=setTimeout(()=>{forceUnlockUrdu('+i+')},3000)" ontouchend="clearTimeout(this.holdTimer)" onmousedown="this.holdTimer=setTimeout(()=>{forceUnlockUrdu('+i+')},3000)" onmouseup="clearTimeout(this.holdTimer)"';
            html += '>';
            html += '<span style="font-size:28px">'+(unlocked ? l.icon : '🔒')+'</span>';
            html += '<div style="flex:1"><div style="color:white;font-size:18px">Level '+(i+1)+': '+l.name+'</div>';
            if (unlocked) {
                html += '<div style="color:#aaa;font-size:12px">Practiced: '+progress+' / '+REQUIRED_COMPLETIONS+' days</div>';
                html += '<div style="background:#444;border-radius:4px;height:6px;margin-top:4px"><div style="background:#FFD700;border-radius:4px;height:6px;width:'+(progress/REQUIRED_COMPLETIONS*100)+'%"></div></div>';
            } else {
                html += '<div style="color:#666;font-size:12px">Complete Level '+i+' more to unlock (hold 3s to override)</div>';
            }
            html += '</div></div>';
        });
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    window.forceUnlockUrdu = (level) => {
        const current = parseInt(localStorage.getItem('urdu_qaida_unlocked') || '0');
        if (level > current) { localStorage.setItem('urdu_qaida_unlocked', level); showLevelPicker(); speak('Level unlocked!'); }
    };

    window.startUrduLevel = (level) => {
        if (level === 0) uqLetters();
        else if (level === 1) uqHarakat();
        else if (level === 2) uqTrace();
        else if (level === 3) uq2Letter();
        else if (level === 4) uqWhatNext();
    };

    // ===== LEVEL 1: Individual Letters =====
    function uqLetters() {
        const letters = URDU_LETTERS.slice(0, CONFIG.focusNumber);
        let current = 0;
        function render() {
            const l = letters[current];
            let html = '<button class="back" onclick="showUrduQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#FFD700;direction:rtl">Level 1: حروف 🔤</div>';
            html += '<div style="text-align:center;font-size:100px;margin:15px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakUrdu(\''+l.letter+'\')">'+l.letter+'</div>';
            html += '<div style="text-align:center;color:white;font-size:24px">'+l.name+'</div>';
            html += '<button class="btn" style="font-size:20px;padding:12px 25px;margin:10px auto;display:block;background:#FFD700;color:#333" onclick="speakUrdu(\''+l.letter+'\')">🔊 Listen</button>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevUQL()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextUQL()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.prevUQL = () => { if (current > 0) { current--; render(); } };
        window.nextUQL = () => { current++; if (current >= letters.length) { addCompletion(0); completeWorksheet('Urdu Qaida L1', letters.length, letters.length); return; } render(); };
        render();
    }

    // ===== LEVEL 2: Harakat =====
    function uqHarakat() {
        const letters = URDU_LETTERS.slice(0, CONFIG.focusNumber);
        let current = 0, harakatMode = 0;
        const harakatNames = ['زَبَر (Fatha)', 'زِیر (Kasra)', 'پِیش (Damma)'];
        const harakatKeys = ['fatha', 'kasra', 'damma'];
        const soundKeys = ['sf', 'sk', 'sd'];
        function render() {
            const l = letters[current];
            const display = l[harakatKeys[harakatMode]];
            const sound = l[soundKeys[harakatMode]];
            let html = '<button class="back" onclick="showUrduQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#FFD700;direction:rtl">Level 2: حرکات 🔊</div>';
            html += '<div style="text-align:center;font-size:80px;margin:10px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakUrdu(\''+sound+'\')">'+display+'</div>';
            html += '<div style="text-align:center;color:white;font-size:22px;margin:5px">'+sound+'</div>';
            html += '<div style="display:flex;justify-content:center;gap:8px;margin:10px 0">';
            harakatNames.forEach((h, i) => {
                const active = i === harakatMode ? 'background:#FFD700;color:#333' : 'background:#444;color:#aaa';
                html += '<button style="padding:8px 12px;border-radius:8px;border:none;font-size:13px;cursor:pointer;'+active+'" onclick="setUQH('+i+')">'+h+'</button>';
            });
            html += '</div>';
            html += '<div style="display:flex;justify-content:center;gap:15px;margin:10px 0">';
            [{key:'fatha',skey:'sf',color:'#FFD700'},{key:'kasra',skey:'sk',color:'#0099FF'},{key:'damma',skey:'sd',color:'#FF6B35'}].forEach(h => {
                html += '<div style="text-align:center;cursor:pointer;padding:10px;border-radius:10px;background:#333" onclick="speakUrdu(\''+l[h.skey]+'\')"><div style="font-size:36px;font-family:serif;direction:rtl">'+l[h.key]+'</div><div style="color:'+h.color+';font-size:16px">'+l[h.skey]+'</div></div>';
            });
            html += '</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:10px"><button class="key" onclick="prevUQH()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextUQH()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.setUQH = (m) => { harakatMode = m; render(); };
        window.prevUQH = () => { if (current > 0) { current--; render(); } };
        window.nextUQH = () => { current++; if (current >= letters.length) { addCompletion(1); completeWorksheet('Urdu Qaida L2', letters.length, letters.length); return; } render(); };
        render();
    }

    // ===== LEVEL 3: Trace =====
    function uqTrace() {
        const letters = URDU_LETTERS.slice(0, CONFIG.focusNumber);
        let current = 0, harakatMode = 0;
        const saved = {};
        const harakatNames = ['زَبَر', 'زِیر', 'پِیش'];
        const harakatKeys = ['fatha', 'kasra', 'damma'];
        function render() {
            const l = letters[current];
            const display = l[harakatKeys[harakatMode]];
            let html = '<button class="back" onclick="showUrduQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#FFD700;direction:rtl">Level 3: لکھیں ✏️ — '+l.name+'</div>';
            html += '<div style="display:flex;justify-content:center;gap:5px;margin:5px 0">';
            harakatNames.forEach((h, i) => {
                const active = i === harakatMode ? 'background:#FFD700;color:#333' : 'background:#444;color:#aaa';
                html += '<button style="padding:6px 10px;border-radius:8px;border:none;font-size:13px;cursor:pointer;'+active+'" onclick="setUQT('+i+')">'+h+'</button>';
            });
            html += '</div>';
            html += '<div class="trace-container" style="direction:rtl"><div class="trace-letter" style="font-family:serif">'+display+'</div><canvas id="canvas" class="trace-canvas"></canvas></div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:10px"><button class="key red" onclick="clearCanvas()">Clear</button><button class="key" onclick="prevUQT()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextUQT()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
            setupCanvas();
            if (saved[current+'_'+harakatMode]) { const img = new Image(); img.onload = () => { document.getElementById('canvas').getContext('2d').drawImage(img,0,0); }; img.src = saved[current+'_'+harakatMode]; }
        }
        function saveCanvas() { try { saved[current+'_'+harakatMode] = document.getElementById('canvas').toDataURL(); } catch(e) {} }
        window.clearCanvas = () => { const c = document.getElementById('canvas'); c.getContext('2d').clearRect(0, 0, c.width, c.height); };
        window.setUQT = (m) => { saveCanvas(); harakatMode = m; render(); };
        window.prevUQT = () => { if (current > 0) { saveCanvas(); current--; render(); } };
        window.nextUQT = () => { saveCanvas(); current++; if (current >= letters.length) { addCompletion(2); completeWorksheet('Urdu Qaida L3', letters.length, letters.length); return; } render(); };
        render();
    }

    // ===== LEVEL 4: 2-Letter Words =====
    function uq2Letter() {
        const words = URDU_WORDS.slice(0, CONFIG.focusNumber);
        let current = 0;
        function render() {
            const w = words[current];
            let html = '<button class="back" onclick="showUrduQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#FFD700;direction:rtl">Level 4: دو حرفی 📖</div>';
            html += '<div style="text-align:center;font-size:72px;margin:20px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakUrdu(\''+w.sound+'\')">'+w.word+'</div>';
            html += '<button class="btn" style="font-size:22px;padding:12px 25px;margin:10px auto;display:block;background:#FFD700;color:#333" onclick="speakUrdu(\''+w.sound+'\')">🔊 '+w.sound+'</button>';
            html += '<div style="text-align:center;color:#aaa;font-size:18px;margin:10px">'+w.meaning+'</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevUQ2()">← Prev</button><span class="score">'+(current+1)+' / '+words.length+'</span><button class="key green" onclick="nextUQ2()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.prevUQ2 = () => { if (current > 0) { current--; render(); } };
        window.nextUQ2 = () => { current++; if (current >= words.length) { addCompletion(3); completeWorksheet('Urdu Qaida L4', words.length, words.length); return; } render(); };
        render();
    }

    // ===== LEVEL 5: What Comes Next =====
    function uqWhatNext() {
        const focus = Math.min(CONFIG.focusNumber, URDU_LETTERS.length);
        const letters = URDU_LETTERS.slice(0, focus);
        const problems = [];
        for (let i = 0; i <= focus - 5; i += 2) {
            const seq = letters.slice(i, i+4).map(l => l.letter);
            const ans = letters[i+4].letter;
            problems.push({seq: seq, ans: ans});
        }
        if (focus >= 5) {
            const start = Math.min(focus-1, URDU_LETTERS.length-1);
            const seq = [];
            for (let i = start; i > start-4 && i >= 0; i--) seq.push(URDU_LETTERS[i].letter);
            if (start-4 >= 0) problems.push({seq: seq, ans: URDU_LETTERS[start-4].letter});
        }
        let current = 0, score = 0;
        function render() {
            if (current >= problems.length) { addCompletion(4); completeWorksheet('Urdu Qaida L5', score, problems.length); return; }
            const p = problems[current];
            const wrongLetters = URDU_LETTERS.filter(l => l.letter !== p.ans).sort(() => Math.random()-0.5).slice(0,3).map(l => l.letter);
            const options = [p.ans, ...wrongLetters].sort(() => Math.random()-0.5);
            let html = '<button class="back" onclick="showUrduQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#FFD700;direction:rtl">Level 5: اگلا حرف ➡️</div>';
            html += '<div style="display:flex;justify-content:center;gap:12px;margin:20px;direction:rtl;flex-wrap:wrap">';
            p.seq.forEach(l => { html += '<div style="font-size:40px;font-family:serif;padding:10px 15px;background:#333;border-radius:10px;color:white">'+l+'</div>'; });
            html += '<div style="font-size:40px;padding:10px 15px;background:#444;border-radius:10px;color:#FFD700;font-weight:bold">?</div>';
            html += '</div>';
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:15px">';
            options.forEach(o => {
                html += '<div style="font-size:36px;font-family:serif;text-align:center;padding:15px;background:#333;border-radius:12px;cursor:pointer;color:white;direction:rtl" onclick="pickUQN(\''+o+'\')">'+o+'</div>';
            });
            html += '</div>';
            html += '<div class="score">⭐ '+score+' / '+problems.length+'</div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.pickUQN = (choice) => {
            const correct = choice === problems[current].ans;
            currentAnswers.push({q: problems[current].seq.join('←')+'←?', a: choice, correct: correct});
            showFeedback(correct, () => { if (correct) score++; current++; render(); });
        };
        render();
    }

    showLevelPicker();
}
