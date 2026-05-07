// ============ TRACE ABC ============
async function showTraceABC() {
    const ALL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const focus = Math.max(1, Math.min(26, Number(getContentLevel('trace_upper')) || 1));
    const allItems = ALL.slice(0, focus);

    // Fetch strength scores and pick smart practice set
    const strengthMap = CONFIG.childId
        ? await getItemStrengths(CONFIG.childId, 'trace_upper')
        : new Map();

    const letters = pickPracticeSet(allItems, strengthMap, {
        maxItems: 7, newestCount: 3, midCount: 2, reviewCount: 2
    });

    function getIncrement(f) {
        if (f <= 13) return 1;
        return 2;
    }

    let current = 0;
    const saved = {};

    function render() {
        startItemTimer();
        let html = '<button class="back" onclick="showMenu()">\u2190 Back</button><div class="card"><div class="title">Trace the Letter!</div>';
        html += '<div style="text-align:center;font-size:16px;color:#888;margin-bottom:5px">Letters up to ' + ALL[focus - 1] + '</div>';
        html += '<div class="trace-container"><div class="trace-letter">' + letters[current] + '</div><canvas id="canvas" class="trace-canvas"></canvas></div>';
        html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key red" onclick="clearCanvas()">Clear</button><button class="key" onclick="prevABC()">\u2190 Prev</button><span class="score">' + (current + 1) + ' / ' + letters.length + '</span><button class="key green" onclick="nextABC()">Next \u2192</button></div></div>';
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

    window.prevABC = () => { if (current > 0) { saveCanvas(); current--; render(); } };

    window.nextABC = () => {
        recordPassiveResponse('trace_upper', { symbol: letters[current] }, current);

        if (CONFIG.childId) {
            updateItemStrength(CONFIG.childId, 'trace_upper', letters[current], 'letter',
                { correct: null, skipped: false, firstTry: null });
        }

        saveCanvas();
        current++;
        if (current >= letters.length) {
            const newFocus = Math.min(26, focus + getIncrement(focus));
            if (newFocus > focus && CONFIG.childId) {
                sb.from('child_skill_settings').upsert(
                    { child_id: CONFIG.childId, skill_id: 'trace_upper', content_level: newFocus },
                    { onConflict: 'child_id,skill_id' }
                ).then(({ error }) => {
                    if (error) console.error('trace_abc advance error', error);
                    else {
                        CONFIG.skillSettings['trace_upper'] = { ...(CONFIG.skillSettings['trace_upper'] || {}), content_level: newFocus };
                        console.log('Trace ABC advanced to', ALL[newFocus - 1]);
                    }
                });
            }
            completeWorksheet('Trace ABC', letters.length, letters.length);
            return;
        }
        render();
    };

    render();
}
