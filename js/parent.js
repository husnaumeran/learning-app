// ============ PARENT AREA ============

let parentTab = 'report'; // 'report' or 'settings'

async function showParentArea() {
    parentTab = 'report';
    renderParentArea();
}

async function renderParentArea() {
    const app = document.getElementById('app');
    let html = '<button class="back" onclick="showMenu()">← Back</button>';
    html += '<h1 style="text-align:center">👨‍👩‍👧 Parent Area</h1>';

    // Tabs
    html += '<div style="display:flex;gap:8px;margin:10px 0">';
    html += '<button class="btn" style="flex:1;padding:12px;'+(parentTab==='report'?'background:#FFD700;color:#333':'background:#444;color:#aaa')+'" onclick="parentTab=\'report\';renderParentArea()">📊 Report Card</button>';
    html += '<button class="btn" style="flex:1;padding:12px;'+(parentTab==='settings'?'background:#FFD700;color:#333':'background:#444;color:#aaa')+'" onclick="parentTab=\'settings\';renderParentArea()">⚙️ Settings</button>';
    html += '</div>';

    if (parentTab === 'report') {
        html += await renderReportCard();
    } else {
        html += renderSettings();
    }

    app.innerHTML = html;
}

// ============ REPORT CARD ============

async function renderReportCard() {
    let html = '';

    // Fetch data
    const weekStart = getWeekStartISO();
    const [sessionsRes, statsRes, progressRes, weekendRes] = await Promise.all([
        sb.from('sessions').select('id,started_at,status,session_type')
            .eq('child_id', CONFIG.childId).gte('created_at', weekStart),
        sb.from('skill_stats').select('*').eq('child_id', CONFIG.childId),
        sb.from('child_skill_progress').select('*').eq('child_id', CONFIG.childId),
        sb.from('sessions').select('id,session_meta')
            .eq('child_id', CONFIG.childId).eq('session_type', 'weekend_assessment')
            .gte('created_at', weekStart).eq('status', 'completed').limit(1)
    ]);

    const sessions = sessionsRes.data || [];
    const stats = statsRes.data || [];
    const progress = progressRes.data || [];
    const weekendSession = (weekendRes.data && weekendRes.data[0]) || null;

    const dailySessions = sessions.filter(s => s.session_type === 'daily_practice' && s.status === 'completed');

    // --- 1. Weekly Summary Card ---
    html += '<div style="background:#1a1a2e;border:2px solid #FFD700;border-radius:15px;padding:20px;margin:10px 0">';
    html += '<div style="text-align:center;font-size:20px;color:#FFD700;font-weight:bold">📅 Weekly Summary</div>';
    html += '<div style="color:white;margin-top:12px;font-size:16px">';
    html += '<div>📝 Sessions completed: <b>' + dailySessions.length + '</b></div>';

    if (weekendSession) {
        html += '<div>⭐ Weekend Challenge: <b>Completed</b></div>';
    } else {
        html += '<div>⭐ Weekend Challenge: <span style="color:#888">Not yet</span></div>';
    }

    // Strong/weak areas from skill_stats
    const ranked = stats.filter(s => s.total_attempts >= 3)
        .map(s => ({...s, accuracy: s.correct_count / s.total_attempts}))
        .sort((a, b) => b.accuracy - a.accuracy);

    const strong = ranked.filter(s => s.accuracy >= 0.80).slice(0, 3);
    const weak = ranked.filter(s => s.accuracy < 0.60).slice(0, 3);

    if (strong.length > 0) {
        html += '<div style="margin-top:10px;color:#22c55e">💪 Strong Areas</div>';
        strong.forEach(s => {
            html += '<div style="margin-left:15px">• ' + formatSkillName(s.skill_id) + ' (' + Math.round(s.accuracy * 100) + '%)</div>';
        });
    }
    if (weak.length > 0) {
        html += '<div style="margin-top:10px;color:#ef4444">📚 Needs Practice</div>';
        weak.forEach(s => {
            html += '<div style="margin-left:15px">• ' + formatSkillName(s.skill_id) + ' (' + Math.round(s.accuracy * 100) + '%)</div>';
        });
    }
    if (ranked.length === 0) {
        html += '<div style="margin-top:10px;color:#888">No data yet — keep practicing!</div>';
    }

    html += '</div></div>';

    // --- 2. Skill Report Cards ---
    html += '<div style="background:#1a1a2e;border:2px solid #0099FF;border-radius:15px;padding:20px;margin:10px 0">';
    html += '<div style="text-align:center;font-size:20px;color:#0099FF;font-weight:bold">🎯 Skill Report</div>';

    if (stats.length === 0) {
        html += '<div style="color:#888;text-align:center;margin:15px">No skills practiced yet.</div>';
    } else {
        const sorted = stats.sort((a, b) => (a.skill_id > b.skill_id ? 1 : -1));
        sorted.forEach(s => {
            const acc = s.total_attempts > 0 ? s.correct_count / s.total_attempts : 0;
            const pct = Math.round(acc * 100);
            const barColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#FFD700' : '#ef4444';
            const label = pct >= 80 ? 'Strong' : pct >= 60 ? 'Learning' : 'Needs Practice';

            // Get per-skill focus number
            const skillSetting = CONFIG.skillSettings && CONFIG.skillSettings[s.skill_id];
            const focus = skillSetting ? skillSetting.focus_number : CONFIG.focusNumber;

            html += '<div style="background:#222;border-radius:10px;padding:12px;margin:8px 0">';
            html += '<div style="display:flex;justify-content:space-between;color:white;font-size:15px">';
            html += '<b>' + formatSkillName(s.skill_id) + '</b>';
            html += '<span style="color:' + barColor + '">' + label + '</span>';
            html += '</div>';
            html += '<div style="background:#333;border-radius:6px;height:10px;margin:6px 0">';
            html += '<div style="background:' + barColor + ';height:100%;border-radius:6px;width:' + pct + '%"></div></div>';
            html += '<div style="display:flex;justify-content:space-between;color:#888;font-size:12px">';
            html += '<span>' + pct + '% accuracy</span>';
            html += '<span>' + s.total_attempts + ' attempts</span>';
            html += '<span>Focus: ' + focus + '</span>';
            html += '</div></div>';
        });
    }

    html += '</div>';

    // --- 3. Practice Activity (this week) ---
    html += '<div style="background:#1a1a2e;border:2px solid #22c55e;border-radius:15px;padding:20px;margin:10px 0">';
    html += '<div style="text-align:center;font-size:20px;color:#22c55e;font-weight:bold">📆 Practice This Week</div>';
    html += '<div style="display:flex;justify-content:space-around;margin-top:15px">';

    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;

    for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - mondayOffset + i);
        const dateStr = d.toISOString().split('T')[0];
        const hasSession = sessions.some(s => s.started_at && s.started_at.startsWith(dateStr));
        const isToday = dateStr === now.toISOString().split('T')[0];
        const isFuture = d > now;

        let icon = '—';
        let color = '#555';
        if (hasSession) { icon = '✅'; color = '#22c55e'; }
        else if (isToday) { icon = '🔵'; color = '#0099FF'; }
        else if (isFuture) { icon = '·'; color = '#333'; }

        html += '<div style="text-align:center">';
        html += '<div style="color:' + (isToday ? '#FFD700' : '#888') + ';font-size:12px;font-weight:' + (isToday ? 'bold' : 'normal') + '">' + dayNames[i] + '</div>';
        html += '<div style="font-size:24px;color:' + color + '">' + icon + '</div>';
        html += '</div>';
    }

    html += '</div></div>';

    return html;
}

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

// ============ SETTINGS ============

function renderSettings() {
    let html = '';
    const wsLimit = parseInt(localStorage.getItem('worksheetLimit') || '10');

    html += '<div style="background:#1a1a2e;border:2px solid #888;border-radius:15px;padding:20px;margin:10px 0">';
    html += '<div style="text-align:center;font-size:20px;color:#888;font-weight:bold">⚙️ Settings</div>';

    // Child name
    html += '<div style="margin:15px 0">';
    html += '<label style="color:white;font-size:16px">Child Name</label>';
    html += '<div style="color:#FFD700;font-size:20px;margin-top:5px">' + (CONFIG.childName || 'Unknown') + '</div>';
    html += '</div>';

    // Worksheet Limit
    html += '<div style="margin:15px 0">';
    html += '<label style="color:white;font-size:16px">Daily Worksheet Limit</label>';
    html += '<div style="margin-top:5px"><input type="number" id="settingsLimit" value="' + wsLimit + '" min="1" max="50" style="width:80px;font-size:20px;text-align:center;padding:8px;border-radius:8px;border:2px solid #444;background:#222;color:white" onchange="updateLimit(this.value)"></div>';
    html += '</div>';

    // Sound
    html += '<div style="margin:15px 0">';
    html += '<label style="color:white;font-size:16px">Sound</label>';
    html += '<div style="margin-top:5px"><button class="btn" style="padding:10px 20px" onclick="toggleSound()">' + (CONFIG.soundOn !== false ? '🔊 On' : '🔇 Off') + '</button></div>';
    html += '</div>';

    // Sign out
    html += '<div style="margin:20px 0;border-top:1px solid #333;padding-top:15px">';
    html += '<button class="btn" style="background:#ef4444;padding:12px" onclick="signOut()">🚪 Sign Out</button>';
    html += '</div>';

    html += '</div>';
    return html;
}

function toggleSound() {
    CONFIG.soundOn = CONFIG.soundOn === false ? true : false;
    localStorage.setItem('soundOn', CONFIG.soundOn);
    renderParentArea();
}
