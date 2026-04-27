// ============ NUMBERS URDU ============
function showNumbersUrdu() {
    const QUESTIONS = Math.max(3, getFocusNumber('numbers_urdu'));
    const LEVEL_NAMES = ['Learn','Hear & Tap','Closest','More Than','Less Than'];
    const URDU_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

    let level = Math.max(1, getContentLevel('numbers_urdu'));

    function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
    function randNum() { 
        const max = getLearnedNumberMax();
        return Math.floor(Math.random() * max) + 1; }
    function getLearnedNumberMax() {
        return Math.max(QUESTIONS, getFocusNumber('numbers_urdu'));
    }
    function nearNums(n, count) {
        const max = getLearnedNumberMax();
        const pool = [];

        for (let v = 1; v <= max; v++) {
            if (v !== n) pool.push(v);
        }

        return shuffle(pool).slice(0, count);
    }
    function displayNum(n) { return String(n).split('').map(d => URDU_DIGITS[parseInt(d)]).join(''); }
    function sayNum(n) { new Audio('audio/numbers/ur_' + n + '.mp3').play().catch(() => speakUrdu(String(n))); }

    // ===== ALL LEVELS =====
    function startAllLevels() {
        const maxLevel = Math.max(1, getContentLevel('numbers_urdu'));
        const oldLevel = level;

        problems = [];
        problemLevels = [];

        for (let l = 2; l <= maxLevel; l++) {
            const old = level;
            level = l;
            const levelProblems = makeProblems(l);
            problems = problems.concat(levelProblems);
            problemLevels = problemLevels.concat(Array(levelProblems.length).fill(l));
            level = old;
        }

        if (problems.length === 0) {
            startLearn();
            return;
        }

        level = oldLevel;
        current = 0;
        score = 0;
        skips = 0;
        tried = false;
        renderGame();
    }

    window.nuStartAll = startAllLevels;

    // ===== LEVEL 1: LEARN =====
    function startLearn() {
        const nums = Array.from({length:QUESTIONS},(_,i)=>i+1);
        let phase = 'flash', flashIdx = 0, quizIdx = 0, score = 0, tried = false;
        const quizNums = shuffle([...nums]);

        function renderFlash() {
            const n = nums[flashIdx];
            let html = '<button class="back" onclick="showMenu()">← Back</button>';
            html += '<div class="card"><div class="title">🔢 اردو Urdu — Learn Numbers</div>';
            html += '<div class="inst">Learn the Urdu numbers!</div>';
            html += '<div style="text-align:center;font-size:18px;color:#888">'+(flashIdx+1)+' / '+nums.length+'</div>';
            html += '<div style="text-align:center;margin:25px 0">';
            html += '<div style="font-size:90px;font-weight:bold;direction:rtl;cursor:pointer" onclick="playNULearn()">'+displayNum(n)+'</div>';
            html += '<div style="font-size:40px;color:#666;margin-top:10px">= '+n+'</div>';
            html += '<button onclick="playNULearn()" style="font-size:40px;background:none;border:none;cursor:pointer;margin-top:10px">🔊</button>';
            html += '</div>';
            html += '<button class="btn green" onclick="nextNUFlash()" style="font-size:20px;padding:15px">Next →</button>';
            html += '</div>';
            document.getElementById('app').innerHTML = html;
            setTimeout(() => sayNum(n), 400);
        }

        function renderQuiz() {
            if (quizIdx >= quizNums.length) {
                finishUrduNumbersL1(score, quizNums.length);
                return;
            }
            const n = quizNums[quizIdx];
            const wrong = nearNums(n, 3);
            const choices = shuffle([n, ...wrong]);
            let html = '<button class="back" onclick="showMenu()">← Back</button>';
            html += '<div class="card"><div class="title">🔢 اردو Urdu — Match!</div>';
            html += '<div class="inst">Which English number matches?</div>';
            html += '<div style="text-align:center;font-size:18px;color:#888">'+(quizIdx+1)+' / '+quizNums.length+'</div>';
            html += '<div style="text-align:center;font-size:90px;font-weight:bold;direction:rtl;margin:20px 0">'+displayNum(n)+'</div>';
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px">';
            choices.forEach((ch, i) => {
                html += '<div id="nuq'+i+'" onclick="pickNUQuiz('+i+','+ch+','+n+')" style="display:flex;align-items:center;justify-content:center;padding:20px;background:white;border:3px solid #ddd;border-radius:12px;cursor:pointer;font-size:36px;font-weight:bold;transition:all 0.2s">'+ch+'</div>';
            });
            html += '</div></div>';
            document.getElementById('app').innerHTML = html;
            tried = false;
            setTimeout(() => sayNum(n), 400);
        }

        window.playNULearn = function() { sayNum(nums[flashIdx]); };

        window.nextNUFlash = function() {
            flashIdx++;
            if (flashIdx >= nums.length) { phase = 'quiz'; renderQuiz(); }
            else renderFlash();
        };

        window.pickNUQuiz = function(i, chosen, target) {
            const el = document.getElementById('nuq'+i);
            if (chosen === target) {
                if (!tried) score++;
                currentAnswers.push({q: displayNum(target)+' = ?', answer: chosen, correct: true, firstTry: !tried});
                el.style.borderColor = '#22c55e'; el.style.background = '#dcfce7';
                showFeedback(true);
                setTimeout(() => { quizIdx++; renderQuiz(); }, 1200);
            } else {
                tried = true;
                el.style.borderColor = '#ef4444'; el.style.background = '#fee2e2'; el.style.opacity = '0.5'; el.onclick = null;
                showFeedback(false);
            }
        };

        renderFlash();
    }

    // ===== LEVELS 2-5: Game levels =====
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
                case 2: {
                    const wrong = nearNums(n, 3);
                    choices = shuffle([n, ...wrong]); correct = n;
                    instruction = 'جو نمبر سنو وہ تھپتھپاؤ!'; break;
                }
                case 3: {
                    const max = getLearnedNumberMax();
                    let close = n > 1 ? n - 1 : Math.min(max, n + 1);

                    const pool = [];
                    for (let v = 1; v <= max; v++) {
                        if (v !== close) pool.push(v);
                    }

                    choices = shuffle([close, ...shuffle(pool).slice(0, 3)]);
                    correct = close;
                    instruction = 'سب سے قریب نمبر تھپتھپاؤ!';
                    break;
                }
                case 4: {
                    const max = getLearnedNumberMax();

                    const biggerPool = [];
                    for (let v = n + 1; v <= max; v++) biggerPool.push(v);

                    if (biggerPool.length === 0) continue;

                    const correct = pick(biggerPool);

                    const pool = [];
                    for (let v = 1; v <= max; v++) {
                        if (v !== correct) pool.push(v);
                    }

                    choices = shuffle([correct, ...shuffle(pool).slice(0, 3)]);
                    instruction = 'بڑا نمبر تھپتھپاؤ!';
                    break;
                }
                case 5: {
                    const max = getLearnedNumberMax();

                    const smallerPool = [];
                    for (let v = 1; v < n; v++) smallerPool.push(v);

                    if (smallerPool.length === 0) continue;

                    const correct = pick(smallerPool);

                    const pool = [];
                    for (let v = 1; v <= max; v++) {
                        if (v !== correct) pool.push(v);
                    }

                    choices = shuffle([correct, ...shuffle(pool).slice(0, 3)]);
                    instruction = 'چھوٹا نمبر تھپتھپاؤ!';
                    break;
                }
            }
            problems.push({n, choices, correct, instruction});
            attempts++;
        }
        return problems;
    }

    let problems=[], problemLevels=[], current=0, score=0, skips=0, tried=false;
    let questionStartMs = null;
    const attemptCounts = {};

    function startLevel(l) {
        level = l;
        if (l === 1) { startLearn(); return; }
        problems = makeProblems(level);
        current = 0; score = 0; skips = 0; tried = false;
        renderGame();
    }

    function renderPicker() {
        const maxLevel = Math.max(1, getContentLevel('numbers_urdu'));
        let html = '<button class="back" onclick="showMenu()">← Back</button>';
        html += '<div class="card"><div class="title">🔢 اردو Urdu — Numbers</div>';
        if (maxLevel > 1) {
            html += '<div onclick="nuStartAll()" style="background:#FF6600;color:white;padding:14px;border-radius:12px;text-align:center;cursor:pointer;margin-bottom:10px;font-size:18px;font-weight:bold">🌟 Practice All (L2-L' + maxLevel + ')</div>';
        }
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:15px 0">';
        for (let l = 1; l <= 5; l++) {
            const unlocked = l <= maxLevel;
            const bg = !unlocked ? '#666' : (l === maxLevel ? '#22c55e' : '#0099FF');
            html += '<div onclick="'+(unlocked?'startNULevel('+l+')':'')+'" style="background:'+bg+';color:white;padding:15px;border-radius:12px;text-align:center;cursor:'+(unlocked?'pointer':'not-allowed')+';opacity:'+(unlocked?1:0.5)+'">';
            html += '<div style="font-size:22px;font-weight:bold">L'+l+'</div>';
            html += '<div style="font-size:13px;margin-top:3px">'+LEVEL_NAMES[l-1]+'</div>';
            html += '</div>';
        }
        html += '</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.startNULevel = startLevel;

    function renderGame() {
        if (problemLevels[current]){
            level = problemLevels[current];
        }

        if (current >= problems.length) {
            finishUrduNumbersLevel(score, problems.length, level);
            return;
        }

        const p = problems[current];
        if (!p || !Array.isArray(p.choices)){
            console.error('Bad Urdu Numbers problem:', p, 'at index', current, 'level', level);
            current++;
            renderGame();
            return;
        }
        let html = '<button class="back" onclick="showMenu()">← Back</button>';
        html += '<div class="card"><div class="title">🔢 اردو Urdu — Numbers</div>';
        html += '<div class="inst" style="direction:rtl">'+p.instruction+'</div>';
        html += '<div style="text-align:center;font-size:18px;color:#888;margin-bottom:8px">'+(current+1)+' / '+problems.length+'</div>';
        html += '<div style="text-align:center;margin:20px 0">';
        html += '<button onclick="playNUSound()" style="font-size:60px;background:none;border:none;cursor:pointer;padding:15px">🔊</button>';
        html += '</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px">';
        p.choices.forEach((ch, i) => {
            html += '<div id="nuch'+i+'" onclick="pickNUAnswer('+i+')" style="display:flex;align-items:center;justify-content:center;padding:20px;background:white;border:3px solid #ddd;border-radius:12px;cursor:pointer;font-size:clamp(28px,8vw,40px);font-weight:bold;transition:all 0.2s;direction:rtl">';
            html += displayNum(ch);
            html += '</div>';
        });
        html += '</div>';
        html += '<div style="text-align:center;margin-top:12px"><a onclick="skipNU()" style="color:#999;font-size:14px;cursor:pointer">Skip →</a></div>';
        html += '</div>';
        document.getElementById('app').innerHTML = html;
        tried = false;
        questionStartMs = Date.now();
        setTimeout(() => sayNum(p.n), 400);
    }

    window.playNUSound = function() { sayNum(problems[current].n); };

    window.pickNUAnswer = function(i) {
        const responseTimeMs = Date.now() - questionStartMs;
        attemptCounts[current] = (attemptCounts[current] || 0) + 1;
        const p = problems[current];
        const chosen = p.choices[i];
        const el = document.getElementById('nuch'+i);
        let isCorrect = false;
        if (level === 2) isCorrect = (chosen === p.correct);
        else if (level === 3) isCorrect = (chosen === p.correct);
        else if (level === 4) isCorrect = (chosen > p.n);
        else if (level === 5) isCorrect = (chosen < p.n);

        if (isCorrect) {
            if (!tried) score++;
            currentAnswers.push({q: p.n, level, answer: chosen, correct: true, firstTry: !tried});
            recordResponse('numbers_urdu', {type:'numbers_urdu', number:p.n, instruction:p.instruction, correct_answer:p.correct}, String(p.correct), String(chosen), true, attemptCounts[current]===1, attemptCounts[current], responseTimeMs, current, false, level);
            el.style.borderColor = '#22c55e'; el.style.background = '#dcfce7';
            showFeedback(true);
            setTimeout(() => { current++; renderGame(); }, 1200);
        } else {
            tried = true;
            recordResponse('numbers_urdu', {type:'numbers_urdu', number:p.n, instruction:p.instruction, correct_answer:p.correct}, String(p.correct), String(chosen), false, attemptCounts[current]===1, attemptCounts[current], responseTimeMs, current, false, level);
            el.style.borderColor = '#ef4444'; el.style.background = '#fee2e2'; el.style.opacity = '0.5'; el.onclick = null;
            showFeedback(false);
        }
    };

    window.skipNU = function() {
        const responseTimeMs = Date.now() - questionStartMs;
        skips++;
        currentAnswers.push({q: problems[current].n, level, answer: 'skip', correct: false, firstTry: false});
        recordResponse('numbers_urdu', {type:'numbers_urdu', number:problems[current].n}, String(problems[current].correct), 'skip', false, false, 1, responseTimeMs, current, true, level);
        current++;
        renderGame();
    };

    renderPicker();
}

async function finishUrduNumbersL1(score, total) {
    const pct = Math.round((score / total) * 100);
    const cur = Math.max(1, getContentLevel('numbers_urdu'));

    if (pct >= 80 && cur < 5) {
        const newLevel = 2;

        const { error } = await sb.from('child_skill_settings').upsert(
            {
                child_id: CONFIG.childId,
                skill_id: 'numbers_urdu',
                content_level: newLevel
            },
            { onConflict: 'child_id,skill_id' }
        );

        if (error) {
            console.error('Numbers Urdu L1 upsert error', error);
        } else {
            CONFIG.skillSettings['numbers_urdu'] = {
                ...(CONFIG.skillSettings['numbers_urdu'] || {}),
                content_level: newLevel
            };

            if (CONFIG.sessionId) {
                completeWorksheet('Numbers Urdu', score, total);
                return;
            }

            document.getElementById('app').innerHTML =
                '<div class="card"><div class="title">Great job! 🎉</div>' +
                '<div style="text-align:center;font-size:28px">' + score + ' / ' + total + '</div>' +
                '<div style="text-align:center;margin-top:10px">Urdu Numbers advanced to level 2!</div>' +
                '<button class="btn green" style="margin-top:20px" onclick="showMenu()">Back to Menu</button></div>';
            return;
        }
    }

    if (CONFIG.sessionId) {
        completeWorksheet('Numbers Urdu', score, total);
        return;
    }

    document.getElementById('app').innerHTML =
        '<div class="card"><div class="title">Nice try 💪</div>' +
        '<div style="text-align:center;font-size:28px">' + score + ' / ' + total + '</div>' +
        '<div style="text-align:center;margin-top:10px">Keep practicing level 1.</div>' +
        '<button class="btn green" style="margin-top:20px" onclick="showMenu()">Back to Menu</button></div>';
}

async function finishUrduNumbersLevel(score, total, level) {
    const pct = Math.round((score / total) * 100);
    const cur = Math.max(1, getContentLevel('numbers_urdu'));

    if (pct >= 80 && level >= cur && cur < 5) {
        const newLevel = cur + 1;

        const { error } = await sb.from('child_skill_settings').upsert(
            {
                child_id: CONFIG.childId,
                skill_id: 'numbers_urdu',
                content_level: newLevel
            },
            { onConflict: 'child_id,skill_id' }
        );

        if (error) {
            console.error('Numbers Urdu level upsert error', error);
        } else {
            CONFIG.skillSettings['numbers_urdu'] = {
                ...(CONFIG.skillSettings['numbers_urdu'] || {}),
                content_level: newLevel
            };

            if (CONFIG.sessionId) {
                completeWorksheet('Numbers Urdu', score, total);
                return;
            }

            document.getElementById('app').innerHTML =
                '<div class="card"><div class="title">Great job! 🎉</div>' +
                '<div style="text-align:center;font-size:28px">' + score + ' / ' + total + '</div>' +
                '<div style="text-align:center;margin-top:10px">Urdu Numbers advanced to level ' + newLevel + '!</div>' +
                '<button class="btn green" style="margin-top:20px" onclick="showMenu()">Back to Menu</button></div>';
            return;
        }
    }

    if (CONFIG.sessionId) {
        completeWorksheet('Numbers Urdu', score, total);
        return;
    }

    document.getElementById('app').innerHTML =
        '<div class="card"><div class="title">Nice try 💪</div>' +
        '<div style="text-align:center;font-size:28px">' + score + ' / ' + total + '</div>' +
        '<div style="text-align:center;margin-top:10px">Keep practicing this level.</div>' +
        '<button class="btn green" style="margin-top:20px" onclick="showMenu()">Back to Menu</button></div>';
}