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
            ['showNumbersArabic','Arabic Numbers 🔊','Numbers Arabic']
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

    html += '<button class="btn" onclick="showHowToUse()">📋 How to Use</button>';
    html += '<button class="btn" onclick="showExport()">📊 View Progress</button>';
    html += '<button class="btn" onclick="resetProgress()">🔄 Reset Progress</button>';
    document.getElementById('app').innerHTML = html;
}

function startDaily() {
    const today = getToday();
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    const wsLimit = parseInt(localStorage.getItem('worksheetLimit') || '10');
    const doneTypes = todayProgress.map(p => p.type);

    const sections = [
        [['showAddition','Addition'],['showSubtraction','Subtraction'],['showCounting','Counting'],['showMatchNumbers','Match Numbers'],['showMoreLess','More/Less'],['showBiggerSmaller','Bigger/Smaller'],['showWhatNext','What Comes Next'],['showNumbersEnglish','Numbers English']],
        [['showTwoLetter','2-Letter Words'],['showThreeLetter','3-Letter Words'],['showTraceABC','Trace ABC'],['showTraceLower','Trace abc'],['showTraceNumbers','Trace Numbers']],
        [['showColors','Color Patterns'],['showColorsL2','Color Patterns L2'],['showDoesntBelong','Doesn\'t Belong'],['showJora','Find Pairs'],['showConnectDots','Connect Dots'],['showFigureMatrices','Figure Matrices'],['showVerbalAnalogies','Verbal Analogies']],
        [['showUrduReading','Urdu Reading'],['showUrduTrace','Urdu Trace'],['showUrdu2Letter','Urdu 2-Letter Words'],['showUrduWhatNext','Urdu What Next'],['showNumbersUrdu','Numbers Urdu']],
        [['showArabicQaida','Arabic Qaida'],['showNumbersArabic','Numbers Arabic']]
    ];

    worksheetQueue = [];
    const remaining = wsLimit - todayProgress.length;

    // First pass: 2 per section
    const leftovers = [];
    sections.forEach(section => {
        const available = section.filter(([fn, type]) => !doneTypes.includes(type));
        const shuffled = available.sort(() => Math.random() - 0.5);
        worksheetQueue.push(...shuffled.slice(0, 2));
        leftovers.push(...shuffled.slice(2));
    });

    // Fill up to limit from leftovers
    if (worksheetQueue.length < remaining && leftovers.length > 0) {
        const extra = leftovers.sort(() => Math.random() - 0.5).slice(0, remaining - worksheetQueue.length);
        worksheetQueue.push(...extra);
    }

    // Shuffle and cap at limit
    worksheetQueue = worksheetQueue.sort(() => Math.random() - 0.5).slice(0, remaining);
    queueIndex = 0;

    if (worksheetQueue.length === 0) { showMenu(); return; }
    nextWorksheet();
}

function nextWorksheet() {
    const today = getToday();
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    const wsLimit = parseInt(localStorage.getItem('worksheetLimit') || '10');
    if (todayProgress.length >= wsLimit || queueIndex >= worksheetQueue.length) {
        
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
    html += '<p style="color:#00CC66;text-align:center;margin-top:15px;font-size:14px">Made with ❤️ for Aliza</p>';
    html += '</div></div>';
    document.getElementById('app').innerHTML = html;
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
