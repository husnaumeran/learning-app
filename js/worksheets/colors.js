// ============ COLOR PATTERNS ============
function showColors() {
    const patterns = generateColorPatterns();
    let score = 0, selectedColor = null;
    const solved = new Set();

    function render() {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Color Patterns!</div><div class="inst">Tap a color, then tap the empty circle</div>';
        patterns.forEach(([seq, ans], i) => {
            html += '<div class="row">';
            seq.forEach(c => { html += '<div class="circle" style="background:'+CONFIG.colors[c]+'"></div>'; });
            const done = solved.has(i);
            html += '<div class="circle '+(done?'correct':'')+'" id="drop'+i+'" style="'+(done?'background:'+CONFIG.colors[ans]:'background:#444;border:3px dashed #888')+';cursor:pointer" onclick="tapDrop('+i+',\''+ans+'\')"></div></div>';
        });
        html += '<div class="palette" style="display:flex;justify-content:center;gap:15px;margin:20px 0">';
        Object.entries(CONFIG.colors).forEach(([name, hex]) => {
            const sel = selectedColor === name ? 'transform:scale(1.3);border:3px solid white;box-shadow:0 0 15px '+hex : '';
            html += '<div class="pal" style="width:50px;height:50px;border-radius:50%;background:'+hex+';cursor:pointer;'+sel+'" onclick="tapColor(\''+name+'\')"></div>';
        });
        html += '</div></div>';
        html += '<div class="score">⭐ '+score+' / '+patterns.length+'</div>';
        document.getElementById('app').innerHTML = html;
    }

    window.tapColor = (color) => {
        selectedColor = color;
        render();
    };

    window.tapDrop = (i, ans) => {
        if (solved.has(i) || !selectedColor) return;
        const correct = selectedColor === ans;
        currentAnswers.push({q: 'pattern'+i, a: selectedColor, correct: correct});
        if (correct) {
            solved.add(i);
            score++;
            showFeedback(true, () => {
                speak('Great job!');
                if (score === patterns.length) { completeWorksheet('Color Patterns', score, patterns.length); return; }
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
