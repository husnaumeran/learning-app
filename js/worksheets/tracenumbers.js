// ============ TRACE NUMBERS ============
function showTraceNumbers() {
    const numbers = [];
    for (let i = 1; i <= CONFIG.focusNumber; i++) numbers.push(String(i));
    let current = 0;
    const saved = {};

    function render() {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Trace the Number!</div>';
        html += '<div class="trace-container"><div class="trace-letter">'+numbers[current]+'</div><canvas id="canvas" class="trace-canvas"></canvas></div>';
        html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key red" onclick="clearCanvas()">Clear</button><button class="key" onclick="prevNum()">← Prev</button><span class="score">'+(current+1)+' / '+numbers.length+'</span><button class="key green" onclick="nextNum()">Next →</button></div></div>';
        document.getElementById('app').innerHTML = html;
        setupCanvas();
        if (saved[current]) { const img = new Image(); img.onload = () => { document.getElementById('canvas').getContext('2d').drawImage(img,0,0); }; img.src = saved[current]; }
    }

    function saveCanvas() { saved[current] = document.getElementById('canvas').toDataURL(); }
    window.clearCanvas = () => { const c = document.getElementById('canvas'); c.getContext('2d').clearRect(0, 0, c.width, c.height); };
    window.prevNum = () => { if (current > 0) { saveCanvas(); current--; render(); } };
    window.nextNum = () => { saveCanvas(); current++; if (current >= numbers.length) { completeWorksheet('Trace Numbers', numbers.length, numbers.length); return; } render(); };
    render();
}