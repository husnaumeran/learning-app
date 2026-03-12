// ============ COUNTING ============
function showCounting() {
    const problems = generateCountingProblems(getDifficultyLevel('counting'), getQuestionCount('counting'));
    let current = -1, score = 0;
    const solved = new Set();
    const answers = {};
    let questionStartMs = null;

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

    window.openKeypad = (i) => { if (!solved.has(i)) { current = i; questionStartMs = Date.now(); document.getElementById('overlay').style.display='block'; document.getElementById('popup').style.display='block'; } };
    window.closeKeypad = () => { document.getElementById('overlay').style.display='none'; document.getElementById('popup').style.display='none'; };
    window.submitAnswer = async (n) => {
        if (current < 0) return;
        const responseTimeMs = Date.now() - questionStartMs;
        answers[current] = n;
        const [ans, emoji] = problems[current];
        const correct = n === ans;
        currentAnswers.push({q: emoji, answer: n, correct: correct});
        closeKeypad();

        // Disable all problem boxes
        document.querySelectorAll('.prob').forEach(p => { p.onclick = null; p.style.pointerEvents = 'none'; });

        recordResponse('counting', {type:'counting', emoji: emoji, correct_answer: ans}, String(ans), String(n), correct, true, 1, responseTimeMs, current);

        if (correct) {
            solved.add(current);
            score++;
            showFeedback(true, () => {
                current = -1;
                if (score === problems.length) { completeWorksheet('Counting', score, problems.length); return; }
                render();
            });
        } else {
            const explanation = 'There are ' + ans + ' ' + emoji + ', not ' + n;
            const title = document.querySelector('.title');
            if (title) { title.innerHTML = '❌ ' + explanation; title.style.color = '#ef4444'; }
            await speak(explanation);
            current = -1;
            render();
        }
    };
    render();
}
