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

// ============ DATE / TIMEZONE ============
// One formatter, reused: buildAdaptiveQueue formats thousands of timestamps, and
// constructing a formatter per call is slow on a tablet.
let _localDayFormatter = null;
let _localDayFormatterTz = null;

function localDayKey(date) {
    const tz = CONFIG.timezone || 'America/Chicago';
    if (_localDayFormatterTz !== tz) {
        _localDayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        _localDayFormatterTz = tz;
    }
    return _localDayFormatter.format(date ? new Date(date) : new Date());
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

function recordPassiveResponse(skillId, questionData, itemIndex = null, level = null) {
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
        level           // level
    );
    _itemTimerStart = null;
}

// ============ DIFFICULTY / COUNT / CONTENT ============
const FOCUS_FLOORS = {
    default: 1,
    urdu_videos: 1,
    arabic_qaida: 1,
    urdu_qaida: 1,
    connect_dots: 1
};

function getSkillValue(skillId, field, fallback = 1) {
    const s = CONFIG.skillSettings && CONFIG.skillSettings[skillId];
    if (!s) return fallback;

    if (field === 'difficulty') {
        return s.difficulty_level ?? s.focus_number ?? fallback;
    }

    if (field === 'count') {
        return s.practice_question_count ?? fallback;
    }

    if (field === 'challenge_count') {
        return s.challenge_question_count ?? fallback;
    }

    if (field === 'content') {
        return s.content_level ?? fallback;
    }

    return fallback;
}

function getDifficultyLevel(skillId) {
    const floor = FOCUS_FLOORS[skillId] ?? FOCUS_FLOORS.default;
    const globalLevel = CONFIG.focusNumber || 1;
    const skillLevel = getSkillValue(skillId, 'difficulty', globalLevel);

    return Math.max(skillLevel, floor);
}

function getQuestionCount(skillId, mode = 'practice') {
    if (mode === 'challenge') {
        return Math.max(getSkillValue(skillId, 'challenge_count', 5), 1);
    }
    return Math.max(getSkillValue(skillId, 'count', 1), 1);
}

// Legacy wrapper — keep for worksheets still using it
function getFocusNumber(skillId) {
    return getDifficultyLevel(skillId);
}

function getContentLevel(skillId) {
    const progress = getSkillProgress(skillId);
    if (progress && (progress.mastery_type === 'mastery' || progress.mastery_type === 'qaida')) {
        return progress.current_level || 1;
    }
    return Math.max(getSkillValue(skillId, 'content', 1), 1);
}

// The permanent achievement — for the picker's "highest reached" display only.
// Content is served from getContentLevel (current_level), which can sit below this.
function getUnlockedLevel(skillId) {
    const progress = getSkillProgress(skillId);
    if (progress && (progress.mastery_type === 'mastery' || progress.mastery_type === 'qaida')) {
        return Math.max(progress.unlocked_level || 1, getSkillValue(skillId, 'content', 1) || 1);
    }
    return Math.max(getSkillValue(skillId, 'content', 1), 1);
}

// ============ MASTERY SYSTEM ============

async function refreshSkillProgress() {
    if (!CONFIG.childId) return;
    try {
        const { data, error } = await sb.rpc('get_skill_progress', { p_child_id: CONFIG.childId });
        if (error) { console.error('get_skill_progress error:', error); return; }
        const byId = {};
        (data || []).forEach(row => { byId[row.skill_id] = row; });
        CONFIG.skillProgress = byId;
    } catch (e) {
        console.error('refreshSkillProgress failed:', e);
    }
}

function getSkillProgress(skillId) {
    return (CONFIG.skillProgress && CONFIG.skillProgress[skillId]) || null;
}

// Dispatches rather than generating: Qaida supplies its own check questions
// (window.qaidaCheckQuestions); mastery skills reuse the weekend generators
// so the test never repeats the practice worksheet's own layout. Returns []
// (never throws) when no generator is available, so the caller can just skip
// the test — see docs/MASTERY.md "The rules, precisely".
function buildDailyTest(skillId, level, count) {
    const n = count || 6;
    let qs = [];
    try {
        const progress = getSkillProgress(skillId);
        const isQaida = (progress && progress.mastery_type === 'qaida') || skillId === 'arabic_qaida' || skillId === 'urdu_qaida';
        if (isQaida && typeof window.qaidaCheckQuestions === 'function') {
            qs = window.qaidaCheckQuestions(skillId, level, n) || [];
        } else if (typeof makeAssessmentQs === 'function' && typeof ASSESSMENT_SKILLS !== 'undefined' &&
                   ASSESSMENT_SKILLS[skillId] && ASSESSMENT_SKILLS[skillId].enabled) {
            qs = makeAssessmentQs(skillId, n, { level: level, difficulty: level }) || [];
        }
    } catch (e) {
        console.error('buildDailyTest failed for ' + skillId + ':', e);
        qs = [];
    }
    qs.forEach(q => {
        q.level = level;
        q.qdata = q.qdata || {};
        q.qdata.purpose = 'check';
        if (q.qdata.level == null) q.qdata.level = level;
    });
    return qs;
}

async function raiseSkillLevel(skillId, level) {
    if (!CONFIG.childId) return null;
    try {
        const { data, error } = await sb.rpc('raise_skill_level', {
            p_child_id: CONFIG.childId,
            p_skill_id: skillId,
            p_level: level
        });
        if (error) { console.error('raise_skill_level error:', error); return null; }
        await refreshSkillProgress();
        return data;
    } catch (e) {
        console.error('raiseSkillLevel failed:', e);
        return null;
    }
}

async function evaluateSkillMastery(skillId) {
    if (!CONFIG.childId) return null;
    try {
        const { data, error } = await sb.rpc('evaluate_skill_mastery', {
            p_child_id: CONFIG.childId,
            p_skill_id: skillId
        });
        if (error) { console.error('evaluate_skill_mastery error:', error); return null; }
        await refreshSkillProgress();
        return data;
    } catch (e) {
        console.error('evaluateSkillMastery failed:', e);
        return null;
    }
}

let _activeLevelUnlockBanners = 0;

function celebrateLevelUnlock(skillId, newLevel) {
    const b = document.createElement('div');
    const topOffset = _activeLevelUnlockBanners * 52;
    _activeLevelUnlockBanners++;
    b.textContent = '🎉 ' + formatSkillName(skillId) + ' — Level ' + newLevel + ' unlocked! 🎉';
    b.style.cssText = 'position:fixed;top:'+topOffset+'px;left:0;right:0;background:#22c55e;color:white;text-align:center;padding:12px;font-weight:bold;z-index:9999;font-size:16px;';
    document.body.prepend(b);
    setTimeout(() => {
        if (b.parentNode) b.parentNode.removeChild(b);
        _activeLevelUnlockBanners--;
    }, 4000);
}

// Marked done only once every level has reached the server: until the mastery
// migration is applied the RPC doesn't exist, so this must retry at next login.
// Key is _v2 because an earlier build set the flag even when every upload failed.
async function syncLegacyLevels() {
    if (localStorage.getItem('legacy_levels_synced_v2')) return;
    const legacy = [
        ['numbers_english', parseInt(localStorage.getItem('ne_level') || '1')],
        ['numbers_arabic', parseInt(localStorage.getItem('na_level') || '1')],
        ['arabic_qaida', legacyQaidaLevel('qaida_unlocked', 'qaida_l')],
        ['urdu_qaida', legacyQaidaLevel('urdu_qaida_unlocked', 'urdu_qaida_l')]
    ];
    let allSynced = true;
    for (const [skillId, level] of legacy) {
        if (!(level > 1)) continue;
        if (await raiseSkillLevel(skillId, level) == null) allSynced = false;
    }
    if (allSynced) localStorage.setItem('legacy_levels_synced_v2', '1');
}

// Old qaida logic unlocked level 1 by default, then level L once level L-1 had
// been practiced on 5 distinct days, or once the parent override reached L-1:
// the old 3-second hold stored a ZERO-based level index, so `override >= level`
// (not `next`) is what keeps a skipped-ahead child at the level they had.
function legacyQaidaLevel(overrideKey, datesPrefix) {
    const override = parseInt(localStorage.getItem(overrideKey) || '0');
    let level = 1;
    while (level < 5) {
        const next = level + 1;
        let dates = [];
        try { dates = JSON.parse(localStorage.getItem(datesPrefix + level) || '[]'); } catch (e) { dates = []; }
        if (override >= level || (Array.isArray(dates) && dates.length >= 5)) level = next;
        else break;
    }
    return level;
}

function levelProgressHTML(skillId) {
    const p = getSkillProgress(skillId);
    if (!p || p.mastery_state === 'mastered') return '';
    if (p.mastery_type === 'mastery' || p.mastery_type === 'qaida') {
        if (p.qualifying_days == null) return '';
        let html = p.qualifying_days + ' of ' + p.days_needed + ' test days';
        if (p.last_test_questions != null) html += ' · last check: ' + (p.last_test_correct || 0) + '/' + p.last_test_questions;
        return html;
    }
    return '';
}


// ============ PRIORITY SCORING ENGINE ============

const SKILLS = {}; // populated from DB

const COGAT_SKILLS = {
    figure_matrices: 'core', verbal_analogies: 'core', which_doesnt_belong: 'core',
    color_patterns: 'support', color_patterns_l2: 'support',
    what_comes_next_numbers: 'support', what_comes_next_letters: 'support',

};

const COGAT_TEST_DATE = new Date('2026-04-18T11:30:00-05:00');

async function loadSkills(){
    const {data, error} = await sb
    .from('skills')
    .select('id, category, base_weight, domain')
    .eq('is_active', true);

    if (error) {
        console.error('loadSkills error: ', error);
        return;
    }

    data.forEach(row => {SKILLS[row.id] = row;});
}

function getBaseWeight(skillId){
    const now = new Date();
    const skill = SKILLS[skillId];
    if (!skill) return 2;

    // After test = balanced
    if (now >= COGAT_TEST_DATE){
        return skill.category === 'fun' ? 4:6;
    }

    // Before test = use DB weight
    return skill.base_weight || 2;
}

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

function getReviewNeedBoost(skillId) {
    const progress = getSkillProgress(skillId);
    if (!progress) return 0;
    const needsReview = Array.isArray(progress.levels_needing_review) && progress.levels_needing_review.length > 0;
    const reviewQuestions = progress.review_questions || 0;
    const belowBar = reviewQuestions >= 5 && progress.accuracy_needed != null &&
        (progress.review_correct || 0) / reviewQuestions < progress.accuracy_needed;
    return (needsReview || belowBar) ? 2 : 0;
}

function calculatePriority(skillId, stats) {
    const baseWeight = getBaseWeight(skillId);
    const reviewUrgency = getReviewUrgency(stats.daysSincePracticed || 0);
    const weaknessSignal = getWeaknessSignal(stats.accuracy != null ? stats.accuracy : 100);
    const cogatBoost = getCogatBoost(skillId);
    const newSkillBonus = getNewSkillBonus(stats.totalAttempts || 0);
    const overusePenalty = getOverusePenalty(stats.timesToday || 0);
    const reviewNeedBoost = getReviewNeedBoost(skillId);

    const priority = Math.max(0, baseWeight + reviewUrgency + weaknessSignal + cogatBoost + newSkillBonus + reviewNeedBoost - overusePenalty);

    return {
        skillId, priority, baseWeight, reviewUrgency, weaknessSignal,
        cogatBoost, newSkillBonus, overusePenalty, reviewNeedBoost
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
// Both addends are at least 1. Drawing from 0..total made "0 + 4" roughly
// three quarters of the questions, and adding zero teaches nothing. A sum of 1
// is the only case where a zero addend is unavoidable.
function splitSumWithoutZero(total) {
    if (total < 2) return 0;
    return 1 + Math.floor(Math.random() * (total - 1));
}

function generateAdditionProblems(difficulty, count) {
    if (count == null) { count = difficulty; }
    const problems = [];
    const used = new Set();
    const numProblems = count;
    const numFocusTarget = Math.max(1, Math.ceil(numProblems / 3));
    // Sums start at 2, whatever the difficulty: the only fact that adds to 1 is
    // "0 + 1", so a beginner would otherwise meet nothing else. The first real
    // addition fact is 1 + 1.
    const top = Math.max(2, difficulty);

    // ~1/3 problems sum to the focus number
    for (let i = 0; i < numFocusTarget; i++) {
        let a, key, attempts = 0;
        do {
            a = splitSumWithoutZero(top);
            key = Math.min(a, top - a) + '+' + Math.max(a, top - a);
            attempts++;
        } while (used.has(key) && attempts < 20);
        used.add(key);
        problems.push([a, top - a, top]);
    }

    // ~2/3 problems sum to random numbers 2..top
    for (let i = numFocusTarget; i < numProblems; i++) {
        let target, a, key, attempts = 0;
        do {
            target = 2 + Math.floor(Math.random() * (top - 1));
            a = splitSumWithoutZero(target);
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

// ============ LETTER & HARAKAT AUDIO ============
// The two recording folders were named independently: audio/letters/ has its own
// transliteration (ت is ar_ta_letter.ogg) while audio/harakat/ follows the `name` field
// in ARABIC_LETTERS / URDU_LETTERS (ت is ar_taa_fatha.mp3). One table carries both stems,
// keyed by the letter character: ['letters/ stem', 'harakat/ stem'], null where nothing
// has been recorded yet. Keep this in sync when new recordings land.
const LETTER_AUDIO = {
    ar: {
        'ا': ['alif', 'alif'],
        'ب': ['baa', 'baa'],
        'ت': ['ta', 'taa'],
        'ث': ['tha', 'thaa'],
        'ج': ['jiim', 'jeem'],
        'ح': ['hha', 'haa'],
        'خ': ['kha', 'khaa'],
        'د': ['daal', 'daal'],
        'ذ': ['thaal', 'dhaal'],
        'ر': ['ra', 'raa'],
        'ز': ['zay', 'zaay'],
        'س': ['siin', 'seen'],
        'ش': ['shiin', 'sheen'],
        'ص': ['saad', 'saad'],
        'ض': ['daad', 'daad'],
        'ط': ['taa', 'taa'],
        'ظ': ['thaa', 'dhaa'],
        'ع': ['ayn', 'ain'],
        'غ': ['ghayn', 'ghain'],
        'ف': ['fa', 'faa'],
        'ق': ['qaf', 'qaaf'],
        'ك': ['kaf', 'kaaf'],
        'ل': ['lam', 'laam'],
        'م': ['miim', 'meem'],
        'ن': ['nuun', 'noon'],
        'ه': ['ha', 'haa'],
        'و': ['waw', 'waaw'],
        'ي': ['ya', 'yaa'],
        // Urdu-shaped kaf and yeh are different codepoints from the Arabic ones above.
        // Aliased so a screen that hands us the Urdu glyph under lang 'ar' still finds audio.
        'ک': ['kaf', 'kaaf'],
        'ی': ['ya', 'yaa']
    },
    ur: {
        'ا': ['alif', 'alif'],
        'ب': ['baa', 'bay'],
        'پ': ['pey', 'pay'],
        'ت': ['ta', 'tay'],
        'ٹ': ['tey', 'ttay'],
        'ث': ['tha', 'say'],
        'ج': ['jiim', 'jeem'],
        'چ': ['chey', 'chay'],
        'ح': ['hha', 'hey'],
        'خ': ['kha', 'khay'],
        'د': ['daal', 'daal'],
        'ڈ': ['daaal', 'ddaal'],
        'ذ': ['thaal', 'zaal'],
        'ر': ['ra', 'ray'],
        'ڑ': ['rey', 'rray'],
        'ز': ['zay', 'zay'],
        'ژ': ['zhey', 'zhay'],
        'س': ['siin', 'seen'],
        'ش': ['shiin', 'sheen'],
        'ص': ['saad', 'suad'],
        'ض': ['daad', 'zuad'],
        'ط': ['taa', 'toy'],
        'ظ': ['thaa', 'zoy'],
        'ع': ['ayn', 'ain'],
        'غ': ['ghayn', 'ghain'],
        'ف': ['fa', 'fay'],
        'ق': ['qaf', 'qaaf'],
        'ک': ['kaf', 'kaaf'],
        'گ': ['gaaf', 'gaaf'],
        'ل': ['lam', 'laam'],
        'م': ['miim', 'meem'],
        'ن': ['nuun', 'noon'],
        'ں': [null, null],
        'و': ['waw', 'wao'],
        'ہ': ['choti_hey', 'hey'],
        'ھ': ['do_chashmi_hey', null],
        'ی': ['ya', 'yay'],
        'ے': [null, null]
    }
};

let activeLetterAudio = null;

function stopLetterAudio() {
    if (activeLetterAudio) {
        try { activeLetterAudio.pause(); } catch (e) {}
        activeLetterAudio = null;
    }
    if (typeof speechSynthesis !== 'undefined') {
        try { speechSynthesis.cancel(); } catch (e) {}
    }
}

function playAudioFile(src) {
    return new Promise((resolve, reject) => {
        let settled = false;
        let timer = null;
        const audio = new Audio(src);
        function finish(ok, err) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            audio.onended = null;
            audio.onerror = null;
            audio.oncanplaythrough = null;
            if (activeLetterAudio === audio) activeLetterAudio = null;
            if (ok) resolve();
            else reject(err || new Error('no audio: ' + src));
        }
        // Settle even if the browser never fires an event, so a caller's fallback chain moves on.
        timer = setTimeout(() => finish(false), 4000);
        audio.onended = () => finish(true);
        audio.onerror = () => finish(false);
        audio.oncanplaythrough = () => {
            clearTimeout(timer);
            timer = setTimeout(() => finish(true), 15000);
            activeLetterAudio = audio;
            audio.play().catch(e => finish(false, e));
        };
        audio.load();
    });
}

function letterAudioEntry(lang, letter) {
    const table = LETTER_AUDIO[lang === 'ur' ? 'ur' : 'ar'];
    return (table && table[letter]) || null;
}

// Some harakat recordings are named for a sound two letters share — Arabic ت and ط
// are both "taa", ح and ه both "haa" — because only one set of each was ever made.
// Playing one for both would teach a letter the wrong pronunciation, which is worse
// than silence when pronunciation is the whole lesson. The owner, who speaks both
// languages, listened to the ambiguous files and assigned them here; an entry below
// always wins. Values carry their own language prefix because two letters borrow the
// other language's recording: Arabic ت uses the Urdu "tay", and Urdu ہ (choti hey)
// uses the Arabic "haa" — no ur_choti_hey harakat set was ever recorded.
const HARAKAT_OVERRIDES = {
    ar: { 'ت': 'ur_tay', 'ط': 'ar_taa', 'ح': 'ar_haa' },
    ur: { 'ت': 'ur_tay', 'ہ': 'ar_haa' }
};

// A stem the owner assigned belongs to those letters only. Arabic ه also resolves to
// "ar_haa" by name, so without this it would quietly inherit ح's recording.
const _ownedHarakatStems = {};
['ar', 'ur'].forEach(L => {
    Object.keys(HARAKAT_OVERRIDES[L]).forEach(ch => { _ownedHarakatStems[HARAKAT_OVERRIDES[L][ch]] = true; });
});

// For everything not assigned by hand, a stem is trusted only when exactly one letter
// claims it. Counted by distinct letter-file name, not by character: the same letter
// appears under two codepoints (Arabic ك/ي and Urdu ک/ی) and rightly shares one file.
const _harakatStemClaims = {};
['ar', 'ur'].forEach(L => {
    const table = (typeof LETTER_AUDIO !== 'undefined' && LETTER_AUDIO[L]) || {};
    Object.keys(table).forEach(ch => {
        if (HARAKAT_OVERRIDES[L][ch]) return;
        const stem = table[ch][1];
        if (!stem) return;
        const key = L + '_' + stem;
        (_harakatStemClaims[key] = _harakatStemClaims[key] || {})[table[ch][0] || ''] = true;
    });
});

// Returns a full "lang_stem" (e.g. "ar_taa"), or null when no recording can be
// attributed to this letter with confidence. Callers then fall back to the letter's
// own recording, which is always correct — just not the harakat.
function harakatStemFor(lang, letter) {
    const L = lang === 'ur' ? 'ur' : 'ar';
    if (HARAKAT_OVERRIDES[L][letter]) return HARAKAT_OVERRIDES[L][letter];
    const entry = letterAudioEntry(lang, letter);
    if (!entry || !entry[1]) return null;
    const key = L + '_' + entry[1];
    if (_ownedHarakatStems[key]) return null;
    if (Object.keys(_harakatStemClaims[key] || {}).length > 1) return null;
    return key;
}

function letterAudioSources(lang, letter) {
    const entry = letterAudioEntry(lang, letter);
    if (!entry) return [];
    const L = lang === 'ur' ? 'ur' : 'ar';
    const harakatStem = harakatStemFor(lang, letter);
    const sources = [];
    if (entry[0]) sources.push('audio/letters/' + L + '_' + entry[0] + '_letter.ogg');
    if (harakatStem) sources.push('audio/harakat/' + harakatStem + '_fatha.mp3');
    return sources;
}

function hasSpeechVoice(lang) {
    if (typeof speechSynthesis === 'undefined') return false;
    let voices = [];
    try { voices = speechSynthesis.getVoices() || []; } catch (e) { return false; }
    const prefix = lang === 'ur' ? 'ur' : 'ar';
    return voices.some(v => v.lang && v.lang.toLowerCase().indexOf(prefix) === 0);
}

function canHearLetter(lang, letter) {
    return letterAudioSources(lang, letter).length > 0 || hasSpeechVoice(lang);
}

function canHearHarakat(lang, letter, harakat) {
    if (harakatStemFor(lang, letter)) return true;
    const entry = letterAudioEntry(lang, letter);
    if (entry && entry[0]) return true;
    return hasSpeechVoice(lang);
}

async function playLetterSound(lang, letter) {
    stopLetterAudio();
    const sources = letterAudioSources(lang, letter);
    for (let i = 0; i < sources.length; i++) {
        try { await playAudioFile(sources[i]); return; } catch (e) {}
    }
    try {
        if (lang === 'ur') await speakUrdu(letter);
        else await speakArabic(letter);
    } catch (e) {}
}

// Resolves true when the recording played, false when there is none, so callers chain a fallback.
function playHarakat(stem, harakat) {
    stopLetterAudio();
    return playAudioFile('audio/harakat/' + stem + '_' + harakat + '.mp3')
        .then(() => true, () => false);
}

async function playHarakatSound(lang, letter, harakat) {
    const stem = harakatStemFor(lang, letter);
    if (stem && harakat) {
        const played = await playHarakat(stem, harakat);
        if (played) return;
    }
    // Letters with no harakat recording (ں ھ ے) show the bare glyph anyway, so its name is the right sound.
    await playLetterSound(lang, letter);
}

// Qaida check questions carry {lang, letter, harakat} when a recording can voice them,
// and only a transliterated `sound` when the item is a word.
function playQaidaPrompt(q) {
    if (!q) return Promise.resolve();
    if (q.letter && q.harakat) return playHarakatSound(q.lang, q.letter, q.harakat);
    if (q.letter) return playLetterSound(q.lang, q.letter);
    stopLetterAudio();
    if (!q.sound) return Promise.resolve();
    const spoken = q.lang === 'ur' ? speakUrdu(q.sound) : speakArabic(q.sound);
    return spoken.catch(() => {});
}

function canHearQaidaPrompt(q) {
    if (!q) return false;
    if (q.letter && q.harakat) return canHearHarakat(q.lang, q.letter, q.harakat);
    if (q.letter) return canHearLetter(q.lang, q.letter);
    return hasSpeechVoice(q.lang);
}

// A check asks "which one sounds like this?". An item we can neither play nor show a
// read-aloud prompt for is unanswerable — and a blind guess still counts toward mastery.
function qaidaPromptable(q) {
    if (canHearQaidaPrompt(q)) return true;
    return !!q.sound && q.sound !== q.display;
}

// Chrome populates the voice list asynchronously; ask early so the first render knows.
if (typeof speechSynthesis !== 'undefined') {
    try { speechSynthesis.getVoices(); } catch (e) {}
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
    if (type.startsWith('Numbers Urdu')) return 'numbers_urdu';
    if (type.startsWith('Numbers Arabic')) return 'numbers_arabic';
    if (type.startsWith('Numbers English')) return 'numbers_english';
    if (type.startsWith('Numbers Urdu')) return 'numbers_urdu';
    if (type.startsWith('Numbers All')) return 'numbers_all';
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

// ============ LEARNING ITEM STRENGTH HELPERS ============

// Fetch strength scores for a child + skill, with lazy decay applied
async function getItemStrengths(childId, skillKey) {
    const { data, error } = await sb.from('learning_item_strength')
        .select('*')
        .eq('child_id', childId)
        .eq('skill_key', skillKey);

    if (error) {
        console.error('getItemStrengths error:', error);
        return new Map();
    }

    const now = new Date();
    const map = new Map();

    for (const row of (data || [])) {
        // Lazy decay: -1 per day since last_decay_at
        if (row.last_decay_at) {
            const daysSince = Math.floor((now - new Date(row.last_decay_at)) / 86400000);
            if (daysSince > 0) {
                row.strength_score = Math.max(0, row.strength_score - daysSince);
                row._decayed = true;
            }
        }
        map.set(row.item_key, row);
    }

    return map;
}

// Pick a practice set weighted toward weak items
// allItems: array of item keys (strings) in unlock order
// strengthMap: Map from getItemStrengths
// options: { maxItems: 7, newestCount: 3, midCount: 2, reviewCount: 2 }
function pickPracticeSet(allItems, strengthMap, options) {
    const max = options.maxItems || 7;
    const newestCount = options.newestCount || 3;
    const midCount = options.midCount || 2;
    const reviewCount = options.reviewCount || 2;

    if (allItems.length <= max) return [...allItems];

    const total = allItems.length;
    const picked = new Set();

    // 1. Newest items (from the end of the unlocked list)
    for (let i = total - 1; i >= 0 && picked.size < newestCount; i--) {
        picked.add(i);
    }

    // 2. Find weakest items from the remaining pool for mid + review slots
    const remaining = [];
    for (let i = 0; i < total - newestCount; i++) {
        if (picked.has(i)) continue;
        const key = allItems[i];
        const row = strengthMap.get(key);
        const score = row ? row.strength_score : 0;
        remaining.push({ idx: i, score: score });
    }

    // Sort by strength (weakest first)
    remaining.sort((a, b) => a.score - b.score);

    // Pick weakest for review + mid slots
    const slotsLeft = midCount + reviewCount;
    for (let i = 0; i < Math.min(slotsLeft, remaining.length); i++) {
        picked.add(remaining[i].idx);
    }

    // If still need more, pick random from unpicked
    const unpicked = [];
    for (let i = 0; i < total; i++) {
        if (!picked.has(i)) unpicked.push(i);
    }
    while (picked.size < max && unpicked.length > 0) {
        const r = Math.floor(Math.random() * unpicked.length);
        picked.add(unpicked.splice(r, 1)[0]);
    }

    // Return in order
    return [...picked].sort((a, b) => a - b).map(i => allItems[i]);
}

// Update strength score after completing an item
// result: { correct: bool|null, skipped: bool, firstTry: bool|null }
//   - For passive activities (tracing): correct=null, skipped=false
//   - For quiz activities: correct=true/false, firstTry=true/false
async function updateItemStrength(childId, skillKey, itemKey, itemType, result) {
    // Calculate score delta
    let delta = 0;
    if (result.skipped) {
        delta = -5;
    } else if (result.correct === null) {
        // Passive activity (tracing) — small positive
        delta = 3;
    } else if (result.correct && result.firstTry) {
        delta = 15;
    } else if (result.correct) {
        delta = 5;
    } else {
        delta = -10;
    }

    const now = new Date().toISOString();

    // Try to fetch existing row
    const { data: existing } = await sb.from('learning_item_strength')
        .select('id, strength_score, attempts_count, correct_count, skip_count, last_decay_at')
        .eq('child_id', childId)
        .eq('skill_key', skillKey)
        .eq('item_key', itemKey)
        .maybeSingle();

    if (existing) {
        // Apply lazy decay first
        let currentScore = existing.strength_score;
        if (existing.last_decay_at) {
            const daysSince = Math.floor((new Date() - new Date(existing.last_decay_at)) / 86400000);
            if (daysSince > 0) currentScore = Math.max(0, currentScore - daysSince);
        }

        const newScore = Math.max(0, Math.min(100, currentScore + delta));

        const { error } = await sb.from('learning_item_strength')
            .update({
                strength_score: newScore,
                last_practiced_at: now,
                last_decay_at: now,
                attempts_count: existing.attempts_count + (result.skipped ? 0 : 1),
                correct_count: existing.correct_count + (result.correct ? 1 : 0),
                skip_count: existing.skip_count + (result.skipped ? 1 : 0),
                updated_at: now
            })
            .eq('id', existing.id);

        if (error) console.error('updateItemStrength update error:', error);
    } else {
        // Insert new row
        const newScore = Math.max(0, Math.min(100, delta));

        const { error } = await sb.from('learning_item_strength')
            .insert({
                child_id: childId,
                skill_key: skillKey,
                item_key: itemKey,
                item_type: itemType,
                strength_score: newScore,
                last_practiced_at: now,
                last_decay_at: now,
                attempts_count: result.skipped ? 0 : 1,
                correct_count: result.correct ? 1 : 0,
                skip_count: result.skipped ? 1 : 0
            });

        if (error) console.error('updateItemStrength insert error:', error);
    }
}
