// ============ COUNTING ============
function showCounting() {
    const problems = generateCountingProblems(CONFIG.focusNumber);
    let current = -1, score = 0;
    const solved = new Set();
    const answers = {};

    function render() {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Count Them!</div>';
        problems.forEach(([ans, emoji], i) => {
            const cls = solved.has(i) ? 'prob done' : 'prob';
            html += '<div class="'+cls+'"><span style="font-size:40px">'+emoji+'</span><span class="ansbox" id="ans'+i+'" onclick="openKeypad('+i+')">'+(answers[i] || '')+'</span>'+(solved.has(i)?'✅':'')+'</div>';
        });
        html += '</div><div class="score">⭐ '+score+' / '+problems.length+'</div>';
        html += '<div class="overlay" id="overlay" onclick="closeKeypad()"></div>';
        html += '<div class="popup" id="popup" onclick="event.stopPropagation()"><div class="keypad">';
        for (let n = 0; n <= 9; n++) html += '<button class="key big" onclick="submitAnswer('+n+')">'+n+'</button>';
        html += '</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.openKeypad = (i) => { if (!solved.has(i)) { current = i; document.getElementById('overlay').style.display='block'; document.getElementById('popup').style.display='block'; } };
    window.closeKeypad = () => { document.getElementById('overlay').style.display='none'; document.getElementById('popup').style.display='none'; };
    window.submitAnswer = (n) => {
        if (current < 0) return;
        answers[current] = n;
        const correct = n === problems[current][0];
        currentAnswers.push({q: problems[current][1], a: n, correct: correct});
        closeKeypad();
        showFeedback(correct, () => {
            if (correct) { solved.add(current); score++; }
            current = -1;
            if (score === problems.length) { completeWorksheet('Counting', score, problems.length); return; }
            render();
        });
    };
    render();
}