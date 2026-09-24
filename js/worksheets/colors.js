// ============ COLOR PATTERNS ============
// Levels 1-4 answer via a 4-option grid; levels 5-6 via an open color palette
// (no fixed choices, greying out colors already tried this question), and
// level 6's blank sits in the middle of the sequence instead of at the end.
// See generateColorPatternProblems in helpers.js for the full level ladder.
function showColors() {
    const level = Math.min(6, Math.max(1, getContentLevel('color_patterns')));
    const isPalette = level >= 5;
    const total = Math.max(getQuestionCount('color_patterns'), 4);
    const problems = generateColorPatternProblems(level, total);
    let current = 0, score = 0;
    let questionStartMs = null;
    let paletteOpen = false;
    const attemptCounts = {};
    const triedColors = {}; // palette mode only: per-question set of wrong colors already tried

    function renderElem(elem, type, size) {
        size = size || 50;
        switch(type) {
            case 'color':
                return '<div style="width:'+size+'px;height:'+size+'px;border-radius:50%;background:'+CONFIG.colors[elem]+';display:inline-block;margin:4px;border:2px solid #333"></div>';
            case 'emoji':
                return '<span style="font-size:'+size+'px;line-height:1;margin:4px">'+elem+'</span>';
            case 'number':
                return '<div style="width:'+size+'px;height:'+size+'px;border-radius:50%;background:#4a5568;color:white;display:inline-flex;align-items:center;justify-content:center;font-size:'+(size*0.55)+'px;font-weight:bold;margin:4px">'+elem+'</div>';
            case 'letter':
                return '<div style="width:'+size+'px;height:'+size+'px;border-radius:50%;background:#7c3aed;color:white;display:inline-flex;align-items:center;justify-content:center;font-size:'+(size*0.55)+'px;font-weight:bold;margin:4px">'+elem+'</div>';
        }
    }

    // The '?' slot — a pulsing open-palette trigger in palette mode, a plain
    // gold marker in grid mode (the real answer choices are below it).
    function renderBlank() {
        if (isPalette) {
            return '<div onclick="openColorsPalette()" style="width:50px;height:50px;border-radius:50%;background:#444;border:3px dashed #fbbf24;display:inline-flex;align-items:center;justify-content:center;font-size:26px;color:#fbbf24;cursor:pointer;margin:4px;animation:pulse 1.5s infinite">?</div>';
        }
        return '<div style="width:50px;height:50px;border-radius:50%;background:#ffd700;display:inline-flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;margin:4px;border:3px dashed #cca300">?</div>';
    }

    function render() {
        if (current >= problems.length) {
            completeWorksheet('Color Patterns', score, problems.length);
            return;
        }
        const p = problems[current];
        const triedSet = triedColors[current] || new Set();

        let html = '<button class="back" onclick="showMenu()">← Back</button>';
        html += '<div class="card"><div class="title">🎨 Color Patterns!</div>';
        html += '<div class="inst">'+(p.type === 'blank' ? 'What fills the blank?' : 'What comes next?')+'</div>';

        if (isPalette) {
            html += '<div style="text-align:center;margin:10px 0">';
            problems.forEach((_, i) => {
                const dotColor = i < current ? '#00CC66' : (i === current ? '#FF6B35' : '#555');
                html += '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:'+dotColor+';margin:2px"></span>';
            });
            html += '</div>';
        } else {
            html += '<div style="text-align:center;font-size:18px;color:#888;margin-bottom:8px">' + (current+1) + ' / ' + problems.length + '</div>';
        }

        // Sequence (the blank renders inline when it's mid-sequence, i.e. type 'blank')
        html += '<div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px;padding:15px;background:#f0f4f8;border-radius:12px;margin-bottom:20px">';
        p.seq.forEach(elem => { html += elem === null ? renderBlank() : renderElem(elem, p.elemType, 50); });
        if (p.type === 'next') html += renderBlank();
        html += '</div>';

        if (isPalette) {
            if (paletteOpen) {
                html += '<div style="display:flex;justify-content:center;gap:15px;margin:20px 0;flex-wrap:wrap">';
                Object.entries(CONFIG.colors).forEach(([name, hex]) => {
                    if (triedSet.has(name)) {
                        html += '<div style="width:55px;height:55px;border-radius:50%;background:#555;opacity:0.3;cursor:not-allowed"></div>';
                    } else {
                        html += '<div style="width:55px;height:55px;border-radius:50%;background:'+hex+';cursor:pointer;border:2px solid transparent" onclick="pickColorsPaletteAnswer(\''+name+'\')"></div>';
                    }
                });
                html += '</div>';
            }
            html += '</div>'; // close card
            html += '<div class="score">⭐ '+score+' / '+problems.length+'</div>';
        } else {
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px">';
            p.choices.forEach((ch, i) => {
                html += '<div id="ch'+i+'" onclick="pickPatternAnswer('+i+')" style="display:flex;align-items:center;justify-content:center;padding:15px;background:white;border:3px solid #ddd;border-radius:12px;cursor:pointer;min-height:70px;transition:all 0.2s">';
                html += renderElem(ch, p.elemType, 45);
                html += '</div>';
            });
            html += '</div></div>'; // close choices grid + card
        }

        document.getElementById('app').innerHTML = html;
        if (!questionStartMs) questionStartMs = Date.now();
    }

    function questionLabel(p) {
        return p.seq.map(v => v === null ? '_' : v).join(',');
    }

    // ---- Grid mode (levels 1-4) ----
    window.pickPatternAnswer = function(i) {
        if (isPalette) return;
        const responseTimeMs = Date.now() - questionStartMs;
        const p = problems[current];
        const chosen = p.choices[i];
        const el = document.getElementById('ch'+i);
        attemptCounts[current] = (attemptCounts[current] || 0) + 1;
        const isFirstAttempt = attemptCounts[current] === 1;
        const correct = chosen === p.ans;

        if (isFirstAttempt) currentAnswers.push({q: questionLabel(p), answer: chosen, correct: correct});

        recordResponse('color_patterns', {type:'color_patterns', pattern_type:p.type, elem_type:p.elemType, sequence:p.seq, correct_answer:p.ans, level:level}, String(p.ans), String(chosen), correct, isFirstAttempt, attemptCounts[current], responseTimeMs, current, false, level);

        if (correct) {
            if (isFirstAttempt) score++;
            el.style.borderColor = '#22c55e';
            el.style.background = '#dcfce7';
            showFeedback(true);
            questionStartMs = null;
            setTimeout(() => { current++; render(); }, 1200);
        } else {
            el.style.borderColor = '#ef4444';
            el.style.background = '#fee2e2';
            el.style.opacity = '0.5';
            el.onclick = null;
            showFeedback(false);
        }
    };

    // ---- Palette mode (levels 5-6) ----
    window.openColorsPalette = function() {
        if (!isPalette) return;
        paletteOpen = true;
        render();
    };

    window.pickColorsPaletteAnswer = function(color) {
        if (!isPalette) return;
        const responseTimeMs = Date.now() - questionStartMs;
        const p = problems[current];
        attemptCounts[current] = (attemptCounts[current] || 0) + 1;
        const isFirstAttempt = attemptCounts[current] === 1;
        const correct = color === p.ans;

        if (isFirstAttempt) currentAnswers.push({q: questionLabel(p), answer: color, correct: correct});

        recordResponse('color_patterns', {type:'color_patterns', pattern_type:p.type, elem_type:p.elemType, sequence:p.seq, correct_answer:p.ans, level:level}, String(p.ans), String(color), correct, isFirstAttempt, attemptCounts[current], responseTimeMs, current, false, level);

        if (correct) {
            if (isFirstAttempt) score++;
            paletteOpen = false;
            questionStartMs = null;
            showFeedback(true, () => { current++; render(); });
        } else {
            if (!triedColors[current]) triedColors[current] = new Set();
            triedColors[current].add(color);
            showFeedback(false, () => { render(); });
        }
    };

    render();
}

// Retired as a standalone skill (merged into Color Patterns, see the
// 20260923_04_merge_color_patterns.sql migration) but the long-press "all
// worksheets" grid in showMenu() (js/menu.js) still names showColorsL2
// directly, so it stays as a thin redirect rather than a dead reference.
function showColorsL2() { showColors(); }
