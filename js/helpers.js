// ============ HELPER FUNCTIONS ============
function generateAdditionProblems(target) {
    const problems = [];
    for (let a = 0; a <= target; a++) {
        problems.push([a, target - a, target]);
    }
    return problems;
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
        const b = Math.floor(Math.random() * focusNum) + 1;
        problems.push({a: focusNum + b, b: b, ans: focusNum, mode: i % 2 === 0 ? 'visual' : 'equation', emoji: pickEmoji()});
    }

    // Rest are random easier subtractions
    for (let i = numFocusAnswer; i < numProblems; i++) {
        const ans = Math.floor(Math.random() * focusNum);
        const b = Math.floor(Math.random() * focusNum) + 1;
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
    for (let i = 0; i < 5; i++) {
        const cat = catNames[Math.floor(Math.random() * catNames.length)];
        const emoji = CONFIG.categories[cat][Math.floor(Math.random() * CONFIG.categories[cat].length)];
        const count = Math.floor(Math.random() * maxNum) + 1;
        problems.push([count, emoji.repeat(count)]);
    }
    return problems;
}

function generateMatchPairs(maxNum) {
    const catNames = Object.keys(CONFIG.categories);
    const pairs = [];
    for (let i = 1; i <= CONFIG.focusNumber && i <= 5; i++) {
        const cat = catNames[Math.floor(Math.random() * catNames.length)];
        const emoji = CONFIG.categories[cat][Math.floor(Math.random() * CONFIG.categories[cat].length)];
        pairs.push([i, emoji.repeat(i)]);
    }
    return pairs;
}

function generateMoreLessProblems(focusNum) {
    const problems = [];
    const catNames = Object.keys(CONFIG.categories);
    const cat = catNames[Math.floor(Math.random() * catNames.length)];
    const emoji = CONFIG.categories[cat][Math.floor(Math.random() * CONFIG.categories[cat].length)];

    const otherNums = [1, 2, 3, 4, 5].filter(n => n !== focusNum);
    otherNums.forEach(n => {
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
    });
    return problems.sort(() => Math.random() - 0.5);
}


function generateColorPatternsL2() {
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

    return shuffle(problems);
}

function generateColorPatterns() {
    const colorNames = Object.keys(CONFIG.colors);
    const patterns = [
        [[colorNames[0], colorNames[1], colorNames[0], colorNames[1], colorNames[0]], colorNames[1]],
        [[colorNames[2], colorNames[2], colorNames[3], colorNames[2], colorNames[2]], colorNames[3]],
        [[colorNames[0], colorNames[1], colorNames[2], colorNames[0], colorNames[1]], colorNames[2]],
        [[colorNames[1], colorNames[0], colorNames[0], colorNames[1], colorNames[0]], colorNames[0]]
    ];
    return patterns;
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

function showFeedback(correct, callback) {
    const title = document.querySelector('.title');
    if (correct) {
        title.innerHTML = '⭐ Correct! ⭐';
        title.style.color = '#22c55e';
    } else {
        title.innerHTML = '❌ Try again next time!';
        title.style.color = '#ef4444';
        document.querySelector('.card').style.animation = 'shake 0.5s';
    }
    setTimeout(callback, correct ? 800 : 1000);
}


function speakUrdu(text) {
    return new Promise(resolve => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ur-PK';
        utterance.rate = 0.7;
        const voices = speechSynthesis.getVoices();
        const urduVoice = voices.find(v => v.lang.startsWith('ur'));
        if (urduVoice) utterance.voice = urduVoice;
        utterance.onend = resolve;
        speechSynthesis.speak(utterance);
    });
}

function speak(text) {
    return new Promise(resolve => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        const voices = speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Karen'));
        if (femaleVoice) utterance.voice = femaleVoice;
        utterance.onend = resolve;
        speechSynthesis.speak(utterance);
    });
}

function completeWorksheet(type, score, total) {
    const today = getToday();
    const todayProgress = JSON.parse(localStorage.getItem('daily_'+today) || '[]');
    todayProgress.push({type: type, score: score+'/'+total, answers: currentAnswers, time: new Date().toISOString()});
    localStorage.setItem('daily_'+today, JSON.stringify(todayProgress));
    currentAnswers = [];

    const current = parseInt(localStorage.getItem('currentWorksheet') || '0');
    localStorage.setItem('currentWorksheet', String(current + 1));

    setTimeout(nextWorksheet, 1500);
}
