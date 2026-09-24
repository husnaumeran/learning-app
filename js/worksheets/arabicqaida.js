// ============ ARABIC QAIDA ============
function showArabicQaida() {
    const levels = [
        {name:'Letters (حروف)', key:'qaida_l1', icon:'🔤'},
        {name:'Harakat (حركات)', key:'qaida_l2', icon:'🔊'},
        {name:'Connections (مركبات)', key:'qaida_l3', icon:'🔗'},
        {name:'2-Letter (مقطع)', key:'qaida_l4', icon:'📖'},
        {name:'3-Letter Words (كلمات)', key:'qaida_l5', icon:'📚'}
    ];

    function safeProgressHTML() {
        if (typeof levelProgressHTML !== 'function') return '';
        try { return levelProgressHTML('arabic_qaida') || ''; } catch (e) { return ''; }
    }
    function safeUnlockedLevel(curLevel) {
        if (typeof getUnlockedLevel !== 'function') return curLevel;
        try { return Math.max(getUnlockedLevel('arabic_qaida') || curLevel, curLevel); } catch (e) { return curLevel; }
    }
    function isGuided() {
        try { return typeof CONFIG !== 'undefined' && CONFIG.guidedLaunch === true; } catch (e) { return false; }
    }

    let revealed = false;

    function showLevelPicker() {
        const curLevel = getContentLevel('arabic_qaida');
        const unlockedLevel = safeUnlockedLevel(curLevel);
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl;color:#22c55e">📖 القاعدة — Arabic Qaida</div>';
        if (!CONFIG.sessionId) {
            html += '<div style="text-align:center;color:#f59e0b;font-size:13px;margin-bottom:10px">Practicing for fun right now — progress will save once today\'s session starts.</div>';
        }
        if (isGuided() && !revealed) {
            html += '<div onmousedown="this.holdTimer=setTimeout(()=>{this._held=true;revealArabicQaidaLevels()},3000)" onmouseup="clearTimeout(this.holdTimer);if(!this._held){startLevel('+(curLevel-1)+')}this._held=false" ontouchstart="this.holdTimer=setTimeout(()=>{this._held=true;revealArabicQaidaLevels()},3000)" ontouchend="clearTimeout(this.holdTimer);if(!this._held){startLevel('+(curLevel-1)+')}this._held=false" style="background:#1a5e1a;color:white;padding:28px 15px;border-radius:14px;text-align:center;cursor:pointer;font-size:22px;font-weight:bold">🌟 Practice All</div>';
            html += '<div style="text-align:center;color:#666;font-size:12px;margin-top:8px">Hold 3s to see all levels</div>';
            html += '</div>';
            document.getElementById('app').innerHTML = html;
            return;
        }
        levels.forEach((l, i) => {
            const L = i + 1;
            const state = L > unlockedLevel ? 'locked' : (L === curLevel ? 'current' : 'completed');
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
        });
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    window.revealArabicQaidaLevels = () => { revealed = true; showLevelPicker(); };

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
        const letters = ARABIC_LETTERS.slice(0, getQuestionCount('arabic_qaida'));
        let current = 0;
        function render() {
            startItemTimer();
            const l = letters[current];
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            const audible = canHearLetter('ar', l.letter);
            const tap = audible ? ' onclick="playLetterSound(\'ar\',\''+l.letter+'\')"' : '';
            html += '<div class="title" style="color:#22c55e;direction:rtl">عربی Arabic — Letters 🔤</div>';
            html += '<div style="text-align:center;font-size:100px;margin:15px;font-family:serif;direction:rtl;'+(audible?'cursor:pointer':'')+'"'+tap+'>'+l.letter+'</div>';
            html += '<div style="text-align:center;color:#333;font-size:24px">'+l.name+'</div>';
            if (audible) html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin:10px auto;display:block"'+tap+'>🔊 Listen</button>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevQL()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextQL()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
            if (audible) playLetterSound('ar', l.letter);
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
        const letters = ARABIC_LETTERS.slice(0, getQuestionCount('arabic_qaida'));
        let current = 0, harakatMode = 0;
        const harakatNames = ['فَتْحَة (Fatha)', 'كَسْرَة (Kasra)', 'ضَمَّة (Damma)'];
        const harakatKeys = ['fatha', 'kasra', 'damma'];
        const soundKeys = ['sf', 'sk', 'sd'];
        function render() {
            startItemTimer();
            const l = letters[current];
            const hkey = harakatKeys[harakatMode];
            const display = l[hkey];
            const sound = l[soundKeys[harakatMode]];
            // The transliteration ("a", "i", "u") is a label, never the sound: speech reads it in a generic voice.
            const audible = canHearHarakat('ar', l.letter, hkey);
            const tap = audible ? ' onclick="playHarakatSound(\'ar\',\''+l.letter+'\',\''+hkey+'\')"' : '';
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#22c55e;direction:rtl">عربی Arabic — Harakat 🔊</div>';
            html += '<div style="text-align:center;font-size:80px;margin:10px;font-family:serif;direction:rtl;'+(audible?'cursor:pointer':'')+'"'+tap+'>'+display+'</div>';
            html += '<div style="text-align:center;color:#333;font-size:22px;margin:5px">'+sound+'</div>';
            if (audible) html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin:10px auto;display:block"'+tap+'>🔊 Listen</button>';
            html += '<div style="display:flex;justify-content:center;gap:8px;margin:10px 0">';
            harakatNames.forEach((h, i) => {
                const active = i === harakatMode ? 'background:#22c55e;color:white' : 'background:#444;color:#aaa';
                html += '<button style="padding:8px 12px;border-radius:8px;border:none;font-size:13px;cursor:pointer;'+active+'" onclick="setQH('+i+')">'+h+'</button>';
            });
            html += '</div>';
            html += '<div style="display:flex;justify-content:center;gap:15px;margin:10px 0">';
            [{key:'fatha',skey:'sf',color:'#22c55e'},{key:'kasra',skey:'sk',color:'#0099FF'},{key:'damma',skey:'sd',color:'#FF6B35'}].forEach(h => {
                const htap = canHearHarakat('ar', l.letter, h.key) ? ' onclick="playHarakatSound(\'ar\',\''+l.letter+'\',\''+h.key+'\')"' : '';
                html += '<div style="text-align:center;'+(htap?'cursor:pointer;':'')+'padding:14px;border-radius:10px;background:#333"'+htap+'><div style="font-size:36px;font-family:serif;direction:rtl">'+l[h.key]+'</div><div style="color:'+h.color+';font-size:16px">'+l[h.skey]+'</div></div>';
            });
            html += '</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:10px"><button class="key" onclick="prevQH()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextQH()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
            if (audible) playHarakatSound('ar', l.letter, hkey);
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
        const letters = ARABIC_LETTERS.slice(0, getQuestionCount('arabic_qaida'));
        let current = 0;
        function render() {
            startItemTimer();
            const l = letters[current];
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            const audible = canHearLetter('ar', l.letter);
            const tap = audible ? ' onclick="playLetterSound(\'ar\',\''+l.letter+'\')"' : '';
            html += '<div class="title" style="color:#22c55e;direction:rtl">عربی Arabic — Connections 🔗</div>';
            html += '<div style="text-align:center;font-size:60px;margin:10px;font-family:serif;direction:rtl;'+(audible?'cursor:pointer':'')+'"'+tap+'>'+l.letter+'</div>';
            if (audible) html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin:10px auto;display:block"'+tap+'>🔊 Listen</button>';
            html += '<div style="display:flex;justify-content:center;gap:20px;margin:15px 0;direction:rtl">';
            [{form:'initial',label:'Beginning'},{form:'medial',label:'Middle'},{form:'final',label:'End'}].forEach(f => {
                html += '<div style="text-align:center;padding:12px 15px;background:#333;border-radius:10px"><div style="font-size:40px;font-family:serif;color:white">'+l[f.form]+'</div><div style="color:#22c55e;font-size:13px;margin-top:5px">'+f.label+'</div></div>';
            });
            html += '</div>';
            html += '<div style="text-align:center;color:#aaa;font-size:16px">'+l.name+'</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevQC()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextQC()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
            if (audible) playLetterSound('ar', l.letter);
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
        const words = [...ARABIC_2LETTER].sort(() => Math.random()-0.5).slice(0, getQuestionCount('arabic_qaida'));
        let current = 0;
        function render() {
            startItemTimer();
            const w = words[current];
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            // No recordings exist for whole words, so the button is only honest where a voice is installed.
            const audible = hasSpeechVoice('ar');
            const tap = audible ? ' onclick="speakArabic(\''+w.sound+'\')"' : '';
            html += '<div class="title" style="color:#22c55e;direction:rtl">عربی Arabic — 2-Letter 📖</div>';
            html += '<div style="text-align:center;font-size:72px;margin:20px;font-family:serif;direction:rtl;'+(audible?'cursor:pointer':'')+'"'+tap+'>'+w.word+'</div>';
            if (audible) html += '<button class="btn green" style="font-size:22px;padding:14px 28px;margin:10px auto;display:block"'+tap+'>🔊 '+w.sound+'</button>';
            else html += '<div style="text-align:center;color:#22c55e;font-size:26px;margin:10px">'+w.sound+'</div>';
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
        const words = [...ARABIC_3LETTER].sort(() => Math.random()-0.5).slice(0, getQuestionCount('arabic_qaida'));
        let current = 0;
        function render() {
            startItemTimer();
            const w = words[current];
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            const audible = hasSpeechVoice('ar');
            const tap = audible ? ' onclick="speakArabic(\''+w.sound+'\')"' : '';
            html += '<div class="title" style="color:#22c55e;direction:rtl">عربی Arabic — 3-Letter Words 📚</div>';
            html += '<div style="text-align:center;font-size:72px;margin:20px;font-family:serif;direction:rtl;'+(audible?'cursor:pointer':'')+'"'+tap+'>'+w.word+'</div>';
            if (audible) html += '<button class="btn green" style="font-size:22px;padding:14px 28px;margin:10px auto;display:block"'+tap+'>🔊 '+w.sound+'</button>';
            else html += '<div style="text-align:center;color:#22c55e;font-size:26px;margin:10px">'+w.sound+'</div>';
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
    // Pool/choice builders now live at top-level as arabicQaidaCheckPool/arabicQaidaBuildChoices (shared with window.qaidaCheckQuestions).
    // Fixed-size loops only: a shuffle-then-slice can never spin, unlike rejection sampling.
    function buildCheckQuestions(pool) {
        if (!pool.length) return [];
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const qs = [];
        for (let i = 0; i < 10; i++) qs.push(shuffled[i % shuffled.length]);
        return qs;
    }

    let checkQuestions = [], checkCurrent = 0, checkAttempt = 1, checkScore = 0, checkLevel = 1, checkRunId = 0, checkQStartMs = null;

    window.startArabicQaidaCheck = () => {
        if (!CONFIG.sessionId) { showLevelPicker(); return; }
        checkLevel = getContentLevel('arabic_qaida');
        const pool = arabicQaidaCheckPool(checkLevel - 1);
        checkQuestions = buildCheckQuestions(pool);
        if (!checkQuestions.length) { showLevelPicker(); return; }
        checkCurrent = 0; checkAttempt = 1; checkScore = 0; checkRunId = Date.now();
        renderCheckQuestion();
    };

    function renderCheckQuestion() {
        const pool = arabicQaidaCheckPool(checkLevel - 1);
        const q = checkQuestions[checkCurrent];
        const choices = arabicQaidaBuildChoices(pool, q);
        const big = pool.every(p => p.display.length <= 3);
        let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
        const audible = canHearQaidaPrompt(q);
        html += '<div class="title" style="color:#22c55e;direction:rtl">📖 Mastery Check — Level '+checkLevel+'</div>';
        // Nothing to play means the parent reads the prompt out; the pool has already dropped
        // any item we could neither voice nor print.
        if (audible) html += '<button class="btn green" style="font-size:20px;padding:14px 28px;margin:10px auto;display:block" onclick="replayArabicQaidaPrompt()">🔊 Listen</button>';
        else html += '<div style="text-align:center;color:#22c55e;font-size:30px;margin:14px">'+q.sound+'</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:15px;direction:rtl">';
        choices.forEach(c => {
            html += '<div style="font-size:'+(big?'48px':'32px')+';font-family:serif;text-align:center;padding:18px;background:#333;border-radius:14px;cursor:pointer;color:white" onclick="pickArabicQaidaCheck(\''+c.display+'\')">'+c.display+'</div>';
        });
        html += '</div>';
        html += '<div class="score">⭐ '+checkScore+' / '+checkQuestions.length+' — Question '+(checkCurrent+1)+' of '+checkQuestions.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
        checkQStartMs = Date.now();
        if (audible) playQaidaPrompt(q);
    }

    window.replayArabicQaidaPrompt = () => { playQaidaPrompt(checkQuestions[checkCurrent]); };

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

// Items carry lang/letter/harakat so the check can play the real recording instead of
// speaking the transliteration, and qaidaPromptable drops any the child could not hear or be read.
function arabicQaidaCheckPool(levelIdx) {
    let pool;
    if (levelIdx === 0) {
        pool = ARABIC_LETTERS.map(l => ({sound: l.aname, display: l.letter, lang: 'ar', letter: l.letter}));
    } else if (levelIdx === 2) {
        pool = [];
        ARABIC_LETTERS.forEach(l => ['initial', 'medial', 'final'].forEach(f => { if (l[f]) pool.push({sound: l.aname, display: l[f], lang: 'ar', letter: l.letter}); }));
    } else if (levelIdx === 1) {
        const harakatKeys = ['fatha', 'kasra', 'damma'], soundKeys = ['sf', 'sk', 'sd'];
        pool = [];
        ARABIC_LETTERS.forEach(l => harakatKeys.forEach((hk, m) => pool.push({sound: l[soundKeys[m]], display: l[hk], lang: 'ar', letter: l.letter, harakat: hk})));
    } else if (levelIdx === 3) {
        pool = ARABIC_2LETTER.map(w => ({sound: w.sound, display: w.word, lang: 'ar'}));
    } else {
        pool = ARABIC_3LETTER.map(w => ({sound: w.sound, display: w.word, lang: 'ar'}));
    }
    return pool.filter(qaidaPromptable);
}

function arabicQaidaBuildChoices(pool, correct) {
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

// Same shape as makeAssessmentQs (skill_id/choices/correct/qdata) so buildDailyTest can render either uniformly; sound/display carry the audio-first Qaida presentation.
function buildArabicQaidaCheckQuestions(level, count) {
    const lvl = Math.min(5, Math.max(1, level || 1));
    const n = Math.max(1, count || 10);
    const pool = arabicQaidaCheckPool(lvl - 1);
    if (!pool.length) return [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const qs = [];
    for (let i = 0; i < n; i++) {
        const q = shuffled[i % shuffled.length];
        qs.push({
            skill_id: 'arabic_qaida',
            sound: q.sound,
            display: q.display,
            lang: q.lang,
            letter: q.letter,
            harakat: q.harakat,
            choices: arabicQaidaBuildChoices(pool, q).map(c => c.display),
            correct: q.display,
            level: lvl,
            qdata: {type:'qaida_check', purpose:'check', level: lvl, item: q.display}
        });
    }
    return qs;
}

window.qaidaCheckQuestions = function(skillId, level, count) {
    try {
        if (skillId === 'arabic_qaida') return buildArabicQaidaCheckQuestions(level, count);
        if (skillId === 'urdu_qaida' && typeof buildUrduQaidaCheckQuestions === 'function') return buildUrduQaidaCheckQuestions(level, count);
    } catch (e) { console.error('qaidaCheckQuestions failed:', e); }
    return [];
};
