// ============ NUMBERS URDU ============
function showNumbersUrdu() {
    const QUESTIONS = getFocusNumber('numbers_urdu');
    const MIN_FOR_UNLOCK = 5;
    const LEVEL_NAMES = ['Learn','Hear & Tap','Closest','More Than','Less Than'];
    const URDU_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

    let level = Math.max(1, getContentLevel('numbers_urdu'));
    const inDailySession = !! CONFIG.sessionId;

    function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
    function randNum() { return Math.floor(Math.random() * 100) + 1; }
    function nearNums(n, count) {
        const s = new Set();
        while (s.size < count) { const offset = Math.floor(Math.random()*20)-10; const v=n+offset; if(v>=1&&v<=100&&v!==n) s.add(v); }
        return [...s];
    }
    function displayNum(n) { return String(n).split('').map(d => URDU_DIGITS[parseInt(d)]).join(''); }
    function sayNum(n) { new Audio('audio/numbers/ur_' + n + '.mp3').play().catch(() => speakUrdu(String(n))); }

    // ===== ALL LEVELS =====
    function startAllLevels() {
        const maxLevel = Math.max(1, getContentLevel('numbers_urdu'));
        const oldLevel = level;

        problems = [];
        problemLevels = [];

        for (let l = 1; l <= maxLevel; l++) {
            const old = level;
            level = l;
            const levelProblems = makeProblems(l);
            problems = problems.concat(levelProblems);
            problemLevels = problemLevels.concat(Array(levelProblems.length).fill(l));
            level = old;
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
                    const target = n + (Math.random()>0.5?1:-1)*(Math.floor(Math.random()*3)+1);
                    const close = Math.min(100, Math.max(1, target));
                    const wrong = nearNums(n, 3).filter(w => Math.abs(w-n) > Math.abs(close-n));
                    while(wrong.length<3){const w=randNum();if(w!==close&&w!==n&&!wrong.includes(w))wrong.push(w);}
                    choices = shuffle([close, ...wrong.slice(0,3)]); correct = close;
                    instruction = 'سب سے قریب نمبر تھپتھپاؤ!'; break;
                }
                case 4: {
                    const bigger = n + Math.floor(Math.random()*10)+1;
                    const b = Math.min(100, bigger);
                    const wrong = [];
                    while(wrong.length<3){const w=Math.max(1,n-Math.floor(Math.random()*15)-1);if(w<n&&!wrong.includes(w)&&w!==b)wrong.push(w);}
                    choices = shuffle([b, ...wrong.slice(0,3)]); correct = b;
                    instruction = 'بڑا نمبر تھپتھپاؤ!'; break;
                }
                case 5: {
                    const smaller = n - Math.floor(Math.random()*10)-1;
                    const s = Math.max(1, smaller);
                    const wrong = [];
                    while(wrong.length<3){const w=Math.min(100,n+Math.floor(Math.random()*15)+1);if(w>n&&!wrong.includes(w)&&w!==s)wrong.push(w);}
                    choices = shuffle([s, ...wrong.slice(0,3)]); correct = s;
                    instruction = 'چھوٹا نمبر تھپتھپاؤ!'; break;
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
            html += '<div onclick="nuStartAll()" style="background:#FF6600;color:white;padding:14px;border-radius:12px;text-align:center;cursor:pointer;margin-bottom:10px;font-size:18px;font-weight:bold">🌟 Practice All (L1-L' + maxLevel + ')</div>';
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
        if (current >= problems.length) {
            finishUrduNumbersLevel(score, problems.length, level);
            return;
        }

        const p = problems[current];
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
                nextWorksheet();
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
        nextWorksheet();
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
                nextWorksheet();
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
        nextWorksheet();
        return;
    }

    document.getElementById('app').innerHTML =
        '<div class="card"><div class="title">Nice try 💪</div>' +
        '<div style="text-align:center;font-size:28px">' + score + ' / ' + total + '</div>' +
        '<div style="text-align:center;margin-top:10px">Keep practicing this level.</div>' +
        '<button class="btn green" style="margin-top:20px" onclick="showMenu()">Back to Menu</button></div>';
}