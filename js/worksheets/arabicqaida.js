// ============ ARABIC QAIDA ============
function showArabicQaida() {
    const levels = [
        {name:'Letters (حروف)', key:'qaida_l1', icon:'🔤'},
        {name:'Harakat (حركات)', key:'qaida_l2', icon:'🔊'},
        {name:'Connections (مركبات)', key:'qaida_l3', icon:'🔗'},
        {name:'2-Letter (مقطع)', key:'qaida_l4', icon:'📖'},
        {name:'3-Letter Words (كلمات)', key:'qaida_l5', icon:'📚'}
    ];

    function safeProgress() {
        if (typeof getSkillProgress !== 'function') return null;
        try { return getSkillProgress('arabic_qaida'); } catch (e) { return null; }
    }
    function safeProgressHTML() {
        if (typeof levelProgressHTML !== 'function') return '';
        try { return levelProgressHTML('arabic_qaida') || ''; } catch (e) { return ''; }
    }

    function showLevelPicker() {
        const curLevel = getContentLevel('arabic_qaida');
        const progress = safeProgress();
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl;color:#22c55e">📖 القاعدة — Arabic Qaida</div>';
        if (!CONFIG.sessionId) {
            html += '<div style="text-align:center;color:#f59e0b;font-size:13px;margin-bottom:10px">Practicing for fun right now — progress will save once today\'s session starts.</div>';
        }
        levels.forEach((l, i) => {
            const L = i + 1;
            const state = L < curLevel ? 'completed' : (L === curLevel ? 'current' : 'locked');
            const bgColor = state === 'locked' ? '#333' : '#1a5e1a';
            const cursor = state === 'locked' ? 'default' : 'pointer';
            const icon = state === 'completed' ? '✅' : (state === 'locked' ? '🔒' : l.icon);
            html += '<div style="background:'+bgColor+';padding:15px;border-radius:12px;margin:8px 0;cursor:'+cursor+';display:flex;align-items:center;gap:12px" ';
            if (state !== 'locked') html += 'onclick="startLevel('+i+')"';
            else html += 'data-level="'+i+'" ontouchstart="this.holdTimer=setTimeout(()=>{forceUnlock('+i+')},3000)" ontouchend="clearTimeout(this.holdTimer)" onmousedown="this.holdTimer=setTimeout(()=>{forceUnlock('+i+')},3000)" onmouseup="clearTimeout(this.holdTimer)"';
            html += '>';
            html += '<span style="font-size:28px">'+icon+'</span>';
            html += '<div style="flex:1"><div style="color:white;font-size:18px">Level '+L+': '+l.name+'</div>';
            if (state === 'completed') {
                html += '<div style="color:#4ade80;font-size:12px">Completed</div>';
            } else if (state === 'current') {
                const prog = safeProgressHTML();
                if (prog) html += '<div style="color:#aaa;font-size:12px">'+prog+'</div>';
            } else {
                html += '<div style="color:#666;font-size:12px">Unlocks after Level '+(L-1)+' (hold 3s to skip ahead)</div>';
            }
            html += '</div></div>';
            if (state === 'current' && CONFIG.sessionId && progress && progress.check_ready) {
                html += '<button class="btn green" style="font-size:16px;padding:12px 20px;margin:2px 0 10px;display:block;width:100%" onclick="startArabicQaidaCheck()">✅ Take the Check!</button>';
            }
        });
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    window.forceUnlock = async (level) => {
        if (typeof raiseSkillLevel === 'function') {
            try { await raiseSkillLevel('arabic_qaida', level + 1); } catch (e) {}
        }
        showLevelPicker();
    };

    window.startLevel = (level) => {
        if (level === 0) levelLetters();
        else if (level === 1) levelHarakat();
        else if (level === 2) levelConnections();
        else if (level === 3) level2Letter();
        else if (level === 4) level3Letter();
    };

    // ===== LEVEL 1: Individual Letters =====
    function levelLetters() {
        const letters = ARABIC_LETTERS.slice(0, getFocusNumber('arabic_qaida'));
        let current = 0;
        function render() {
            startItemTimer();
            const l = letters[current];
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#22c55e;direction:rtl">عربی Arabic — Letters 🔤</div>';
            html += '<div style="text-align:center;font-size:100px;margin:15px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakArabic(\''+l.aname+'\')">'+l.letter+'</div>';
            html += '<div style="text-align:center;color:white;font-size:24px">'+l.name+'</div>';
            html += '<button class="btn green" style="font-size:20px;padding:12px 25px;margin:10px auto;display:block" onclick="speakArabic(\''+l.aname+'\')">🔊 Listen</button>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevQL()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextQL()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.prevQL = () => { if (current > 0) { current--; render(); } };
        window.nextQL = () => {
            currentAnswers.push({q: letters[current].letter, answer: letters[current].name, correct: true});
            recordPassiveResponse('arabic_qaida', {type:'qaida_letters', letter: letters[current].letter}, current, 1);
            current++;
            if (current >= letters.length) { completeWorksheet('Arabic Qaida L1', letters.length, letters.length); return; }
            render();
        };
        render();
    }

    // ===== LEVEL 2: Harakat =====
    function levelHarakat() {
        const letters = ARABIC_LETTERS.slice(0, getFocusNumber('arabic_qaida'));
        let current = 0, harakatMode = 0;
        const harakatNames = ['فَتْحَة (Fatha)', 'كَسْرَة (Kasra)', 'ضَمَّة (Damma)'];
        const harakatKeys = ['fatha', 'kasra', 'damma'];
        const soundKeys = ['sf', 'sk', 'sd'];
        function render() {
            startItemTimer();
            const l = letters[current];
            const display = l[harakatKeys[harakatMode]];
            const sound = l[soundKeys[harakatMode]];
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#22c55e;direction:rtl">عربی Arabic — Harakat 🔊</div>';
            html += '<div style="text-align:center;font-size:80px;margin:10px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakArabic(\''+sound+'\')">'+display+'</div>';
            html += '<div style="text-align:center;color:white;font-size:22px;margin:5px">'+sound+'</div>';
            html += '<div style="display:flex;justify-content:center;gap:8px;margin:10px 0">';
            harakatNames.forEach((h, i) => {
                const active = i === harakatMode ? 'background:#22c55e;color:white' : 'background:#444;color:#aaa';
                html += '<button style="padding:8px 12px;border-radius:8px;border:none;font-size:13px;cursor:pointer;'+active+'" onclick="setQH('+i+')">'+h+'</button>';
            });
            html += '</div>';
            html += '<div style="display:flex;justify-content:center;gap:15px;margin:10px 0">';
            [{key:'fatha',skey:'sf',color:'#22c55e'},{key:'kasra',skey:'sk',color:'#0099FF'},{key:'damma',skey:'sd',color:'#FF6B35'}].forEach(h => {
                html += '<div style="text-align:center;cursor:pointer;padding:10px;border-radius:10px;background:#333" onclick="speakArabic(\''+l[h.skey]+'\')"><div style="font-size:36px;font-family:serif;direction:rtl">'+l[h.key]+'</div><div style="color:'+h.color+';font-size:16px">'+l[h.skey]+'</div></div>';
            });
            html += '</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:10px"><button class="key" onclick="prevQH()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextQH()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.setQH = (m) => { harakatMode = m; render(); };
        window.prevQH = () => { if (current > 0) { current--; render(); } };
        window.nextQH = () => {
            currentAnswers.push({q: letters[current].letter+' harakat', answer: letters[current][soundKeys[harakatMode]], correct: true});
            recordPassiveResponse('arabic_qaida', {type:'qaida_harakat', letter: letters[current].letter, harakat: harakatKeys[harakatMode]}, current, 2);
            current++;
            if (current >= letters.length) { completeWorksheet('Arabic Qaida L2', letters.length, letters.length); return; }
            render();
        };
        render();
    }

    // ===== LEVEL 3: Letter Connections =====
    function levelConnections() {
        const letters = ARABIC_LETTERS.slice(0, getFocusNumber('arabic_qaida'));
        let current = 0;
        function render() {
            startItemTimer();
            const l = letters[current];
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#22c55e;direction:rtl">عربی Arabic — Connections 🔗</div>';
            html += '<div style="text-align:center;font-size:60px;margin:10px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakArabic(\''+l.aname+'\')">'+l.letter+'</div>';
            html += '<div style="display:flex;justify-content:center;gap:20px;margin:15px 0;direction:rtl">';
            [{form:'initial',label:'Beginning'},{form:'medial',label:'Middle'},{form:'final',label:'End'}].forEach(f => {
                html += '<div style="text-align:center;padding:12px 15px;background:#333;border-radius:10px"><div style="font-size:40px;font-family:serif;color:white">'+l[f.form]+'</div><div style="color:#22c55e;font-size:13px;margin-top:5px">'+f.label+'</div></div>';
            });
            html += '</div>';
            html += '<div style="text-align:center;color:#aaa;font-size:16px">'+l.name+'</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevQC()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextQC()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.prevQC = () => { if (current > 0) { current--; render(); } };
        window.nextQC = () => {
            currentAnswers.push({q: letters[current].letter+' connections', answer: letters[current].name, correct: true});
            recordPassiveResponse('arabic_qaida', {type:'qaida_connections', letter: letters[current].letter}, current, 3);
            current++;
            if (current >= letters.length) { completeWorksheet('Arabic Qaida L3', letters.length, letters.length); return; }
            render();
        };
        render();
    }

    // ===== LEVEL 4: 2-Letter Combos =====
    function level2Letter() {
        const words = [...ARABIC_2LETTER].sort(() => Math.random()-0.5).slice(0, getFocusNumber('arabic_qaida'));
        let current = 0;
        function render() {
            startItemTimer();
            const w = words[current];
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#22c55e;direction:rtl">عربی Arabic — 2-Letter 📖</div>';
            html += '<div style="text-align:center;font-size:72px;margin:20px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakArabic(\''+w.sound+'\')">'+w.word+'</div>';
            html += '<button class="btn green" style="font-size:22px;padding:12px 25px;margin:10px auto;display:block" onclick="speakArabic(\''+w.sound+'\')">🔊 '+w.sound+'</button>';
            html += '<div style="text-align:center;color:#aaa;font-size:18px;margin:10px">'+w.meaning+'</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevQ2()">← Prev</button><span class="score">'+(current+1)+' / '+words.length+'</span><button class="key green" onclick="nextQ2()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.prevQ2 = () => { if (current > 0) { current--; render(); } };
        window.nextQ2 = () => {
            currentAnswers.push({q: words[current].word, answer: words[current].sound, correct: true});
            recordPassiveResponse('arabic_qaida', {type:'qaida_2letter', word: words[current].word}, current, 4);
            current++;
            if (current >= words.length) { completeWorksheet('Arabic Qaida L4', words.length, words.length); return; }
            render();
        };
        render();
    }

    // ===== LEVEL 5: 3-Letter Words =====
    function level3Letter() {
        const words = [...ARABIC_3LETTER].sort(() => Math.random()-0.5).slice(0, getFocusNumber('arabic_qaida'));
        let current = 0;
        function render() {
            startItemTimer();
            const w = words[current];
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#22c55e;direction:rtl">عربی Arabic — 3-Letter Words 📚</div>';
            html += '<div style="text-align:center;font-size:72px;margin:20px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakArabic(\''+w.sound+'\')">'+w.word+'</div>';
            html += '<button class="btn green" style="font-size:22px;padding:12px 25px;margin:10px auto;display:block" onclick="speakArabic(\''+w.sound+'\')">🔊 '+w.sound+'</button>';
            html += '<div style="text-align:center;color:#aaa;font-size:18px;margin:10px">'+w.meaning+'</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevQ3()">← Prev</button><span class="score">'+(current+1)+' / '+words.length+'</span><button class="key green" onclick="nextQ3()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.prevQ3 = () => { if (current > 0) { current--; render(); } };
        window.nextQ3 = () => {
            currentAnswers.push({q: words[current].word, answer: words[current].sound, correct: true});
            recordPassiveResponse('arabic_qaida', {type:'qaida_3letter', word: words[current].word}, current, 5);
            current++;
            if (current >= words.length) { completeWorksheet('Arabic Qaida L5', words.length, words.length); return; }
            render();
        };
        render();
    }

    // ===== MASTERY CHECK =====
    function checkPool(levelIdx) {
        if (levelIdx === 0) return ARABIC_LETTERS.map(l => ({sound: l.aname, display: l.letter}));
        if (levelIdx === 2) {
            const pool = [];
            ARABIC_LETTERS.forEach(l => ['initial', 'medial', 'final'].forEach(f => { if (l[f]) pool.push({sound: l.aname, display: l[f]}); }));
            return pool;
        }
        if (levelIdx === 1) {
            const harakatKeys = ['fatha', 'kasra', 'damma'], soundKeys = ['sf', 'sk', 'sd'];
            const pool = [];
            ARABIC_LETTERS.forEach(l => harakatKeys.forEach((hk, m) => pool.push({sound: l[soundKeys[m]], display: l[hk]})));
            return pool;
        }
        if (levelIdx === 3) return ARABIC_2LETTER.map(w => ({sound: w.sound, display: w.word}));
        return ARABIC_3LETTER.map(w => ({sound: w.sound, display: w.word}));
    }

    // Fixed-size loops only: a shuffle-then-slice can never spin, unlike rejection sampling.
    function buildCheckQuestions(pool) {
        if (!pool.length) return [];
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const qs = [];
        for (let i = 0; i < 10; i++) qs.push(shuffled[i % shuffled.length]);
        return qs;
    }

    function buildChoices(pool, correct) {
        const seen = new Set([correct.display]);
        const distractors = [];
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        for (let i = 0; i < shuffled.length && distractors.length < 3; i++) {
            // Different letters share a sound (د/ض both "da"), and a letter's connected forms share its name: one that sounds like the answer would make the question unanswerable.
            if (seen.has(shuffled[i].display) || shuffled[i].sound === correct.sound) continue;
            seen.add(shuffled[i].display);
            distractors.push(shuffled[i]);
        }
        return [correct, ...distractors].sort(() => Math.random() - 0.5);
    }

    let checkQuestions = [], checkCurrent = 0, checkAttempt = 1, checkScore = 0, checkLevel = 1, checkRunId = 0, checkQStartMs = null;

    window.startArabicQaidaCheck = () => {
        if (!CONFIG.sessionId) { showLevelPicker(); return; }
        checkLevel = getContentLevel('arabic_qaida');
        const pool = checkPool(checkLevel - 1);
        checkQuestions = buildCheckQuestions(pool);
        if (!checkQuestions.length) { showLevelPicker(); return; }
        checkCurrent = 0; checkAttempt = 1; checkScore = 0; checkRunId = Date.now();
        renderCheckQuestion();
    };

    function renderCheckQuestion() {
        const pool = checkPool(checkLevel - 1);
        const q = checkQuestions[checkCurrent];
        const choices = buildChoices(pool, q);
        const big = pool.every(p => p.display.length <= 3);
        let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
        html += '<div class="title" style="color:#22c55e;direction:rtl">📖 Mastery Check — Level '+checkLevel+'</div>';
        html += '<button class="btn green" style="font-size:20px;padding:12px 25px;margin:10px auto;display:block" onclick="speakArabic(\''+q.sound+'\')">🔊 Listen</button>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:15px;direction:rtl">';
        choices.forEach(c => {
            html += '<div style="font-size:'+(big?'48px':'32px')+';font-family:serif;text-align:center;padding:18px;background:#333;border-radius:14px;cursor:pointer;color:white" onclick="pickArabicQaidaCheck(\''+c.display+'\')">'+c.display+'</div>';
        });
        html += '</div>';
        html += '<div class="score">⭐ '+checkScore+' / '+checkQuestions.length+' — Question '+(checkCurrent+1)+' of '+checkQuestions.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
        checkQStartMs = Date.now();
    }

    function checkWrongFeedback(callback) {
        const title = document.querySelector('.title');
        const card = document.querySelector('.card');
        if (title) { title.innerHTML = '🤔 Try again!'; title.style.color = '#ef4444'; }
        if (card) card.style.animation = 'shake 0.5s';
        setTimeout(callback, 1000);
    }

    window.pickArabicQaidaCheck = (choice) => {
        const q = checkQuestions[checkCurrent];
        const correct = choice === q.display;
        const isFirstTry = checkAttempt === 1;
        const responseTimeMs = checkQStartMs ? Date.now() - checkQStartMs : null;
        recordResponse('arabic_qaida', {type:'qaida_check', purpose:'check', level: checkLevel, item: q.display}, q.display, choice, correct, isFirstTry, checkAttempt, responseTimeMs, 'chk'+checkRunId+'_'+checkCurrent, false, checkLevel);
        if (correct) {
            if (isFirstTry) checkScore++;
            showFeedback(true, () => {
                checkCurrent++;
                checkAttempt = 1;
                if (checkCurrent >= checkQuestions.length) { finishArabicQaidaCheck(); return; }
                renderCheckQuestion();
            });
        } else {
            checkAttempt++;
            checkWrongFeedback(() => { renderCheckQuestion(); });
        }
    };

    async function finishArabicQaidaCheck() {
        let result = null;
        if (typeof evaluateSkillMastery === 'function') {
            try { result = await evaluateSkillMastery('arabic_qaida'); } catch (e) {}
        }
        if (result && result.level_unlocked) {
            if (typeof celebrateLevelUnlock === 'function') {
                try { await celebrateLevelUnlock('arabic_qaida', result.unlocked_level); } catch (e) {}
            }
            showArabicQaida();
            return;
        }
        showCheckResult();
    }

    function showCheckResult() {
        const warm = checkScore >= 8 ? 'Amazing work! 🌟' : (checkScore >= 5 ? 'Great effort! A bit more practice and you\'ll have it.' : 'Good try! Keep practicing this level.');
        let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
        html += '<div class="title" style="color:#22c55e;direction:rtl">📖 Check Complete!</div>';
        html += '<div style="text-align:center;font-size:40px;margin:20px">⭐ '+checkScore+' / '+checkQuestions.length+'</div>';
        html += '<div style="text-align:center;color:#aaa;font-size:18px;margin:10px">'+warm+'</div>';
        html += '<button class="btn green" style="font-size:18px;padding:12px 25px;margin:15px auto;display:block" onclick="showArabicQaida()">Back to Levels</button>';
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    showLevelPicker();
}
