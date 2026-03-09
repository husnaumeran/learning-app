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
    const remaining = Math.max(0, 10 - answered);

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

    // Filter to skills we can generate assessment questions for
    const supported = ['addition','subtraction','counting','more_less','bigger_smaller',
        'which_doesnt_belong','what_comes_next_numbers'];
    let skills = Object.entries(counts)
        .filter(([id]) => supported.includes(id))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
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

    // 3. Generate 10 questions distributed across skills
    const questions = [];
    const perSkill = Math.max(2, Math.ceil(10 / skills.length));
    for (const skill of skills) {
        questions.push(...makeAssessmentQs(skill, perSkill));
    }
    const finalQs = questions.sort(() => Math.random() - 0.5).slice(0, 10);

    // 4. Run
    runAssessment(finalQs);
}

// ============ QUESTION GENERATORS ============

function makeAssessmentQs(skillId, count) {
    const focus = getFocusNumber(skillId);
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
            const probs = generateAdditionProblems(focus).slice(0, count);
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
            const probs = generateSubtractionProblems(focus).slice(0, count);
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
            const probs = generateCountingProblems(focus).slice(0, count);
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
            const probs = generateMoreLessProblems(focus).slice(0, count);
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

        // Emoji prompt (counting)
        if (q.prompt_emoji) {
            html += '<div style="text-align:center;font-size:36px;margin:15px 0">' + q.prompt_emoji + '</div>';
        }

        // Text prompt
        html += '<div class="title" style="font-size:28px">' + q.prompt + '</div>';

        // Choices
        const cols = q.choices.length <= 2 ? 2 : 2;
        const fontSize = q.emoji_choices ? '36px' : '28px';
        html += '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:12px;margin:20px 0">';
        q.choices.forEach((ch, i) => {
            const label = q.choice_labels ? q.choice_labels[i] : ch;
            html += '<div id="ach' + i + '" onclick="assessPick(' + i + ')" style="display:flex;align-items:center;justify-content:center;padding:20px;background:white;border:3px solid #ddd;border-radius:12px;cursor:pointer;font-size:' + fontSize + ';font-weight:bold;transition:all 0.2s;min-height:60px">' + label + '</div>';
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
        results.push({ skill_id: q.skill_id, chosen, correct, responseTimeMs });

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
    const answers = results.map(r => ({q: r.skill_id.replace(/_/g,' '), answer: r.chosen, correct: r.correct}));
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
    html += '<div style="text-align:center;font-size:36px;color:white;font-weight:bold">' + score + ' / ' + total + ' (' + pct + '%)</div>';
    html += '<div style="text-align:center;font-size:24px;color:#FFD700;margin:10px">' + msg + '</div>';

    // Per-skill bars
    html += '<div style="margin:20px 0">';
    Object.entries(bySkill).forEach(([skill, data]) => {
        const skillPct = Math.round(data.correct / data.total * 100);
        const barColor = skillPct >= 80 ? '#22c55e' : skillPct >= 60 ? '#FFD700' : '#ef4444';
        const displayName = skill.replace(/_/g, ' ');
        html += '<div style="display:flex;align-items:center;margin:8px 0;color:white;font-size:16px">';
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