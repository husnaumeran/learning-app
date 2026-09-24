// ============ ASSESSMENT SKILL REGISTRY ============
// type: 'text' = standard choices, 'visual' = needs SVG/canvas, 'audio' = needs TTS
// enabled: only enabled skills are included in the weekend challenge
const ASSESSMENT_SKILLS = {
    addition:                 { type: 'text',   enabled: true },
    subtraction:              { type: 'text',   enabled: true },
    counting:                 { type: 'text',   enabled: true },
    more_less:                { type: 'text',   enabled: true },
    bigger_smaller:           { type: 'text',   enabled: true },
    match_numbers:            { type: 'text',   enabled: true },
    which_doesnt_belong:      { type: 'text',   enabled: true },
    what_comes_next_numbers:  { type: 'text',   enabled: true },
    find_pairs:               { type: 'Visual', enabled: true },
    color_patterns:           { type: 'text',   enabled: true },
    verbal_analogies:         { type: 'text',   enabled: true },
    figure_matrices:          { type: 'visual', enabled: true },
    numbers_english:          { type: 'audio',  enabled: true },
    numbers_urdu:             { type: 'audio',  enabled: true },
    numbers_arabic:           { type: 'audio',  enabled: true },
    urdu_qaida:               { type: 'audio',  enabled: false },
    arabic_qaida:             { type: 'audio',  enabled: false },
};

// Verbal analogy pairs for assessment (duplicated from worksheet since they're scoped inside showVerbalAnalogies)
const VA_ASSESS_LEVELS = window.VA_LEVELS;

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

function getChallengeStartISO() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 6=Sat
    const diff = day === 0 ? 1 : day === 6 ? 0 : day + 1;
    const saturday = new Date(now);
    saturday.setDate(now.getDate() - diff);
    saturday.setHours(0, 0, 0, 0);
    return saturday.toISOString();
}

function getChallengeDayKey(){
    return localDayKey(); // YYYY-MM-DD
}

function isWeekendDay(){
    const day = new Date().getDay(); // 0=Sun, 6=Sat
    return day === 0 || day === 6;
}

window.checkWeekendAssessment = async function() {
    if (!CONFIG.childId) return;

    // Mon-Fri: no weekend challenge
    if (!isWeekendDay()) {
        CONFIG.weekendChallengeSession = null;
        CONFIG.weekendChallengeDone = false;
        CONFIG.weekendChallengeInProgress = false;
        return;
    }

    const todayKey = getChallengeDayKey();

    const { data } = await sb.from('sessions')
        .select('id,status,session_meta,created_at')
        .eq('child_id', CONFIG.childId)
        .eq('session_type', 'weekend_assessment')
        .in('status', ['in_progress', 'completed'])
        .order('created_at', { ascending: false });

    const todaySession = (data || []).find(s =>
        s.session_meta && s.session_meta.challenge_day === todayKey
    );

    if (todaySession) {
        CONFIG.weekendChallengeSession = todaySession;
        CONFIG.weekendChallengeDone = todaySession.status === 'completed';
        CONFIG.weekendChallengeInProgress = todaySession.status === 'in_progress';
    } else {
        CONFIG.weekendChallengeSession = null;
        CONFIG.weekendChallengeDone = false;
        CONFIG.weekendChallengeInProgress = false;
    }
}

window.resumeWeekendChallenge = async function() {
    if (!CONFIG.weekendChallengeSession) return;
    CONFIG.sessionId = CONFIG.weekendChallengeSession.id;

    // Count how many questions already answered in this session
    const { data: existing } = await sb.from('responses')
        .select('id')
        .eq('session_id', CONFIG.sessionId);
    const answered = (existing || []).length;

    // Get skills from session_meta
    const { data: sess } = await sb.from('sessions')
        .select('session_meta')
        .eq('id', CONFIG.sessionId)
        .single();
    const skills = (sess && sess.session_meta && sess.session_meta.skills_tested) || ['addition', 'subtraction', 'counting', 'find_pairs'];

    const totalExpected = skills.reduce((sum, s) => sum + getQuestionCount(s, 'challenge'), 0);
    const remaining = Math.max(0, totalExpected - answered);

    if (remaining === 0) {
        // All questions done, just finalize
        await finalizeWeekendChallenge();
        return;
    }

    const questions = [];
    const perSkill = Math.max(2, Math.ceil(remaining / skills.length));
    for (const skill of skills) {
        questions.push(...buildAssessmentQuestions(skill, perSkill));
    }
    const finalQs = questions.sort(() => Math.random() - 0.5).slice(0, remaining);
    runAssessment(finalQs, answered);
}

window.startWeekendChallenge = async function() {
    if (!isWeekendDay()) {
        alert('Weekend Challenge is only available on Saturday and Sunday.');
        return;
    }

    const todayKey = getChallengeDayKey();
    const weekStart = getWeekStartISO();

    // 1. Find skills practiced this week
    const { data: practiced } = await sb.from('responses')
        .select('skill_id')
        .eq('child_id', CONFIG.childId)
        .gte('created_at', weekStart);

    const counts = {};
    (practiced || []).forEach(r => {
        if (r.skill_id) counts[r.skill_id] = (counts[r.skill_id] || 0) + 1;
    });

    let skills = Object.entries(counts)
        .filter(([id]) => ASSESSMENT_SKILLS[id] && ASSESSMENT_SKILLS[id].enabled)
        .sort((a, b) => b[1] - a[1])
        .map(e => e[0]);

    if (skills.length === 0) {
        skills = ['addition', 'subtraction', 'counting'];
    }

    // 2. Create session for TODAY only
    const { data: session, error } = await sb.from('sessions').insert({
        child_id: CONFIG.childId,
        session_type: 'weekend_assessment',
        session_meta: {
            week: getWeekKey(),
            challenge_day: todayKey,
            skills_tested: skills
        }
    }).select('id').single();

    if (error || !session) {
        console.error('Weekend session failed:', error);
        alert('Session error: ' + JSON.stringify(error));
        return;
    }

    CONFIG.sessionId = session.id;

    // 3. Generate questions
    const questions = [];
    for (const skill of skills) {
        try {
            const count = getQuestionCount(skill, 'challenge');
            questions.push(...buildAssessmentQuestions(skill, count));
        } catch (e) {
            console.error('buildAssessmentQuestions failed for', skill, e);
            document.getElementById('app').innerHTML =
                '<div style="padding:20px;color:red">Error on skill: ' +
                skill + ' — ' + e.message + '<br>' + e.stack + '</div>';
            return;
        }
    }

    const finalQs = questions.sort(() => Math.random() - 0.5);
    runAssessment(finalQs);
}

// ============ FM ASSESSMENT HELPER ============
function makeFMAssessmentQs(count, levelOverride) {
    const SHAPES = ['circle','square','triangle','star','diamond'];
    const COLORS = ['#FF0000','#0066FF','#00AA00','#FFD700','#FF6600','#FF69B4'];
    const SIZES = [60, 30];
    const fmLevel = Math.min(levelOverride != null ? levelOverride : getContentLevel('figure_matrices'), 8);
    const pick=(a)=>a[Math.floor(Math.random()*a.length)];
    const pickDiff=(a,x)=>{ const o=a.filter(v=>v!==x); return o.length?o[Math.floor(Math.random()*o.length)]:a[0]; };
    const rci=()=>Math.floor(Math.random()*COLORS.length);
    const rciDiff=(x)=>{ let c; do{c=rci();}while(c===x); return c; };
    const fmSvg = (shape, color, size) => {
        const s=size, h=s/2; let d;
        switch(shape) {
            case 'circle': d='<circle cx="'+h+'" cy="'+h+'" r="'+(h-2)+'" fill="'+color+'" stroke="#333" stroke-width="1.5"/>'; break;
            case 'square': d='<rect x="2" y="2" width="'+(s-4)+'" height="'+(s-4)+'" rx="2" fill="'+color+'" stroke="#333" stroke-width="1.5"/>'; break;
            case 'triangle': d='<polygon points="'+h+',3 '+(s-3)+','+(s-3)+' 3,'+(s-3)+'" fill="'+color+'" stroke="#333" stroke-width="1.5"/>'; break;
            case 'star': { const cx=h,cy=h,or=h-3,ir=or*0.4; let p=[]; for(let i=0;i<5;i++){const a1=(i*72-90)*Math.PI/180,a2=((i*72+36)-90)*Math.PI/180; p.push((cx+or*Math.cos(a1))+','+(cy+or*Math.sin(a1)));p.push((cx+ir*Math.cos(a2))+','+(cy+ir*Math.sin(a2)));} d='<polygon points="'+p.join(' ')+'" fill="'+color+'" stroke="#333" stroke-width="1.5"/>'; break; }
            case 'diamond': d='<polygon points="'+h+',3 '+(s-3)+','+h+' '+h+','+(s-3)+' 3,'+h+'" fill="'+color+'" stroke="#333" stroke-width="1.5"/>'; break;
        }
        return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 '+s+' '+s+'">'+d+'</svg>';
    };
    const makeFMProblem = (lvl) => {
        const ci1=rci(), ci2=rciDiff(ci1);
        const sh1=pick(SHAPES), sh2=pickDiff(SHAPES,sh1);
        const esh=pick(SHAPES);
        let tl,tr,bl,ans;
        switch(lvl) {
            case 1: { const s1=pick(SHAPES); tl={shape:s1,ci:ci1,si:0};tr={shape:s1,ci:ci2,si:0};bl={shape:s1,ci:ci1,si:0};ans={shape:s1,ci:ci2,si:0}; break; }
            case 2: { tl={shape:esh,ci:ci1,si:0};tr={shape:esh,ci:ci1,si:1};bl={shape:esh,ci:ci1,si:0};ans={shape:esh,ci:ci1,si:1}; break; }
            case 3: { tl={shape:sh1,ci:ci1,si:0};tr={shape:sh2,ci:ci1,si:0};bl={shape:sh1,ci:ci1,si:0};ans={shape:sh2,ci:ci1,si:0}; break; }
            case 4: { const rule=pick(['color','size','shape']); if(rule==='color'){tl={shape:esh,ci:ci1,si:0};tr={shape:esh,ci:ci1,si:0};bl={shape:esh,ci:ci2,si:0};ans={shape:esh,ci:ci2,si:0};} else if(rule==='size'){tl={shape:esh,ci:ci1,si:0};tr={shape:esh,ci:ci1,si:0};bl={shape:esh,ci:ci1,si:1};ans={shape:esh,ci:ci1,si:1};} else {tl={shape:sh1,ci:ci1,si:0};tr={shape:sh1,ci:ci1,si:0};bl={shape:sh2,ci:ci1,si:0};ans={shape:sh2,ci:ci1,si:0};} break; }
            case 5: { if(Math.random()>0.5){tl={shape:esh,ci:ci1,si:0};tr={shape:esh,ci:ci2,si:0};bl={shape:esh,ci:ci1,si:1};ans={shape:esh,ci:ci2,si:1};} else {tl={shape:esh,ci:ci1,si:0};tr={shape:esh,ci:ci1,si:1};bl={shape:esh,ci:ci2,si:0};ans={shape:esh,ci:ci2,si:1};} break; }
            case 6: { if(Math.random()>0.5){tl={shape:sh1,ci:ci1,si:0};tr={shape:sh1,ci:ci2,si:0};bl={shape:sh2,ci:ci1,si:0};ans={shape:sh2,ci:ci2,si:0};} else {tl={shape:sh1,ci:ci1,si:0};tr={shape:sh2,ci:ci1,si:0};bl={shape:sh1,ci:ci2,si:0};ans={shape:sh2,ci:ci2,si:0};} break; }
            case 7: { if(Math.random()>0.5){tl={shape:sh1,ci:ci1,si:0};tr={shape:sh1,ci:ci1,si:1};bl={shape:sh2,ci:ci1,si:0};ans={shape:sh2,ci:ci1,si:1};} else {tl={shape:sh1,ci:ci1,si:0};tr={shape:sh2,ci:ci1,si:0};bl={shape:sh1,ci:ci1,si:1};ans={shape:sh2,ci:ci1,si:1};} break; }
            case 8: { tl={shape:sh1,ci:ci1,si:0};tr={shape:sh2,ci:ci2,si:0};bl={shape:sh1,ci:ci1,si:1};ans={shape:sh2,ci:ci2,si:1}; break; }
            default: { tl={shape:esh,ci:ci1,si:0};tr={shape:esh,ci:ci2,si:0};bl={shape:esh,ci:ci1,si:0};ans={shape:esh,ci:ci2,si:0}; }
        }
        const ansKey = JSON.stringify(ans);
        const choices=[ans];
        const tried=new Set([ansKey]);
        let att=0;
        while(choices.length<4 && att<100) {
            att++;
            const d={...ans};
            const prop=pick(['shape','ci','si']);
            if(prop==='shape') d.shape=pickDiff(SHAPES,ans.shape);
            else if(prop==='ci') d.ci=rciDiff(ans.ci);
            else d.si=1-ans.si;
            const k=JSON.stringify(d);
            if(!tried.has(k)){tried.add(k);choices.push(d);}
        }
        while(choices.length<4) choices.push({shape:pick(SHAPES),ci:rci(),si:Math.floor(Math.random()*2)});
        const shuffled = choices.sort(() => Math.random() - 0.5);
        const ansIdx = shuffled.findIndex(c => JSON.stringify(c) === ansKey);
        const cell = (o) => '<div style="background:#f5f5f5;border-radius:8px;padding:6px;display:flex;align-items:center;justify-content:center">'+fmSvg(o.shape,COLORS[o.ci],SIZES[o.si])+'</div>';
        const grid = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:180px;margin:0 auto">'+cell(tl)+cell(tr)+cell(bl)+'<div style="background:#FFF8DC;border:2px dashed #FFD700;border-radius:8px;padding:6px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#FF69B4">?</div></div>';
        const choiceLabels = shuffled.map(c => '<div style="display:flex;align-items:center;justify-content:center">'+fmSvg(c.shape,COLORS[c.ci],SIZES[c.si])+'</div>');
        return {
            skill_id: 'figure_matrices',
            prompt: 'Which one fits?',
            prompt_html: grid,
            choices: shuffled.map((c,i) => String(i)),
            choice_labels: choiceLabels,
            correct: String(ansIdx),
            qdata: {type:'figure_matrices', level:fmLevel}
        };
    };
    const qs = [];
    let attempts = 0;
    while (qs.length < count && attempts < 200) {
        qs.push(makeFMProblem(fmLevel));
        attempts++;
    }
    return qs;
}

// ============ QUESTION GENERATORS ============

function makeAssessmentQs(skillId, count, overrides) {
    const focus = (overrides && overrides.difficulty != null) ? overrides.difficulty : getDifficultyLevel(skillId);
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

    // ---- shared helpers for the audio numbers skills (English/Urdu/Arabic) ----
    // Every pool below is built as an explicit array from a bounded range, then
    // sliced — never rejection-sampled — so every loop here has a fixed trip
    // count and provably terminates regardless of where n falls in its range.
    function numRange(lo, hi) { const a = []; for (let v = lo; v <= hi; v++) a.push(v); return a; }
    function shufN(a) { return [...a].sort(() => Math.random() - 0.5); }
    function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }
    const URDU_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
    const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
    const toUrduDigits = n => String(n).split('').map(d => URDU_DIGITS[+d]).join('');
    const toArabicDigits = n => String(n).split('').map(d => ARABIC_DIGITS[+d]).join('');

    // Builds one question object in the shape runAssessment/recordResponse expect.
    // cfg.instruction may be a string or a fn(n) for prompts that embed the number.
    // cfg.choiceDisplay renders choices in a script (Urdu/Arabic digits); omitted
    // means choices display as the plain digit string they already are.
    // cfg.promptDisplay, if set, shows the number itself as part of the prompt
    // (the "Learn" reading check, and Urdu's What Comes Next/More/Less, which
    // teach with the numeral visible); omitted means audio-only, matching how
    // English and Arabic's L2+ levels actually present ("verify per file").
    function numberChoiceQ(sId, level, n, correct, wrongPool, cfg) {
        const wrongs = shufN(wrongPool).slice(0, 3);
        const choiceVals = shufN([correct, ...wrongs]);
        const q = {
            skill_id: sId,
            prompt: typeof cfg.instruction === 'function' ? cfg.instruction(n) : cfg.instruction,
            choices: choiceVals.map(String),
            correct: String(correct),
            audio: { n: n, prefix: cfg.audioPrefix },
            qdata: { type: sId, number: n, correct_answer: correct, level: level }
        };
        if (cfg.choiceDisplay) q.choice_labels = choiceVals.map(cfg.choiceDisplay);
        if (cfg.promptDisplay) {
            q.prompt_html = '<div style="direction:' + (cfg.dir || 'rtl') + ';font-size:60px;font-weight:bold">' + cfg.promptDisplay(n) + '</div>';
        }
        return q;
    }

    // "Hear it, tap it" — n from [1,hi]; wrong choices from a +/-10 window,
    // which collapses to the whole range when hi is small (e.g. Urdu's learned
    // range), matching how that worksheet's own nearNums has no window at all.
    function hearTapQ(sId, level, hi, cfg) {
        const n = pickOne(numRange(1, hi));
        const near = numRange(Math.max(1, n - 10), Math.min(hi, n + 10)).filter(v => v !== n);
        const pool = near.length >= 3 ? near : numRange(1, hi).filter(v => v !== n);
        return numberChoiceQ(sId, level, n, n, pool, cfg);
    }

    // "Closest" — wrong choices are all strictly farther from n than the
    // correct answer, so exactly one choice is ever the closest.
    function closestQ(sId, level, hi, cfg) {
        const n = pickOne(numRange(1, hi));
        let deltas = [-3, -2, -1, 1, 2, 3].filter(d => n + d >= 1 && n + d <= hi);
        if (!deltas.length) deltas = [n <= 1 ? 1 : -1];
        const delta = pickOne(deltas);
        const correct = n + delta;
        const dist = Math.abs(delta);
        let pool = numRange(1, hi).filter(v => v !== n && v !== correct && Math.abs(v - n) > dist);
        if (pool.length < 3) pool = numRange(1, hi).filter(v => v !== n && v !== correct);
        return numberChoiceQ(sId, level, n, correct, pool, cfg);
    }

    // "More Than" — wrong choices are drawn only from <= n, so no wrong choice
    // is itself a valid "more than n" answer (the grading is exact-match, not
    // a > comparison, so an also-bigger wrong choice would be a second correct
    // answer in disguise). hi is floored at 6 so there's always room for n>=3
    // with 3 smaller distractors below it and 1 bigger correct answer above.
    function moreThanQ(sId, level, hiIn, cfg) {
        const hi = Math.max(hiIn, 6);
        const n = pickOne(numRange(3, hi - 1));
        const correct = pickOne(numRange(n + 1, hi));
        const pool = numRange(1, n);
        return numberChoiceQ(sId, level, n, correct, pool, cfg);
    }

    // "Less Than" — mirror of moreThanQ; wrong choices are drawn only from >= n.
    function lessThanQ(sId, level, hiIn, cfg) {
        const hi = Math.max(hiIn, 6);
        const n = pickOne(numRange(2, hi - 2));
        const correct = pickOne(numRange(1, n - 1));
        const pool = numRange(n, hi);
        return numberChoiceQ(sId, level, n, correct, pool, cfg);
    }

    // Urdu-only "What Comes Next" — correct is always n+1.
    function whatComesNextQ(sId, level, hiIn, cfg) {
        const hi = Math.max(hiIn, 6);
        const n = pickOne(numRange(1, hi - 1));
        const correct = n + 1;
        const pool = numRange(1, hi).filter(v => v !== n && v !== correct);
        return numberChoiceQ(sId, level, n, correct, pool, cfg);
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
        case 'find_pairs': {
            const pairs = generateMatchPairs(focus, count);
            for (const [n, emoji] of pairs) {
                qs.push({
                    skill_id: 'find_pairs',
                    prompt: 'Find the matching pair',
                    prompt_emoji: emoji,
                    choices: [String(n), ...randWrongs(n, 3, 1).map(String)].sort(() => Math.random() - 0.5),
                    correct: String(n),
                    qdata: { type: 'find_pairs', number: n, emoji_count: n }
                });
            }
            break;
        }
        case 'match_numbers': {
            const pairs = generateMatchPairs(focus, count);
            for (const [ans, emoji] of pairs) {
                qs.push({
                    skill_id: 'match_numbers',
                    prompt_emoji: emoji,
                    prompt: 'Number Match',
                    choices: [String(ans), ...randWrongs(ans, 3, 1).map(String)].sort(() => Math.random() - 0.5),
                    correct: String(ans),
                    qdata: {type:'match_numbers', number: ans, emoji_count:ans}
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
                do { other = Math.floor(Math.random() * Math.max(focus, 2)) + 1; } while (other === focus);
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
            // Generated, not a fixed list: five hardcoded sequences meant a child
            // could memorise the answers instead of learning to count on. Steps
            // widen with difficulty so skip-counting appears once they're ready,
            // and a descending run starts high enough that nothing reaches zero.
            const stepPool = focus <= 2 ? [1, 2] : (focus <= 4 ? [1, 2, 5] : [1, 2, 5, 10]);
            for (let i = 0; i < count; i++) {
                const step = stepPool[Math.floor(Math.random() * stepPool.length)];
                const goingUp = Math.random() < 0.5;
                const start = (goingUp ? 1 : step * 4 + 1) + Math.floor(Math.random() * (focus * 2 + 5));
                const seq = [0, 1, 2, 3].map(k => goingUp ? start + k * step : start - k * step);
                const ans = goingUp ? start + 4 * step : start - 4 * step;
                const choices = [String(ans)];
                for (let k = 1; choices.length < 4 && k <= 6; k++) {
                    [ans + step * k, ans - step * k].forEach(v => {
                        if (v >= 1 && choices.length < 4 && choices.indexOf(String(v)) === -1) choices.push(String(v));
                    });
                }
                qs.push({
                    skill_id: 'what_comes_next_numbers',
                    prompt: seq.join(' → ') + ' → ?',
                    choices: choices.sort(() => Math.random() - 0.5),
                    correct: String(ans),
                    qdata: {type:'what_comes_next', sequence:seq, correct_answer:String(ans), step:step, direction: goingUp ? 'up' : 'down'}
                });
            }
            break;
        }
        case 'color_patterns': {
            // Merged skill (was color_patterns + color_patterns_l2) — six levels,
            // see generateColorPatternProblems in helpers.js. Levels 5-6 are an
            // open palette in practice (p.choices is null); the weekend challenge
            // has no palette UI, so synthesize 4 fixed choices from the color set.
            const lvl = Math.min(Math.max(1, (overrides && overrides.level != null) ? overrides.level : getContentLevel('color_patterns')), 6);
            const probs = generateColorPatternProblems(lvl, count);
            for (const p of probs) {
                const dot = (hex, dashed) => '<span style="display:inline-block;width:28px;height:28px;border-radius:50%;'
                    + (dashed ? 'border:3px dashed #888;' : 'background:' + hex + ';') + 'vertical-align:middle;margin:0 2px"></span>';
                const seqDisplay = p.seq.map(s => {
                    if (s === null) return dot(null, true);
                    if (p.elemType === 'color' && CONFIG.colors[s]) return dot(CONFIG.colors[s], false);
                    return '<span style="font-size:22px;vertical-align:middle;margin:0 2px">' + s + '</span>';
                }).join(' ') + (p.type === 'next' ? ' <span style="font-size:28px;font-weight:bold">?</span>' : '');

                let choices;
                if (p.choices) {
                    choices = p.choices.map(String);
                } else {
                    const colorKeys = Object.keys(CONFIG.colors);
                    const wrong = colorKeys.filter(c => c !== p.ans).sort(() => Math.random() - 0.5).slice(0, 3);
                    choices = [p.ans, ...wrong].sort(() => Math.random() - 0.5);
                }

                qs.push({
                    skill_id: 'color_patterns',
                    prompt_html: seqDisplay,
                    prompt: p.type === 'blank' ? 'What fills the blank?' : 'What comes next?',
                    choices: choices,
                    correct: String(p.ans),
                    color_choices: p.elemType === 'color',
                    qdata: {type:'color_patterns', pattern_type:p.type, elem_type:p.elemType, sequence:p.seq, correct_answer:p.ans, level:lvl}
                });
            }
            break;
        }
        case 'verbal_analogies': {
            const vaLevel = Math.min((overrides && overrides.level != null) ? overrides.level : getContentLevel('verbal_analogies'), VA_ASSESS_LEVELS.length - 1);
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
        case 'figure_matrices': {
            qs.push(...makeFMAssessmentQs(count, overrides && overrides.level));
            break;
        }
        case 'numbers_english': {
            const maxLevel = 4;
            const lvl = Math.min(Math.max(1, (overrides && overrides.level != null) ? overrides.level : getContentLevel('numbers_english')), maxLevel);
            const cfg = { audioPrefix: 'en' };
            for (let i = 0; i < count; i++) {
                let q;
                if (lvl === 1) q = hearTapQ('numbers_english', lvl, 100, Object.assign({}, cfg, {instruction: 'Tap the number you hear!'}));
                else if (lvl === 2) q = closestQ('numbers_english', lvl, 100, Object.assign({}, cfg, {instruction: 'Which is closest to what you hear?'}));
                else if (lvl === 3) q = moreThanQ('numbers_english', lvl, 100, Object.assign({}, cfg, {instruction: 'Tap a number MORE than what you hear!'}));
                else q = lessThanQ('numbers_english', lvl, 100, Object.assign({}, cfg, {instruction: 'Tap a number LESS than what you hear!'}));
                qs.push(q);
            }
            break;
        }
        case 'numbers_arabic': {
            const maxLevel = 5;
            const lvl = Math.min(Math.max(1, (overrides && overrides.level != null) ? overrides.level : getContentLevel('numbers_arabic')), maxLevel);
            const base = { audioPrefix: 'ar', choiceDisplay: toArabicDigits };
            for (let i = 0; i < count; i++) {
                let q;
                if (lvl === 1) q = hearTapQ('numbers_arabic', lvl, 20, { audioPrefix: 'ar', promptDisplay: toArabicDigits, instruction: 'Which English number matches?' });
                else if (lvl === 2) q = hearTapQ('numbers_arabic', lvl, 100, Object.assign({}, base, {instruction: 'اضغط الرقم الذي تسمعه!'}));
                else if (lvl === 3) q = closestQ('numbers_arabic', lvl, 100, Object.assign({}, base, {instruction: 'اضغط الرقم الأقرب!'}));
                else if (lvl === 4) q = moreThanQ('numbers_arabic', lvl, 100, Object.assign({}, base, {instruction: 'اضغط الرقم الأكبر!'}));
                else q = lessThanQ('numbers_arabic', lvl, 100, Object.assign({}, base, {instruction: 'اضغط الرقم الأصغر!'}));
                qs.push(q);
            }
            break;
        }
        case 'numbers_urdu': {
            const maxLevel = 5;
            const lvl = Math.min(Math.max(1, (overrides && overrides.level != null) ? overrides.level : getContentLevel('numbers_urdu')), maxLevel);
            // Same "focus number" the worksheet itself calls getLearnedNumberMax()
            // via getFocusNumber — floored at 6 (not the worksheet's 3) so the
            // More/Less/What-Comes-Next pools always have room; see moreThanQ.
            const learnedMax = Math.max(3, (overrides && overrides.difficulty != null) ? overrides.difficulty : focus);
            const span = Math.max(learnedMax, 6);
            const base = { audioPrefix: 'ur', choiceDisplay: toUrduDigits };
            for (let i = 0; i < count; i++) {
                let q;
                if (lvl === 1) q = hearTapQ('numbers_urdu', lvl, 20, { audioPrefix: 'ur', promptDisplay: toUrduDigits, instruction: 'Which English number matches?' });
                else if (lvl === 2) q = hearTapQ('numbers_urdu', lvl, span, Object.assign({}, base, {instruction: 'جو نمبر سنو وہ تھپتھپاؤ!'}));
                else if (lvl === 3) q = whatComesNextQ('numbers_urdu', lvl, span, Object.assign({}, base, {instruction: 'اگلا نمبر کون سا ہے؟', promptDisplay: toUrduDigits, dir: 'ltr'}));
                else if (lvl === 4) q = moreThanQ('numbers_urdu', lvl, span, Object.assign({}, base, {promptDisplay: toUrduDigits, instruction: n => toUrduDigits(n) + ' سے بڑا نمبر تھپتھپاؤ!'}));
                else q = lessThanQ('numbers_urdu', lvl, span, Object.assign({}, base, {promptDisplay: toUrduDigits, instruction: n => toUrduDigits(n) + ' سے چھوٹا نمبر تھپتھپاؤ!'}));
                qs.push(q);
            }
            break;
        }
    }

    return qs;
}

// ============ RE-TEST EARLIER MATERIAL (RETENTION REVIEW) ============

function buildAssessmentQuestions(skillId, count) {
    if (!count || count < 1) return makeAssessmentQs(skillId, count);

    const isMasterySkill = skillId === 'verbal_analogies' || skillId === 'figure_matrices' ||
        skillId === 'numbers_english' || skillId === 'numbers_urdu' || skillId === 'numbers_arabic';
    const difficultyReviewSkills = ['addition', 'subtraction', 'counting', 'find_pairs', 'match_numbers', 'more_less', 'bigger_smaller', 'what_comes_next_numbers'];

    let earlierMaterialExists = false;
    let currentLevel, floor, currentDifficulty;

    if (isMasterySkill) {
        currentLevel = getContentLevel(skillId);
        if (skillId === 'figure_matrices') currentLevel = Math.min(currentLevel, 8);
        if (skillId === 'verbal_analogies') currentLevel = Math.min(currentLevel, VA_ASSESS_LEVELS.length - 1);
        if (skillId === 'numbers_english') currentLevel = Math.min(currentLevel, 4);
        if (skillId === 'numbers_urdu' || skillId === 'numbers_arabic') currentLevel = Math.min(currentLevel, 5);
        earlierMaterialExists = currentLevel > 1;
    } else if (difficultyReviewSkills.indexOf(skillId) !== -1) {
        floor = FOCUS_FLOORS[skillId] ?? FOCUS_FLOORS.default;
        currentDifficulty = getDifficultyLevel(skillId);
        earlierMaterialExists = currentDifficulty > floor;
    }

    const reviewCount = earlierMaterialExists
        ? Math.min(Math.max(1, Math.floor(count / 3)), count - 1)
        : 0;
    const currentCount = count - reviewCount;

    const currentQs = makeAssessmentQs(skillId, currentCount);
    if (isMasterySkill) currentQs.forEach(q => { q.level = currentLevel; });

    let reviewQs = [];
    if (reviewCount > 0) {
        try {
            if (isMasterySkill) {
                const needing = getSkillProgress(skillId)?.levels_needing_review || [];
                const flagged = needing.filter(l => l >= 1 && l < currentLevel);
                const pool = flagged.length ? flagged : Array.from({length: currentLevel - 1}, (_, i) => i + 1);
                for (let i = 0; i < reviewCount; i++) {
                    const level = pool[Math.floor(Math.random() * pool.length)];
                    const [q] = makeAssessmentQs(skillId, 1, { level });
                    if (q) {
                        q.level = level;
                        q.qdata.purpose = 'review';
                        q.qdata.review_of_level = level;
                        reviewQs.push(q);
                    }
                }
            } else {
                for (let i = 0; i < reviewCount; i++) {
                    const difficulty = floor + Math.floor(Math.random() * (currentDifficulty - floor));
                    const [q] = makeAssessmentQs(skillId, 1, { difficulty });
                    if (q) {
                        q.qdata.purpose = 'review';
                        q.qdata.review_difficulty = difficulty;
                        reviewQs.push(q);
                    }
                }
            }
        } catch (e) {
            console.error('review question generation failed for', skillId, e);
            reviewQs = [];
        }
    }

    return currentQs.concat(reviewQs).sort(() => Math.random() - 0.5);
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

        // Audio prompt (numbers hear-it skills)
        if (q.audio) {
            html += '<div style="text-align:center;margin:15px 0"><button onclick="assessPlayAudio()" style="font-size:60px;background:none;border:none;cursor:pointer;padding:15px">🔊</button></div>';
        }

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
        if (q.audio) setTimeout(() => window.assessPlayAudio(), 400);
    }

    window.assessPlayAudio = function() {
        const q = questions[current];
        if (!q || !q.audio) return;
        new Audio('audio/numbers/' + q.audio.prefix + '_' + q.audio.n + '.mp3').play().catch(() => {
            const fallback = q.audio.prefix === 'ur' ? speakUrdu : q.audio.prefix === 'ar' ? speakArabic : speak;
            fallback(String(q.audio.n));
        });
    };

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
        const isReview = !!(q.qdata && q.qdata.purpose === 'review');
        results.push({ skill_id: q.skill_id, chosen, correct, responseTimeMs, prompt: q.prompt, choices: q.choices, correctAnswer: q.correct, isReview });

        // Record to Supabase
        recordResponse(q.skill_id, q.qdata, q.correct, chosen, correct, true, 1, responseTimeMs, indexOffset + current, false, q.level);

        // Auto-advance
        setTimeout(() => { current++; render(); }, 1200);
    };

    render();
}

// ============ RESULTS SCREEN ============

async function finishAssessment(results, score, total) {
    // Finalize session
    if (CONFIG.sessionId) {
        try {
            const { data, error } = await sb.rpc('finalize_session', { p_session_id: CONFIG.sessionId });
            if (error) {
                console.error('finalize_session error:', error);
            } else {
                console.log('finalize_session OK:', data);
                if (data && data.slices) await adjustFocusNumbers(data.slices);
                await refreshSkillProgress();
                if (data && data.levels_unlocked) {
                    Object.entries(data.levels_unlocked).forEach(([skillId, level]) => {
                        celebrateLevelUnlock(skillId, level);
                    });
                }
            }
        } catch (e) {
            console.error('finishAssessment finalize step failed:', e);
        }
    }

    // Mark done (keyed by child + week)
    localStorage.setItem('weekendChallenge:' + CONFIG.childId + ':' + getChallengeDayKey(), 'true');
    CONFIG.weekendChallengeDone = true;

    // Write to localStorage so progress view can show it
    const today = localDayKey();
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    const answers = results.map(r => ({q: r.prompt || r.skill_id.replace(/_/g,' '), answer: r.chosen, correct: r.correct, choices: r.choices, correctAnswer: r.correctAnswer, type: r.skill_id.replace(/_/g,' ')}));
    todayProgress.push({type: '⭐ Weekend Challenge', score: score+'/'+total, answers: answers, time: new Date().toISOString()});
    localStorage.setItem('daily_'+today, JSON.stringify(todayProgress));

    // Per-skill breakdown — current material vs. retention (review) material
    const bySkill = {};
    results.forEach(r => {
        if (!bySkill[r.skill_id]) bySkill[r.skill_id] = {
            current: {correct: 0, total: 0},
            review: {correct: 0, total: 0}
        };
        const bucket = r.isReview ? bySkill[r.skill_id].review : bySkill[r.skill_id].current;
        bucket.total++;
        if (r.correct) bucket.correct++;
    });

    const pct = Math.round(score / total * 100);
    const emoji = pct >= 90 ? '🏆' : pct >= 80 ? '🌟' : pct >= 60 ? '👍' : '💪';
    const msg = pct >= 90 ? 'Amazing!' : pct >= 80 ? 'Great job!' : pct >= 60 ? 'Good effort!' : 'Keep practicing!';

    let html = '<div class="card">';
    html += '<div class="title" style="color:#FFD700;font-size:28px">⭐ Weekend Challenge Complete! ⭐</div>';
    html += '<div style="text-align:center;font-size:80px;margin:10px">' + emoji + '</div>';
    html += '<div style="text-align:center;font-size:36px;color:#333;font-weight:bold">' + score + ' / ' + total + ' (' + pct + '%)</div>';
    html += '<div style="text-align:center;font-size:24px;color:#FFD700;margin:10px">' + msg + '</div>';

    // Per-skill bars — current material, plus a retention bar when review questions ran
    html += '<div style="margin:20px 0">';
    Object.entries(bySkill).forEach(([skill, data]) => {
        const displayName = skill.replace(/_/g, ' ');
        const cur = data.current;
        const curPct = cur.total ? Math.round(cur.correct / cur.total * 100) : 0;
        const curColor = curPct >= 80 ? '#22c55e' : curPct >= 60 ? '#FFD700' : '#ef4444';
        html += '<div style="margin:8px 0">';
        html += '<div style="display:flex;align-items:center;color:#333;font-size:16px">';
        html += '<span style="min-width:130px;text-transform:capitalize">' + displayName + '</span>';
        html += '<div style="background:#333;border-radius:5px;height:12px;flex:1;margin:0 10px"><div style="background:' + curColor + ';border-radius:5px;height:12px;width:' + curPct + '%"></div></div>';
        html += '<span>' + cur.correct + '/' + cur.total + '</span>';
        html += '</div>';
        if (data.review.total) {
            const revPct = Math.round(data.review.correct / data.review.total * 100);
            const revColor = revPct >= 80 ? '#22c55e' : revPct >= 60 ? '#FFD700' : '#ef4444';
            html += '<div style="display:flex;align-items:center;color:#888;font-size:13px;margin-top:2px">';
            html += '<span style="min-width:130px">⭐ remembers it</span>';
            html += '<div style="background:#333;border-radius:5px;height:8px;flex:1;margin:0 10px"><div style="background:' + revColor + ';border-radius:5px;height:8px;width:' + revPct + '%"></div></div>';
            html += '<span>' + data.review.correct + '/' + data.review.total + '</span>';
            html += '</div>';
        }
        html += '</div>';
    });
    html += '</div>';

    html += '<button class="btn green" style="font-size:20px;padding:15px 40px" onclick="showMenu()">Back to Menu</button>';
    html += '</div>';

    document.getElementById('app').innerHTML = html;
}