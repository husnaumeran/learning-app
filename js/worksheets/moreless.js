// ============ MORE/LESS ============
function showMoreLess() {
    const questions = generateMoreLessProblems(getFocusNumber('more_less'));
    let current = 0, score = 0;
    let questionStartMs = null;

    function render() {
        if (current >= questions.length) { completeWorksheet('More/Less', score, questions.length); return; }
        const [a, b, type, ans] = questions[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Which has '+type+'?</div>';
        html += '<div style="display:flex;justify-content:center;gap:20px;margin:30px 0">';
        html += '<div class="prob" style="font-size:32px;padding:20px;cursor:pointer" onclick="pickMore(\'left\')">'+a+'</div>';
        html += '<div class="prob" style="font-size:32px;padding:20px;cursor:pointer" onclick="pickMore(\'right\')">'+b+'</div>';
        html += '</div><div class="score">'+(current+1)+' / '+questions.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
        questionStartMs = Date.now();
    }

    window.pickMore = async (choice) => {
        const responseTimeMs = Date.now() - questionStartMs;
        const [a, b, type, correctSide] = questions[current];
        const correct = choice === correctSide;
        currentAnswers.push({q: type+': '+a+' vs '+b, answer: choice, correct: correct});

        // Disable both boxes immediately
        const boxes = document.querySelectorAll('.prob');
        boxes.forEach(box => { box.onclick = null; box.style.pointerEvents = 'none'; });

        const leftEl = boxes[0], rightEl = boxes[1];
        if (correctSide === 'left') { leftEl.style.background = '#22c55e'; rightEl.style.background = '#ef4444'; }
        else { rightEl.style.background = '#22c55e'; leftEl.style.background = '#ef4444'; }

        recordResponse('more_less', {type:'more_less', left:a, right:b, question_type:type}, correctSide, choice, correct, true, 1, responseTimeMs, current);

        if (correct) {
            score++;
            showFeedback(true, () => { current++; render(); });
        } else {
            const correctVal = correctSide === 'left' ? a : b;
            const wrongVal = correctSide === 'left' ? b : a;
            const explanation = correctVal + ' has ' + type + ' than ' + wrongVal;
            const title = document.querySelector('.title');
            if (title) { title.innerHTML = '❌ ' + explanation; title.style.color = '#ef4444'; }
            await speak(explanation);
            current++; render();
        }
    };
    render();
}
