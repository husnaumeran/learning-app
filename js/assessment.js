// ============ ASSESSMENT SKILL REGISTRY ============
// type: 'text' = standard choices, 'visual' = needs SVG/canvas, 'audio' = needs TTS
// enabled: only enabled skills are included in the weekend challenge
const ASSESSMENT_SKILLS = {
    addition:                 { type: 'text',   enabled: true },
    subtraction:              { type: 'text',   enabled: true },
    counting:                 { type: 'text',   enabled: true },
    more_less:                { type: 'text',   enabled: true },
    bigger_smaller:           { type: 'text',   enabled: true },
    which_doesnt_belong:      { type: 'text',   enabled: true },
    what_comes_next_numbers:  { type: 'text',   enabled: true },
    color_patterns:           { type: 'text',   enabled: true },
    color_patterns_l2:        { type: 'text',   enabled: true },
    verbal_analogies:         { type: 'text',   enabled: true },
    figure_matrices:          { type: 'visual', enabled: false },
    numbers_english:          { type: 'audio',  enabled: false },
    numbers_urdu:             { type: 'audio',  enabled: false },
    numbers_arabic:           { type: 'audio',  enabled: false },
    urdu_qaida:               { type: 'audio',  enabled: false },
    arabic_qaida:             { type: 'audio',  enabled: false },
};

// Verbal analogy pairs for assessment (duplicated from worksheet since they're scoped inside showVerbalAnalogies)
const VA_ASSESS_LEVELS = [
    null,
    { name:'Opposites', conn:' means ',
      pairs:[{a:'big',b:'small'},{a:'hot',b:'cold'},{a:'up',b:'down'},{a:'happy',b:'sad'},{a:'fast',b:'slow'},{a:'day',b:'night'},{a:'open',b:'close'},{a:'loud',b:'quiet'},{a:'go',b:'stop'},{a:'wet',b:'dry'},{a:'full',b:'empty'},{a:'in',b:'out'}] },
    { name:'Function', conn:' is for ',
      pairs:[{a:'pen',b:'write'},{a:'scissors',b:'cut'},{a:'oven',b:'cook'},{a:'broom',b:'sweep'},{a:'phone',b:'call'},{a:'camera',b:'photo'},{a:'toothbrush',b:'brush'},{a:'key',b:'unlock'},{a:'crayon',b:'color'},{a:'drum',b:'beat'},{a:'soap',b:'wash'},{a:'bell',b:'ring'}] },
    { name:'Associations', conn:' → ',
      pairs:[{a:'rain',b:'umbrella'},{a:'cold',b:'coat'},{a:'night',b:'moon'},{a:'bee',b:'honey'},{a:'teacher',b:'school'},{a:'doctor',b:'hospital'},{a:'baby',b:'bottle'},{a:'fish',b:'water'},{a:'bird',b:'nest'},{a:'snow',b:'snowman'},{a:'sun',b:'sunglasses'},{a:'dog',b:'bone'}] },
    { name:'Relational', conn:' → ',
      pairs:[{a:'kitten',b:'cat'},{a:'puppy',b:'dog'},{a:'baby',b:'adult'},{a:'cub',b:'bear'},{a:'chick',b:'chicken'},{a:'lamb',b:'sheep'},{a:'foal',b:'horse'},{a:'calf',b:'cow'},{a:'duckling',b:'duck'},{a:'caterpillar',b:'butterfly'},{a:'piglet',b:'pig'},{a:'seed',b:'flower'}] },
    { name:'Categories', conn:' → ',
      pairs:[{a:'dog',b:'animal'},{a:'apple',b:'fruit'},{a:'car',b:'vehicle'},{a:'shirt',b:'clothing'},{a:'chair',b:'furniture'},{a:'banana',b:'fruit'},{a:'cat',b:'animal'},{a:'shoe',b:'clothing'},{a:'carrot',b:'vegetable'},{a:'truck',b:'vehicle'},{a:'bed',b:'furniture'},{a:'orange',b:'fruit'}] },
    { name:'Parts', conn:' → ',
      pairs:[{a:'wheel',b:'car'},{a:'page',b:'book'},{a:'petal',b:'flower'},{a:'branch',b:'tree'},{a:'door',b:'house'},{a:'feather',b:'bird'},{a:'button',b:'shirt'},{a:'window',b:'house'},{a:'leaf',b:'tree'},{a:'candle',b:'cake'},{a:'seed',b:'plant'},{a:'roof',b:'building'}] },
];

// ============ WEEKEND ASSESSMENT ============

function getWeekStartISO() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon...
    const diff = day === 0 ? 6 : day - 1; // days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
}

async function checkWeekendAssessment() {
    if (!CONFIG.childId) return;
    const weekStart = getWeekStartISO();
    const { data } = await sb.from('sessions')
        .select('id,status')
        .eq('child_id', CONFIG.childId)
        .eq('session_type', 'weekend_assessment')
        .gte('created_at', weekStart)
        .limit(1);

    if (data && data.length > 0) {
        CONFIG.weekendChallengeSession = data[0];
        CONFIG.weekendChallengeDone = data[0].status === 'completed';
        CONFIG.weekendChallengeInProgress = data[0].status === 'in_progress';
    } else {
        CONFIG.weekendChallengeSession = null;
        CONFIG.weekendChallengeDone = false;
        CONFIG.weekendChallengeInProgress = false;
    }
}

async function resumeWeekendChallenge() {
    if (!CONFIG.weekendChallengeSession) return;
    CONFIG.sessionId = CONFIG.weekendChallengeSession.id;

    // Count how many questions already answered in this session
    const { data: existing } = await sb.from('responses')
        .select('id')
        .eq('session_id', CONFIG.sessionId);
    const answered = (existing || []).length;
    const totalExpected = skills.reduce((sum, s) => sum + getQuestionCount(s, 'challenge'), 0);
    const remaining = Math.max(0, totalExpected - answered);

    if (remaining === 0) {
        // All questions done, just finalize
        await finalizeWeekendChallenge();
        return;
    }

    // Get skills from session_meta
    const { data: sess } = await sb.from('sessions')
        .select('session_meta')
        .eq('id', CONFIG.sessionId)
        .single();
    const skills = (sess && sess.session_meta && sess.session_meta.skills_tested) || ['addition', 'subtraction', 'counting'];

    const questions = [];
    const perSkill = Math.max(2, Math.ceil(remaining / skills.length));
    for (const skill of skills) {
        questions.push(...makeAssessmentQs(skill, perSkill));
    }
    const finalQs = questions.sort(() => Math.random() - 0.5).slice(0, remaining);
    runAssessment(finalQs, answered);
}

async function startWeekendChallenge() {
    // 1. Find skills practiced this week
    const weekStart = getWeekStartISO();
    const { data: practiced } = await sb.from('responses')
        .select('skill_id')
        .eq('child_id', CONFIG.childId)
        .gte('created_at', weekStart);

    const counts = {};
    (practiced || []).forEach(r => {
        if (r.skill_id) counts[r.skill_id] = (counts[r.skill_id] || 0) + 1;
    });

    // Filter to enabled evaluable skills only (no cap — all practiced skills included)
    let skills = Object.entries(counts)
        .filter(([id]) => ASSESSMENT_SKILLS[id] && ASSESSMENT_SKILLS[id].enabled)
        .sort((a, b) => b[1] - a[1])
        .map(e => e[0]);

    // Fallback if no practice this week
    if (skills.length === 0) {
        skills = ['addition', 'subtraction', 'counting'];
    }

    // 2. Create session
    const { data: session, error } = await sb.from('sessions').insert({
        child_id: CONFIG.childId,
        session_type: 'weekend_assessment',
        session_meta: { week: getWeekKey(), skills_tested: skills }
    }).select('id').single();

    if (error) { console.error('Weekend session failed:', error); return; }
    CONFIG.sessionId = session.id;

    // 3. Generate questions — each skill gets its own challenge_question_count
    const questions = [];
    for (const skill of skills) {
        const count = getQuestionCount(skill, 'challenge');
        questions.push(...makeAssessmentQs(skill, count));
    }
    const finalQs = questions.sort(() => Math.random() - 0.5);

    // 4. Run
    runAssessment(finalQs);
}

// ============ QUESTION GENERATORS ============

function makeAssessmentQs(skillId, count) {
    const focus = getDifficultyLevel(skillId);
    const qs = [];

    function randWrongs(correct, n, min) {
        min = min || 0;
        const wrongs = new Set();
        let attempts = 0;
        while (wrongs.size < n && attempts < 50) {
            const w = correct + Math.floor(Math.random() * 5) - 2;
            if (w !== correct && w >= min) wrongs.add(w);
            attempts++;
        }
        return [...wrongs];
    }

    switch(skillId) {
        case 'addition': {
            const probs = generateAdditionProblems(focus, count);
            for (const [a, b, sum] of probs) {
                qs.push({
                    skill_id: 'addition',
                    prompt: a + ' + ' + b + ' = ?',
                    choices: [String(sum), ...randWrongs(sum, 3, 0).map(String)].sort(() => Math.random() - 0.5),
                    correct: String(sum),
                    qdata: {type:'addition', a, b, sum}
                });
            }
            break;
        }
        case 'subtraction': {
            const probs = generateSubtractionProblems(focus, count);
            for (const p of probs) {
                qs.push({
                    skill_id: 'subtraction',
                    prompt: p.a + ' − ' + p.b + ' = ?',
                    choices: [String(p.ans), ...randWrongs(p.ans, 3, 0).map(String)].sort(() => Math.random() - 0.5),
                    correct: String(p.ans),
                    qdata: {type:'subtraction', a:p.a, b:p.b, answer:p.ans}
                });
            }
            break;
        }
        case 'counting': {
            const probs = generateCountingProblems(focus, count);
            for (const [ans, emoji] of probs) {
                qs.push({
                    skill_id: 'counting',
                    prompt_emoji: emoji,
                    prompt: 'How many?',
                    choices: [String(ans), ...randWrongs(ans, 3, 1).map(String)].sort(() => Math.random() - 0.5),
                    correct: String(ans),
                    qdata: {type:'counting', emoji, correct_answer:ans}
                });
            }
            break;
        }
        case 'more_less': {
            const probs = generateMoreLessProblems(focus, count);
            for (const [a, b, type, ans] of probs) {
                qs.push({
                    skill_id: 'more_less',
                    prompt: 'Which has ' + type + '?',
                    choices: ['left', 'right'],
                    choice_labels: [String(a), String(b)],
                    correct: ans,
                    qdata: {type:'more_less', left:a, right:b, question_type:type}
                });
            }
            break;
        }
        case 'bigger_smaller': {
            for (let i = 0; i < count; i++) {
                let other;
                do { other = Math.floor(Math.random() * focus) + 1; } while (other === focus);
                const askBigger = Math.random() > 0.5;
                const type = askBigger ? 'BIGGER' : 'SMALLER';
                const swapped = Math.random() > 0.5;
                const left = swapped ? other : focus;
                const right = swapped ? focus : other;
                const correctAns = type === 'BIGGER'
                    ? (left > right ? 'left' : 'right')
                    : (left < right ? 'left' : 'right');
                qs.push({
                    skill_id: 'bigger_smaller',
                    prompt: 'Which is ' + type + '?',
                    choices: ['left', 'right'],
                    choice_labels: [String(left), String(right)],
                    correct: correctAns,
                    qdata: {type:'bigger_smaller', left, right, question_type:type}
                });
            }
            break;
        }
        case 'which_doesnt_belong': {
            const catNames = Object.keys(CONFIG.categories);
            for (let i = 0; i < count; i++) {
                const cat1 = catNames[Math.floor(Math.random() * catNames.length)];
                let cat2;
                do { cat2 = catNames[Math.floor(Math.random() * catNames.length)]; } while (cat2 === cat1);
                const items1 = [...CONFIG.categories[cat1]].sort(() => Math.random() - 0.5).slice(0, 3);
                const oddOne = CONFIG.categories[cat2][Math.floor(Math.random() * CONFIG.categories[cat2].length)];
                const items = [...items1, oddOne].sort(() => Math.random() - 0.5);
                qs.push({
                    skill_id: 'which_doesnt_belong',
                    prompt: 'Which doesn\'t belong?',
                    choices: items,
                    correct: oddOne,
                    emoji_choices: true,
                    qdata: {type:'which_doesnt_belong', items, correct_answer:oddOne, category:cat1}
                });
            }
            break;
        }
        case 'what_comes_next_numbers': {
            const seqs = [
                [[1,2,3,4], '5'], [[2,4,6,8], '10'],
                [[focus-4,focus-3,focus-2,focus-1], String(focus)],
                [[focus,focus-1,focus-2,focus-3], String(focus-4)],
                [[5,10,15,20], '25']
            ];
            const shuffled = [...seqs].sort(() => Math.random() - 0.5).slice(0, count);
            for (const [seq, ans] of shuffled) {
                qs.push({
                    skill_id: 'what_comes_next_numbers',
                    prompt: seq.join(' → ') + ' → ?',
                    choices: [ans, ...randWrongs(Number(ans), 3, 0).map(String)].sort(() => Math.random() - 0.5),
                    correct: ans,
                    qdata: {type:'what_comes_next', sequence:seq, correct_answer:ans}
                });
            }
            break;
        }
        case 'color_patterns': {
            const probs = generateColorPatterns(count).slice(0, count);
            for (const p of probs) {
                const seqDisplay = p.seq.map(s => typeof s === 'string' && CONFIG.colors[s]
                    ? '<span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:' + CONFIG.colors[s] + ';vertical-align:middle"></span>'
                    : '<span>' + s + '</span>'
                ).join(' ');
                const ansDisplay = typeof p.ans === 'string' && CONFIG.colors[p.ans] ? p.ans : String(p.ans);
                qs.push({
                    skill_id: 'color_patterns',
                    prompt_html: seqDisplay + ' <span style="font-size:28px;font-weight:bold">?</span>',
                    prompt: 'What comes next?',
                    choices: p.choices.map(String),
                    correct: String(p.ans),
                    color_choices: p.type === 'color',
                    qdata: {type:'color_patterns', pattern_type:p.type, sequence:p.seq, correct_answer:p.ans}
                });
            }
            break;
        }
        case 'color_patterns_l2': {
            const probs = generateColorPatternsL2(count).slice(0, count);
            for (const p of probs) {
                const colorKeys = Object.keys(CONFIG.colors);
                const seqDisplay = p.seq.map(s => {
                    if (s === null) return '<span style="display:inline-block;width:28px;height:28px;border-radius:50%;border:3px dashed #888;vertical-align:middle"></span>';
                    return '<span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:' + CONFIG.colors[s] + ';vertical-align:middle"></span>';
                }).join(' ');
                const wrong = colorKeys.filter(c => c !== p.ans).sort(() => Math.random() - 0.5).slice(0, 3);
                const choices = [p.ans, ...wrong].sort(() => Math.random() - 0.5);
                qs.push({
                    skill_id: 'color_patterns_l2',
                    prompt_html: seqDisplay,
                    prompt: p.type === 'blank' ? 'Fill the blank!' : 'What comes next?',
                    choices: choices,
                    correct: p.ans,
                    color_choices: true,
                    qdata: {type:'color_patterns_l2', pattern_label:p.label, sequence:p.seq, correct_answer:p.ans}
                });
            }
            break;
        }
        case 'verbal_analogies': {
            // Use child's current VA level (stored in localStorage)
            const vaLevel = Math.min(parseInt(localStorage.getItem('va_level') || '1'), VA_ASSESS_LEVELS.length - 1);
            const levelData = VA_ASSESS_LEVELS[vaLevel];
            if (!levelData) break;
            const pairs = levelData.pairs;
            const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
            const used = new Set();
            let attempts = 0;
            while (qs.length < count && attempts < 200) {
                const sh = shuffle(pairs);
                const ex = sh[0], q = sh.find(p => p !== ex && p.b !== ex.b);
                if (!q) { attempts++; continue; }
                const key = ex.a + ':' + q.a;
                if (used.has(key)) { attempts++; continue; }
                used.add(key);
                const wrongBs = shuffle([...new Set(pairs.filter(p => p.b !== q.b).map(p => p.b))]).slice(0, 3);
                const choices = shuffle([q.b, ...wrongBs]);
                qs.push({
                    skill_id: 'verbal_analogies',
                    prompt: ex.a + levelData.conn + ex.b + '.  ' + q.a + levelData.conn + '?',
                    choices: choices,
                    correct: q.b,
                    qdata: {type:'verbal_analogies', level:vaLevel, level_name:levelData.name, example:{a:ex.a,b:ex.b}, question_a:q.a, correct_answer:q.b}
                });
                attempts++;
            }
            break;
        }
    }

    return qs;
}

// ============ ASSESSMENT UI (NO RETRIES) ============

function runAssessment(questions, indexOffset) {
    indexOffset = indexOffset || 0;
    let current = 0, score = 0;
    let questionStartMs = null;
    const results = [];

    function render() {
        if (current >= questions.length) {
            finishAssessment(results, score, questions.length);
            return;
        }

        const q = questions[current];
        let html = '<div class="card">';
        html += '<div style="text-align:center;font-size:16px;color:#FFD700;margin-bottom:5px">⭐ Weekend Challenge ⭐</div>';
        html += '<div style="text-align:center;font-size:14px;color:#888">' + (current + 1) + ' / ' + questions.length + '</div>';

        // Progress bar
        html += '<div style="background:#333;border-radius:10px;height:8px;margin:10px 0">';
        html += '<div style="background:#FFD700;border-radius:10px;height:8px;width:' + (current / questions.length * 100) + '%"></div></div>';

        // HTML prompt (pattern sequences with color swatches)
        if (q.prompt_html) {
            html += '<div style="text-align:center;font-size:28px;margin:15px 0;line-height:2">' + q.prompt_html + '</div>';
        }

        // Emoji prompt (counting)
        if (q.prompt_emoji) {
            html += '<div style="text-align:center;font-size:36px;margin:15px 0">' + q.prompt_emoji + '</div>';
        }

        // Text prompt
        html += '<div class="title" style="font-size:28px">' + q.prompt + '</div>';

        // Choices
        const cols = q.choices.length <= 2 ? 2 : (q.color_choices ? 4 : 2);
        const fontSize = q.emoji_choices ? '36px' : '28px';
        html += '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:12px;margin:20px 0">';
        q.choices.forEach((ch, i) => {
            if (q.color_choices && CONFIG.colors[ch]) {
                // Color swatch choice
                html += '<div id="ach' + i + '" onclick="assessPick(' + i + ')" style="display:flex;align-items:center;justify-content:center;padding:10px;background:white;border:3px solid #ddd;border-radius:12px;cursor:pointer;transition:all 0.2s;min-height:60px">';
                html += '<span style="display:inline-block;width:44px;height:44px;border-radius:50%;background:' + CONFIG.colors[ch] + '"></span>';
                html += '</div>';
            } else {
                const label = q.choice_labels ? q.choice_labels[i] : ch;
                html += '<div id="ach' + i + '" onclick="assessPick(' + i + ')" style="display:flex;align-items:center;justify-content:center;padding:20px;background:white;border:3px solid #ddd;border-radius:12px;cursor:pointer;font-size:' + fontSize + ';font-weight:bold;transition:all 0.2s;min-height:60px">' + label + '</div>';
            }
        });
        html += '</div></div>';

        document.getElementById('app').innerHTML = html;
        questionStartMs = Date.now();
    }

    window.assessPick = (i) => {
        const responseTimeMs = Date.now() - questionStartMs;
        const q = questions[current];
        const chosen = q.choices[i];
        const correct = chosen === q.correct;

        // Visual feedback — highlight correct and wrong, disable all
        q.choices.forEach((ch, j) => {
            const el = document.getElementById('ach' + j);
            if (ch === q.correct) {
                el.style.borderColor = '#22c55e';
                el.style.background = '#dcfce7';
            } else if (j === i && !correct) {
                el.style.borderColor = '#ef4444';
                el.style.background = '#fee2e2';
            }
            el.onclick = null; // No retries!
        });

        if (correct) score++;
        results.push({ skill_id: q.skill_id, chosen, correct, responseTimeMs, prompt: q.prompt, choices: q.choices, correctAnswer: q.correct });

        // Record to Supabase
        recordResponse(q.skill_id, q.qdata, q.correct, chosen, correct, true, 1, responseTimeMs, indexOffset + current, false);

        // Auto-advance
        setTimeout(() => { current++; render(); }, 1200);
    };

    render();
}

// ============ RESULTS SCREEN ============

function finishAssessment(results, score, total) {
    // Finalize session
    if (CONFIG.sessionId) {
        sb.rpc('finalize_session', { p_session_id: CONFIG.sessionId })
          .then(({data, error}) => {
            if (error) console.error('finalize_session error:', error);
            else {
                console.log('finalize_session OK:', data);
                if (data && data.slices) adjustFocusNumbers(data.slices);
            }
          });
    }

    // Mark done (keyed by child + week)
    localStorage.setItem('weekendChallenge:' + CONFIG.childId + ':' + getWeekKey(), 'true');
    CONFIG.weekendChallengeDone = true;

    // Write to localStorage so progress view can show it
    const today = new Date().toISOString().split('T')[0];
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    const answers = results.map(r => ({q: r.prompt || r.skill_id.replace(/_/g,' '), answer: r.chosen, correct: r.correct, choices: r.choices, correctAnswer: r.correctAnswer, type: r.skill_id.replace(/_/g,' ')}));
    todayProgress.push({type: '⭐ Weekend Challenge', score: score+'/'+total, answers: answers, time: new Date().toISOString()});
    localStorage.setItem('daily_'+today, JSON.stringify(todayProgress));

    // Per-skill breakdown
    const bySkill = {};
    results.forEach(r => {
        if (!bySkill[r.skill_id]) bySkill[r.skill_id] = {correct: 0, total: 0};
        bySkill[r.skill_id].total++;
        if (r.correct) bySkill[r.skill_id].correct++;
    });

    const pct = Math.round(score / total * 100);
    const emoji = pct >= 90 ? '🏆' : pct >= 80 ? '🌟' : pct >= 60 ? '👍' : '💪';
    const msg = pct >= 90 ? 'Amazing!' : pct >= 80 ? 'Great job!' : pct >= 60 ? 'Good effort!' : 'Keep practicing!';

    let html = '<div class="card">';
    html += '<div class="title" style="color:#FFD700;font-size:28px">⭐ Weekend Challenge Complete! ⭐</div>';
    html += '<div style="text-align:center;font-size:80px;margin:10px">' + emoji + '</div>';
    html += '<div style="text-align:center;font-size:36px;color:#333;font-weight:bold">' + score + ' / ' + total + ' (' + pct + '%)</div>';
    html += '<div style="text-align:center;font-size:24px;color:#FFD700;margin:10px">' + msg + '</div>';

    // Per-skill bars
    html += '<div style="margin:20px 0">';
    Object.entries(bySkill).forEach(([skill, data]) => {
        const skillPct = Math.round(data.correct / data.total * 100);
        const barColor = skillPct >= 80 ? '#22c55e' : skillPct >= 60 ? '#FFD700' : '#ef4444';
        const displayName = skill.replace(/_/g, ' ');
        html += '<div style="display:flex;align-items:center;margin:8px 0;color:#333;font-size:16px">';
        html += '<span style="min-width:130px;text-transform:capitalize">' + displayName + '</span>';
        html += '<div style="background:#333;border-radius:5px;height:12px;flex:1;margin:0 10px"><div style="background:' + barColor + ';border-radius:5px;height:12px;width:' + skillPct + '%"></div></div>';
        html += '<span>' + data.correct + '/' + data.total + '</span>';
        html += '</div>';
    });
    html += '</div>';

    html += '<button class="btn green" style="font-size:20px;padding:15px 40px" onclick="showMenu()">Back to Menu</button>';
    html += '</div>';

    document.getElementById('app').innerHTML = html;
}