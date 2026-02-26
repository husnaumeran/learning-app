// ============ COLOR PATTERNS L2 ============
function showColorsL2() {
    const problems = generateColorPatternsL2();
    let current = 0, score = 0, selectedColor = null;
    const solved = new Set();

    function render() {
        const p = problems[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title">Color Patterns L2! 🎨</div>';
        html += '<div class="inst">'+(p.type==='next' ? 'What color comes next?' : 'Which color fills the blank?')+'</div>';

        // Progress dots
        html += '<div style="text-align:center;margin:10px 0">';
        problems.forEach((_, i) => {
            const color = solved.has(i) ? '#00CC66' : (i === current ? '#FF6B35' : '#555');
            html += '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:'+color+';margin:2px"></span>';
        });
        html += '</div>';

        // Pattern display
        html += '<div style="display:flex;justify-content:center;align-items:center;gap:8px;margin:15px 5px;flex-wrap:wrap">';
        p.seq.forEach((c, i) => {
            if (c === null) {
                html += '<div style="width:45px;height:45px;border-radius:50%;background:#444;border:3px dashed #888;display:flex;align-items:center;justify-content:center;font-size:24px;color:#888">?</div>';
            } else {
                html += '<div class="circle" style="width:45px;height:45px;border-radius:50%;background:'+CONFIG.colors[c]+'"></div>';
            }
        });
        if (p.type === 'next') {
            html += '<div style="width:45px;height:45px;border-radius:50%;background:#444;border:3px dashed #888;display:flex;align-items:center;justify-content:center;font-size:24px;color:#888">?</div>';
        }
        html += '</div>';

        // Color palette
        html += '<div style="display:flex;justify-content:center;gap:15px;margin:20px 0">';
        Object.entries(CONFIG.colors).forEach(([name, hex]) => {
            const sel = selectedColor === name ? 'transform:scale(1.3);border:3px solid white;box-shadow:0 0 15px '+hex : '';
            html += '<div style="width:55px;height:55px;border-radius:50%;background:'+hex+';cursor:pointer;'+sel+'" onclick="tapColorL2(\''+name+'\')"></div>';
        });
        html += '</div>';

        html += '<button class="btn green" style="margin:10px auto;display:block;font-size:20px;padding:15px 40px" onclick="checkColorL2()">Check ✓</button>';
        html += '</div>';
        html += '<div class="score">⭐ '+score+' / '+problems.length+'</div>';
        document.getElementById('app').innerHTML = html;
    }

    window.tapColorL2 = (color) => {
        selectedColor = color;
        render();
    };

    window.checkColorL2 = () => {
        if (!selectedColor || solved.has(current)) return;
        const p = problems[current];
        const correct = selectedColor === p.ans;
        currentAnswers.push({q: 'patternL2_'+current, a: selectedColor, correct: correct});
        if (correct) {
            solved.add(current);
            score++;
            showFeedback(true, () => {
                speak('Great job!');
                if (score === problems.length) { completeWorksheet('Color Patterns L2', score, problems.length); return; }
                for (let i = 0; i < problems.length; i++) if (!solved.has(i)) { current = i; break; }
                selectedColor = null;
                render();
            });
        } else {
            showFeedback(false, () => {
                speak('Try again!');
                selectedColor = null;
                render();
            });
        }
    };

    render();
}
