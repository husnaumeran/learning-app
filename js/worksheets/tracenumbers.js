// ============ TRACE NUMBERS ============
function showTraceNumbers() {
    const focus = Math.max(1, Number(getFocusNumber('trace_numbers')) || 1);

    // Smart practice set: 2 review + 2 medium + 3 newest = 7 items
    function generatePracticeSet(f) {
        if (f <= 7) {
            const nums = [];
            for (let i = 1; i <= f; i++) nums.push(i);
            return nums;
        }

        const set = new Set();

        // Newest 3: focus and its neighbors
        set.add(f);
        if (f > 1) set.add(f - 1);
        if (f > 2) set.add(f - 2);

        // Medium 2: from ~40-70% of range
        const midStart = Math.ceil(f * 0.4);
        const midEnd = Math.ceil(f * 0.7);
        let attempts = 0;
        while ([...set].filter(n => n >= midStart && n <= midEnd).length < 2 && attempts < 50) {
            set.add(midStart + Math.floor(Math.random() * (midEnd - midStart + 1)));
            attempts++;
        }

        // Review 2: from 1 to ~40%
        const revEnd = Math.max(1, midStart - 1);
        attempts = 0;
        while ([...set].filter(n => n <= revEnd).length < 2 && attempts < 50) {
            set.add(1 + Math.floor(Math.random() * revEnd));
            attempts++;
        }

        return [...set].sort((a, b) => a - b);
    }

    function getIncrement(f) {
        if (f <= 10) return 1;
        if (f <= 20) return 2;
        if (f <= 50) return 5;
        return 10;
    }

    const numbers = generatePracticeSet(focus).map(String);
    let current = 0;
    const saved = {};

    function render() {
        startItemTimer();

        let html = '<button class="back" onclick="showMenu()">\u2190 Back</button><div class="card"><div class="title">Trace the Number!</div>';
        html += '<div style="text-align:center;font-size:16px;color:#888;margin-bottom:5px">Numbers up to ' + focus + '</div>';
        html += '<div class="trace-container"><div class="trace-letter">' + numbers[current] + '</div><canvas id="canvas" class="trace-canvas"></canvas></div>';
        html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key red" onclick="clearCanvas()">Clear</button><button class="key" onclick="prevNum()">\u2190 Prev</button><span class="score">' + (current + 1) + ' / ' + numbers.length + '</span><button class="key green" onclick="nextNum()">Next \u2192</button></div></div>';

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

    window.prevNum = () => {
        if (current > 0) {
            saveCanvas();
            current--;
            render();
        }
    };

    window.nextNum = () => {
        recordPassiveResponse('trace_numbers', { symbol: numbers[current] }, current);
        saveCanvas();
        current++;

        if (current >= numbers.length) {
            // Auto-advance focus number
            const newFocus = Math.min(100, focus + getIncrement(focus));
            if (newFocus > focus && CONFIG.childId) {
                sb.from('child_skill_settings').upsert(
                    { child_id: CONFIG.childId, skill_id: 'trace_numbers', content_level: newFocus },
                    { onConflict: 'child_id,skill_id' }
                ).then(({ error }) => {
                    if (error) {
                        console.error('trace_numbers advance error', error);
                    } else {
                        CONFIG.skillSettings['trace_numbers'] = {
                            ...(CONFIG.skillSettings['trace_numbers'] || {}),
                            content_level: newFocus
                        };
                        console.log('Trace Numbers advanced to', newFocus);
                    }
                });
            }
            completeWorksheet('Trace Numbers', numbers.length, numbers.length);
            return;
        }

        render();
    };

    render();
}
