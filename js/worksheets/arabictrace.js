// ============ ARABIC TRACE ============
async function showArabicTrace() {
    const ALL = ARABIC_LETTERS;
    const focus = Math.max(1, Math.min(ALL.length, Number(getContentLevel('arabic_trace')) || 1));
    const allKeys = ALL.slice(0, focus).map(l => l.letter);

    const strengthMap = CONFIG.childId
        ? await getItemStrengths(CONFIG.childId, 'arabic_trace')
        : new Map();

    const pickedKeys = pickPracticeSet(allKeys, strengthMap, {
        maxItems: 7, newestCount: 3, midCount: 2, reviewCount: 2
    });

    const keyToObj = {};
    ALL.forEach(l => { keyToObj[l.letter] = l; });
    const letters = pickedKeys.map(k => keyToObj[k]);

    function getIncrement(f) {
        if (f <= 10) return 1;
        if (f <= 20) return 1;
        return 2;
    }

    let current = 0;
    const saved = {};

    function render() {
        startItemTimer();
        const item = letters[current];
        let html = '<button class="back" onclick="showMenu()">\u2190 Back</button><div class="card" style="border-color:#22c55e">';
        html += '<div class="title" style="direction:rtl;color:#22c55e">\u0639\u0631\u0628\u06cc Arabic \u2014 Trace the Letter!</div>';
        html += '<div style="text-align:center;font-size:16px;color:#888;margin-bottom:5px">Letters up to ' + ALL[focus - 1].letter + '</div>';
        html += '<div class="trace-container">';
        html += '<div class="trace-letter" style="direction:rtl;font-family:serif">' + item.letter + '</div>';
        html += '<canvas id="canvas" class="trace-canvas"></canvas>';
        html += '</div>';
        html += '<div style="display:flex;justify-content:space-between;margin-top:15px">';
        html += '<button class="key red" onclick="clearCanvas()">Clear</button>';
        html += '<button class="key" onclick="prevArabicTrace()">\u2190 Prev</button>';
        html += '<span class="score">' + (current + 1) + ' / ' + letters.length + '</span>';
        html += '<button class="key green" onclick="nextArabicTrace()">Next \u2192</button>';
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

    window.prevArabicTrace = () => { if (current > 0) { saveCanvas(); current--; render(); } };

    window.nextArabicTrace = () => {
        recordPassiveResponse('arabic_trace', { symbol: letters[current].letter }, current);

        if (CONFIG.childId) {
            updateItemStrength(CONFIG.childId, 'arabic_trace', letters[current].letter, 'letter',
                { correct: null, skipped: false, firstTry: null });
        }

        saveCanvas();
        current++;
        if (current >= letters.length) {
            const newFocus = Math.min(ALL.length, focus + getIncrement(focus));
            if (newFocus > focus && CONFIG.childId) {
                sb.from('child_skill_settings').upsert(
                    { child_id: CONFIG.childId, skill_id: 'arabic_trace', content_level: newFocus },
                    { onConflict: 'child_id,skill_id' }
                ).then(({ error }) => {
                    if (error) console.error('arabic_trace advance error', error);
                    else {
                        CONFIG.skillSettings['arabic_trace'] = { ...(CONFIG.skillSettings['arabic_trace'] || {}), content_level: newFocus };
                        console.log('Arabic Trace advanced to', ALL[newFocus - 1].letter);
                    }
                });
            }
            completeWorksheet('Arabic Trace', letters.length, letters.length);
            return;
        }
        render();
    };

    render();
}
