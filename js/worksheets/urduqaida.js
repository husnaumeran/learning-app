// ============ URDU QAIDA ============
function showUrduQaida() {
    const levels = [
        {name:'Letters (حروف)', key:'urdu_qaida_l1', icon:'🔤'},
        {name:'Harakat (حرکات)', key:'urdu_qaida_l2', icon:'🔊'},
        {name:'Trace (لکھیں)', key:'urdu_qaida_l3', icon:'✏️'},
        {name:'2-Letter Words (دو حرفی)', key:'urdu_qaida_l4', icon:'📖'},
        {name:'What Comes Next (اگلا حرف)', key:'urdu_qaida_l5', icon:'➡️'}
    ];

    function safeProgressHTML() {
        if (typeof levelProgressHTML !== 'function') return '';
        try { return levelProgressHTML('urdu_qaida') || ''; } catch (e) { return ''; }
    }
    function safeUnlockedLevel(curLevel) {
        if (typeof getUnlockedLevel !== 'function') return curLevel;
        try { return Math.max(getUnlockedLevel('urdu_qaida') || curLevel, curLevel); } catch (e) { return curLevel; }
    }
    function isGuided() {
        try { return typeof CONFIG !== 'undefined' && CONFIG.guidedLaunch === true; } catch (e) { return false; }
    }

    let revealed = false;

    function showLevelPicker() {
        const curLevel = getContentLevel('urdu_qaida');
        const unlockedLevel = safeUnlockedLevel(curLevel);
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl;color:#FFD700">📖 قاعدہ — Urdu Qaida</div>';
        if (!CONFIG.sessionId) {
            html += '<div style="text-align:center;color:#f59e0b;font-size:13px;margin-bottom:10px">Practicing for fun right now — progress will save once today\'s session starts.</div>';
        }
        if (isGuided() && !revealed) {
            html += '<div onmousedown="this.holdTimer=setTimeout(()=>{this._held=true;revealUrduQaidaLevels()},3000)" onmouseup="clearTimeout(this.holdTimer);if(!this._held){startUrduLevel('+(curLevel-1)+')}this._held=false" ontouchstart="this.holdTimer=setTimeout(()=>{this._held=true;revealUrduQaidaLevels()},3000)" ontouchend="clearTimeout(this.holdTimer);if(!this._held){startUrduLevel('+(curLevel-1)+')}this._held=false" style="background:#5e4a00;color:white;padding:28px 15px;border-radius:14px;text-align:center;cursor:pointer;font-size:22px;font-weight:bold">🌟 Practice All</div>';
            html += '<div style="text-align:center;color:#666;font-size:12px;margin-top:8px">Hold 3s to see all levels</div>';
            html += '</div>';
            document.getElementById('app').innerHTML = html;
            return;
        }
        levels.forEach((l, i) => {
            const L = i + 1;
            const state = L > unlockedLevel ? 'locked' : (L === curLevel ? 'current' : 'completed');
            const bgColor = state === 'locked' ? '#333' : '#5e4a00';
            const cursor = state === 'locked' ? 'default' : 'pointer';
            const icon = state === 'completed' ? '✅' : (state === 'locked' ? '🔒' : l.icon);
            html += '<div style="background:'+bgColor+';padding:15px;border-radius:12px;margin:8px 0;cursor:'+cursor+';display:flex;align-items:center;gap:12px" ';
            if (state !== 'locked') html += 'onclick="startUrduLevel('+i+')"';
            else html += 'data-level="'+i+'" ontouchstart="this.holdTimer=setTimeout(()=>{forceUnlockUrdu('+i+')},3000)" ontouchend="clearTimeout(this.holdTimer)" onmousedown="this.holdTimer=setTimeout(()=>{forceUnlockUrdu('+i+')},3000)" onmouseup="clearTimeout(this.holdTimer)"';
            html += '>';
            html += '<span style="font-size:28px">'+icon+'</span>';
            html += '<div style="flex:1"><div style="color:white;font-size:18px">Level '+L+': '+l.name+'</div>';
            if (state === 'completed') {
                html += '<div style="color:#ffe066;font-size:12px">Completed</div>';
            } else if (state === 'current') {
                const prog = safeProgressHTML();
                if (prog) html += '<div style="color:#aaa;font-size:12px">'+prog+'</div>';
            } else {
                html += '<div style="color:#666;font-size:12px">Unlocks after Level '+(L-1)+' (hold 3s to skip ahead)</div>';
            }
            html += '</div></div>';
        });
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    window.revealUrduQaidaLevels = () => { revealed = true; showLevelPicker(); };

    window.forceUnlockUrdu = async (level) => {
        if (typeof raiseSkillLevel === 'function') {
            try { await raiseSkillLevel('urdu_qaida', level + 1); } catch (e) {}
        }
        showLevelPicker();
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
        const letters = URDU_LETTERS.slice(0, getQuestionCount('urdu_qaida'));
        let current = 0;
        function render() {
            startItemTimer();
            const l = letters[current];
            let html = '<button class="back" onclick="showUrduQaida()">← Back</button><div class="card">';
            const audible = canHearLetter('ur', l.letter);
            const tap = audible ? ' onclick="playLetterSound(\'ur\',\''+l.letter+'\')"' : '';
            html += '<div class="title" style="color:#FFD700;direction:rtl">Level 1: حروف 🔤</div>';
            html += '<div style="text-align:center;font-size:100px;margin:15px;font-family:serif;direction:rtl;'+(audible?'cursor:pointer':'')+'"'+tap+'>'+l.letter+'</div>';
            html += '<div style="text-align:center;color:#333;font-size:24px">'+l.name+'</div>';
            if (audible) html += '<button class="btn" style="font-size:20px;padding:14px 28px;margin:10px auto;display:block;background:#FFD700;color:#333"'+tap+'>🔊 Listen</button>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevUQL()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextUQL()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
            if (audible) playLetterSound('ur', l.letter);
        }
        window.prevUQL = () => { if (current > 0) { current--; render(); } };
        window.nextUQL = () => {
            recordPassiveResponse('urdu_qaida', {type:'urdu_qaida_letters', letter: letters[current].letter}, current, 1);
            current++;
            if (current >= letters.length) { completeWorksheet('Urdu Qaida L1', letters.length, letters.length); return; }
            render();
        };
        render();
    }

    // ===== LEVEL 2: Harakat =====
    function uqHarakat() {
        const letters = URDU_LETTERS.slice(0, getQuestionCount('urdu_qaida'));
        let current = 0, harakatMode = 0;
        const harakatNames = ['زَبَر (Fatha)', 'زِیر (Kasra)', 'پِیش (Damma)'];
        const harakatKeys = ['fatha', 'kasra', 'damma'];
        const soundKeys = ['sf', 'sk', 'sd'];
        function render() {
            startItemTimer();
            const l = letters[current];
            const hkey = harakatKeys[harakatMode];
            const display = l[hkey];
            const sound = l[soundKeys[harakatMode]];
            // The transliteration ("ba", "bi", "bu") is a label, never the sound: speech reads it in a generic voice.
            const audible = canHearHarakat('ur', l.letter, hkey);
            const tap = audible ? ' onclick="playHarakatSound(\'ur\',\''+l.letter+'\',\''+hkey+'\')"' : '';
            let html = '<button class="back" onclick="showUrduQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#FFD700;direction:rtl">Level 2: حرکات 🔊</div>';
            html += '<div style="text-align:center;font-size:80px;margin:10px;font-family:serif;direction:rtl;'+(audible?'cursor:pointer':'')+'"'+tap+'>'+display+'</div>';
            html += '<div style="text-align:center;color:#333;font-size:22px;margin:5px">'+sound+'</div>';
            if (audible) html += '<button class="btn" style="font-size:20px;padding:14px 28px;margin:10px auto;display:block;background:#FFD700;color:#333"'+tap+'>🔊 Listen</button>';
            html += '<div style="display:flex;justify-content:center;gap:8px;margin:10px 0">';
            harakatNames.forEach((h, i) => {
                const active = i === harakatMode ? 'background:#FFD700;color:#333' : 'background:#444;color:#aaa';
                html += '<button style="padding:8px 12px;border-radius:8px;border:none;font-size:13px;cursor:pointer;'+active+'" onclick="setUQH('+i+')">'+h+'</button>';
            });
            html += '</div>';
            html += '<div style="display:flex;justify-content:center;gap:15px;margin:10px 0">';
            [{key:'fatha',skey:'sf',color:'#FFD700'},{key:'kasra',skey:'sk',color:'#0099FF'},{key:'damma',skey:'sd',color:'#FF6B35'}].forEach(h => {
                const htap = canHearHarakat('ur', l.letter, h.key) ? ' onclick="playHarakatSound(\'ur\',\''+l.letter+'\',\''+h.key+'\')"' : '';
                html += '<div style="text-align:center;'+(htap?'cursor:pointer;':'')+'padding:14px;border-radius:10px;background:#333"'+htap+'><div style="font-size:36px;font-family:serif;direction:rtl">'+l[h.key]+'</div><div style="color:'+h.color+';font-size:16px">'+l[h.skey]+'</div></div>';
            });
            html += '</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:10px"><button class="key" onclick="prevUQH()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextUQH()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
            if (audible) playHarakatSound('ur', l.letter, hkey);
        }
        window.setUQH = (m) => { harakatMode = m; render(); };
        window.prevUQH = () => { if (current > 0) { current--; render(); } };
        window.nextUQH = () => {
            recordPassiveResponse('urdu_qaida', {type:'urdu_qaida_harakat', letter: letters[current].letter, harakat: harakatKeys[harakatMode]}, current, 2);
            current++;
            if (current >= letters.length) { completeWorksheet('Urdu Qaida L2', letters.length, letters.length); return; }
            render();
        };
        render();
    }

    // ===== LEVEL 3: Trace =====
    function uqTrace() {
        const letters = URDU_LETTERS.slice(0, getQuestionCount('urdu_qaida'));
        let current = 0, harakatMode = 0;
        const saved = {};
        const harakatNames = ['زَبَر', 'زِیر', 'پِیش'];
        const harakatKeys = ['fatha', 'kasra', 'damma'];
        function render() {
            startItemTimer();
            const l = letters[current];
            const hkey = harakatKeys[harakatMode];
            const display = l[hkey];
            const audible = canHearHarakat('ur', l.letter, hkey);
            let html = '<button class="back" onclick="showUrduQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#FFD700;direction:rtl">Level 3: لکھیں ✏️ — '+l.name+'</div>';
            if (audible) html += '<button class="btn" style="font-size:20px;padding:14px 28px;margin:8px auto;display:block;background:#FFD700;color:#333" onclick="playHarakatSound(\'ur\',\''+l.letter+'\',\''+hkey+'\')">🔊 Listen</button>';
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
            if (audible) playHarakatSound('ur', l.letter, hkey);
        }
        function saveCanvas() { try { saved[current+'_'+harakatMode] = document.getElementById('canvas').toDataURL(); } catch(e) {} }
        window.clearCanvas = () => { const c = document.getElementById('canvas'); c.getContext('2d').clearRect(0, 0, c.width, c.height); };
        window.setUQT = (m) => { saveCanvas(); harakatMode = m; render(); };
        window.prevUQT = () => { if (current > 0) { saveCanvas(); current--; render(); } };
        window.nextUQT = () => {
            recordPassiveResponse('urdu_qaida', {type:'urdu_qaida_trace', letter: letters[current].letter, harakat: harakatKeys[harakatMode]}, current, 3);
            saveCanvas(); current++; if (current >= letters.length) { completeWorksheet('Urdu Qaida L3', letters.length, letters.length); return; } render();
        };
        render();
    }

    // ===== LEVEL 4: 2-Letter Words =====
    function uq2Letter() {
        const words = [...URDU_WORDS].sort(() => Math.random()-0.5).slice(0, getQuestionCount('urdu_qaida'));
        let current = 0;
        function render() {
            startItemTimer();
            const w = words[current];
            let html = '<button class="back" onclick="showUrduQaida()">← Back</button><div class="card">';
            // No recordings exist for whole words, so the button is only honest where a voice is installed.
            const audible = hasSpeechVoice('ur');
            const tap = audible ? ' onclick="speakUrdu(\''+w.sound+'\')"' : '';
            html += '<div class="title" style="color:#FFD700;direction:rtl">Level 4: دو حرفی 📖</div>';
            html += '<div style="text-align:center;font-size:72px;margin:20px;font-family:serif;direction:rtl;'+(audible?'cursor:pointer':'')+'"'+tap+'>'+w.word+'</div>';
            if (audible) html += '<button class="btn" style="font-size:22px;padding:14px 28px;margin:10px auto;display:block;background:#FFD700;color:#333"'+tap+'>🔊 '+w.sound+'</button>';
            else html += '<div style="text-align:center;color:#FFD700;font-size:26px;margin:10px">'+w.sound+'</div>';
            html += '<div style="text-align:center;color:#aaa;font-size:18px;margin:10px">'+w.meaning+'</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevUQ2()">← Prev</button><span class="score">'+(current+1)+' / '+words.length+'</span><button class="key green" onclick="nextUQ2()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.prevUQ2 = () => { if (current > 0) { current--; render(); } };
        window.nextUQ2 = () => {
            recordPassiveResponse('urdu_qaida', {type:'urdu_qaida_2letter', word: words[current].word}, current, 4);
            current++;
            if (current >= words.length) { completeWorksheet('Urdu Qaida L4', words.length, words.length); return; }
            render();
        };
        render();
    }

    // ===== LEVEL 5: What Comes Next =====
    function uqWhatNext() {
        const focus = Math.min(getQuestionCount('urdu_qaida'), URDU_LETTERS.length);
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
            if (current >= problems.length) { completeWorksheet('Urdu Qaida L5', score, problems.length); return; }
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
            questionStartMs = Date.now();
        }
        let questionStartMs = null;
        window.pickUQN = (choice) => {
            const responseTimeMs = Date.now() - questionStartMs;
            const correct = choice === problems[current].ans;
            currentAnswers.push({q: problems[current].seq.join('←')+'←?', answer: choice, correct: correct});
            recordResponse('urdu_qaida', {type:'urdu_qaida', sequence:problems[current].seq, correct_answer:problems[current].ans}, problems[current].ans, choice, correct, true, 1, responseTimeMs, current, false, 5);
            showFeedback(correct, () => { if (correct) score++; current++; render(); });
        };
        render();
    }

    // ===== MASTERY CHECK =====
    // Pool/choice builders now live at top-level as urduQaidaCheckPool/urduQaidaBuildChoices (shared with window.qaidaCheckQuestions).
    // Fixed-size loops only: a shuffle-then-slice can never spin, unlike rejection sampling.
    function buildCheckQuestions(pool) {
        if (!pool.length) return [];
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const qs = [];
        for (let i = 0; i < 10; i++) qs.push(shuffled[i % shuffled.length]);
        return qs;
    }

    let checkQuestions = [], checkCurrent = 0, checkAttempt = 1, checkScore = 0, checkLevel = 1, checkRunId = 0, checkQStartMs = null;

    window.startUrduQaidaCheck = () => {
        if (!CONFIG.sessionId) { showLevelPicker(); return; }
        checkLevel = getContentLevel('urdu_qaida');
        const pool = urduQaidaCheckPool(checkLevel - 1);
        checkQuestions = buildCheckQuestions(pool);
        if (!checkQuestions.length) { showLevelPicker(); return; }
        checkCurrent = 0; checkAttempt = 1; checkScore = 0; checkRunId = Date.now();
        renderCheckQuestion();
    };

    function renderCheckQuestion() {
        const pool = urduQaidaCheckPool(checkLevel - 1);
        const q = checkQuestions[checkCurrent];
        const choices = urduQaidaBuildChoices(pool, q);
        const big = pool.every(p => p.display.length <= 3);
        let html = '<button class="back" onclick="showUrduQaida()">← Back</button><div class="card">';
        const audible = canHearQaidaPrompt(q);
        html += '<div class="title" style="color:#FFD700;direction:rtl">📖 Mastery Check — Level '+checkLevel+'</div>';
        // Nothing to play means the parent reads the prompt out; the pool has already dropped
        // any item we could neither voice nor print.
        if (audible) html += '<button class="btn" style="font-size:20px;padding:14px 28px;margin:10px auto;display:block;background:#FFD700;color:#333" onclick="replayUrduQaidaPrompt()">🔊 Listen</button>';
        else html += '<div style="text-align:center;color:#FFD700;font-size:30px;margin:14px">'+q.sound+'</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:15px;direction:rtl">';
        choices.forEach(c => {
            html += '<div style="font-size:'+(big?'48px':'32px')+';font-family:serif;text-align:center;padding:18px;background:#333;border-radius:14px;cursor:pointer;color:white" onclick="pickUrduQaidaCheck(\''+c.display+'\')">'+c.display+'</div>';
        });
        html += '</div>';
        html += '<div class="score">⭐ '+checkScore+' / '+checkQuestions.length+' — Question '+(checkCurrent+1)+' of '+checkQuestions.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
        checkQStartMs = Date.now();
        if (audible) playQaidaPrompt(q);
    }

    window.replayUrduQaidaPrompt = () => { playQaidaPrompt(checkQuestions[checkCurrent]); };

    function checkWrongFeedback(callback) {
        const title = document.querySelector('.title');
        const card = document.querySelector('.card');
        if (title) { title.innerHTML = '🤔 Try again!'; title.style.color = '#ef4444'; }
        if (card) card.style.animation = 'shake 0.5s';
        setTimeout(callback, 1000);
    }

    window.pickUrduQaidaCheck = (choice) => {
        const q = checkQuestions[checkCurrent];
        const correct = choice === q.display;
        const isFirstTry = checkAttempt === 1;
        const responseTimeMs = checkQStartMs ? Date.now() - checkQStartMs : null;
        recordResponse('urdu_qaida', {type:'qaida_check', purpose:'check', level: checkLevel, item: q.display}, q.display, choice, correct, isFirstTry, checkAttempt, responseTimeMs, 'chk'+checkRunId+'_'+checkCurrent, false, checkLevel);
        if (correct) {
            if (isFirstTry) checkScore++;
            showFeedback(true, () => {
                checkCurrent++;
                checkAttempt = 1;
                if (checkCurrent >= checkQuestions.length) { finishUrduQaidaCheck(); return; }
                renderCheckQuestion();
            });
        } else {
            checkAttempt++;
            checkWrongFeedback(() => { renderCheckQuestion(); });
        }
    };

    async function finishUrduQaidaCheck() {
        let result = null;
        if (typeof evaluateSkillMastery === 'function') {
            try { result = await evaluateSkillMastery('urdu_qaida'); } catch (e) {}
        }
        if (result && result.level_unlocked) {
            if (typeof celebrateLevelUnlock === 'function') {
                try { await celebrateLevelUnlock('urdu_qaida', result.unlocked_level); } catch (e) {}
            }
            showUrduQaida();
            return;
        }
        showCheckResult();
    }

    function showCheckResult() {
        const warm = checkScore >= 8 ? 'Amazing work! 🌟' : (checkScore >= 5 ? 'Great effort! A bit more practice and you\'ll have it.' : 'Good try! Keep practicing this level.');
        let html = '<button class="back" onclick="showUrduQaida()">← Back</button><div class="card">';
        html += '<div class="title" style="color:#FFD700;direction:rtl">📖 Check Complete!</div>';
        html += '<div style="text-align:center;font-size:40px;margin:20px">⭐ '+checkScore+' / '+checkQuestions.length+'</div>';
        html += '<div style="text-align:center;color:#aaa;font-size:18px;margin:10px">'+warm+'</div>';
        html += '<button class="btn" style="font-size:18px;padding:12px 25px;margin:15px auto;display:block;background:#FFD700;color:#333" onclick="showUrduQaida()">Back to Levels</button>';
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    showLevelPicker();
}

// Items carry lang/letter/harakat so the check can play the real recording instead of
// speaking the transliteration, and qaidaPromptable drops any the child could not hear or be read.
function urduQaidaCheckPool(levelIdx) {
    let pool;
    if (levelIdx === 0 || levelIdx === 4) {
        pool = URDU_LETTERS.map(l => ({sound: l.letter, display: l.letter, lang: 'ur', letter: l.letter}));
    } else if (levelIdx === 1 || levelIdx === 2) {
        const harakatKeys = ['fatha', 'kasra', 'damma'], soundKeys = ['sf', 'sk', 'sd'];
        pool = [];
        URDU_LETTERS.forEach(l => harakatKeys.forEach((hk, m) => pool.push({sound: l[soundKeys[m]], display: l[hk], lang: 'ur', letter: l.letter, harakat: hk})));
    } else {
        pool = URDU_WORDS.map(w => ({sound: w.sound, display: w.word, lang: 'ur'}));
    }
    return pool.filter(qaidaPromptable);
}

function urduQaidaBuildChoices(pool, correct) {
    const seen = new Set([correct.display]);
    const distractors = [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length && distractors.length < 3; i++) {
        // Different letters share a sound (س ص ث, ز ذ ض ظ): one that sounds like the answer would make the question unanswerable.
        if (seen.has(shuffled[i].display) || shuffled[i].sound === correct.sound) continue;
        seen.add(shuffled[i].display);
        distractors.push(shuffled[i]);
    }
    return [correct, ...distractors].sort(() => Math.random() - 0.5);
}

// Same shape as makeAssessmentQs (skill_id/choices/correct/qdata) so buildDailyTest can render either uniformly; sound/display carry the audio-first Qaida presentation.
function buildUrduQaidaCheckQuestions(level, count) {
    const lvl = Math.min(5, Math.max(1, level || 1));
    const n = Math.max(1, count || 10);
    const pool = urduQaidaCheckPool(lvl - 1);
    if (!pool.length) return [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const qs = [];
    for (let i = 0; i < n; i++) {
        const q = shuffled[i % shuffled.length];
        qs.push({
            skill_id: 'urdu_qaida',
            sound: q.sound,
            display: q.display,
            lang: q.lang,
            letter: q.letter,
            harakat: q.harakat,
            choices: urduQaidaBuildChoices(pool, q).map(c => c.display),
            correct: q.display,
            level: lvl,
            qdata: {type:'qaida_check', purpose:'check', level: lvl, item: q.display}
        });
    }
    return qs;
}
