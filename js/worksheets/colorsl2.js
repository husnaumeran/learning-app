// ============ COLOR PATTERNS L2 ============
function showColorsL2() {
    const problems = generateColorPatternsL2(getFocusNumber('color_patterns_l2'));
    let current = 0, score = 0;
    let showPalette = false;
    const attemptCounts = {};
    let questionStartMs = null;

    function render() {
        const p = problems[current];
        let html = '<button class="back" onclick="showMenu()">\u2190 Back</button><div class="card">';
        html += '<div class="title">Color Patterns L2! \uD83C\uDFA8</div>';
        html += '<div class="inst">'+(p.type==='next' ? 'What color comes next?' : 'Which color fills the blank?')+'</div>';

        // Progress dots
        html += '<div style="text-align:center;margin:10px 0">';
        problems.forEach((_, i) => {
            const color = i < current ? '#00CC66' : (i === current ? '#FF6B35' : '#555');
            html += '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:'+color+';margin:2px"></span>';
        });
        html += '</div>';

        // Pattern display
        html += '<div style="display:flex;justify-content:center;align-items:center;gap:8px;margin:15px 5px;flex-wrap:wrap">';
        p.seq.forEach((c, i) => {
            if (c === null) {
                html += '<div onclick="openPaletteL2()" style="width:45px;height:45px;border-radius:50%;background:#444;border:3px dashed #FFD700;display:flex;align-items:center;justify-content:center;font-size:24px;color:#FFD700;cursor:pointer;animation:pulse 1.5s infinite">?</div>';
            } else {
                html += '<div style="width:45px;height:45px;border-radius:50%;background:'+CONFIG.colors[c]+'"></div>';
            }
        });
        if (p.type === 'next') {
            html += '<div onclick="openPaletteL2()" style="width:45px;height:45px;border-radius:50%;background:#444;border:3px dashed #FFD700;display:flex;align-items:center;justify-content:center;font-size:24px;color:#FFD700;cursor:pointer;animation:pulse 1.5s infinite">?</div>';
        }
        html += '</div>';

        // Popup palette (only when tapped)
        if (showPalette) {
            html += '<div style="background:rgba(0,0,0,0.7);border-radius:15px;padding:20px;margin:15px 0;text-align:center">';
            html += '<div style="color:white;font-size:16px;margin-bottom:12px">Tap a color!</div>';
            html += '<div style="display:flex;justify-content:center;gap:15px;flex-wrap:wrap">';
            Object.entries(CONFIG.colors).forEach(([name, hex]) => {
                html += '<div style="width:55px;height:55px;border-radius:50%;background:'+hex+';cursor:pointer;border:3px solid rgba(255,255,255,0.3)" onclick="pickColorL2(\''+name+'\')"></div>';
            });
            html += '</div></div>';
        } else {
            html += '<div style="text-align:center;color:#aaa;margin:15px;font-size:16px">\uD83D\uDC46 Tap the ? to choose a color</div>';
        }

        html += '</div>';
        html += '<div class="score">\u2B50 '+score+' / '+problems.length+'</div>';
        document.getElementById('app').innerHTML = html;
        if (!questionStartMs) questionStartMs = Date.now();
    }

    window.openPaletteL2 = () => {
        showPalette = true;
        render();
    };

    window.pickColorL2 = (color) => {
        showPalette = false;
        const responseTimeMs = Date.now() - questionStartMs;
        attemptCounts[current] = (attemptCounts[current] || 0) + 1;
        const p = problems[current];
        const correct = color === p.ans;
        currentAnswers.push({q: 'patternL2_'+current, answer: color, correct: correct});

        recordResponse('color_patterns_l2', {type:'color_patterns_l2', pattern:p.seq, pattern_type:p.type, correct_answer:p.ans}, p.ans, color, correct, attemptCounts[current]===1, attemptCounts[current], responseTimeMs, current);

        const explanation = correct ? null : 'The answer is ' + p.ans + ', not ' + color;
        showFeedback(correct, () => {
            if (correct) score++;
            current++;
            questionStartMs = null;
            if (current >= problems.length) { completeWorksheet('Color Patterns L2', score, problems.length); return; }
            render();
        }, explanation);
    };

    render();
}
