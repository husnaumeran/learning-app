// ============ URDU TRACE ============
function showUrduTrace() {
    const ALL = URDU_LETTERS;
    const focus = Math.max(1, Math.min(ALL.length, Number(getFocusNumber('urdu_trace')) || 1));

    function generatePracticeSet(f) {
        if (f <= 7) return ALL.slice(0, f);
        const idxSet = new Set();
        // Newest 3
        idxSet.add(f - 1);
        if (f > 1) idxSet.add(f - 2);
        if (f > 2) idxSet.add(f - 3);
        // Medium 2
        const midStart = Math.ceil(f * 0.4);
        const midEnd = Math.ceil(f * 0.7);
        let attempts = 0;
        while ([...idxSet].filter(n => n >= midStart && n < midEnd).length < 2 && attempts < 50) {
            idxSet.add(midStart + Math.floor(Math.random() * (midEnd - midStart)));
            attempts++;
        }
        // Review 2
        const revEnd = Math.max(1, midStart);
        attempts = 0;
        while ([...idxSet].filter(n => n < revEnd).length < 2 && attempts < 50) {
            idxSet.add(Math.floor(Math.random() * revEnd));
            attempts++;
        }
        return [...idxSet].sort((a, b) => a - b).map(i => ALL[i]);
    }

    function getIncrement(f) {
        if (f <= 10) return 1;
        if (f <= 20) return 1;
        return 2;
    }

    const letters = generatePracticeSet(focus);
    let current = 0;
    const saved = {};

    function render() {
        startItemTimer();
        const item = letters[current];
        let html = '<button class="back" onclick="showMenu()">\u2190 Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl">\u0627\u0631\u062f\u0648 Urdu \u2014 Trace the Letter!</div>';
        html += '<div style="text-align:center;font-size:16px;color:#888;margin-bottom:5px">Letters up to ' + ALL[focus - 1].letter + '</div>';
        html += '<div class="trace-container">';
        html += '<div class="trace-letter" style="direction:rtl;font-family:serif">' + item.letter + '</div>';
        html += '<canvas id="canvas" class="trace-canvas"></canvas>';
        html += '</div>';
        html += '<div style="display:flex;justify-content:space-between;margin-top:15px">';
        html += '<button class="key red" onclick="clearCanvas()">Clear</button>';
        html += '<button class="key" onclick="prevUrduTrace()">\u2190 Prev</button>';
        html += '<span class="score">' + (current + 1) + ' / ' + letters.length + '</span>';
        html += '<button class="key green" onclick="nextUrduTrace()">Next \u2192</button>';
        html += '</div></div>';
        document.getElementById('app').innerHTML = html;
        setupCanvas();
        if (saved[current]) {
            const img = new Image();
            img.onload = () => { document.getElementById('canvas').getContext('2d').drawImage(img, 0, 0); };
            img.src = saved[current];
        }
    }

    function saveCanvas() { saved[current] = document.getElementById('canvas').toDataURL(); }

    window.clearCanvas = () => {
        const c = document.getElementById('canvas');
        c.getContext('2d').clearRect(0, 0, c.width, c.height);
    };

    window.prevUrduTrace = () => { if (current > 0) { saveCanvas(); current--; render(); } };

    window.nextUrduTrace = () => {
        recordPassiveResponse('urdu_trace', { symbol: letters[current].letter }, current);
        saveCanvas();
        current++;
        if (current >= letters.length) {
            const newFocus = Math.min(ALL.length, focus + getIncrement(focus));
            if (newFocus > focus && CONFIG.childId) {
                sb.from('child_skill_settings').upsert(
                    { child_id: CONFIG.childId, skill_id: 'urdu_trace', content_level: newFocus },
                    { onConflict: 'child_id,skill_id' }
                ).then(({ error }) => {
                    if (error) console.error('urdu_trace advance error', error);
                    else {
                        CONFIG.skillSettings['urdu_trace'] = { ...(CONFIG.skillSettings['urdu_trace'] || {}), content_level: newFocus };
                        console.log('Urdu Trace advanced to', ALL[newFocus - 1].letter);
                    }
                });
            }
            completeWorksheet('Urdu Trace', letters.length, letters.length);
            return;
        }
        render();
    };

    render();
}
