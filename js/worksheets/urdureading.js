// ============ URDU READING ============
function showUrduReading() {
    const letters = URDU_LETTERS.slice(0, getContentLevel('urdu_reading'));
    let current = 0;

    function render() {
        const l = letters[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl">اردو Urdu — Read: '+l.name+'</div>';
        html += '<div style="text-align:center;font-size:80px;margin:10px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakUrdu(\''+l.letter+'\')">'+l.letter+'</div>';
        html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevUrduRead()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextUrduRead()">Next →</button></div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.prevUrduRead = () => { if (current > 0) { current--; render(); } };
    window.nextUrduRead = () => {
        current++;
        if (current >= letters.length) {
            completeWorksheet('Urdu Reading', letters.length, letters.length);
            const level = getContentLevel('urdu_reading');
            if (level <= 1) {
                // Auto-advance level 1 after first completion
                const newLevel = 2;
                CONFIG.skillSettings['urdu_reading'] = { ...(CONFIG.skillSettings['urdu_reading'] || {}), content_level: newLevel };
                sb.from('child_skill_settings').upsert({ child_id: CONFIG.childId, skill_id: 'urdu_reading', content_level: newLevel }, { onConflict: 'child_id,skill_id' });
                document.getElementById('app').innerHTML =
                    '<div class="card"><div class="title">Great job! 🎉</div>' +
                    '<div style="text-align:center;margin-top:10px">Urdu Reading advanced to level 2!</div>' +
                    '<button class="btn green" style="margin-top:20px" onclick="showMenu()">Back to Menu</button></div>';
            } else {
                showUrduReadingCheck(letters);
            }
            return;
        }
        render();
    };
    render();
}

function showUrduReadingCheck(letters) {
    const DISTRACTOR_POOL = URDU_LETTERS.slice(0, Math.max(10, letters.length));
    const total = Math.min(5, letters.length);
    const bank = [...letters].sort(() => Math.random() - 0.5).slice(0, total);
    const questions = bank.map(correct => {
        const wrongs = [...DISTRACTOR_POOL]
            .filter(l => l.letter !== correct.letter)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        return { correct, choices: [...wrongs, correct].sort(() => Math.random() - 0.5) };
    });

    let current = 0, score = 0;
    const startTime = Date.now();

    function render() {
        if (current >= questions.length) { finishUrduReadingCheck(score, questions.length); return; }
        const q = questions[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title">Urdu Reading Check ⭐</div>';
        html += '<div style="text-align:center;color:#888">' + (current + 1) + ' / ' + questions.length + '</div>';
        html += '<div style="text-align:center;font-size:24px;margin:15px 0">Tap the correct letter</div>';
        html += '<div style="text-align:center;font-size:28px;margin:15px 0">' + q.correct.name + '</div>';
        html += '<div style="text-align:center;margin:10px 0"><button class="btn" onclick="speakUrdu(\'' + q.correct.letter + '\')">🔊 Hear</button></div>';
        html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:20px">';
        q.choices.forEach((choice, i) => {
            html += '<button class="key" onclick="pickUrduReadingCheck(' + i + ')" style="font-size:48px;font-family:serif;direction:rtl">' + choice.letter + '</button>';
        });
        html += '</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.pickUrduReadingCheck = function(i) {
        const q = questions[current];
        const correct = q.choices[i].letter === q.correct.letter;
        if (correct) score++;
        const responseTimeMs = Date.now() - startTime;
        recordResponse('urdu_reading_check',
            { type: 'urdu_reading_check', letter: q.correct.letter, letter_name: q.correct.name },
            q.correct.letter, q.choices[i].letter, correct, true, 1, responseTimeMs, current);
        current++;
        render();
    };

    render();
}

function finishUrduReadingCheck(score, total) {
    const pct = Math.round((score / total) * 100);
    const level = getContentLevel('urdu_reading');
    if (pct >= 80) {
        const newLevel = Math.min(level + 1, URDU_LETTERS.length);
        CONFIG.skillSettings['urdu_reading'] = { ...(CONFIG.skillSettings['urdu_reading'] || {}), content_level: newLevel };
        sb.from('child_skill_settings').upsert({ child_id: CONFIG.childId, skill_id: 'urdu_reading', content_level: newLevel }, { onConflict: 'child_id,skill_id' });
        document.getElementById('app').innerHTML =
            '<div class="card"><div class="title">Great job! 🎉</div>' +
            '<div style="text-align:center;font-size:28px">' + score + ' / ' + total + '</div>' +
            '<div style="text-align:center;margin-top:10px">Urdu Reading advanced to level ' + newLevel + '!</div>' +
            '<button class="btn green" style="margin-top:20px" onclick="showMenu()">Back to Menu</button></div>';
    } else {
        document.getElementById('app').innerHTML =
            '<div class="card"><div class="title">Nice try 💪</div>' +
            '<div style="text-align:center;font-size:28px">' + score + ' / ' + total + '</div>' +
            '<div style="text-align:center;margin-top:10px">Keep practicing this level.</div>' +
            '<button class="btn green" style="margin-top:20px" onclick="showMenu()">Back to Menu</button></div>';
    }
}
