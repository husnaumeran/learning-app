// ============ SUBTRACTION ============
function showSubtraction() {
    const problems = generateSubtractionProblems(CONFIG.focusNumber);
    let current = 0, score = 0;
    const solved = new Set();
    const answers = {};

    function render() {
        const p = problems[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Subtraction! ➖</div>';

        // Progress dots
        html += '<div style="text-align:center;margin:10px 0">';
        problems.forEach((_, i) => {
            const color = solved.has(i) ? '#00CC66' : (i === current ? '#FF6B35' : '#555');
            html += '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:'+color+';margin:3px"></span>';
        });
        html += '</div>';

        if (p.mode === 'visual') {
            // Show equation above emojis
            html += '<div style="text-align:center;font-size:36px;margin:10px;color:#333">';
            html += p.a+' <span style="color:#FF6B35">−</span> '+p.b+' <span style="color:#FF6B35">=</span> <span style="color:#FF6B35">?</span></div>';
            // Visual: show emojis, cross out some
            html += '<div style="text-align:center;font-size:32px;line-height:1.8;margin:15px 5px">';
            for (let i = 0; i < p.a; i++) {
                if (i >= p.a - p.b) {
                    html += '<span style="opacity:0.25;position:relative;display:inline-block">'+p.emoji+'<span style="position:absolute;top:-2px;left:0;font-size:28px;color:red">✕</span></span> ';
                } else {
                    html += '<span>'+p.emoji+'</span> ';
                }
            }
            html += '</div>';
            html += '<div style="text-align:center;font-size:22px;color:white;margin:5px">How many are left?</div>';
        } else {
            // Equation mode
            html += '<div style="text-align:center;font-size:48px;margin:20px;color:#333">';
            html += p.a+' <span style="color:#FF6B35">−</span> '+p.b+' <span style="color:#FF6B35">=</span> ';
            html += '<span class="answer-box" id="ansBox">'+(answers[current]!=null ? answers[current] : '?')+'</span></div>';
        }

        // Answer box for visual mode
        if (p.mode === 'visual') {
            html += '<div style="text-align:center;font-size:48px;margin:5px;color:#333">';
            html += '<span class="answer-box" id="ansBox">'+(answers[current]!=null ? answers[current] : '?')+'</span></div>';
        }

        html += '</div><div class="keypad">';
        for (let n = 0; n <= 9; n++) html += '<button class="key" onclick="pressKey('+n+')">'+n+'</button>';
        html += '<button class="key red" onclick="clearKey()">✕</button><button class="key green" onclick="checkKey()">✓</button></div>';
        html += '<div class="score">⭐ '+score+' / '+problems.length+'</div>';
        document.getElementById('app').innerHTML = html;
    }

    window.pressKey = (n) => {
        if (solved.has(current)) return;
        answers[current] = n;
        document.getElementById('ansBox').textContent = n;
    };
    window.clearKey = () => {
        if (solved.has(current)) return;
        answers[current] = null;
        document.getElementById('ansBox').textContent = '?';
    };
    window.checkKey = () => {
        const ans = document.getElementById('ansBox').textContent;
        if (ans === '?' || solved.has(current)) return;
        const p = problems[current];
        const correct = parseInt(ans) === p.ans;
        currentAnswers.push({q: p.a+'−'+p.b, a: ans, correct: correct});
        showFeedback(correct, () => {
            if (correct) {
                solved.add(current);
                score++;
                speak(p.ans + '! Great job!');
                if (score === problems.length) { completeWorksheet('Subtraction', score, problems.length); return; }
                for (let i = 0; i < problems.length; i++) if (!solved.has(i)) { current = i; break; }
                render();
            } else {
                speak('Try again!');
                render();
            }
        });
    };
    render();
}
