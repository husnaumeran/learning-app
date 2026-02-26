// ============ MENU ============
function showMenu() {
    const today = getToday();
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');

    let html = '<h1>🎨 Aliza\'s Learning</h1>';
    html += '<div class="btn"><label>Focus Number: <input type="number" id="focusInput" value="'+CONFIG.focusNumber+'" min="1" max="20" style="width:60px;font-size:24px;text-align:center" onchange="updateFocus(this.value)"></label></div>';
    html += '<p style="color:white;text-align:center">Done today: '+todayProgress.length+'</p>';
    html += '<button class="btn green" style="font-size:24px;padding:30px" onclick="startDaily()">Let\'s Start! 🚀</button>';
    html += '<button class="btn" onclick="showExport()">📊 View Progress</button>';
    html += '<button class="btn" onclick="resetProgress()">🔄 Reset Progress</button>';
    document.getElementById('app').innerHTML = html;
}

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function startDaily() {
    const math = ['showAddition','showCounting','showMatchNumbers','showMoreLess','showBiggerSmaller','showWhatNext','showSubtraction'];
    const english = ['showTwoLetter','showThreeLetter','showTraceABC','showTraceLower','showTraceNumbers'];
    const thinking = ['showColors','showDoesntBelong','showJora','showConnectDots'];

    const todayMix = [];
    const shuffledMath = math.sort(() => Math.random() - 0.5);
    todayMix.push(shuffledMath[0], shuffledMath[1]);
    const shuffledEng = english.sort(() => Math.random() - 0.5);
    todayMix.push(shuffledEng[0], shuffledEng[1]);
    const shuffledThink = thinking.sort(() => Math.random() - 0.5);
    todayMix.push(shuffledThink[0]);

    todayMix.sort(() => Math.random() - 0.5);

    localStorage.setItem('todayMix', JSON.stringify(todayMix));
    localStorage.setItem('currentWorksheet', '0');

    nextWorksheet();
}

function nextWorksheet() {
    const today = getToday();
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    const todayMix = JSON.parse(localStorage.getItem('todayMix') || '[]');
    const current = parseInt(localStorage.getItem('currentWorksheet') || '0');

    if (current >= 5 || current >= todayMix.length) {
        showMenu();
        return;
    }

    window[todayMix[current]]();
}

function updateFocus(n) {
    CONFIG.focusNumber = parseInt(n);
    localStorage.setItem('focusNumber', n);
}

function resetProgress() {
    if (confirm('Delete all progress?')) {
        localStorage.clear();
        location.reload();
    }
}

function showExport() {
    const allProgress = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('daily_')) {
            allProgress[key.replace('daily_', '')] = JSON.parse(localStorage.getItem(key));
        }
    }
    let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">📊 Progress</div>';
    html += '<div style="background:#333;color:#0f0;padding:15px;border-radius:10px;font-family:monospace;font-size:12px;max-height:300px;overflow:auto;white-space:pre-wrap">'+JSON.stringify(allProgress, null, 2)+'</div>';
    html += '<button class="btn green" onclick="copyProgress()">📋 Copy to Clipboard</button></div>';
    document.getElementById('app').innerHTML = html;

    window.copyProgress = () => {
        navigator.clipboard.writeText(JSON.stringify(allProgress)).then(() => alert('Copied!'));
    };
}

showMenu();


// ============ Show Progress ============
function showExport() {
    const allProgress = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('daily_')) {
            allProgress[key.replace('daily_', '')] = JSON.parse(localStorage.getItem(key));
        }
    }
    let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">📊 Progress</div>';
    html += '<div style="background:#333;color:#0f0;padding:15px;border-radius:10px;font-family:monospace;font-size:12px;max-height:300px;overflow:auto;white-space:pre-wrap">'+JSON.stringify(allProgress, null, 2)+'</div>';
    html += '<button class="btn green" onclick="copyProgress()">📋 Copy to Clipboard</button></div>';
    document.getElementById('app').innerHTML = html;

    window.copyProgress = () => {
        navigator.clipboard.writeText(JSON.stringify(allProgress)).then(() => alert('Copied!'));
    };
}

// ============ Show Progress ============
function showExport() {
    const allProgress = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('daily_')) {
            allProgress[key.replace('daily_', '')] = JSON.parse(localStorage.getItem(key));
        }
    }
    let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">📊 Progress</div>';
    html += '<div style="background:#333;color:#0f0;padding:15px;border-radius:10px;font-family:monospace;font-size:12px;max-height:300px;overflow:auto;white-space:pre-wrap">'+JSON.stringify(allProgress, null, 2)+'</div>';
    html += '<button class="btn green" onclick="copyProgress()">📋 Copy to Clipboard</button></div>';
    document.getElementById('app').innerHTML = html;

    window.copyProgress = () => {
        navigator.clipboard.writeText(JSON.stringify(allProgress)).then(() => alert('Copied!'));
    };
}