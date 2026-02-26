// ============ TRACE ABC ============
function showTraceABC() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, CONFIG.focusNumber).split('');
    let current = 0;
    const saved = {};

    function render() {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Trace the Letter!</div>';
        html += '<div class="trace-container"><div class="trace-letter">'+letters[current]+'</div><canvas id="canvas" class="trace-canvas"></canvas></div>';
        html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key red" onclick="clearCanvas()">Clear</button><button class="key" onclick="prevTrace()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextTrace()">Next →</button></div></div>';
        document.getElementById('app').innerHTML = html;
        setupCanvas();
        if (saved[current]) { const img = new Image(); img.onload = () => { document.getElementById('canvas').getContext('2d').drawImage(img,0,0); }; img.src = saved[current]; }
    }

    function saveCanvas() { saved[current] = document.getElementById('canvas').toDataURL(); }
    window.clearCanvas = () => { const c = document.getElementById('canvas'); c.getContext('2d').clearRect(0, 0, c.width, c.height); };
    window.prevTrace = () => { if (current > 0) { saveCanvas(); current--; render(); } };
    window.nextTrace = () => { saveCanvas(); current++; if (current >= letters.length) { completeWorksheet('Trace ABC', letters.length, letters.length); return; } render(); };
    render();
}