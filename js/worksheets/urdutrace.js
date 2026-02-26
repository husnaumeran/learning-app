// ============ URDU TRACE ============
function showUrduTrace() {
    const letters = URDU_LETTERS.slice(0, CONFIG.focusNumber);
    let current = 0, harakatMode = 0; // 0=fatha, 1=kasra, 2=damma
    const saved = {};
    const harakatNames = ['زَبَر (Fatha)', 'زِیر (Kasra)', 'پِیش (Damma)'];
    const harakatKeys = ['fatha', 'kasra', 'damma'];
    const soundKeys = ['sf', 'sk', 'sd'];

    function render() {
        const l = letters[current];
        const displayLetter = l[harakatKeys[harakatMode]];
        const sound = l[soundKeys[harakatMode]];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl">Trace: '+l.name+' — '+harakatNames[harakatMode]+'</div>';
        html += '<div style="text-align:center;margin:5px"><button class="btn" style="font-size:16px;padding:8px 15px;display:inline-block" onclick="speakUrdu(\''+sound+'\')">🔊 '+sound+'</button></div>';
        html += '<div style="display:flex;justify-content:center;gap:5px;margin:5px 0">';
        harakatNames.forEach((h, i) => {
            const active = i === harakatMode ? 'background:#FF6B35;color:white' : 'background:#444;color:#aaa';
            html += '<button style="padding:8px 12px;border-radius:8px;border:none;font-size:14px;cursor:pointer;'+active+'" onclick="setHarakat('+i+')">'+h+'</button>';
        });
        html += '</div>';
        html += '<div class="trace-container" style="direction:rtl"><div class="trace-letter" style="font-family:serif">'+displayLetter+'</div><canvas id="canvas" class="trace-canvas"></canvas></div>';
        html += '<div style="display:flex;justify-content:space-between;margin-top:10px"><button class="key red" onclick="clearCanvas()">Clear</button><button class="key" onclick="prevUrduTrace()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextUrduTrace()">Next →</button></div></div>';
        document.getElementById('app').innerHTML = html;
        setupCanvas();
        if (saved[current+'_'+harakatMode]) { const img = new Image(); img.onload = () => { document.getElementById('canvas').getContext('2d').drawImage(img,0,0); }; img.src = saved[current+'_'+harakatMode]; }
    }

    function saveCanvas() { try { saved[current+'_'+harakatMode] = document.getElementById('canvas').toDataURL(); } catch(e) {} }
    window.clearCanvas = () => { const c = document.getElementById('canvas'); c.getContext('2d').clearRect(0, 0, c.width, c.height); };
    window.setHarakat = (m) => { saveCanvas(); harakatMode = m; render(); };
    window.prevUrduTrace = () => { if (current > 0) { saveCanvas(); current--; render(); } };
    window.nextUrduTrace = () => { saveCanvas(); current++; if (current >= letters.length) { completeWorksheet('Urdu Trace', letters.length, letters.length); return; } render(); };
    render();
}
