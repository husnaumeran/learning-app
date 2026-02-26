// ============ URDU WHAT COMES NEXT ============
function showUrduWhatNext() {
    const focus = Math.min(CONFIG.focusNumber, URDU_LETTERS.length);
    const letters = URDU_LETTERS.slice(0, focus);
    const problems = [];

    // Generate sequence problems
    for (let i = 0; i <= focus - 5; i += 2) {
        const seq = letters.slice(i, i+4).map(l => l.letter);
        const ans = letters[i+4].letter;
        problems.push({seq: seq, ans: ans});
    }
    // Add a reverse sequence
    if (focus >= 5) {
        const start = Math.min(focus-1, URDU_LETTERS.length-1);
        const seq = [];
        for (let i = start; i > start-4 && i >= 0; i--) seq.push(URDU_LETTERS[i].letter);
        if (start-4 >= 0) problems.push({seq: seq, ans: URDU_LETTERS[start-4].letter});
    }

    let current = 0, score = 0;

    function render() {
        if (current >= problems.length) { completeWorksheet('Urdu What Next', score, problems.length); return; }
        const p = problems[current];
        // Generate options: correct + 3 random wrong
        const wrongLetters = URDU_LETTERS.filter(l => l.letter !== p.ans).sort(() => Math.random()-0.5).slice(0,3).map(l => l.letter);
        const options = [p.ans, ...wrongLetters].sort(() => Math.random()-0.5);

        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl">What Comes Next?</div>';
        html += '<div style="display:flex;justify-content:center;gap:12px;margin:20px;direction:rtl;flex-wrap:wrap">';
        p.seq.forEach(l => { html += '<div style="font-size:40px;font-family:serif;padding:10px 15px;background:#333;border-radius:10px;color:white">'+l+'</div>'; });
        html += '<div style="font-size:40px;padding:10px 15px;background:#444;border-radius:10px;color:#FF6B35;font-weight:bold">?</div>';
        html += '</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:15px">';
        options.forEach(o => {
            html += '<div style="font-size:36px;font-family:serif;text-align:center;padding:15px;background:#333;border-radius:12px;cursor:pointer;color:white;direction:rtl" onclick="pickUrduNext(\''+o+'\')">'+o+'</div>';
        });
        html += '</div>';
        html += '<div class="score">⭐ '+score+' / '+problems.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.pickUrduNext = (choice) => {
        const correct = choice === problems[current].ans;
        currentAnswers.push({q: problems[current].seq.join('→')+'→?', a: choice, correct: correct});
        const boxes = document.querySelectorAll('.card div[onclick]');
        boxes.forEach(b => {
            if (b.textContent.trim() === problems[current].ans) b.style.background = '#22c55e';
            else if (b.textContent.trim() === choice && !correct) b.style.background = '#ef4444';
        });
        showFeedback(correct, () => { if (correct) score++; current++; render(); });
    };
    render();
}
