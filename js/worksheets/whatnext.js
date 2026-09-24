// ============  What Comes Next ============
function showWhatNext() {
    const difficulty = getDifficultyLevel('what_comes_next_numbers');
    const questionCount = getQuestionCount('what_comes_next_numbers');
    const problems = buildWhatNextProblems(difficulty, questionCount);
    let current = 0, score = 0;
    let questionStartMs = null;

    function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

    // More steps unlock as difficulty rises, so skip-counting shows up once a child is ready for it.
    function stepPoolFor(level) {
        if (level <= 2) return [1, 2];
        if (level <= 4) return [1, 2, 5];
        return [1, 2, 5, 10];
    }

    // Start/step are chosen so every shown term and the answer stay >= 1 by construction —
    // no rejection sampling, so this can never loop.
    function numberSeq(level) {
        const steps = stepPoolFor(level);
        const step = steps[Math.floor(Math.random() * steps.length)];
        const forward = Math.random() < 0.5;
        const windowWidth = 5 + level * 5;
        const minStart = forward ? 1 : (4 * step + 1);
        const start = minStart + Math.floor(Math.random() * windowWidth);
        const seq = forward
            ? [start, start + step, start + 2 * step, start + 3 * step]
            : [start, start - step, start - 2 * step, start - 3 * step];
        const answer = forward ? start + 4 * step : start - 4 * step;
        return { seq, answer, step, isLetter: false, sig: 'n:' + step + ':' + (forward ? 'f' : 'b') + ':' + start };
    }

    function letterSeq() {
        const forward = Math.random() < 0.5;
        const startCode = forward
            ? 65 + Math.floor(Math.random() * 22)  // + up to 3 more keeps the run inside A-Z
            : 69 + Math.floor(Math.random() * 22);  // - up to 3 more keeps the run inside A-Z
        const seq = [0, 1, 2, 3].map(i => String.fromCharCode(forward ? startCode + i : startCode - i));
        const answer = String.fromCharCode(forward ? startCode + 4 : startCode - 4);
        return { seq, answer, step: 1, isLetter: true, sig: 'l:' + (forward ? 'f' : 'b') + ':' + startCode };
    }

    function choicesFor(p) {
        const toVal = v => p.isLetter ? v.charCodeAt(0) : v;
        const fromVal = v => p.isLetter ? String.fromCharCode(v) : v;
        const inRange = v => p.isLetter ? (v >= 65 && v <= 90) : (v >= 1);
        const av = toVal(p.answer);
        const offsets = [p.step, -p.step, p.step * 2, -p.step * 2, 1, -1, 2, -2, 3, -3];
        const seen = new Set([av]);
        const distractors = [];
        for (const off of offsets) {
            if (distractors.length >= 3) break;
            const v = av + off;
            if (!inRange(v) || seen.has(v)) continue;
            seen.add(v);
            distractors.push(fromVal(v));
        }
        return shuffle([p.answer, ...distractors]);
    }

    function buildWhatNextProblems(level, n) {
        const total = Math.max(1, n);
        const used = new Set();
        const list = [];
        for (let i = 0; i < total; i++) {
            let p = Math.random() < 0.5 ? numberSeq(level) : letterSeq();
            if (used.has(p.sig)) {
                // A same-shape repeat within this sitting: nudge it once (deterministic, not a retry loop).
                p = p.isLetter ? letterSeq() : (() => {
                    const bump = (p.step || 1) * 7;
                    return { seq: p.seq.map(v => v + bump), answer: p.answer + bump, step: p.step, isLetter: false, sig: p.sig + ':2' };
                })();
            }
            used.add(p.sig);
            list.push({ seq: p.seq, answer: p.answer, choices: choicesFor(p) });
        }
        return list;
    }

    function render() {
        if (current >= problems.length) { completeWorksheet('What Comes Next', score, problems.length); return; }
        const { seq, answer, choices } = problems[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">What Comes Next?</div>';
        html += '<div class="prob" style="justify-content:center;font-size:32px;gap:10px">'+seq.join(' → ')+' → <span style="color:#FF6B35;font-weight:bold">?</span></div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px">';
        choices.forEach(o => html += '<div class="prob" style="justify-content:center;font-size:32px;cursor:pointer" onclick="pickNext(\''+o+'\')">'+o+'</div>');
        html += '</div><div class="score">'+(current+1)+' / '+problems.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
        questionStartMs = Date.now();
    }

    window.pickNext = async (choice) => {
        const responseTimeMs = Date.now() - questionStartMs;
        const { seq, answer } = problems[current];
        const correct = String(choice) === String(answer);
        currentAnswers.push({q: seq.join('→')+'→?', answer: choice, correct: correct});

        // Disable all option boxes immediately
        const boxes = document.querySelectorAll('.card .prob');
        boxes.forEach(b => { b.onclick = null; b.style.pointerEvents = 'none'; });

        // Highlight correct/wrong
        boxes.forEach(b => {
            if (b.textContent == answer) b.style.background = '#22c55e';
            else if (b.textContent == choice && !correct) b.style.background = '#ef4444';
        });

        recordResponse('what_comes_next_numbers', {type:'what_comes_next', sequence: seq, correct_answer: answer}, String(answer), String(choice), correct, true, 1, responseTimeMs, current);

        if (correct) {
            score++;
            showFeedback(true, () => { current++; render(); });
        } else {
            const explanation = 'After ' + seq.join(', ') + ' comes ' + answer;
            const title = document.querySelector('.title');
            if (title) { title.innerHTML = '❌ ' + explanation; title.style.color = '#ef4444'; }
            await speak(explanation);
            current++; render();
        }
    };
    render();
}
