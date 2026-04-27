// ============ VERBAL ANALOGIES (CogAT Prep) ============
function showVerbalAnalogies() {
    const QUESTIONS = getFocusNumber('verbal_analogies');
    const MIN_FOR_UNLOCK = 5;
    const LEVELS = window.VA_LEVELS;

    // Sanitize emojis for device compatibility
    LEVELS.forEach(lv => { if (lv && lv.pairs) lv.pairs.forEach(p => { if (p.ea) p.ea = safeEmoji(p.ea); if (p.eb) p.eb = safeEmoji(p.eb); }); });

    let level = getContentLevel('verbal_analogies');
    const history = JSON.parse(localStorage.getItem('va_history') || '{}');
    let problems=[], problemLevels=[], current=0, score=0, skips=0, tried=false;
    let questionStartMs = null;
    const attemptCounts = {};

    function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
    function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}

    function getSpeech(lvl, exA, exB, qA) {
        switch(lvl) {
            case 1: return exA+' and '+exB+' are opposites. '+qA+' and?';
            case 2: return 'You use '+exA+' to '+exB+'. You use '+qA+' to?';
            case 3: return exA+' goes with '+exB+'. '+qA+' goes with?';
            case 4: return exA+' grows into '+exB+'. '+qA+' grows into?';
            case 5: return exA+' is a type of '+exB+'. '+qA+' is a type of?';
            case 6: return exA+' is part of '+exB+'. '+qA+' is part of?';
            default: return exA+' and '+exB+'. '+qA+' and?';
        }
    }

    function generateProblems(lvl) {
        const pairs = LEVELS[lvl].pairs;
        const result = [];
        const used = new Set();
        let attempts = 0;
        const bMap = {};
        pairs.forEach(p => { if(p.eb && !bMap[p.b]) bMap[p.b] = p.eb; });

        while (result.length < QUESTIONS && attempts < 200) {
            const sh = shuffle(pairs);
            const ex = sh[0];
            const qCandidates = sh.filter(p => p !== ex && p.b !== ex.b);
            if (!qCandidates.length) { attempts++; continue; }
            const q = qCandidates[0];
            const key = ex.a + ':' + q.a;
            if (used.has(key)) { attempts++; continue; }
            used.add(key);

            const uniqueBs = [...new Set(pairs.filter(p => p.b !== q.b).map(p => p.b))];
            const wrong = shuffle(uniqueBs).slice(0, 3);
            const choices = shuffle([
                {text: q.b, emoji: bMap[q.b]||'', correct: true},
                ...wrong.map(w => ({text: w, emoji: bMap[w]||'', correct: false}))
            ]);
            result.push({ example: ex, question: q, choices });
            attempts++;
        }
        return result;
    }

    function runLearnMode(pairs, onDone) {
        let idx = 0;
        function showCard() {
            if (idx >= pairs.length) { onDone(); return; }
            const p = pairs[idx];
            const conn = level === 1 ? ' and ' : LEVELS[level].conn;
            let html = '<button class="back" onclick="showMenu()">← Back</button>';
            html += '<div class="card"><div class="title">🗣️ Verbal Analogies</div>';
            html += '<div class="inst" style="color:#FFD700">✨ Let\'s Learn! ' + (idx+1) + ' / ' + pairs.length + '</div>';
            html += '<div style="text-align:center;padding:30px 15px;background:#1a1a2e;border-radius:16px;margin:20px 0">';
            html += '<div style="font-size:52px;margin-bottom:8px">' + (p.ea||'') + '</div>';
            html += '<div style="font-size:32px;font-weight:bold;color:white">' + p.a + '</div>';
            html += '<div style="font-size:28px;color:#FFD700;margin:10px 0">' + conn + '</div>';
            html += '<div style="font-size:52px;margin-bottom:8px">' + (p.eb||'') + '</div>';
            html += '<div style="font-size:32px;font-weight:bold;color:white">' + p.b + '</div>';
            html += '</div>';
            const isLast = idx === pairs.length - 1;
            html += '<button onclick="vaLearnNext()" style="width:100%;padding:18px;font-size:22px;background:#22c55e;color:white;border:none;border-radius:14px;cursor:pointer;margin-top:10px">' + (isLast ? '✅ Start Quiz!' : '👉 Next') + '</button>';
            html += '</div>';
            document.getElementById('app').innerHTML = html;
            speak(p.ea ? p.ea + ' ' : '' + p.a + ' and ' + p.b);
        }
        window.vaLearnNext = function() { idx++; showCard(); };
        showCard();
    }

    function startLevel(l) {
        level = l;
        problems = generateProblems(level);
        problemLevels = problems.map(() => l);
        current = 0; score = 0; skips = 0; tried = false;
        // Show learn mode for Level 1 (Opposites) only
        if (l === 1) {
            const quizPairs = problems.map(p => p.question);
            runLearnMode(quizPairs, renderGame);
        } else {
            renderGame();
        }
    }

    function startAllLevels() {
        const maxUnlocked = getContentLevel('verbal_analogies');
        problems = [];
        problemLevels = [];
        for (let l = 1; l <= maxUnlocked; l++) {
            const lProbs = generateProblems(l);
            lProbs.forEach(p => { problems.push(p); problemLevels.push(l); });
        }
        current = 0; score = 0; skips = 0; tried = false;
        renderGame();
    }

    function renderPicker() {
        const maxUnlocked = getContentLevel('verbal_analogies');
        let html = '<button class="back" onclick="showMenu()">← Back</button>';
        html += '<div class="card"><div class="title">🗣️ Verbal Analogies</div>';
        html += '<div class="inst">Pick a level!</div>';
        if(maxUnlocked>1) html+='<div onclick="startVAAll()" style="background:#FF6600;color:white;padding:14px;border-radius:12px;text-align:center;cursor:pointer;margin-bottom:10px;font-size:18px;font-weight:bold">🌟 Practice All (L1-L'+maxUnlocked+')</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:15px 0">';
        for (let l = 1; l <= 6; l++) {
            const unlocked = l <= maxUnlocked;
            const h = history['L'+l] || [];
            const best = h.length ? Math.max(...h.map(s => s.score)) : 0;
            const bg = !unlocked ? '#555' : (l === maxUnlocked ? '#22c55e' : '#3b82f6');
            html += '<div onclick="' + (unlocked ? 'startVALevel('+l+')' : '') + '" style="background:'+bg+';color:white;padding:15px;border-radius:12px;text-align:center;cursor:'+(unlocked?'pointer':'not-allowed')+';opacity:'+(unlocked?'1':'0.5')+'">';
            html += '<div style="font-size:24px;font-weight:bold">L'+l+'</div>';
            html += '<div style="font-size:11px;margin-top:3px">'+LEVELS[l].name+'</div>';
            if (unlocked && h.length) html += '<div style="font-size:11px;margin-top:2px">Best: '+best+'/'+problems.length+' (×'+h.length+')</div>';
            html += '</div>';
        }
        html += '</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.startVALevel = function(l) { startLevel(l); };
    window.startVAAll = startAllLevels;

    function renderGame() {
        if(problemLevels[current]) level=problemLevels[current];
        if (current >= problems.length) {
            const key = 'L' + level;
            const h = history[key] || [];
            const answered = QUESTIONS - skips;
            const qualifies = answered >= MIN_FOR_UNLOCK && (skips / QUESTIONS) <= 0.25;
            h.push({score, skips, qualifies});
            history[key] = h;
            localStorage.setItem('va_history', JSON.stringify(history));

            // Level-up moved to weekend challenge (assessment.js)
            completeWorksheet('Verbal Analogies', score, QUESTIONS);
            return;
        }

        const p = problems[current];
        const conn = LEVELS[level].conn;
        let html = '<button class="back" onclick="showMenu()">← Back</button>';
        html += '<div class="card"><div class="title">🗣️ Verbal Analogies</div>';
        html += '<div style="text-align:center;font-size:18px;color:#888;margin-bottom:5px">'+(current+1)+' / '+problems.length+'</div>';
        html += '<div class="inst">Level '+level+': '+LEVELS[level].name+'</div>';

        // Example pair (green)
        html += '<div style="text-align:center;padding:15px;background:#e8f5e9;border-radius:12px;margin:10px 0;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:5px">';
        if(p.example.ea) html += '<span style="font-size:32px">'+p.example.ea+'</span>';
        html += '<span style="font-size:22px;font-weight:bold">'+cap(p.example.a)+'</span>';
        html += '<span style="font-size:18px;color:#666">'+conn+'</span>';
        if(p.example.eb) html += '<span style="font-size:32px">'+p.example.eb+'</span>';
        html += '<span style="font-size:22px;font-weight:bold">'+cap(p.example.b)+'</span>';
        html += '</div>';

        // Question pair (orange)
        html += '<div style="text-align:center;padding:15px;background:#fff3e0;border-radius:12px;margin:10px 0;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:5px">';
        if(p.question.ea) html += '<span style="font-size:32px">'+p.question.ea+'</span>';
        html += '<span style="font-size:22px;font-weight:bold">'+cap(p.question.a)+'</span>';
        html += '<span style="font-size:18px;color:#666">'+conn+'</span>';
        html += '<span style="font-size:36px">❓</span>';
        html += '</div>';

        // 4 choices
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px">';
        p.choices.forEach((ch, i) => {
            html += '<div id="vach'+i+'" onclick="pickVA('+i+')" style="display:flex;align-items:center;justify-content:center;gap:5px;padding:15px;background:white;border:3px solid #ddd;border-radius:12px;cursor:pointer;min-height:60px;transition:all 0.2s">';
            if(ch.emoji) html += '<span style="font-size:24px">'+ch.emoji+'</span>';
            html += '<span style="font-size:18px;font-weight:bold">'+cap(ch.text)+'</span>';
            html += '</div>';
        });
        html += '</div>';

        // Skip
        html += '<div style="text-align:center;margin-top:12px">';
        html += '<span onclick="skipVA()" style="color:#aaa;font-size:14px;cursor:pointer;text-decoration:underline">Skip →</span>';
        html += '</div></div>';

        document.getElementById('app').innerHTML = html;
        tried = false;
        questionStartMs = Date.now();

        // Speak the analogy
        speak(getSpeech(level, cap(p.example.a), cap(p.example.b), cap(p.question.a)));
    }

    window.pickVA = function(i) {
        const responseTimeMs = Date.now() - questionStartMs;
        attemptCounts[current] = (attemptCounts[current] || 0) + 1;
        const p = problems[current];
        const ch = p.choices[i];
        const el = document.getElementById('vach'+i);
        if(ch.correct) {
            if(!tried) score++;
            currentAnswers.push({q:p.example.a+'→'+p.example.b+', '+p.question.a+'→?', answer:ch.text, correct:true, firstTry:!tried});
            recordResponse('verbal_analogies', {type:'verbal_analogies', example_a:p.example.a, example_b:p.example.b, question_a:p.question.a, correct_answer:p.question.b}, p.question.b, ch.text, true, attemptCounts[current]===1, attemptCounts[current], responseTimeMs, current, false, level);
            el.style.borderColor = '#22c55e';
            el.style.background = '#dcfce7';
            showFeedback(true);
            setTimeout(() => { current++; renderGame(); }, 1200);
        } else {
            tried = true;
            recordResponse('verbal_analogies', {type:'verbal_analogies', example_a:p.example.a, example_b:p.example.b, question_a:p.question.a, correct_answer:p.question.b}, p.question.b, ch.text, false, attemptCounts[current]===1, attemptCounts[current], responseTimeMs, current, false, level);
            el.style.borderColor = '#ef4444';
            el.style.background = '#fee2e2';
            el.style.opacity = '0.5';
            el.onclick = null;
            showFeedback(false);
        }
    };

    window.skipVA = function() {
        const responseTimeMs = Date.now() - questionStartMs;
        skips++;
        currentAnswers.push({q:problems[current].question.a+'→?', answer:'skipped', correct:false, firstTry:false});
        recordResponse('verbal_analogies', {type:'verbal_analogies', question_a:problems[current].question.a}, problems[current].question.b, 'skipped', false, false, 1, responseTimeMs, current, true, level);
        current++;
        renderGame();
    };

    renderPicker();
}
