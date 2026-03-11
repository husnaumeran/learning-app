// ============  What Comes Next ============
function showWhatNext() {
    const focus = getFocusNumber('what_comes_next_numbers');
    const problems = [
        [[1,2,3,4], 5],
        [[2,4,6,8], 10],
        [['A','B','C','D'], 'E'],
        [[focus-4,focus-3,focus-2,focus-1], focus],
        [[focus,focus-1,focus-2,focus-3], focus-4]
    ];
    let current = 0, score = 0;
    let questionStartMs = null;

    function render() {
        if (current >= problems.length) { completeWorksheet('What Comes Next', score, problems.length); return; }
        const [seq, ans] = problems[current];
        const options = [ans, ans+1, ans-1, ans+2].filter(x => x !== ans).slice(0,3).concat(ans).sort(() => Math.random()-0.5);
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">What Comes Next?</div>';
        html += '<div class="prob" style="justify-content:center;font-size:32px;gap:10px">'+seq.join(' → ')+' → <span style="color:#FF6B35;font-weight:bold">?</span></div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px">';
        options.forEach(o => html += '<div class="prob" style="justify-content:center;font-size:32px;cursor:pointer" onclick="pickNext(\''+o+'\')">'+o+'</div>');
        html += '</div><div class="score">'+(current+1)+' / '+problems.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
        questionStartMs = Date.now();
    }

    window.pickNext = async (choice) => {
        const responseTimeMs = Date.now() - questionStartMs;
        const [seq, ans] = problems[current];
        const correct = String(choice) === String(ans);
        currentAnswers.push({q: seq.join('→')+'→?', answer: choice, correct: correct});

        // Disable all option boxes immediately
        const boxes = document.querySelectorAll('.card .prob');
        boxes.forEach(b => { b.onclick = null; b.style.pointerEvents = 'none'; });

        // Highlight correct/wrong
        boxes.forEach(b => {
            if (b.textContent == ans) b.style.background = '#22c55e';
            else if (b.textContent == choice && !correct) b.style.background = '#ef4444';
        });

        recordResponse('what_comes_next_numbers', {type:'what_comes_next', sequence: seq, correct_answer: ans}, String(ans), String(choice), correct, true, 1, responseTimeMs, current);

        if (correct) {
            score++;
            showFeedback(true, () => { current++; render(); });
        } else {
            const explanation = 'After ' + seq.join(', ') + ' comes ' + ans;
            const title = document.querySelector('.title');
            if (title) { title.innerHTML = '❌ ' + explanation; title.style.color = '#ef4444'; }
            await speak(explanation);
            current++; render();
        }
    };
    render();
}
