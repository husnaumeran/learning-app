// ============ ADDITION ============
function showAddition() {
    const problems = generateAdditionProblems(CONFIG.focusNumber);
    let current = 0, score = 0;
    const solved = new Set();
    const answers = {};

    function render() {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Ways to Make '+CONFIG.focusNumber+'!</div>';
        problems.forEach(([a, b, ans], i) => {
            const cls = solved.has(i) ? 'problem solved' : (i === current ? 'problem active' : 'problem');
            html += '<div class="'+cls+'" onclick="setCurrent('+i+')"><span>'+a+'</span><span style="color:#FF6B35">+</span><span>'+b+'</span><span style="color:#FF6B35">=</span><span class="answer-box" id="ans'+i+'">'+(answers[i] || '?')+'</span><span>'+(solved.has(i)?'✅':'')+'</span></div>';
        });
        html += '</div><div class="keypad">';
        for (let n = 0; n <= 9; n++) html += '<button class="key" onclick="pressKey('+n+')">'+n+'</button>';
        html += '<button class="key red" onclick="clearKey()">✕</button><button class="key green" onclick="checkKey()">✓</button></div>';
        html += '<div class="score">⭐ '+score+' / '+problems.length+'</div>';
        document.getElementById('app').innerHTML = html;
    }

    window.setCurrent = (i) => { if (!solved.has(i)) { current = i; render(); } };
    window.pressKey = (n) => { if (!solved.has(current)) { answers[current] = n;
    document.getElementById('ans'+current).textContent = n; } };
    window.clearKey = () => { document.getElementById('ans'+current).textContent = '?'; };
    window.checkKey = () => {
        const ans = document.getElementById('ans'+current).textContent;
        if (ans === '?' || solved.has(current)) return;
        const correct = parseInt(ans) === problems[current][2];
        currentAnswers.push({q: problems[current][0]+'+'+problems[current][1], a: ans, correct: correct});
        showFeedback(correct, () => {
            if (correct) {
                solved.add(current);
                score++;
                if (score === problems.length) { completeWorksheet('Addition', score, problems.length); return; }
                else { for (let i = 0; i < problems.length; i++) if (!solved.has(i)) { current = i; break; } }
                render();
            } else {
                document.querySelector('.title').innerHTML = 'Ways to Make '+CONFIG.focusNumber+'!';
                document.querySelector('.title').style.color = '#FF6B35';
            }
        });
    };
    render();
}