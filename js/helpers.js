// ============ EMOJI COMPATIBILITY ============
const _emojiCache = {};
function canRenderEmoji(emoji) {
    if (emoji in _emojiCache) return _emojiCache[emoji];
    const c = document.createElement('canvas');
    c.width = 20; c.height = 20;
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '16px sans-serif';
    ctx.fillText(emoji, 0, 0);
    const data = ctx.getImageData(0, 0, 20, 20).data;
    let hasColor = false;
    for (let i = 0; i < data.length; i += 4) {
        const [r, g, b, a] = [data[i], data[i+1], data[i+2], data[i+3]];
        if (a > 0 && (r !== g || g !== b || (r > 50 && r < 200))) { hasColor = true; break; }
    }
    _emojiCache[emoji] = hasColor;
    return hasColor;
}

// Newer emoji → universally supported fallback
const EMOJI_FALLBACKS = {
    '🪑':'💺','🪞':'🔲','🩴':'👡','🛼':'⛸️','🩳':'👖','🪲':'🐛','🪳':'🐜',
    '🦭':'🐟','🪸':'🐚','🦩':'🐦','🪻':'🌸','🪷':'🌸','🪛':'🔧','🪚':'🔨',
    '🪜':'📐','🪘':'🥁','🫖':'☕','🪐':'🌍','🤫':'😶','🥤':'🍵','🧹':'🔨',
    '🪥':'🔑','🧼':'💧','🧥':'👔','🪺':'🐦','🦴':'🍖','🧑':'👤','🪵':'🌳',
    '🪶':'🐦','🪟':'🔲','🪴':'🌱','🛞':'⚙️','🧲':'⚙️','🥡':'🍴',
    '🧂':'🍴','🛸':'🚀','🧦':'👟','🧣':'👒','🤗':'😊','🥰':'😍',
};

function safeEmoji(emoji, fallback) {
    if (canRenderEmoji(emoji)) return emoji;
    return fallback || EMOJI_FALLBACKS[emoji] || '❓';
}

// Sanitize all emoji in CONFIG.categories and any array/object data at load time
function sanitizeEmojis() {
    // Sanitize CONFIG.categories
    if (CONFIG && CONFIG.categories) {
        for (const key of Object.keys(CONFIG.categories)) {
            CONFIG.categories[key] = CONFIG.categories[key].map(e => safeEmoji(e));
        }
    }
}

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

// ============ DIFFICULTY & QUESTION COUNT ============
const FOCUS_FLOORS = {
    default: 1,
    urdu_videos: 1,
    arabic_qaida: 1,
    urdu_qaida: 1,
    connect_dots: 1
};

function getDifficultyLevel(skillId) {
    const s = CONFIG.skillSettings && CONFIG.skillSettings[skillId];
    if (s && s.difficulty_level != null) return Math.max(s.difficulty_level, 1);
    if (s && s.focus_number != null) return Math.max(s.focus_number, 1); // fallback during migration
    return Math.max(CONFIG.focusNumber, 1);
}

function getQuestionCount(skillId, sessionType) {
    const mode = sessionType || 'practice';
    const s = CONFIG.skillSettings && CONFIG.skillSettings[skillId];
    if (mode === 'challenge') {
        if (s && s.challenge_question_count != null) return s.challenge_question_count;
        return 5; // default challenge count
    }
    // practice
    if (s && s.practice_question_count != null) return s.practice_question_count;
    return 1; // default practice count — start gentle
}

// Legacy wrapper — used by worksheets not yet migrated
function getFocusNumber(skillId) {
    let val;
    if (CONFIG.skillSettings && CONFIG.skillSettings[skillId]) {
        val = CONFIG.skillSettings[skillId].difficulty_level ?? CONFIG.skillSettings[skillId].focus_number;
    } else {
        val = CONFIG.focusNumber;
    }
    const floor = FOCUS_FLOORS[skillId] ?? FOCUS_FLOORS.default;
    return Math.max(val, floor);
}


function getDifficultyLevel(skillId) {
    if (CONFIG.skillSettings && CONFIG.skillSettings[skillId]) {
        return CONFIG.skillSettings[skillId].difficulty_level ?? 1;
    }
    return 1;
}

function getQuestionCount(skillId, mode) {
    const key = mode === 'challenge' ? 'challenge_question_count' : 'practice_question_count';
    const fallback = mode === 'challenge' ? 5 : 1;
    if (CONFIG.skillSettings && CONFIG.skillSettings[skillId]) {
        return CONFIG.skillSettings[skillId][key] ?? fallback;
    }
    return fallback;
}
// ============ PRIORITY SCORING ENGINE ============

const BASE_WEIGHTS = {
    // CogAT Core (10)
    figure_matrices: 10, verbal_analogies: 10, which_doesnt_belong: 10,
    // CogAT Support (8)
    color_patterns: 8, color_patterns_l2: 8, what_comes_next: 8,
    // Math (6)
    addition: 6, subtraction: 6, counting: 6, more_less: 6, bigger_smaller: 6, matching: 6,
    // Language (4)
    two_letter_words: 4, three_letter_words: 4, numbers_english: 4,
    // Qaida (4)
    urdu_qaida: 4, arabic_qaida: 4, urdu_reading: 4, urdu_trace: 4,
    // Numbers Urdu/Arabic (3)
    numbers_urdu: 3, numbers_arabic: 3, numbers_all: 3,
    // Fun/Confidence (2)
    find_pairs: 2, connect_dots: 2, trace_upper: 2, trace_lower: 2, trace_numbers: 2,
    urdu_what_next: 2, urdu_2_letter: 2, urdu_videos: 2,
};

const COGAT_SKILLS = {
    figure_matrices: 'core', verbal_analogies: 'core', which_doesnt_belong: 'core',
    color_patterns: 'support', color_patterns_l2: 'support', what_comes_next: 'support',
};

const COGAT_TEST_DATE = new Date('2026-04-18T11:30:00-05:00');

function getReviewUrgency(daysSincePracticed) {
    if (daysSincePracticed === 0) return 0;
    if (daysSincePracticed === 1) return 1;
    if (daysSincePracticed === 2) return 2;
    if (daysSincePracticed <= 4) return 3;
    if (daysSincePracticed <= 6) return 4;
    return 5; // 7+ days
}

function getWeaknessSignal(accuracy) {
    if (accuracy < 50) return 5;
    if (accuracy < 60) return 4;
    if (accuracy < 70) return 3;
    if (accuracy < 80) return 2;
    if (accuracy < 90) return 1;
    return 0; // 90%+
}

function getCogatBoost(skillId) {
    const now = new Date();
    if (now >= COGAT_TEST_DATE) return 0; // test is over
    const tier = COGAT_SKILLS[skillId];
    if (!tier) return 0;
    const daysUntilTest = Math.ceil((COGAT_TEST_DATE - now) / (1000 * 60 * 60 * 24));
    if (tier === 'core') return 3;
    if (tier === 'support') return daysUntilTest <= 14 ? 3 : 2; // support rises to 3 in final 2 weeks
    return 0;
}

function getNewSkillBonus(totalAttempts) {
    if (totalAttempts === 0) return 2;
    if (totalAttempts < 3) return 1;
    return 0;
}

function getOverusePenalty(timesToday) {
    if (timesToday <= 1) return 0;
    if (timesToday === 2) return 1;
    if (timesToday === 3) return 2;
    return 3; // 4+
}

function calculatePriority(skillId, stats) {
    const baseWeight = BASE_WEIGHTS[skillId] || 2;
    const reviewUrgency = getReviewUrgency(stats.daysSincePracticed || 0);
    const weaknessSignal = getWeaknessSignal(stats.accuracy != null ? stats.accuracy : 100);
    const cogatBoost = getCogatBoost(skillId);
    const newSkillBonus = getNewSkillBonus(stats.totalAttempts || 0);
    const overusePenalty = getOverusePenalty(stats.timesToday || 0);

    const priority = Math.max(0, baseWeight + reviewUrgency + weaknessSignal + cogatBoost + newSkillBonus - overusePenalty);

    return {
        skillId, priority, baseWeight, reviewUrgency, weaknessSignal,
        cogatBoost, newSkillBonus, overusePenalty
    };
}

// ============ AUTO FOCUS ADJUSTMENT ============
async function adjustFocusNumbers(slices) {
    if (!slices || !slices.length || !CONFIG.childId) return;

    for (const slice of slices) {
        const skillId = slice.skill_id;
        const accuracy = parseFloat(slice.accuracy);
        const attempted = slice.attempted;

        // Need at least 5 questions to evaluate
        if (attempted < 5) continue;

        // Get or create current settings
        let settings = CONFIG.skillSettings[skillId] || {
            difficulty_level: 1,
            streak_up: 0,
            streak_down: 0
        };

        let streakUp = settings.streak_up;
        let streakDown = settings.streak_down;
        let diffLevel = settings.difficulty_level || settings.focus_number || 1;
        let practiceCount = settings.practice_question_count || 1;
        let changed = false;

        if (accuracy >= 0.90) {
            streakUp++;
            streakDown = 0;
            if (streakUp >= 2) {
                diffLevel = Math.min(diffLevel + 1, 50);
                practiceCount = Math.min(practiceCount + 1, 7);
                streakUp = 0;
                changed = true;
                console.log('📈 ' + skillId + ' difficulty_level → ' + diffLevel + ', practice_count → ' + practiceCount);
            }
        } else if (accuracy < 0.60) {
            streakDown++;
            streakUp = 0;
            if (streakDown >= 2) {
                const floor = FOCUS_FLOORS[skillId] ?? FOCUS_FLOORS.default;
                diffLevel = Math.max(diffLevel - 1, floor);
                streakDown = 0;
                changed = true;
                console.log('📉 ' + skillId + ' difficulty_level → ' + diffLevel);
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
                difficulty_level: diffLevel,
                practice_question_count: practiceCount,
                streak_up: streakUp,
                streak_down: streakDown
            }, { onConflict: 'child_id,skill_id' });

        if (error) console.error('adjustFocus error for ' + skillId + ':', error);

        // Update local cache
        CONFIG.skillSettings[skillId] = {
            difficulty_level: diffLevel,
            practice_question_count: practiceCount,
            challenge_question_count: settings.challenge_question_count || 5,
            streak_up: streakUp,
            streak_down: streakDown
        };

        if (changed) console.log('🎯 ' + skillId + ': streak_up=' + streakUp + ' streak_down=' + streakDown + ' difficulty=' + diffLevel);
    }
}

// ============ HELPER FUNCTIONS ============
function generateAdditionProblems(difficulty, count) {
    if (count == null) { count = difficulty; }
    const problems = [];
    const used = new Set();
    const numProblems = count;
    const numFocusTarget = Math.max(1, Math.ceil(numProblems / 3));

    // ~1/3 problems sum to difficulty
    for (let i = 0; i < numFocusTarget; i++) {
        let a, key, attempts = 0;
        do {
            a = Math.floor(Math.random() * (difficulty + 1));
            key = Math.min(a, difficulty - a) + '+' + Math.max(a, difficulty - a);
            attempts++;
        } while (used.has(key) && attempts < 20);
        used.add(key);
        problems.push([a, difficulty - a, difficulty]);
    }

    // ~2/3 problems sum to random numbers 1..difficulty
    for (let i = numFocusTarget; i < numProblems; i++) {
        let target, a, key, attempts = 0;
        do {
            target = Math.floor(Math.random() * difficulty) + 1;
            a = Math.floor(Math.random() * (target + 1));
            key = Math.min(a, target - a) + '+' + Math.max(a, target - a);
            attempts++;
        } while (used.has(key) && attempts < 20);
        used.add(key);
        problems.push([a, target - a, target]);
    }

    return problems.sort(() => Math.random() - 0.5);
}


function generateSubtractionProblems(difficulty, count) {
    if (count == null) { count = difficulty; }
    const problems = [];
    const used = new Set();
    const numProblems = count;
    const focusNum = difficulty;
    const numFocusAnswer = Math.max(1, Math.ceil(numProblems / 3));
    const catNames = Object.keys(CONFIG.categories);

    function pickEmoji() {
        const cat = catNames[Math.floor(Math.random() * catNames.length)];
        return CONFIG.categories[cat][Math.floor(Math.random() * CONFIG.categories[cat].length)];
    }

    // Some problems where answer = focusNumber
    for (let i = 0; i < numFocusAnswer; i++) {
        let b, key, attempts = 0;
        do {
            b = Math.floor(Math.random() * Math.min(focusNum, 3)) + 1;
            key = (focusNum + b) + '-' + b;
            attempts++;
        } while (used.has(key) && attempts < 20);
        used.add(key);
        problems.push({a: focusNum + b, b: b, ans: focusNum, mode: i % 2 === 0 ? 'visual' : 'equation', emoji: pickEmoji()});
    }

    // Rest are random easier subtractions (a <= focusNum)
    for (let i = numFocusAnswer; i < numProblems; i++) {
        let a, b, key, attempts = 0;
        do {
            a = Math.floor(Math.random() * (focusNum - 1)) + 2;
            b = Math.floor(Math.random() * (a - 1)) + 1;
            key = a + '-' + b;
            attempts++;
        } while (used.has(key) && attempts < 20);
        used.add(key);
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

function generateCountingProblems(difficulty, count) {
    if (count == null) { count = difficulty; }
    const catNames = Object.keys(CONFIG.categories);
    const problems = [];
    const used = new Set();
    for (let i = 0; i < count; i++) {
        let num, key, attempts = 0;
        do {
            num = Math.floor(Math.random() * difficulty) + 1;
            key = 'count:' + num;
            attempts++;
        } while (used.has(key) && attempts < 20);
        used.add(key);
        const cat = catNames[Math.floor(Math.random() * catNames.length)];
        const emoji = CONFIG.categories[cat][Math.floor(Math.random() * CONFIG.categories[cat].length)];
        problems.push([num, emoji.repeat(num)]);
    }
    return problems;
}

function generateMatchPairs(difficulty, count) {
    if (count == null) { count = difficulty; }
    const catNames = Object.keys(CONFIG.categories);
    const nums = [];
    for (let i = 1; i <= difficulty; i++) nums.push(i);
    const shuffled = nums.sort(() => Math.random() - 0.5).slice(0, count);
    const pairs = [];
    for (const n of shuffled) {
        const cat = catNames[Math.floor(Math.random() * catNames.length)];
        const emoji = CONFIG.categories[cat][Math.floor(Math.random() * CONFIG.categories[cat].length)];
        pairs.push([n, emoji.repeat(n)]);
    }
    return pairs;
}

function generateMoreLessProblems(difficulty, count) {
    if (count == null) { count = difficulty; }
    const focusNum = difficulty;
    const problems = [];
    const used = new Set();
    const catNames = Object.keys(CONFIG.categories);
    const cat = catNames[Math.floor(Math.random() * catNames.length)];
    const emoji = CONFIG.categories[cat][Math.floor(Math.random() * CONFIG.categories[cat].length)];

    for (let i = 0; i < count; i++) {
        let n, askMore, key, attempts = 0;
        do {
            n = focusNum <= 1 ? focusNum + 1 + Math.floor(Math.random() * 5) : (function(){ let o; do { o = Math.floor(Math.random() * (focusNum + 3)) + 1; } while (o === focusNum); return o; })();
            askMore = Math.random() > 0.5;
            key = (askMore ? 'more:' : 'less:') + Math.min(focusNum, n) + ',' + Math.max(focusNum, n);
            attempts++;
        } while (used.has(key) && attempts < 20);
        used.add(key);
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

    return shuffle(problems).slice(0, focusNum || 1);
}

function generateColorPatterns(focusNum) {
    const n = focusNum || 1;
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
    if (!title) { if (callback) callback(); return; }
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

// Display name → skill_id reverse map
const DISPLAY_TO_SKILL = {
    'Addition':'addition', 'Subtraction':'subtraction', 'Counting':'counting',
    'Match Numbers':'match_numbers', 'More/Less':'more_less', 'Bigger/Smaller':'bigger_smaller',
    'Color Patterns':'color_patterns', 'Color Patterns L2':'color_patterns_l2',
    'Connect Dots':'connect_dots', 'Doesnt Belong':'which_doesnt_belong',
    'Figure Matrices':'figure_matrices', 'Find Pairs':'find_pairs',
    'What Comes Next':'what_comes_next_numbers', 'Numbers English':'numbers_english',
    '2-Letter Words':'two_letter_words', '3-Letter Words':'three_letter_words',
    'Trace ABC':'trace_upper', 'Trace abc':'trace_lower', 'Trace Numbers':'trace_numbers',
    'Urdu Reading':'urdu_reading', 'Urdu Trace':'urdu_trace', 'Urdu 2-Letter Words':'urdu_2letter',
    'Urdu What Next':'urdu_what_next', 'Verbal Analogies':'verbal_analogies'
};

function resolveSkillId(type) {
    if (DISPLAY_TO_SKILL[type]) return DISPLAY_TO_SKILL[type];
    if (type.startsWith('Urdu Qaida')) return 'urdu_qaida';
    if (type.startsWith('Arabic Qaida')) return 'arabic_qaida';
    if (type.startsWith('Urdu Video')) return 'urdu_videos';
    // If type is already a skill_id (e.g. 'numbers_urdu')
    return type;
}

function completeWorksheet(type, score, total) {
    // Track daily progress in localStorage (cache for instant menu paint)
    const today = getToday();
    const progress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    progress.push({type: type, score: score+'/'+total, answers: currentAnswers, time: new Date().toISOString()});
    localStorage.setItem('daily_'+today, JSON.stringify(progress));
    currentAnswers = [];

    // Advance queue index now that worksheet is complete
    if (typeof queueIndex !== 'undefined') {
        queueIndex++;
        if (CONFIG.sessionId && typeof sb !== 'undefined') {
            sb.from('sessions').update({
                queue_index: queueIndex,
                last_activity_at: new Date().toISOString()
            }).eq('id', CONFIG.sessionId).then(({ error }) => {
                if (error) console.error('Update queue_index failed:', error);
            });
        }
    }

    // Record to Supabase (source of truth)
    const skillId = resolveSkillId(type);
    if (CONFIG.sessionId && CONFIG.childId && typeof sb !== 'undefined') {
        sb.from('worksheet_completions').insert({
            session_id: CONFIG.sessionId,
            child_id: CONFIG.childId,
            skill_id: skillId,
            score: score || null,
            total: total || null
        }).then(({error}) => {
            if (error) console.error('worksheet_completion insert error:', error);
            else console.log('worksheet_completion OK:', skillId);
        });
    }

    let html = '<div class="card"><div class="title">🌟 Great Job! 🌟</div>';
    html += '<p style="color:#333;font-size:24px;text-align:center">'+type+': '+score+'/'+total+'</p>';
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