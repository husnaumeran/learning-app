// ============ MENU ============
var worksheetQueue = [];
var queueIndex = 0;

async function showMenu() {
    const today = getToday();
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    const wsLimit = parseInt(localStorage.getItem('worksheetLimit') || '10');
    const doneTypes = todayProgress.map(p => p.type);

    // Check if limit reached
    if (todayProgress.length >= wsLimit) {
        let html = '<h1>🎨 ' + (CONFIG.childName||'Aliza') + '\'s Learning</h1>';
        html += '<div class="card"><div class="title">🌟 Amazing job today! 🌟</div>';
        html += '<p style="color:#333;font-size:24px;text-align:center">You finished '+todayProgress.length+' worksheets!</p>';
        html += '<p style="color:#333;font-size:28px;text-align:center">Come back later! 🎉</p></div>';
        html += '<button class="btn" onclick="showExport()">📊 View Progress</button>';
        html += '<button class="btn" onclick="resetProgress()">🔄 Reset Progress</button>';

        document.getElementById('app').innerHTML = html;
        return;
    }

    let html = '<h1>🎨 ' + (CONFIG.childName||'Aliza') + '\'s Learning</h1>';
    html += '<div class="btn"><label>Worksheet Limit: <input type="number" id="limitInput" value="'+wsLimit+'" min="1" max="50" style="width:60px;font-size:24px;text-align:center" onchange="updateLimit(this.value)"></label></div>';
    html += '<p style="color:white;text-align:center">Done today: '+todayProgress.length+' / '+wsLimit+'</p>';

    // Weekend Challenge detection
    const dayName = new Date().toLocaleDateString('en-US', {weekday: 'long', timeZone: CONFIG.timezone || 'America/Chicago'});
    const isWeekend = (dayName === 'Saturday' || dayName === 'Sunday');
    if (isWeekend) {
        if (CONFIG.weekendChallengeDone) {
            html += '<div style="padding:20px;margin:10px 0;background:#1a4d1a;border:2px solid #22c55e;border-radius:15px;text-align:center">';
            html += '<div style="font-size:20px;color:#22c55e">⭐ Weekend Challenge Complete!</div>';
            html += '<button class="btn" style="margin-top:10px" onclick="showExport()">See Results</button></div>';
        } else if (CONFIG.weekendChallengeInProgress) {
            html += '<button class="btn" style="font-size:24px;padding:30px;background:#FFA500;color:#333;font-weight:bold;border:3px solid #FF8C00" onclick="resumeWeekendChallenge()">⭐ Continue Weekend Challenge! ⭐</button>';
        } else {
            html += '<button class="btn" style="font-size:24px;padding:30px;background:#FFD700;color:#333;font-weight:bold;border:3px solid #FFA500" onclick="startWeekendChallenge()">⭐ Weekend Challenge! ⭐</button>';
        }
    }

// Check for active session to resume
    let activeSession = null;
    if (CONFIG.childId) {
        const { data } = await sb.from('sessions')
            .select('id, queue_json, queue_index, started_at, status')
            .eq('child_id', CONFIG.childId)
            .eq('status', 'in_progress')
            .order('started_at', { ascending: false })
            .limit(1);
        if (data && data.length > 0 && data[0].queue_json) activeSession = data[0];
    }

    if (activeSession) {
        const sessionDay = activeSession.started_at ? localDayKey(activeSession.started_at) : null;
        const isToday = sessionDay === today;
        const remaining = (activeSession.queue_json.length || 0) - (activeSession.queue_index || 0);
        if (isToday) {
            html += '<button class="btn green" style="font-size:24px;padding:30px" onclick="resumeSession(\''+activeSession.id+'\')">Continue ▶️ ('+remaining+' left)</button>';
        } else {
            html += '<div style="background:#1a3a5c;padding:15px;border-radius:12px;margin:10px 0;text-align:center">';
            html += '<p style="color:#fbbf24;font-size:16px;margin:0 0 10px">📋 You have an unfinished session from '+sessionDay+'</p>';
            html += '<button class="btn" style="font-size:20px;padding:20px;background:#3b82f6" onclick="resumeSession(\''+activeSession.id+'\')">Resume ('+remaining+' left) ▶️</button>';
            html += '<button class="btn" style="font-size:20px;padding:20px;margin-top:8px" onclick="archiveAndStart(\''+activeSession.id+'\')">Start Fresh 🚀</button>';
            html += '</div>';
        }
    } else {
        html += '<button class="btn green" style="font-size:24px;padding:30px" onclick="startDaily()">Let\'s Start! 🚀</button>';
    }

    const sections = [
        {title:'🔢 Math', color:'#FF6B35', items:[
            ['showAddition','Addition ➕','Addition'],['showSubtraction','Subtraction ➖','Subtraction'],
            ['showCounting','Counting 🔢','Counting'],['showMatchNumbers','Match Numbers 🎯','Match Numbers'],
            ['showMoreLess','More / Less ⚖️','More/Less'],['showBiggerSmaller','Bigger / Smaller 📏','Bigger/Smaller'],
            ['showWhatNext','What Next ➡️','What Comes Next'],
            ['showNumbersEnglish','Numbers 🔊','Numbers English']
        ]},
        {title:'📖 English', color:'#00CC66', items:[
            ['showTwoLetter','2-Letter Words 📖','2-Letter Words'],['showThreeLetter','3-Letter Words 📚','3-Letter Words'],
            ['showTraceABC','Trace ABC ✏️','Trace ABC'],['showTraceLower','Trace abc ✏️','Trace abc'],
            ['showTraceNumbers','Trace 123 ✏️','Trace Numbers']
        ]},
        {title:' Thinking', color:'#0099FF', items:[
            ['showColors','Color Patterns 🎨','Color Patterns'],['showColorsL2','Color Patterns L2 🎨','Color Patterns L2'],
            ['showDoesntBelong','Doesn\'t Belong 🤔','Doesn\'t Belong'],
            ['showJora','Find Pairs 🧩','Find Pairs'],['showConnectDots','Connect Dots ✍️','Connect Dots'],
            ['showFigureMatrices','Figure Matrices 🧩','Figure Matrices'],
            ['showVerbalAnalogies','Verbal Analogies 🗣️','Verbal Analogies']
        ]},
        {title:'اردو Urdu', color:'#FFD700', items:[
            ['showUrduReading','Urdu Reading 📖','Urdu Reading'],['showUrduTrace','Urdu Trace ✏️','Urdu Trace'],
            ['showUrdu2Letter','Urdu 2-Letter 📚','Urdu 2-Letter Words'],['showUrduWhatNext','Urdu What Next ➡️','Urdu What Next'],
            ['showUrduVideos','Urdu Videos 📺','Urdu Videos'],['showUrduQaida','Urdu Qaida 📖','Urdu Qaida'],
            ['showNumbersUrdu','Urdu Numbers 🔊','Numbers Urdu']
        ]},
        {title:'📖 Arabic Qaida', color:'#22c55e', items:[
            ['showArabicQaida','Arabic Qaida 📖','Arabic Qaida'],
            ['showArabicTrace','Arabic Trace ✏️','Arabic Trace'],
            ['showNumbersArabic','Arabic Numbers 🔊','Numbers Arabic']
        ]},
        {title:'🌍 All Languages', color:'#9c27b0', items:[
            ['showNumbersAll','Numbers All 🔢','Numbers All']
        ]},
        {title:'📚 Books', color:'#FF6B9D', items:[
            ['showBabyUniversity','Baby University 📚','Baby University']
        ]}
    ];

    sections.forEach(s => {
        html += '<div style="margin:15px 0"><h2 style="color:'+s.color+';text-align:center;margin:5px">'+s.title+'</h2>';
        s.items.forEach(([fn, label, type]) => {
            const done = doneTypes.includes(type);
            const icon = done ? ' ✅' : ' 🔒';
            html += '<div style="padding:12px 20px;margin:4px 0;background:#333;border-radius:10px;color:'+(done?'#aaa':'white')+';font-size:18px;cursor:default" ';
            html += 'ontouchstart="this.holdTimer=setTimeout(()=>{CONFIG.guidedLaunch=false;window[\''+fn+'\']()},3000)" ontouchend="clearTimeout(this.holdTimer)" ';
            html += 'onmousedown="this.holdTimer=setTimeout(()=>{CONFIG.guidedLaunch=false;window[\''+fn+'\']()},3000)" onmouseup="clearTimeout(this.holdTimer)">';
            html += label + icon + '</div>';
        });
        html += '</div>';
    });

    html += '<button class="btn" onclick="showHowToUse()">📋 How to Use</button>';
    html += '<button class="btn" onclick="showExport()">📊 View Progress</button>';
    html += '<button class="btn" onclick="showParentArea()">👨‍👩‍👧 Parent Area</button>';
    html += '<button class="btn" onclick="resetProgress()">🔄 Reset Progress</button>';
    document.getElementById('app').innerHTML = html;
}

function showSaveWarningBanner() {
    if (document.getElementById('saveWarningBanner')) return;
    const b = document.createElement('div');
    b.id = 'saveWarningBanner';
    b.textContent = '⚠️ Progress is not being saved — check your internet connection';
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ef4444;color:white;text-align:center;padding:8px;font-weight:bold;z-index:9999;font-size:14px;';
    document.body.prepend(b);
}

async function startDaily() {
    // If session already in progress, resume the queue
    if (CONFIG.sessionId && worksheetQueue.length > 0 && queueIndex < worksheetQueue.length) {
        nextWorksheet();
        return;
    }

    // Archive any stale in_progress sessions before creating a new one
    if (CONFIG.childId) {
        await sb.from('sessions')
            .update({ status: 'abandoned', last_activity_at: new Date().toISOString() })
            .eq('child_id', CONFIG.childId)
            .eq('status', 'in_progress');
    }

    // Create a session in Supabase (retry once on failure)
    let { data: session, error } = await sb.from('sessions').insert({
        child_id: CONFIG.childId,
        session_type: 'daily_practice'
    }).select('id').single();

    if (error) {
        console.error('Session creation failed:', error);
        ({ data: session, error } = await sb.from('sessions').insert({
            child_id: CONFIG.childId,
            session_type: 'daily_practice'
        }).select('id').single());
        if (error) {
            console.error('Session creation retry failed:', error);
            showSaveWarningBanner();
        }
    }
    CONFIG.sessionId = session ? session.id : null;

    const today = getToday();
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    const wsLimit = parseInt(localStorage.getItem('worksheetLimit') || '10');
    const remaining = wsLimit - todayProgress.length;
    const doneTypes = todayProgress.map(p => p.type);

    worksheetQueue = await buildAdaptiveQueue(CONFIG.childId, remaining, doneTypes);
    queueIndex = 0;

    if (CONFIG.sessionId) {
        sb.from('sessions').update({
            queue_json: worksheetQueue,
            queue_index: 0,
            current_skill_id: null,
            last_activity_at: new Date().toISOString(),
            status: 'in_progress'
        }).eq('id', CONFIG.sessionId).then(({ error }) => {
            if (error) console.error('Save queue failed:', error);
        });
    }


    if (worksheetQueue.length === 0) { showMenu(); return; }
    nextWorksheet();
}


async function resumeSession(sessionId) {
    const { data, error } = await sb.from('sessions')
        .select('id, queue_json, queue_index')
        .eq('id', sessionId)
        .single();
    if (error || !data || !data.queue_json) {
        console.error('Resume failed:', error);
        startDaily();
        return;
    }
    worksheetQueue = data.queue_json;
    queueIndex = data.queue_index || 0;
    CONFIG.sessionId = data.id;
    sb.from('sessions').update({ last_activity_at: new Date().toISOString() })
        .eq('id', sessionId).then(({ error }) => {
            if (error) console.error('Resume timestamp update failed:', error);
        });
    nextWorksheet();
}

async function archiveAndStart(sessionId) {
    await sb.from('sessions').update({
        status: 'abandoned',
        last_activity_at: new Date().toISOString()
    }).eq('id', sessionId);
    startDaily();
}

function nextWorksheet() {
    const today = getToday();
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    const wsLimit = parseInt(localStorage.getItem('worksheetLimit') || '10');
    if (todayProgress.length >= wsLimit || queueIndex >= worksheetQueue.length) {
        if (CONFIG.sessionId) {
            sb.from('sessions').update({
                queue_index: queueIndex,
                progress_json: todayProgress,
                last_activity_at: new Date().toISOString()
            }).eq('id', CONFIG.sessionId).then(({ error }) => {
                if (error) console.error('Final session update failed:', error);
            });
        }
        // Practice unlocks nothing now — the daily mini-test runs first (so
        // finalize_session below sees its answers), then the closing book.
        startDailyTestStep();
        return;
    }
    const item = worksheetQueue[queueIndex];
    if (!item) { console.error('Queue item missing at index', queueIndex); showMenu(); return; }
    const [fn, type] = item;
    if (typeof window[fn] !== 'function') { console.error('Worksheet function not found:', fn); queueIndex++; nextWorksheet(); return; }
    CONFIG.guidedLaunch = true;
    try { window[fn](); } catch(e) { console.error('Worksheet crashed:', fn, e); queueIndex++; nextWorksheet(); }
}

// ============ DAILY MINI-TEST + CLOSING BOOK ============
// Session shape: worksheets (above) -> one daily mini-test -> a book -> menu.
// See docs/MASTERY.md "The shape of a session".

async function startDailyTestStep() {
    if (!CONFIG.sessionId) { launchClosingBook(); return; }

    let skillId = null;
    try { skillId = await pickDailyTestSkill(); }
    catch (e) { console.error('pickDailyTestSkill failed:', e); }
    if (!skillId) { finishDailySession(); return; }

    const progress = getSkillProgress(skillId);
    const level = (progress && progress.current_level) || 1;
    const count = (progress && progress.questions_needed) || 6;

    let questions = [];
    try { questions = buildDailyTest(skillId, level, count) || []; }
    catch (e) { console.error('buildDailyTest failed for ' + skillId + ':', e); }

    if (!questions.length) { finishDailySession(); return; }
    runDailyTest(skillId, level, questions, finishDailySession);
}

// One skill per day: fewest qualifying_days at its current_level first
// (closest to unlocking), ties broken by least recently tested.
async function pickDailyTestSkill() {
    if (!CONFIG.childId) return null;
    const practiced = [...new Set(worksheetQueue.slice(0, queueIndex).map(item => item[2]).filter(Boolean))];
    const eligible = practiced.filter(id => {
        const p = getSkillProgress(id);
        return p && (p.mastery_type === 'mastery' || p.mastery_type === 'qaida') && p.mastery_state !== 'mastered';
    });
    if (!eligible.length) return null;
    if (eligible.length === 1) return eligible[0];

    const lastPracticed = {};
    try {
        const { data, error } = await sb.from('responses')
            .select('skill_id, created_at')
            .eq('child_id', CONFIG.childId)
            .in('skill_id', eligible)
            .order('created_at', { ascending: false });
        if (error) console.error('pickDailyTestSkill recency lookup error:', error);
        (data || []).forEach(r => { if (!(r.skill_id in lastPracticed)) lastPracticed[r.skill_id] = r.created_at; });
    } catch (e) {
        console.error('pickDailyTestSkill recency lookup failed:', e);
    }

    eligible.sort((a, b) => {
        const qa = getSkillProgress(a).qualifying_days || 0;
        const qb = getSkillProgress(b).qualifying_days || 0;
        if (qa !== qb) return qa - qb;
        const ta = lastPracticed[a] || '';
        const tb = lastPracticed[b] || '';
        return ta < tb ? -1 : (ta > tb ? 1 : 0);
    });
    return eligible[0];
}

// One question at a time, no hints, no retries — the first answer stands.
function runDailyTest(skillId, level, questions, onDone) {
    const runId = Date.now();
    let current = 0, score = 0, qStartMs = null;

    function speakQuestion(q) {
        if (!q.sound) return;
        const fn = skillId === 'urdu_qaida' ? window.speakUrdu : window.speakArabic;
        if (typeof fn === 'function') { try { fn(q.sound); } catch (e) {} }
    }

    function render() {
        if (current >= questions.length) { showResult(); return; }
        const q = questions[current];
        let html = '<div class="card">';
        html += '<div style="text-align:center;font-size:16px;color:#FFD700;margin-bottom:5px">✅ Quick Check</div>';
        html += '<div style="text-align:center;font-size:14px;color:#888">' + (current + 1) + ' / ' + questions.length + '</div>';
        html += '<div style="background:#333;border-radius:10px;height:8px;margin:10px 0"><div style="background:#FFD700;border-radius:10px;height:8px;width:' + (current / questions.length * 100) + '%"></div></div>';
        if (q.prompt_html) html += '<div style="text-align:center;font-size:28px;margin:15px 0;line-height:2">' + q.prompt_html + '</div>';
        if (q.prompt_emoji) html += '<div style="text-align:center;font-size:36px;margin:15px 0">' + q.prompt_emoji + '</div>';
        if (q.prompt) html += '<div class="title" style="font-size:28px">' + q.prompt + '</div>';
        if (q.sound) html += '<button class="btn green" style="font-size:20px;padding:12px 25px;margin:10px auto;display:block" onclick="dailyTestListen()">🔊 Listen</button>';
        const cols = q.choices.length <= 2 ? 2 : (q.color_choices ? 4 : 2);
        const fontSize = q.emoji_choices ? '36px' : '28px';
        html += '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:12px;margin:20px 0">';
        q.choices.forEach((ch, i) => {
            if (q.color_choices && CONFIG.colors[ch]) {
                html += '<div id="dtch' + i + '" onclick="dailyTestPick(' + i + ')" style="display:flex;align-items:center;justify-content:center;padding:10px;background:white;border:3px solid #ddd;border-radius:12px;cursor:pointer;min-height:60px">';
                html += '<span style="display:inline-block;width:44px;height:44px;border-radius:50%;background:' + CONFIG.colors[ch] + '"></span></div>';
            } else {
                const label = q.choice_labels ? q.choice_labels[i] : ch;
                html += '<div id="dtch' + i + '" onclick="dailyTestPick(' + i + ')" style="display:flex;align-items:center;justify-content:center;padding:20px;background:white;border:3px solid #ddd;border-radius:12px;cursor:pointer;font-size:' + fontSize + ';font-weight:bold;min-height:60px">' + label + '</div>';
            }
        });
        html += '</div></div>';
        document.getElementById('app').innerHTML = html;
        qStartMs = Date.now();
        window.dailyTestListen = () => speakQuestion(q);
    }

    window.dailyTestPick = (i) => {
        const q = questions[current];
        const responseTimeMs = qStartMs ? Date.now() - qStartMs : null;
        const chosen = q.choices[i];
        const correct = chosen === q.correct;

        q.choices.forEach((ch, j) => {
            const el = document.getElementById('dtch' + j);
            if (!el) return;
            if (ch === q.correct) { el.style.borderColor = '#22c55e'; el.style.background = '#dcfce7'; }
            else if (j === i && !correct) { el.style.borderColor = '#ef4444'; el.style.background = '#fee2e2'; }
            el.onclick = null;
        });

        if (correct) score++;
        recordResponse(q.skill_id || skillId, q.qdata, q.correct, chosen, correct, true, 1,
            responseTimeMs, 'dt' + runId + '_' + current, false, q.level != null ? q.level : level);

        setTimeout(() => { current++; render(); }, 1200);
    };

    function showResult() {
        const warm = score >= questions.length * 0.8 ? 'Amazing work! 🌟'
            : score >= questions.length * 0.5 ? 'Great effort! 👍'
            : 'Good try — more practice coming!';
        let html = '<div class="card">';
        html += '<div class="title" style="font-size:26px">✅ Quick Check Done!</div>';
        html += '<div style="text-align:center;font-size:40px;margin:20px">⭐ You got ' + score + ' of ' + questions.length + '</div>';
        html += '<div style="text-align:center;color:#888;font-size:18px;margin:10px">' + warm + '</div>';
        html += '<button class="btn green" style="font-size:20px;padding:15px 30px" onclick="dailyTestContinue()">Continue →</button>';
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    window.dailyTestContinue = () => { onDone(); };

    render();
}

async function finishDailySession() {
    if (CONFIG.sessionId) {
        try {
            const { data, error } = await sb.rpc('finalize_session', { p_session_id: CONFIG.sessionId });
            if (error) console.error('finalize_session error:', error);
            else {
                console.log('finalize_session OK:', data);
                await refreshSkillProgress();
                if (data && data.levels_unlocked) {
                    Object.keys(data.levels_unlocked).forEach(skillId => {
                        celebrateLevelUnlock(skillId, data.levels_unlocked[skillId]);
                    });
                }
            }
        } catch (e) { console.error('finalize_session failed:', e); }
    }
    launchClosingBook();
}

function launchClosingBook() {
    CONFIG.guidedLaunch = true;
    if (typeof showBabyUniversity === 'function') {
        try { showBabyUniversity(); return; } catch (e) { console.error('showBabyUniversity failed:', e); }
    }
    showMenu();
}

function getToday() {
    return localDayKey();
}

function getWeekKey() {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    return now.getFullYear() + '-W' + String(weekNum).padStart(2, '0');
}

function updateFocus(n) {
    CONFIG.focusNumber = parseInt(n);
    localStorage.setItem('focusNumber', n);
}

function updateLimit(n) {
    localStorage.setItem('worksheetLimit', n);
}

function resetProgress() {
    if (confirm('Delete all progress?')) {
        localStorage.clear();
        location.reload();
    }
}

function showHowToUse() {
    let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
    html += '<div class="title">📋 How to Use</div>';
    html += '<div style="color:#333;font-size:16px;line-height:1.8;text-align:left;padding:10px">';
    html += '<p style="color:#FF6B35;font-size:18px;font-weight:bold;text-align:center;margin-bottom:15px">⚠️ This is NOT a "give the kid and forget" app.<br>This is a "do it WITH your kid" app! ⚠️</p>';
    html += '<ul style="padding-left:20px;list-style:none">';
    html += '<li style="margin:10px 0;color:#333;font-size:15px">👨‍👩‍👧 <b>Sit with your child</b> — Guide them through each worksheet, talk about what they see</li>';
    html += '<li style="margin:10px 0;color:#333;font-size:15px">🔢 <b>Focus Number</b> — Controls difficulty across ALL worksheets. Start low (3-5), increase as they improve</li>';
    html += '<li style="margin:10px 0;color:#333;font-size:15px">📊 <b>Worksheet Limit</b> — Set how many worksheets per day to avoid screen fatigue</li>';
    html += '<li style="margin:10px 0;color:#333;font-size:15px">🚀 <b>Let\'s Start</b> — Picks 2 random worksheets per section. Best for daily practice</li>';
    html += '<li style="margin:10px 0;color:#333;font-size:15px">🔒 <b>Locked worksheets</b> — Kids can\'t open individual worksheets. Parents hold 3 seconds to unlock</li>';
    html += '<li style="margin:10px 0;color:#333;font-size:15px">📖 <b>Urdu &amp; Arabic Qaida</b> — Levels unlock after 5 days of practice. Parents can hold 3s on lock to override</li>';
    html += '<li style="margin:10px 0;color:#333;font-size:15px">🔊 <b>Sound buttons</b> — Tap letters/words to hear pronunciation. Repeat together!</li>';
    html += '<li style="margin:10px 0;color:#333;font-size:15px">✏️ <b>Tracing</b> — Let them trace with their finger. Clear and try again. No wrong answers here!</li>';
    html += '<li style="margin:10px 0;color:#333;font-size:15px">🎨 <b>Color Patterns</b> — Tap a color, then tap the empty circle. Talk about the pattern together</li>';
    html += '<li style="margin:10px 0;color:#333;font-size:15px">🔄 <b>Repetition is key</b> — Same worksheets appear in different order each day. This is intentional!</li>';
    html += '<li style="margin:10px 0;color:#333;font-size:15px">⭐ <b>Celebrate effort</b> — Stars are for trying, not just correct answers</li>';
    html += '<li style="margin:10px 0;color:#333;font-size:15px">⏱️ <b>Keep sessions short</b> — 10-15 minutes is plenty for ages 3-5</li>';
    html += '</ul>';
    html += '<p style="color:#00CC66;text-align:center;margin-top:15px;font-size:14px">Made with ❤️ for ' + (CONFIG.childName||'Aliza') + '</p>';
    html += '</div></div>';
    document.getElementById('app').innerHTML = html;
}

async function showExport() {
    // Gather days from localStorage
    const localDays = new Set();
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('daily_')) localDays.add(key.replace('daily_', ''));
    }

    // Fetch completed sessions with progress_json from Supabase
    const remoteDays = {};
    if (CONFIG.childId) {
        const { data } = await sb.from('sessions')
            .select('started_at, progress_json')
            .eq('child_id', CONFIG.childId)
            .not('progress_json', 'is', null)
            .order('started_at', { ascending: false })
            .limit(30);
        if (data) {
            for (const s of data) {
                const day = localDayKey(s.started_at);
                if (!localDays.has(day) && s.progress_json && s.progress_json.length > 0) {
                    remoteDays[day] = s.progress_json;
                }
            }
        }
    }

    const days = [...new Set([...localDays, ...Object.keys(remoteDays)])].sort().reverse();
    const today = getToday();

    let activeDay = today;

    function getDayData(day) {
        const local = JSON.parse(localStorage.getItem('daily_'+day) || '[]');
        if (local.length > 0) return local;
        return remoteDays[day] || [];
    }

    function renderProgress() {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">📊 Progress</div>';

        // Day tabs
        html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:15px">';
        days.forEach(d => {
            const isActive = d === activeDay;
            const label = d === today ? '📅 Today' : d;
            html += '<div onclick="switchDay(\''+d+'\')" style="padding:8px 12px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold;background:'+(isActive?'#22c55e':'#e5e7eb')+';color:'+(isActive?'white':'#333')+'">'+label+'</div>';
        });
        html += '</div>';

        // Day content
        const data = getDayData(activeDay);
        if (data.length === 0) {
            html += '<p style="text-align:center;color:#999">No worksheets completed this day.</p>';
        } else {
const totalQs = data.reduce((sum, ws) => sum + (ws.answers||[]).length, 0);
            html += '<div style="background:#f0f4f8;padding:10px;border-radius:8px;margin-bottom:12px;text-align:center;color:#333">';
            html += '<b>'+data.length+'</b> worksheets · <b>'+totalQs+'</b> questions';
            html += '</div>';

            data.forEach((ws, wi) => {
                const t = ws.time ? new Date(ws.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '';
                const total = (ws.answers||[]).length;

                html += '<div style="border:1px solid #ddd;border-radius:10px;margin-bottom:10px;overflow:hidden">';
                // Header
                html += '<div onclick="toggleWS('+wi+')" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f8f9fa;cursor:pointer">';
                html += '<div><b>'+ws.type+'</b> <span style="color:#666;font-size:13px">'+t+'</span></div>';
                html += '<div style="font-size:14px">'+ws.score+' · '+total+' Q <span id="arrow'+wi+'">▶</span></div>';
                html += '</div>';

                // Detail (hidden by default)
                html += '<div id="wsDetail'+wi+'" style="display:none;padding:10px 12px;background:white">';
                if (ws.answers && ws.answers.length > 0) {
                    ws.answers.forEach((a, qi) => {
                        const icon = a.correct ? '✅' : (a.answer === 'skip' || a.answer === 'skipped' ? '⏭️' : '❌');
                        html += '<div style="padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px">';
                        html += '<div>'+icon+' <b>Q'+(qi+1)+':</b> ';

                        // Show question
                        if (a.q) html += '<span style="color:#555">'+a.q+'</span>';
                        html += '</div>';

                        // Show details
                        html += '<div style="margin-left:24px;color:#888;font-size:12px">';
                        if (a.choices) html += 'Choices: '+a.choices.join(', ')+' · ';
                        if (a.type) html += 'Type: '+a.type+' · ';
                        if (a.level) html += 'Level: '+a.level+' · ';
                        html += 'Picked: <b style="color:'+(a.correct?'#22c55e':'#ef4444')+'">'+a.answer+'</b>';
                        if (a.correctAnswer) html += ' · Answer: <b style="color:#22c55e">'+a.correctAnswer+'</b>';
                        html += '</div></div>';
                    });
                } else {
                    html += '<p style="color:#999;font-size:13px">No detailed answer data.</p>';
                }
                html += '</div></div>';
            });
        }

        html += '<button class="btn green" onclick="copyDayProgress()">📋 Copy This Day</button>';
        html += '<button class="btn" onclick="copyAllProgress()">📋 Copy All Days</button>';
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    window.switchDay = (d) => { activeDay = d; renderProgress(); };

    window.toggleWS = (i) => {
        const el = document.getElementById('wsDetail'+i);
        const arrow = document.getElementById('arrow'+i);
        if (el.style.display === 'none') { el.style.display = 'block'; arrow.textContent = '▼'; }
        else { el.style.display = 'none'; arrow.textContent = '▶'; }
    };

    window.copyDayProgress = () => {
        const data = getDayData(activeDay);
        let text = '📅 '+activeDay+'\n\n';
        data.forEach((ws, wi) => {
            const t = ws.time ? new Date(ws.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '';
            const firstTry = (ws.answers||[]).filter(a => a.firstTry).length;
            text += '📝 '+ws.type+' — '+ws.score+' (⭐'+firstTry+' first-try) '+t+'\n';
            (ws.answers||[]).forEach((a, qi) => {
                const icon = a.correct ? '✅' : (a.answer === 'skip' || a.answer === 'skipped' ? '⏭️' : '❌');
                const ft = a.firstTry ? '⭐' : '  ';
                text += '  '+icon+ft+' Q'+(qi+1)+': '+(a.q||'')+ ' → Picked: '+a.answer;
                if (a.correctAnswer) text += ' (Answer: '+a.correctAnswer+')';
                text += '\n';
            });
            text += '\n';
        });
        navigator.clipboard.writeText(text).then(() => alert('Copied '+activeDay+'!'));
    };

    window.copyAllProgress = () => {
        let text = '';
        days.forEach(d => {
            const data = getDayData(d);
            text += '📅 '+d+'\n';
            data.forEach(ws => {
                const firstTry = (ws.answers||[]).filter(a => a.firstTry).length;
                text += '  📝 '+ws.type+' — '+ws.score+' (⭐'+firstTry+' first-try)\n';
            });
            text += '\n';
        });
        navigator.clipboard.writeText(text).then(() => alert('Copied all days!'));
    };

    renderProgress();
}

// ============ ADAPTIVE QUEUE BRAIN ============

// Skill ID → [functionName, displayName] mapping
const SKILL_MAP = {
    // Challenge — Quantitative
    addition:                ['showAddition', 'Addition'],
    subtraction:             ['showSubtraction', 'Subtraction'],
    counting:                ['showCounting', 'Counting'],
    match_numbers:           ['showMatchNumbers', 'Match Numbers'],
    more_less:               ['showMoreLess', 'More/Less'],
    bigger_smaller:          ['showBiggerSmaller', 'Bigger/Smaller'],
    what_comes_next_numbers: ['showWhatNext', 'What Comes Next'],
    numbers_english:         ['showNumbersEnglish', 'Numbers English'],
    // Challenge — Nonverbal
    figure_matrices:         ['showFigureMatrices', 'Figure Matrices'],
    color_patterns_l2:       ['showColorsL2', 'Color Patterns L2'],
    // Challenge — Verbal
    verbal_analogies:        ['showVerbalAnalogies', 'Verbal Analogies'],
    // Challenge — Literacy
    two_letter_words:        ['showTwoLetter', '2-Letter Words'],
    three_letter_words:      ['showThreeLetter', '3-Letter Words'],
    // Challenge — Urdu
    urdu_reading:            ['showUrduReading', 'Urdu Reading'],
    urdu_2letter:            ['showUrdu2Letter', 'Urdu 2-Letter Words'],
    urdu_what_next:          ['showUrduWhatNext', 'Urdu What Next'],
    urdu_qaida:              ['showUrduQaida', 'Urdu Qaida'],
    numbers_urdu:            ['showNumbersUrdu', 'Numbers Urdu'],
    // Challenge — Arabic
    arabic_qaida:            ['showArabicQaida', 'Arabic Qaida'],
    numbers_arabic:          ['showNumbersArabic', 'Numbers Arabic'],
    numbers_all:             ['showNumbersAll', 'Numbers All'],
    // Fun
    color_patterns:          ['showColors', 'Color Patterns'],
    connect_dots:            ['showConnectDots', 'Connect Dots'],
    find_pairs:              ['showJora', 'Find Pairs'],
    which_doesnt_belong:     ['showDoesntBelong', "Doesn't Belong"],
    trace_upper:             ['showTraceABC', 'Trace ABC'],
    trace_lower:             ['showTraceLower', 'Trace abc'],
    trace_numbers:           ['showTraceNumbers', 'Trace Numbers'],
    urdu_trace:              ['showUrduTrace', 'Urdu Trace'],
    arabic_trace:            ['showArabicTrace', 'Arabic Trace'],
    urdu_videos:             ['showUrduVideos', 'Urdu Videos'],
};

const CHALLENGE_SKILLS = [
    'addition','subtraction','counting','match_numbers','more_less','bigger_smaller',
    'what_comes_next_numbers','numbers_english',
    'figure_matrices','color_patterns_l2','verbal_analogies',
    'two_letter_words','three_letter_words',
    'urdu_what_next','urdu_qaida','numbers_urdu',
    'arabic_qaida','numbers_arabic'
];

const FUN_SKILLS = [
    'color_patterns','connect_dots','find_pairs','which_doesnt_belong',
    'trace_upper','trace_lower','trace_numbers','urdu_trace', 'arabic_trace','urdu_videos'
];

async function buildAdaptiveQueue(childId, maxItems, doneTypes) {
    const today = getToday();
    const allSkillIds = Object.keys(SKILL_MAP);

    // --- Fetch response data for scoring ---
    let responses = [];
    try {
        let { data, error } = await sb.from('responses')
            .select('skill_id,is_correct,created_at,is_passive')
            .eq('child_id', childId);
        if (error) {
            // Pre-migration: is_passive doesn't exist yet. Retry without it so the queue is never empty.
            console.error('Queue fetch with is_passive failed, retrying without it:', error);
            ({ data, error } = await sb.from('responses')
                .select('skill_id,is_correct,created_at')
                .eq('child_id', childId));
            if (error) console.error('Queue fetch retry error:', error);
        }
        responses = data || [];
    } catch(e) {
        console.error('Queue fetch error:', e);
    }

    // --- Build per-skill stats ---
    const skillStats = {};
    const now = new Date();
    responses.forEach(r => {
        if (!skillStats[r.skill_id]) {
            skillStats[r.skill_id] = { totalAttempts: 0, correctCount: 0, lastPracticed: null, timesToday: 0 };
        }
        const s = skillStats[r.skill_id];
        if (r.is_passive !== true) {
            s.totalAttempts++;
            if (r.is_correct) s.correctCount++;
        }
        const rDate = r.created_at ? localDayKey(r.created_at) : null;
        if (rDate === today) s.timesToday++;
        if (!s.lastPracticed || r.created_at > s.lastPracticed) s.lastPracticed = r.created_at;
    });

    // --- Score all skills ---
    const scored = allSkillIds.map(skillId => {
        const entry = SKILL_MAP[skillId];
        if (!entry) return null;
        if (doneTypes.includes(entry[1])) return null; // already done today

        const s = skillStats[skillId] || { totalAttempts: 0, correctCount: 0, lastPracticed: null, timesToday: 0 };
        const daysSincePracticed = s.lastPracticed
            ? Math.floor((now - new Date(s.lastPracticed)) / (1000 * 60 * 60 * 24))
            : 7; // never practiced = treat as 7 days ago
        const accuracy = s.totalAttempts > 0 ? Math.round(s.correctCount / s.totalAttempts * 100) : -1;

        const result = calculatePriority(skillId, {
            daysSincePracticed,
            accuracy: accuracy >= 0 ? accuracy : 100, // unknown = assume fine, new_skill_bonus handles it
            totalAttempts: s.totalAttempts,
            timesToday: s.timesToday
        });
        result.entry = entry;
        return result;
    }).filter(Boolean);

    // --- Sort by priority (highest first), with small random tiebreaker for variety ---
    scored.sort((a, b) => {
        const diff = b.priority - a.priority;
        if (Math.abs(diff) <= 1) return Math.random() - 0.5; // break ties randomly
        return diff;
    });

    // --- Map each skill to its domain, straight from the skills table (SKILLS) ---
    const skillDomain = {};
    Object.keys(SKILLS).forEach(id => { if (SKILLS[id] && SKILLS[id].domain) skillDomain[id] = SKILLS[id].domain; });
    const domainNames = [...new Set(Object.values(skillDomain))];

    // --- Phase 1: guarantee coverage — each domain's highest-priority eligible skill ---
    const queue = [];
    const usedFns = new Set();
    const queueDomains = [];

    const domainCandidates = domainNames
        .map(domain => scored.find(s => skillDomain[s.skillId] === domain))
        .filter(Boolean)
        .sort((a, b) => b.priority - a.priority); // most-needed domains win the limited slots

    for (const item of domainCandidates) {
        if (queue.length >= maxItems) break;
        if (usedFns.has(item.entry[0])) continue;
        queue.push([item.entry[0], item.entry[1], item.skillId]);
        usedFns.add(item.entry[0]);
        queueDomains.push(skillDomain[item.skillId]);
    }

    // --- Phase 2: fill remaining slots from the global priority order ---
    for (const item of scored) {
        if (queue.length >= maxItems) break;
        if (usedFns.has(item.entry[0])) continue;
        queue.push([item.entry[0], item.entry[1], item.skillId]);
        usedFns.add(item.entry[0]);
        queueDomains.push(skillDomain[item.skillId] || 'none');
    }

    console.log('Priority queue:', scored.slice(0, maxItems).map(s =>
        s.skillId + '=' + s.priority + ' (bw=' + s.baseWeight + ' ru=' + s.reviewUrgency + ' ws=' + s.weaknessSignal + ' cb=' + s.cogatBoost + ' ns=' + s.newSkillBonus + ' rb=' + s.reviewNeedBoost + ' op=' + s.overusePenalty + ')'
    ));
    console.log('Adaptive queue built:', queue.map((q, i) => q[1] + ' [' + queueDomains[i] + ']'));
    return queue;
}

checkAuth();