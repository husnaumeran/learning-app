// ============ Bigger/Smaller ============
function showBiggerSmaller() {
    const focus = CONFIG.focusNumber;
    const problems = [];
    for (let i = 0; i < 5; i++) {
        let other;
        do { other = Math.floor(Math.random() * focus) + 1; } while (other === focus);
        const askBigger = Math.random() > 0.5;
        problems.push([focus, other, askBigger ? 'BIGGER' : 'SMALLER']);
    }
    problems.sort(() => Math.random() - 0.5);
    let current = 0, score = 0;

    function render() {
        if (current >= problems.length) { completeWorksheet('Bigger/Smaller', score, problems.length); return; }
        const [a, b, type] = problems[current];
        const swapped = Math.random() > 0.5;
        const left = swapped ? b : a;
        const right = swapped ? a : b;
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Which is '+type+'?</div>';
        html += '<div style="display:flex;justify-content:center;gap:30px;margin:30px 0">';
        html += '<button style="padding:30px 50px;font-size:48px;border-radius:15px;background:#4169E1;color:white;border:none" onclick="pickSize(\'left\','+left+','+right+',\''+type+'\')">'+left+'</button>';
        html += '<button style="padding:30px 50px;font-size:48px;border-radius:15px;background:#FF6B35;color:white;border:none" onclick="pickSize(\'right\','+left+','+right+',\''+type+'\')">'+right+'</button>';
        html += '</div><div class="score">'+(current+1)+' / '+problems.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.pickSize = (choice, left, right, type) => {
        const correct = type === 'BIGGER' ? (choice === 'left' ? left > right : right > left) : (choice === 'left' ? left < right : right < left);
        currentAnswers.push({q: type+': '+left+' vs '+right, a: choice, correct: correct});
        showFeedback(correct, () => { if(correct) score++; current++; render(); });
    };
    render();
}