// ============ SUPABASE RECORDING ============
function recordResponse(skillId, questionData, correctAnswer, finalAnswer, isCorrect, isFirstTry, attemptCount, responseTimeMs, questionIndex, isSkipped, level) {
    if (!CONFIG.sessionId || !CONFIG.childId) return;
    const params = {
        p_session_id: CONFIG.sessionId,
        p_child_id: CONFIG.childId,
        p_skill_id: skillId,
        p_question_data: questionData,
        p_correct_answer: String(correctAnswer),
        p_final_answer: String(finalAnswer),
        p_is_correct: isCorrect,
        p_is_first_try: isFirstTry,
        p_attempt_count: attemptCount,
        p_is_skipped: isSkipped || false,
        p_response_time_ms: responseTimeMs,
        p_client_event_id: CONFIG.sessionId + '_' + skillId + '_' + questionIndex + '_a' + attemptCount
    };
    if (level != null) params.p_level = level;
    sb.rpc('record_response', params).then(({data, error}) => {
        if (error) console.error('record_response error:', error);
        else console.log('record_response OK:', data);
    });
}

// ============ PASSIVE ITEM RECORDING ============
let _itemTimerStart = null;

function startItemTimer() {
    _itemTimerStart = Date.now();
}

function recordPassiveResponse(skillId, questionData, itemIndex = null) {
    const elapsed = _itemTimerStart ? Date.now() - _itemTimerStart : null;
    recordResponse(
        skillId,
        questionData,
        'seen',         // correctAnswer
        'seen',         // finalAnswer
        true,           // is_correct
        true,           // is_first_try
        1,              // attempt_count
        elapsed,        // response_time_ms
        itemIndex,      // questionIndex (for idempotency key)
        false,          // is_skipped
        null            // level
    );
    _itemTimerStart = null;
}

// ============ FOCUS NUMBER ============
function getFocusNumber(skillId) {
    if (CONFIG.skillSettings && CONFIG.skillSettings[skillId]) {
        return CONFIG.skillSettings[skillId].focus_number;
    }
    return CONFIG.focusNumber;
}

// ============ AUTO FOCUS ADJUSTMENT ============
async function adjustFocusNumbers(slices) {
    if (!slices || !slices.length || !CONFIG.childId) return;

    for (const slice of slices) {
        const skillId = slice.skill_id;
        const accuracy = parseFloat(slice.accuracy);
        const attempted = slice.attempted;

        // Need at least 3 questions to evaluate
        if (attempted < 3) continue;

        // Get or create current settings
        let settings = CONFIG.skillSettings[skillId] || {
            focus_number: CONFIG.focusNumber,
            streak_up: 0,
            streak_down: 0
        };

        let streakUp = settings.streak_up;
        let streakDown = settings.streak_down;
        let focusNum = settings.focus_number;
        let changed = false;

        if (accuracy >= 0.90) {
            streakUp++;
            streakDown = 0;
            if (streakUp >= 3) {
                focusNum = Math.min(focusNum + 1, 50);
                streakUp = 0;
                changed = true;
                console.log('📈 ' + skillId + ' focus_number → ' + focusNum);
            }
        } else if (accuracy < 0.60) {
            streakDown++;
            streakUp = 0;
            if (streakDown >= 2) {
                focusNum = Math.max(focusNum - 1, 3);
                streakDown = 0;
                changed = true;
                console.log('📉 ' + skillId + ' focus_number → ' + focusNum);
            }
        } else {
            // 60-89%: reset both streaks
            streakUp = 0;
            streakDown = 0;
        }

        // Upsert to Supabase
        const { error } = await sb.from('child_skill_settings')
            .upsert({
                child_id: CONFIG.childId,
                skill_id: skillId,
                focus_number: focusNum,
                streak_up: streakUp,
                streak_down: streakDown
            }, { onConflict: 'child_id,skill_id' });

        if (error) console.error('adjustFocus error for ' + skillId + ':', error);

        // Update local cache
        CONFIG.skillSettings[skillId] = {
            focus_number: focusNum,
            streak_up: streakUp,
            streak_down: streakDown
        };

        if (changed) console.log('🎯 ' + skillId + ': streak_up=' + streakUp + ' streak_down=' + streakDown + ' focus=' + focusNum);
    }
}

// ============ AUTO-ADJUST FOCUS NUMBER ============
async function adjustFocusNumbers(slices) {
    if (!slices || !slices.length || !CONFIG.childId) return;

    for (const slice of slices) {
        const skillId = slice.skill_id;
        const accuracy = slice.accuracy;
        if (accuracy == null || !skillId) continue;

        // Get current settings or defaults
        const current = (CONFIG.skillSettings && CONFIG.skillSettings[skillId]) || {};
        let focusNum = current.focus_number || CONFIG.focusNumber;
        let streakUp = current.streak_up || 0;
        let streakDown = current.streak_down || 0;

        // Evaluate
        if (accuracy >= 0.90) {
            streakUp++;
            streakDown = 0;
        } else if (accuracy < 0.60) {
            streakDown++;
            streakUp = 0;
        } else {
            streakUp = 0;
            streakDown = 0;
        }

        // Adjust focus_number if thresholds hit
        let changed = false;
        if (streakUp >= 3) {
            focusNum = Math.min(focusNum + 1, 12);
            streakUp = 0;
            changed = true;
            console.log('📈 ' + skillId + ' focus_number → ' + focusNum);
        } else if (streakDown >= 2) {
            focusNum = Math.max(focusNum - 1, 3);
            streakDown = 0;
            changed = true;
            console.log('📉 ' + skillId + ' focus_number → ' + focusNum);
        }

        // Upsert to Supabase
        const { error } = await sb.from('child_skill_settings')
            .upsert({
                child_id: CONFIG.childId,
                skill_id: skillId,
                focus_number: focusNum,
                streak_up: streakUp,
                streak_down: streakDown
            }, { onConflict: 'child_id,skill_id' });

        if (error) console.error('adjustFocus error:', error);
        else {
            // Update local cache
            CONFIG.skillSettings[skillId] = { focus_number: focusNum, streak_up: streakUp, streak_down: streakDown };
            console.log('🎯 ' + skillId + ': accuracy=' + accuracy + ' streak_up=' + streakUp + ' streak_down=' + streakDown + ' focus=' + focusNum);
        }
    }
}

// ============ HELPER FUNCTIONS ============
function generateAdditionProblems(focusNum) {
    const problems = [];
    const numProblems = focusNum;
    const numFocusTarget = Math.max(1, Math.ceil(numProblems / 3));

    // ~1/3 problems sum to focusNumber
    for (let i = 0; i < numFocusTarget; i++) {
        const a = Math.floor(Math.random() * (focusNum + 1));
        problems.push([a, focusNum - a, focusNum]);
    }

    // ~2/3 problems sum to random numbers 1..focusNumber
    for (let i = numFocusTarget; i < numProblems; i++) {
        const target = Math.floor(Math.random() * focusNum) + 1;
        const a = Math.floor(Math.random() * (target + 1));
        problems.push([a, target - a, target]);
    }

    return problems.sort(() => Math.random() - 0.5);
}


function generateSubtractionProblems(focusNum) {
    const problems = [];
    const numProblems = focusNum;
    const numFocusAnswer = Math.max(1, Math.ceil(numProblems / 3));
    const catNames = Object.keys(CONFIG.categories);

    function pickEmoji() {
        const cat = catNames[Math.floor(Math.random() * catNames.length)];
        return CONFIG.categories[cat][Math.floor(Math.random() * CONFIG.categories[cat].length)];
    }

    // Some problems where answer = focusNumber
    for (let i = 0; i < numFocusAnswer; i++) {
        const b = Math.floor(Math.random() * Math.min(focusNum, 3)) + 1;
        problems.push({a: focusNum + b, b: b, ans: focusNum, mode: i % 2 === 0 ? 'visual' : 'equation', emoji: pickEmoji()});
    }

    // Rest are random easier subtractions (a <= focusNum)
    for (let i = numFocusAnswer; i < numProblems; i++) {
        const a = Math.floor(Math.random() * (focusNum - 1)) + 2;
        const b = Math.floor(Math.random() * (a - 1)) + 1;
        const ans = a - b;
        problems.push({a: ans + b, b: b, ans: ans, mode: i % 2 === 0 ? 'visual' : 'equation', emoji: pickEmoji()});
    }

    // Shuffle
    for (let i = problems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [problems[i], problems[j]] = [problems[j], problems[i]];
    }
    return problems;
}

function generateCountingProblems(maxNum) {
    const catNames = Object.keys(CONFIG.categories);
    const problems = [];
    for (let i = 0; i < maxNum; i++) {
        const cat = catNames[Math.floor(Math.random() * catNames.length)];
        const emoji = CONFIG.categories[cat][Math.floor(Math.random() * CONFIG.categories[cat].length)];
        const count = Math.floor(Math.random() * maxNum) + 1;
        problems.push([count, emoji.repeat(count)]);
    }
    return problems;
}

function generateMatchPairs(maxNum) {
    const catNames = Object.keys(CONFIG.categories);
    const nums = [];
    for (let i = 1; i <= maxNum; i++) nums.push(i);
    const shuffled = nums.sort(() => Math.random() - 0.5).slice(0, maxNum);
    const pairs = [];
    for (const n of shuffled) {
        const cat = catNames[Math.floor(Math.random() * catNames.length)];
        const emoji = CONFIG.categories[cat][Math.floor(Math.random() * CONFIG.categories[cat].length)];
        pairs.push([n, emoji.repeat(n)]);
    }
    return pairs;
}

function generateMoreLessProblems(focusNum) {
    const problems = [];
    const catNames = Object.keys(CONFIG.categories);
    const cat = catNames[Math.floor(Math.random() * catNames.length)];
    const emoji = CONFIG.categories[cat][Math.floor(Math.random() * CONFIG.categories[cat].length)];

    for (let i = 0; i < focusNum; i++) {
        let n;
        do { n = Math.floor(Math.random() * focusNum) + 1; } while (n === focusNum);
        const askMore = Math.random() > 0.5;
        const focusEmojis = emoji.repeat(focusNum);
        const otherEmojis = emoji.repeat(n);
        if (Math.random() > 0.5) {
            const ans = focusNum > n ? 'left' : 'right';
            problems.push([focusEmojis, otherEmojis, askMore ? 'MORE' : 'LESS', askMore ? ans : (ans === 'left' ? 'right' : 'left')]);
        } else {
            const ans = n > focusNum ? 'left' : 'right';
            problems.push([otherEmojis, focusEmojis, askMore ? 'MORE' : 'LESS', askMore ? ans : (ans === 'left' ? 'right' : 'left')]);
        }
    }
    return problems.sort(() => Math.random() - 0.5);
}


function generateColorPatternsL2(focusNum) {
    const c = Object.keys(CONFIG.colors);
    const shuffle = arr => arr.sort(() => Math.random() - 0.5);
    const pick2 = () => { const s = shuffle([...c]); return [s[0], s[1]]; };
    const pick3 = () => { const s = shuffle([...c]); return [s[0], s[1], s[2]]; };
    const problems = [];

    // ABB patterns
    let [a, b] = pick2();
    problems.push({seq: [a,b,b,a,b,b,a], ans: b, type: 'next', label: 'ABB'});
    [a, b] = pick2();
    problems.push({seq: [a,b,b,a,b,b], ans: a, type: 'next', label: 'ABB'});

    // AABB patterns
    [a, b] = pick2();
    problems.push({seq: [a,a,b,b,a,a,b], ans: b, type: 'next', label: 'AABB'});

    // ABBC patterns
    let [x, y, z] = pick3();
    problems.push({seq: [x,y,y,z,x,y,y], ans: z, type: 'next', label: 'ABBC'});

    // Fill-the-blank versions
    [a, b] = pick2();
    problems.push({seq: [a,b,b,null,b,b,a], ans: a, type: 'blank', label: 'ABB'});
    [a, b] = pick2();
    problems.push({seq: [a,a,b,b,null,a,b,b], ans: a, type: 'blank', label: 'AABB'});
    [x, y, z] = pick3();
    problems.push({seq: [x,y,y,z,x,null,y,z], ans: y, type: 'blank', label: 'ABBC'});

    return shuffle(problems).slice(0, focusNum || 7);
}

function generateColorPatterns(focusNum) {
    const n = focusNum || 7;
    const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    // Pattern templates: indices into element array, answer is always last needed
    const templates = [
        {seq:[0,1,0,1,0], ans:1},
        {seq:[0,0,1,0,0], ans:1},
        {seq:[0,1,2,0,1], ans:2},
        {seq:[0,1,0,1,0,1], ans:0},
        {seq:[0,1,1,0,1,1], ans:0},
        {seq:[0,0,1,1,0,0], ans:1},
        {seq:[0,1,1,0,0,1], ans:1},
        {seq:[0,1,0,2,0,1,0], ans:2},
        {seq:[0,1,2,0,1,2], ans:0},
        {seq:[0,0,1,0,0,1,0], ans:0},
        {seq:[1,0,1,0,1], ans:0},
        {seq:[0,1,2,1,0,1], ans:2},
    ];

    const colorKeys = Object.keys(CONFIG.colors);
    const emojiCats = Object.keys(CONFIG.categories);
    const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ'.split('');
    const nums = [1,2,3,4,5,6,7,8,9];
    const types = ['color','emoji','number','letter'];

    function makeElems(type, count) {
        switch(type) {
            case 'color': return shuffle([...colorKeys]).slice(0, count);
            case 'emoji': { const cat=pick(emojiCats); const items=CONFIG.categories[cat]; return items.length>=count ? shuffle([...items]).slice(0,count) : null; }
            case 'number': return shuffle([...nums]).slice(0, count);
            case 'letter': return shuffle([...letters]).slice(0, count);
        }
    }

    function makeChoices(ans, type, elems) {
        let pool;
        switch(type) {
            case 'color': pool=colorKeys; break;
            case 'emoji': { pool=[]; for(const cat of emojiCats) pool.push(...CONFIG.categories[cat]); break; }
            case 'number': pool=nums; break;
            case 'letter': pool=letters; break;
        }
        // Priority: other elements from pattern, then from pool
        const patternOthers = elems.filter(e => e !== ans);
        const rest = shuffle(pool.filter(e => e !== ans && !elems.includes(e)));
        const allWrong = [...new Set([...patternOthers, ...rest])];
        const wrong = allWrong.slice(0, 3);
        return shuffle([ans, ...wrong]);
    }

    const problems = [];
    const used = new Set();
    let attempts = 0;

    while (problems.length < n && attempts < 200) {
        const type = pick(types);
        const tmpl = pick(templates);
        const maxIdx = Math.max(...tmpl.seq, tmpl.ans);
        const elems = makeElems(type, maxIdx + 1);
        if (!elems) { attempts++; continue; }

        const seq = tmpl.seq.map(i => elems[i]);
        const ans = elems[tmpl.ans];
        const key = type + ':' + seq.join(',');
        if (used.has(key)) { attempts++; continue; }
        used.add(key);

        problems.push({seq, ans, type, choices: makeChoices(ans, type, elems)});
        attempts++;
    }

    return shuffle(problems);
}

function setupCanvas() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.strokeStyle = '#4169E1';
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    let drawing = false;

    canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing = true; ctx.beginPath(); const t = e.touches[0]; const r = canvas.getBoundingClientRect(); ctx.moveTo(t.clientX - r.left, t.clientY - r.top); });
    canvas.addEventListener('touchmove', e => { if (!drawing) return; const t = e.touches[0]; const r = canvas.getBoundingClientRect(); ctx.lineTo(t.clientX - r.left, t.clientY - r.top); ctx.stroke(); });
    canvas.addEventListener('touchend', () => { drawing = false; });
    canvas.addEventListener('mousedown', e => { drawing = true; ctx.beginPath(); const r = canvas.getBoundingClientRect(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top); });
    canvas.addEventListener('mousemove', e => { if (!drawing) return; const r = canvas.getBoundingClientRect(); ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke(); });
    canvas.addEventListener('mouseup', () => { drawing = false; });
}

function showFeedback(correct, callback, explanation) {
    const title = document.querySelector('.title');
    if (correct) {
        title.innerHTML = '⭐ Correct! ⭐';
        title.style.color = '#22c55e';
        setTimeout(callback, 800);
    } else {
        title.innerHTML = '❌ ' + (explanation || 'Try again next time!');
        title.style.color = '#ef4444';
        document.querySelector('.card').style.animation = 'shake 0.5s';
        if (explanation) {
            speak(explanation).then(() => setTimeout(callback, 1500));
        } else {
            setTimeout(callback, 2000);
        }
    }
}



function speakArabic(text) {
    return new Promise(resolve => {
        const timeout = setTimeout(resolve, 3000);
        function done() { clearTimeout(timeout); resolve(); }
        function fallback() {
            if (typeof speechSynthesis === 'undefined') { done(); return; }
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'ar-SA';
            u.rate = 0.7;
            u.onend = done;
            u.onerror = done;
            speechSynthesis.speak(u);
        }
        const audio = new Audio('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ar&q='+encodeURIComponent(text));
        audio.onended = done;
        audio.onerror = fallback;
        audio.play().catch(fallback);
    });
}

function speakUrdu(text) {
    return new Promise(resolve => {
        const timeout = setTimeout(resolve, 3000);
        function done() { clearTimeout(timeout); resolve(); }
        function fallback() {
            if (typeof speechSynthesis === 'undefined') { done(); return; }
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'ur-PK';
            u.rate = 0.7;
            u.onend = done;
            u.onerror = done;
            speechSynthesis.speak(u);
        }
        const audio = new Audio('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ur&q='+encodeURIComponent(text));
        audio.onended = done;
        audio.onerror = fallback;
        audio.play().catch(fallback);
    });
}

function speak(text) {
    return new Promise(resolve => {
        if (typeof speechSynthesis === 'undefined') { resolve(); return; }
        const timeout = setTimeout(resolve, 3000);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        const voices = speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Karen'));
        if (femaleVoice) utterance.voice = femaleVoice;
        utterance.onend = () => { clearTimeout(timeout); resolve(); };
        utterance.onerror = () => { clearTimeout(timeout); resolve(); };
        speechSynthesis.speak(utterance);
    });
}

function completeWorksheet(type, score, total) {
    currentAnswers = [];

    let html = '<div class="card"><div class="title">🌟 Great Job! 🌟</div>';
    html += '<p style="color:white;font-size:24px;text-align:center">'+type+': '+score+'/'+total+'</p>';
    html += '<button class="btn green" style="font-size:20px;padding:15px 30px" onclick="nextWorksheet()">Continue →</button>';
    html += '<button class="btn" onclick="showMenu()">← Menu</button></div>';
    document.getElementById('app').innerHTML = html;
}

// ============ SKILL NAME FORMATTING ============
function formatSkillName(skillId) {
    const names = {
        addition: 'Addition', subtraction: 'Subtraction', counting: 'Counting',
        match_numbers: 'Match Numbers', more_less: 'More/Less', bigger_smaller: 'Bigger/Smaller',
        what_comes_next_numbers: 'What Comes Next', numbers_english: 'Numbers English',
        figure_matrices: 'Figure Matrices', color_patterns: 'Color Patterns',
        color_patterns_l2: 'Color Patterns L2', connect_dots: 'Connect Dots',
        find_pairs: 'Find Pairs', which_doesnt_belong: "Doesn't Belong",
        verbal_analogies: 'Verbal Analogies', two_letter_words: '2-Letter Words',
        three_letter_words: '3-Letter Words', what_comes_next_letters: 'Letters What Next',
        trace_upper: 'Trace ABC', trace_lower: 'Trace abc', trace_numbers: 'Trace Numbers',
        urdu_reading: 'Urdu Reading', urdu_trace: 'Urdu Trace', urdu_2letter: 'Urdu 2-Letter',
        urdu_what_next: 'Urdu What Next', urdu_qaida: 'Urdu Qaida', numbers_urdu: 'Numbers Urdu',
        urdu_videos: 'Urdu Videos', arabic_qaida: 'Arabic Qaida', numbers_arabic: 'Numbers Arabic'
    };
    return names[skillId] || skillId;
}

// ============ QUESTION FORMATTING ============
function formatQuestion(skillId, qd) {
    if (!qd) return '—';
    try {
        if (qd.word && qd.meaning) return qd.word + ' (' + qd.meaning + ')';
        if (qd.word) return qd.word;
        if (qd.symbol) return qd.symbol;
        if (qd.letter && qd.symbol) return qd.symbol + ' (' + qd.letter + ')';
        if (qd.letter && qd.name) return qd.letter + ' (' + qd.name + ')';
        if (qd.prompt) return qd.prompt;
        if (qd.question) return qd.question;
        if (qd.a !== undefined && qd.b !== undefined) return qd.a + ' ? ' + qd.b;
        if (qd.items) return JSON.stringify(qd.items);
        var s = JSON.stringify(qd);
        return s.length > 60 ? s.slice(0, 57) + '...' : s;
    } catch(e) { return '—'; }
}
