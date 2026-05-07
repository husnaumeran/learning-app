// ============ TRACE LOWERCASE ============
async function showTraceLower() {
    const ALL = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const focus = Math.max(1, Math.min(26, Number(getContentLevel('trace_lower')) || 1));
    const allItems = ALL.slice(0, focus);

    const strengthMap = CONFIG.childId
        ? await getItemStrengths(CONFIG.childId, 'trace_lower')
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
        html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key red" onclick="clearCanvas()">Clear</button><button class="key" onclick="prevLower()">\u2190 Prev</button><span class="score">' + (current + 1) + ' / ' + letters.length + '</span><button class="key green" onclick="nextLower()">Next \u2192</button></div></div>';
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

    window.prevLower = () => { if (current > 0) { saveCanvas(); current--; render(); } };

    window.nextLower = () => {
        recordPassiveResponse('trace_lower', { symbol: letters[current] }, current);

        if (CONFIG.childId) {
            updateItemStrength(CONFIG.childId, 'trace_lower', letters[current], 'letter',
                { correct: null, skipped: false, firstTry: null });
        }

        saveCanvas();
        current++;
        if (current >= letters.length) {
            const newFocus = Math.min(26, focus + getIncrement(focus));
            if (newFocus > focus && CONFIG.childId) {
                sb.from('child_skill_settings').upsert(
                    { child_id: CONFIG.childId, skill_id: 'trace_lower', content_level: newFocus },
                    { onConflict: 'child_id,skill_id' }
                ).then(({ error }) => {
                    if (error) console.error('trace_lower advance error', error);
                    else {
                        CONFIG.skillSettings['trace_lower'] = { ...(CONFIG.skillSettings['trace_lower'] || {}), content_level: newFocus };
                        console.log('Trace Lower advanced to', ALL[newFocus - 1]);
                    }
                });
            }
            completeWorksheet('Trace Lowercase', letters.length, letters.length);
            return;
        }
        render();
    };

    render();
}
