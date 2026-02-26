// ============ COLOR PATTERNS ============
function showColors() {
    const patterns = generateColorPatterns();
    let score = 0, dragging = null;
    const solved = new Set();

    function render() {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Color Patterns!</div><div class="inst">Drag a color to the empty circle</div>';
        patterns.forEach(([seq, ans], i) => {
            html += '<div class="row">';
            seq.forEach(c => { html += '<div class="circle" style="background:'+CONFIG.colors[c]+'"></div>'; });
            const done = solved.has(i);
            html += '<div class="drop'+(done?' correct':'')+'" id="drop'+i+'" data-ans="'+ans+'" style="'+(done?'background:'+CONFIG.colors[ans]:'')+'"></div></div>';
        });
        html += '<div class="palette">';
        Object.entries(CONFIG.colors).forEach(([name, hex]) => {
            html += '<div class="pal" draggable="true" data-color="'+name+'" style="background:'+hex+'"></div>';
        });
        html += '</div><div class="score">⭐ '+score+' / '+patterns.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
        setupColorDrag();
    }

    function setupColorDrag() {
        document.querySelectorAll('.pal').forEach(p => {
            p.addEventListener('touchstart', e => { dragging = p.dataset.color; p.style.opacity='0.5'; });
            p.addEventListener('touchend', e => {
                p.style.opacity='1';
                const touch = e.changedTouches[0];
                const el = document.elementFromPoint(touch.clientX, touch.clientY);
                if (el && el.classList.contains('drop')) handleDrop(el);
                dragging = null;
            });
            p.addEventListener('dragstart', e => { dragging = p.dataset.color; });
        });
        document.querySelectorAll('.drop').forEach(d => {
            d.addEventListener('dragover', e => e.preventDefault());
            d.addEventListener('drop', e => { e.preventDefault(); handleDrop(d); });
        });
    }

    function handleDrop(el) {
        const i = parseInt(el.id.replace('drop',''));
        if (solved.has(i) || !dragging) return;
        const correct = dragging === el.dataset.ans;
        currentAnswers.push({q: 'Pattern '+i, a: dragging, correct: correct});
        if (correct) { solved.add(i); score++; }
        showFeedback(correct, () => {
            if (score === patterns.length) { completeWorksheet('Color Patterns', score, patterns.length); }
            else { render(); }
        });
    }
    render();
}