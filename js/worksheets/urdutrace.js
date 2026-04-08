// ============ URDU TRACE ============
function showUrduTrace() {
    const letters = URDU_LETTERS
        .slice(0, Math.max(1, Number(getFocusNumber('urdu_trace')) || 1));

    let current = 0;
    const saved = {};

    function render() {
        startItemTimer();

        const item = letters[current];

        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl">اردو Urdu — Trace the Letter!</div>';
        html += '<div class="trace-container">';
        html += '<div class="trace-letter" style="direction:rtl;font-family:serif">' + item.letter + '</div>';
        html += '<canvas id="canvas" class="trace-canvas"></canvas>';
        html += '</div>';
        html += '<div style="display:flex;justify-content:space-between;margin-top:15px">';
        html += '<button class="key red" onclick="clearCanvas()">Clear</button>';
        html += '<button class="key" onclick="prevUrduTrace()">← Prev</button>';
        html += '<span class="score">' + (current + 1) + ' / ' + letters.length + '</span>';
        html += '<button class="key green" onclick="nextUrduTrace()">Next →</button>';
        html += '</div></div>';

        document.getElementById('app').innerHTML = html;

        setupCanvas();

        if (saved[current]) {
            const img = new Image();
            img.onload = () => {
                document.getElementById('canvas').getContext('2d').drawImage(img, 0, 0);
            };
            img.src = saved[current];
        }
    }

    function saveCanvas() {
        saved[current] = document.getElementById('canvas').toDataURL();
    }

    window.clearCanvas = () => {
        const c = document.getElementById('canvas');
        c.getContext('2d').clearRect(0, 0, c.width, c.height);
    };

    window.prevUrduTrace = () => {
        if (current > 0) {
            saveCanvas();
            current--;
            render();
        }
    };

    window.nextUrduTrace = () => {
        recordPassiveResponse('urdu_trace', { symbol: letters[current].letter }, current);
        saveCanvas();
        current++;

        if (current >= letters.length) {
            completeWorksheet('Urdu Trace', letters.length, letters.length);
            return;
        }

        render();
    };

    render();
}