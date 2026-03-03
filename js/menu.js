// ============ MENU ============
var worksheetQueue = [];
var queueIndex = 0;

function showMenu() {
    const today = getToday();
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    const wsLimit = parseInt(localStorage.getItem('worksheetLimit') || '10');
    const doneTypes = todayProgress.map(p => p.type);

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
    html += '<button class="btn green" style="font-size:24px;padding:30px" onclick="startDaily()">Let\'s Start! 🚀</button>';

    const sections = [
        {title:'🔢 Math', color:'#FF6B35', items:[
            ['showAddition','Addition ➕','Addition'],['showSubtraction','Subtraction ➖','Subtraction'],
            ['showCounting','Counting 🔢','Counting'],['showMatchNumbers','Match Numbers 🎯','Match Numbers'],
            ['showMoreLess','More / Less ⚖️','More/Less'],['showBiggerSmaller','Bigger / Smaller 📏','Bigger/Smaller'],
            ['showWhatNext','What Next ➡️','What Comes Next']
        ]},
        {title:'📖 English', color:'#00CC66', items:[
            ['showTwoLetter','2-Letter Words 📖','2-Letter Words'],['showThreeLetter','3-Letter Words 📚','3-Letter Words'],
            ['showTraceABC','Trace ABC ✏️','Trace ABC'],['showTraceLower','Trace abc ✏️','Trace abc'],
            ['showTraceNumbers','Trace 123 ✏️','Trace Numbers']
        ]},
        {title:' Thinking', color:'#0099FF', items:[
            ['showColors','Color Patterns 🎨','Color Patterns'],['showColorsL2','Color Patterns L2 🎨','Color Patterns L2'],
            ['showDoesntBelong','Doesn\'t Belong 🤔','Doesn\'t Belong'],
            ['showJora','Find Jora 🧩','Find Jora'],['showConnectDots','Connect Dots ✍️','Connect Dots']
        ]},
        {title:'اردو Urdu', color:'#FFD700', items:[
            ['showUrduReading','Urdu Reading 📖','Urdu Reading'],['showUrduTrace','Urdu Trace ✏️','Urdu Trace'],
            ['showUrdu2Letter','Urdu 2-Letter 📚','Urdu 2-Letter Words'],['showUrduWhatNext','Urdu What Next ➡️','Urdu What Next'],
            ['showUrduVideos','Urdu Videos 📺','Urdu Videos'],['showUrduQaida','Urdu Qaida 📖','Urdu Qaida']
        ]},
        {title:'📖 Arabic Qaida', color:'#22c55e', items:[
            ['showArabicQaida','Arabic Qaida 📖','Arabic Qaida']
        ]}
    ];

    sections.forEach(s => {
        html += '<div style="margin:15px 0"><h2 style="color:'+s.color+';text-align:center;margin:5px">'+s.title+'</h2>';
        s.items.forEach(([fn, label, type]) => {
            const done = doneTypes.includes(type);
            const icon = done ? ' ✅' : ' 🔒';
            html += '<div style="padding:12px 20px;margin:4px 0;background:#333;border-radius:10px;color:'+(done?'#aaa':'white')+';font-size:18px;cursor:default" ';
            html += 'ontouchstart="this.holdTimer=setTimeout(()=>{window[\''+fn+'\']()},3000)" ontouchend="clearTimeout(this.holdTimer)" ';
            html += 'onmousedown="this.holdTimer=setTimeout(()=>{window[\''+fn+'\']()},3000)" onmouseup="clearTimeout(this.holdTimer)">';
            html += label + icon + '</div>';
        });
        html += '</div>';
    });

    html += '<button class="btn" onclick="showExport()">📊 View Progress</button>';
    html += '<button class="btn" onclick="resetProgress()">🔄 Reset Progress</button>';
    document.getElementById('app').innerHTML = html;
}

function startDaily() {
    const today = getToday();
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    const doneTypes = todayProgress.map(p => p.type);

    const sections = [
        [['showAddition','Addition'],['showSubtraction','Subtraction'],['showCounting','Counting'],['showMatchNumbers','Match Numbers'],['showMoreLess','More/Less'],['showBiggerSmaller','Bigger/Smaller'],['showWhatNext','What Comes Next']],
        [['showTwoLetter','2-Letter Words'],['showThreeLetter','3-Letter Words'],['showTraceABC','Trace ABC'],['showTraceLower','Trace abc'],['showTraceNumbers','Trace Numbers']],
        [['showColors','Color Patterns'],['showColorsL2','Color Patterns L2'],['showDoesntBelong','Doesn\'t Belong'],['showJora','Find Jora'],['showConnectDots','Connect Dots']],
        [['showUrduReading','Urdu Reading'],['showUrduTrace','Urdu Trace'],['showUrdu2Letter','Urdu 2-Letter Words'],['showUrduWhatNext','Urdu What Next']],
        [['showArabicQaida','Arabic Qaida']]
    ];

    worksheetQueue = [];
    sections.forEach(section => {
        const available = section.filter(([fn, type]) => !doneTypes.includes(type));
        const shuffled = available.sort(() => Math.random() - 0.5);
        worksheetQueue.push(...shuffled.slice(0, 2));
    });

    // Shuffle and cap at limit
    worksheetQueue = worksheetQueue.sort(() => Math.random() - 0.5);
    const remaining = wsLimit - todayProgress.length;
    worksheetQueue = worksheetQueue.slice(0, remaining);
    queueIndex = 0;

    if (worksheetQueue.length === 0) { showMenu(); return; }
    nextWorksheet();
}

function nextWorksheet() {
    const today = getToday();
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    const wsLimit = parseInt(localStorage.getItem('worksheetLimit') || '10');
    if (todayProgress.length >= wsLimit || queueIndex >= worksheetQueue.length) {
        speak('All done! Great job!');
        showMenu();
        return;
    }
    const [fn, type] = worksheetQueue[queueIndex];
    queueIndex++;
    window[fn]();
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
