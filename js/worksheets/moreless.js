// ============ MORE/LESS ============
function showMoreLess() {
    const questions = generateMoreLessProblems(CONFIG.focusNumber);
    let current = 0, score = 0;

    function render() {
        if (current >= questions.length) { completeWorksheet('More/Less', score, questions.length); return; }
        const [a, b, type, ans] = questions[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Which has '+type+'?</div>';
        html += '<div style="display:flex;justify-content:center;gap:20px;margin:30px 0">';
        html += '<div class="prob" style="font-size:32px;padding:20px;cursor:pointer" onclick="pickMore(\'left\')">'+a+'</div>';
        html += '<div class="prob" style="font-size:32px;padding:20px;cursor:pointer" onclick="pickMore(\'right\')">'+b+'</div>';
        html += '</div><div class="score">'+(current+1)+' / '+questions.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.pickMore = (choice) => {
        const correct = choice === questions[current][3];
        const correctSide = questions[current][3];
        currentAnswers.push({q: questions[current][2]+': '+questions[current][0]+' vs '+questions[current][1], a: choice, correct: correct});
        const leftEl = document.querySelectorAll('.prob')[0];
        const rightEl = document.querySelectorAll('.prob')[1];

        if (correctSide === 'left') { leftEl.style.background = '#22c55e'; rightEl.style.background = '#ef4444'; }
        else { rightEl.style.background = '#22c55e'; leftEl.style.background = '#ef4444'; }

        showFeedback(correct, () => {
            if (correct) score++;
            current++;
            render();
        });
    };
    render();
}