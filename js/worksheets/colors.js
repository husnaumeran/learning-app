// ============ COLOR PATTERNS ============
function showColors() {
    const problems = generateColorPatterns();
    let current = 0, score = 0, tried = false;
    let questionStartMs = null;
    const attemptCounts = {};

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

    function render() {
        if (current >= problems.length) {
            completeWorksheet('Color Patterns', score, problems.length);
            return;
        }
        const p = problems[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button>';
        html += '<div class="card"><div class="title">🎨 Patterns!</div>';
        html += '<div class="inst">What comes next?</div>';
        html += '<div style="text-align:center;font-size:18px;color:#888;margin-bottom:8px">' + (current+1) + ' / ' + problems.length + '</div>';

        // Sequence
        html += '<div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px;padding:15px;background:#f0f4f8;border-radius:12px;margin-bottom:20px">';
        p.seq.forEach(elem => { html += renderElem(elem, p.type, 50); });
        html += '<div style="width:50px;height:50px;border-radius:50%;background:#ffd700;display:inline-flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;margin:4px;border:3px dashed #cca300">?</div>';
        html += '</div>';

        // 4 answer choices
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px">';
        p.choices.forEach((ch, i) => {
            html += '<div id="ch'+i+'" onclick="pickPatternAnswer('+i+')" style="display:flex;align-items:center;justify-content:center;padding:15px;background:white;border:3px solid #ddd;border-radius:12px;cursor:pointer;min-height:70px;transition:all 0.2s">';
            html += renderElem(ch, p.type, 45);
            html += '</div>';
        });
        html += '</div></div>';

        document.getElementById('app').innerHTML = html;
        tried = false;
        questionStartMs = Date.now();
    }

    window.pickPatternAnswer = function(i) {
        const responseTimeMs = Date.now() - questionStartMs;
        const p = problems[current];
        const chosen = p.choices[i];
        const el = document.getElementById('ch'+i);
        attemptCounts[current] = (attemptCounts[current] || 0) + 1;
        if (chosen === p.ans) {
            if (!tried) score++;
            currentAnswers.push({q: p.seq.join(','), type: p.type, answer: chosen, correct: true, firstTry: !tried});

            recordResponse('color_patterns', {type:'color_patterns', pattern_type:p.type, sequence:p.seq, correct_answer:p.ans}, String(p.ans), String(chosen), true, attemptCounts[current]===1, attemptCounts[current], responseTimeMs, current);

            el.style.borderColor = '#22c55e';
            el.style.background = '#dcfce7';
            showFeedback(true);
            setTimeout(() => { current++; render(); }, 1200);
        } else {
            tried = true;

            recordResponse('color_patterns', {type:'color_patterns', pattern_type:p.type, sequence:p.seq, correct_answer:p.ans}, String(p.ans), String(chosen), false, attemptCounts[current]===1, attemptCounts[current], responseTimeMs, current);

            el.style.borderColor = '#ef4444';
            el.style.background = '#fee2e2';
            el.style.opacity = '0.5';
            el.onclick = null;
            showFeedback(false);
        }
    };

    render();
}
