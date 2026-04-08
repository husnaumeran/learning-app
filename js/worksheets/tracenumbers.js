// ============ TRACE NUMBERS ============
function showTraceNumbers() {
    const level = Math.max(1, Number(getFocusNumber('trace_numbers')) || 1);
    const numbers = [];

    for (let i = 1; i <= level; i++) {
        numbers.push(String(i));
    }

    let current = 0;

    function render() {
        const n = numbers[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title">Trace the Number</div>';
        html += '<div class="bigword">' + n + '</div>';
        html += '<div class="trace-wrap">';
        html += '<canvas id="traceCanvas" width="320" height="220" style="border:2px dashed #cbd5e1;border-radius:16px;background:#fff"></canvas>';
        html += '</div>';
        html += '<div style="margin-top:16px;display:flex;gap:10px;justify-content:center">';
        html += '<button class="btn" onclick="clearTraceNumbers()">Clear</button>';
        html += '<button class="btn green" onclick="nextTraceNumbers()">Next →</button>';
        html += '</div>';
        html += '<div class="score">' + (current + 1) + ' / ' + numbers.length + '</div>';
        html += '</div>';

        document.getElementById('app').innerHTML = html;

        if (typeof initNumberTracing === 'function') {
            initNumberTracing(n);
        }
    }

    window.nextTraceNumbers = () => {
        currentAnswers.push({
            q: numbers[current],
            answer: numbers[current],
            correct: true
        });

        current++;

        if (current >= numbers.length) {
            completeWorksheet('Trace Numbers', numbers.length, numbers.length);
            return;
        }

        render();
    };

    window.clearTraceNumbers = () => {
        if (typeof clearTracingCanvas === 'function') {
            clearTracingCanvas();
        }
    };

    render();
}