// ============ URDU WHAT COMES NEXT ============
function showUrduWhatNext() {
    const letters = URDU_LETTERS;
    const problems = [];
    for (let i = 0; i < getFocusNumber('urdu_what_next') && i < letters.length - 4; i++) {
        const start = Math.floor(Math.random() * (letters.length - 4));
        const seq = letters.slice(start, start+3);
        const ans = letters[start+3];
        const choices = [ans];
        while(choices.length < 4) {
            const r = letters[Math.floor(Math.random()*letters.length)];
            if (!choices.includes(r)) choices.push(r);
        }
        problems.push({seq, ans, choices: choices.sort(() => Math.random()-0.5)});
    }
    let current = 0, score = 0;
    let questionStartMs = null;

    function render() {
        if (current >= problems.length) { completeWorksheet('Urdu What Next', score, problems.length); return; }
        const p = problems[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl">اردو What Comes Next?</div>';
        html += '<div style="display:flex;justify-content:center;gap:15px;margin:20px 0;direction:rtl">';
        p.seq.forEach(l => html += '<div style="font-size:48px;font-family:serif;padding:10px 15px;background:#333;border-radius:10px;color:white">'+l.letter+'</div>');
        html += '<div style="font-size:48px;padding:10px 15px;background:#ffd700;border-radius:10px;color:#333;font-weight:bold">?</div>';
        html += '</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:15px 0">';
        p.choices.forEach(ch => {
            html += '<div class="prob" style="font-size:40px;font-family:serif;justify-content:center;cursor:pointer;direction:rtl" onclick="pickUrduNext(\''+ch.letter+'\')">'+ch.letter+'</div>';
        });
        html += '</div>';
        html += '<div class="score">'+(current+1)+' / '+problems.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
        questionStartMs = Date.now();
    }

    window.pickUrduNext = (choice) => {
        const responseTimeMs = Date.now() - questionStartMs;
        const correct = choice === problems[current].ans.letter;
        currentAnswers.push({q: problems[current].seq.map(l=>l.letter).join('→')+'→?', answer: choice, correct: correct});
        const boxes = document.querySelectorAll('.card div[onclick]');
        boxes.forEach(b => {
            if (b.textContent === problems[current].ans.letter) b.style.background = '#22c55e';
            else if (b.textContent === choice && !correct) b.style.background = '#ef4444';
        });

        recordResponse('urdu_what_next', {type:'urdu_what_next', sequence:problems[current].seq.map(l=>l.letter), correct_answer:problems[current].ans.letter}, problems[current].ans.letter, choice, correct, true, 1, responseTimeMs, current);

        showFeedback(correct, () => { if (correct) score++; current++; render(); });
    };
    render();
}
