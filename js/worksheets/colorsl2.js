// ============ COLOR PATTERNS L2 ============
function showColorsL2() {
    const problems = generateColorPatternsL2(getFocusNumber('color_patterns_l2'));
    let current = 0, score = 0;
    const solved = new Set();
    const attemptCounts = {};
    const triedColors = {};  // per-question: set of wrong colors
    let paletteOpen = false;
    let questionStartMs = null;

    function render() {
        const p = problems[current];
        const tried = triedColors[current] || new Set();
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
                html += '<div onclick="openPaletteL2()" style="width:45px;height:45px;border-radius:50%;background:#444;border:3px dashed #fbbf24;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fbbf24;cursor:pointer;animation:pulse 1.5s infinite">?</div>';
            } else {
                html += '<div class="circle" style="width:45px;height:45px;border-radius:50%;background:'+CONFIG.colors[c]+'"></div>';
            }
        });
        if (p.type === 'next') {
            html += '<div onclick="openPaletteL2()" style="width:45px;height:45px;border-radius:50%;background:#444;border:3px dashed #fbbf24;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fbbf24;cursor:pointer;animation:pulse 1.5s infinite">?</div>';
        }
        html += '</div>';

        // Color palette (only visible when open)
        if (paletteOpen) {
            html += '<div style="display:flex;justify-content:center;gap:15px;margin:20px 0;flex-wrap:wrap">';
            Object.entries(CONFIG.colors).forEach(([name, hex]) => {
                if (tried.has(name)) {
                    // Greyed out wrong answer
                    html += '<div style="width:55px;height:55px;border-radius:50%;background:#555;opacity:0.3;cursor:not-allowed"></div>';
                } else {
                    html += '<div style="width:55px;height:55px;border-radius:50%;background:'+hex+';cursor:pointer;border:2px solid transparent" onclick="pickColorL2(\''+name+'\')"></div>';
                }
            });
            html += '</div>';
        }

        html += '</div>';
        html += '<div class="score">⭐ '+score+' / '+problems.length+'</div>';
        document.getElementById('app').innerHTML = html;
        if (!questionStartMs) questionStartMs = Date.now();
    }

    window.openPaletteL2 = () => {
        if (solved.has(current)) return;
        paletteOpen = true;
        render();
    };

    window.pickColorL2 = (color) => {
        if (solved.has(current)) return;
        const responseTimeMs = Date.now() - questionStartMs;
        attemptCounts[current] = (attemptCounts[current] || 0) + 1;
        const p = problems[current];
        const correct = color === p.ans;
        if (attemptCounts[current] === 1) currentAnswers.push({q: 'patternL2_'+current, answer: color, correct: correct});

        recordResponse('color_patterns_l2', {type:'color_patterns_l2', pattern:p.seq, pattern_type:p.type, correct_answer:p.ans}, p.ans, color, correct, attemptCounts[current]===1, attemptCounts[current], responseTimeMs, current);

        if (correct) {
            solved.add(current);
            score++;
            paletteOpen = false;
            questionStartMs = null;
            showFeedback(true, () => {
                if (score === problems.length) { completeWorksheet('Color Patterns L2', score, problems.length); return; }
                for (let i = 0; i < problems.length; i++) if (!solved.has(i)) { current = i; break; }
                render();
            });
        } else {
            // Grey out wrong color, keep palette open
            if (!triedColors[current]) triedColors[current] = new Set();
            triedColors[current].add(color);
            showFeedback(false, () => {
                render();
            });
        }
    };

    render();
}
