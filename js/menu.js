// ============ MENU ============
function showMenu() {
    const today = getToday();
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    const wsLimit = parseInt(localStorage.getItem('worksheetLimit') || '10');

    // Check if limit reached
    if (todayProgress.length >= wsLimit) {
        let html = '<h1>🎨 Aliza\'s Learning</h1>';
        html += '<div class="card"><div class="title">🌟 Amazing job today! 🌟</div>';
        html += '<p style="color:white;font-size:24px;text-align:center">You finished '+todayProgress.length+' worksheets!</p>';
        html += '<p style="color:white;font-size:28px;text-align:center">Come back later! 🎉</p></div>';
        html += '<button class="btn" onclick="showExport()">📊 View Progress</button>';
        html += '<button class="btn" onclick="resetProgress()">🔄 Reset Progress</button>';
        document.getElementById('app').innerHTML = html;
        return;
    }

    let html = '<h1>🎨 Aliza\'s Learning</h1>';
    html += '<div class="btn"><label>Focus Number: <input type="number" id="focusInput" value="'+CONFIG.focusNumber+'" min="1" max="20" style="width:60px;font-size:24px;text-align:center" onchange="updateFocus(this.value)"></label></div>';
    html += '<div class="btn"><label>Worksheet Limit: <input type="number" id="limitInput" value="'+wsLimit+'" min="1" max="50" style="width:60px;font-size:24px;text-align:center" onchange="updateLimit(this.value)"></label></div>';
    html += '<p style="color:white;text-align:center">Done today: '+todayProgress.length+' / '+wsLimit+'</p>';

    // Math worksheets
    html += '<div style="margin:15px 0"><h2 style="color:#FF6B35;text-align:center;margin:5px">🔢 Math</h2>';
    const math = [
        ['showAddition','Addition ➕'],['showSubtraction','Subtraction ➖'],['showCounting','Counting 🔢'],
        ['showMatchNumbers','Match Numbers 🎯'],['showMoreLess','More / Less ⚖️'],
        ['showBiggerSmaller','Bigger / Smaller 📏'],['showWhatNext','What Next ➡️']
    ];
    math.forEach(([fn,label]) => { html += '<button class="btn" onclick="launchWorksheet(\''+fn+'\')">'+label+'</button>'; });
    html += '</div>';

    // English worksheets
    html += '<div style="margin:15px 0"><h2 style="color:#00CC66;text-align:center;margin:5px">📖 English</h2>';
    const english = [
        ['showTwoLetter','2-Letter Words 📖'],['showThreeLetter','3-Letter Words 📚'],
        ['showTraceABC','Trace ABC ✏️'],['showTraceLower','Trace abc ✏️'],['showTraceNumbers','Trace 123 ✏️']
    ];
    english.forEach(([fn,label]) => { html += '<button class="btn" onclick="launchWorksheet(\''+fn+'\')">'+label+'</button>'; });
    html += '</div>';

    // Thinking worksheets
    html += '<div style="margin:15px 0"><h2 style="color:#0099FF;text-align:center;margin:5px">🧠 Thinking</h2>';
    const thinking = [
        ['showColors','Color Patterns 🎨'],['showColorsL2','Color Patterns L2 🎨'],['showDoesntBelong','Doesn\'t Belong 🤔'],
        ['showJora','Find Jora 🧩'],['showConnectDots','Connect Dots ✍️']
    ];
    thinking.forEach(([fn,label]) => { html += '<button class="btn" onclick="launchWorksheet(\''+fn+'\')">'+label+'</button>'; });
    html += '</div>';

    // Urdu worksheets
    html += '<div style="margin:15px 0"><h2 style="color:#FFD700;text-align:center;margin:5px">اردو Urdu</h2>';
    const urdu = [
        ['showUrduReading','Urdu Reading 📖'],['showUrduTrace','Urdu Trace ✏️'],
        ['showUrdu2Letter','Urdu 2-Letter Words 📚'],['showUrduWhatNext','Urdu What Next ➡️'],['showUrduVideos','Urdu Videos 📺']
    ];
    urdu.forEach(([fn,label]) => { html += '<button class="btn" onclick="launchWorksheet(\''+fn+'\')">'+label+'</button>'; });
    html += '</div>';

    // Arabic worksheets
    html += '<div style="margin:15px 0"><h2 style="color:#22c55e;text-align:center;margin:5px">📖 Arabic Qaida</h2>';
    const arabic = [
        ['showArabicQaida','Arabic Qaida 📖']
    ];
    arabic.forEach(([fn,label]) => { html += '<button class="btn" onclick="launchWorksheet(\''+fn+'\')">'+label+'</button>'; });
    html += '</div>';

    html += '<button class="btn" onclick="showExport()">📊 View Progress</button>';
    html += '<button class="btn" onclick="resetProgress()">🔄 Reset Progress</button>';
    document.getElementById('app').innerHTML = html;
}

function launchWorksheet(fnName) {
    const today = getToday();
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    const wsLimit = parseInt(localStorage.getItem('worksheetLimit') || '10');
    if (todayProgress.length >= wsLimit) {
        showMenu();
        return;
    }
    window[fnName]();
}

function getToday() {
    return new Date().toISOString().split('T')[0];
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
