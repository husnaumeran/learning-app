// ============ ADDITION ============
function showAddition() {
    const problems = generateAdditionProblems(getFocusNumber('addition'));
    let current = 0, score = 0;
    let attemptCount = 0;
    let questionStartMs = null;
    let currentAnswer = '';

    function render() {
        if (current >= problems.length) { completeWorksheet('Addition', score, problems.length); return; }
        const [a, b, ans] = problems[current];
        attemptCount = 0;
        currentAnswer = '';
        let html = '<button class="back" onclick="showMenu()">\u2190 Back</button><div class="card"><div class="title">Addition!</div>';
        html += '<div style="text-align:center;font-size:48px;margin:20px;color:#333">' + a + ' <span style="color:#FF6B35">+</span> ' + b + ' <span style="color:#FF6B35">=</span> <span id="ansBox" style="display:inline-block;min-width:50px;border-bottom:3px solid #FFD700;color:#FFD700">?</span></div>';
        html += '</div><div class="keypad">';
        for (let n = 0; n <= 9; n++) html += '<button class="key" onclick="pressKey(' + n + ')">' + n + '</button>';
        html += '<button class="key red" onclick="clearKey()">\u2715</button><button class="key green" onclick="checkKey()">\u2713</button></div>';
        html += '<div class="score">\u2B50 ' + score + ' / ' + problems.length + '  (' + (current + 1) + '/' + problems.length + ')</div>';
        document.getElementById('app').innerHTML = html;
        questionStartMs = Date.now();
    }

    window.pressKey = (n) => { currentAnswer = String(n); document.getElementById('ansBox').textContent = n; };
    window.clearKey = () => { currentAnswer = ''; document.getElementById('ansBox').textContent = '?'; };
    window.checkKey = async () => {
        if (currentAnswer === '') return;
        const responseTimeMs = Date.now() - questionStartMs;
        attemptCount++;
        const [a, b, ans] = problems[current];
        const correct = parseInt(currentAnswer) === ans;
        currentAnswers.push({q: a + '+' + b, answer: currentAnswer, correctAnswer: String(ans), correct: correct, firstTry: attemptCount === 1});

        // Disable keypad immediately
        document.querySelectorAll('.key').forEach(k => { k.onclick = null; k.style.pointerEvents = 'none'; k.style.opacity = '0.5'; });

        recordResponse('addition', {type: 'addition', a: a, b: b, sum: ans}, String(ans), currentAnswer, correct, attemptCount === 1, attemptCount, responseTimeMs, current);

        if (correct) {
            score++;
            showFeedback(true, () => { current++; render(); });
        } else {
            const explanation = a + ' + ' + b + ' = ' + ans + ', not ' + currentAnswer;
            const title = document.querySelector('.title');
            if (title) { title.innerHTML = '❌ ' + explanation; title.style.color = '#ef4444'; }
            await speak(explanation);
            current++; render();
        }
    };
    render();
}
