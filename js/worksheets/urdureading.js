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
    window.nextUrduRead = async () => {
        current++;
        if (current >= letters.length) {
            completeWorksheet('Urdu Reading', letters.length, letters.length);
            const level = getContentLevel('urdu_reading');
            if (level <= 1) {
                // Auto-advance level 1 after first completion
                const newLevel = 2;
                // Update local storage
                CONFIG.skillSettings['urdu_reading'] = { ...(CONFIG.skillSettings['urdu_reading'] || {}), content_level: newLevel };
                // Debug LOG
                console.log('ATTEMPT SAVE URDU LEVEL (AUTO):', newLevel);
                // Save to db
                const { error } = await sb.from('child_skill_settings').upsert(
                {
                    child_id: CONFIG.childId,
                    skill_id: 'urdu_reading',
                    content_level: newLevel
                },
                { onConflict: 'child_id,skill_id' }
                );
                // Debug result
                console.log('UPSERT ERROR (AUTO):', error);
                // UI
                document.getElementById('app').innerHTML =
                    '<div class="card"><div class="title">Great job! 🎉</div>' +
                    '<div style="text-align:center;margin-top:10px">Urdu Reading advanced to level 2!</div>' +
                    '<button class="btn green" style="margin-top:20px" onclick="showMenu()">Back to Menu</button></div>';
            } else {
                showUrduReadingCheck(letters, !! CONFIG.sessionId);
            }
            return;
        }
        render();
    };
    render();
}

function showUrduReadingCheck(letters, silent = false) {
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
    let questionStartMs = Date.now();

    function render() {
        if (current >= questions.length) { finishUrduReadingCheck(score, questions.length, silent); return; }
        const q = questions[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title">Urdu Reading Check ⭐</div>';
        html += '<div style="text-align:center;color:#888">' + (current + 1) + ' / ' + questions.length + '</div>';
        html += '<div style="text-align:center;font-size:24px;margin:15px 0">Tap the correct letter</div>';
        html += '<div style="text-align:center;font-size:28px;margin:15px 0">' + q.correct.name + '</div>';
        html += '<div style="text-align:center;margin:10px 0"><button class="btn" onclick="speakUrdu(\'' + q.correct.letter + '\')">🔊 Hear</button></div>';
        html += '<div style="display:grid;grid-template-columns:1fr;gap:16px;margin-top:20px">';
        q.choices.forEach((choice, i) => {
            html += '<button class="key" onclick="pickUrduReadingCheck(' + i + ')" style="font-size:64px;padding:20px;font-family:serif;direction:rtl">' + choice.letter + '</button>';
        });
        html += '</div></div>';
        document.getElementById('app').innerHTML = html;
        questionStartMs = Date.now();
    }

    window.pickUrduReadingCheck = function(i) {
        const q = questions[current];
        const correct = q.choices[i].letter === q.correct.letter;
        if (correct) score++;
        const responseTimeMs = Date.now() - questionStartMs;
        recordResponse('urdu_reading',
            { type: 'urdu_reading_check', letter: q.correct.letter, letter_name: q.correct.name },
            q.correct.letter, q.choices[i].letter, correct, true, 1, responseTimeMs, current);
        current++;
        render();
    };

    render();
}

async function finishUrduReadingCheck(score, total, silent = false) {
    const pct = Math.round((score / total) * 100);
    const level = getContentLevel('urdu_reading');

    if (pct >= 80) {
        const newLevel = Math.min(level + 1, URDU_LETTERS.length);
        CONFIG.skillSettings['urdu_reading'] = {
            ...(CONFIG.skillSettings['urdu_reading'] || {}),
            content_level: newLevel
        };

        await sb.from('child_skill_settings').upsert(
            {
                child_id: CONFIG.childId,
                skill_id: 'urdu_reading',
                content_level: newLevel
            },
            { onConflict: 'child_id,skill_id' }
        );

        if (silent) {
            nextWorksheet();
            return;
        }

        document.getElementById('app').innerHTML =
            '<div class="card"><div class="title">Great job! 🎉</div>' +
            '<div style="text-align:center;font-size:28px">' + score + ' / ' + total + '</div>' +
            '<div style="text-align:center;margin-top:10px">Urdu Reading advanced to level ' + newLevel + '!</div>' +
            '<button class="btn green" style="margin-top:20px" onclick="showMenu()">Back to Menu</button></div>';
    } else {
        if (silent) {
            nextWorksheet();
            return;
        }

        document.getElementById('app').innerHTML =
            '<div class="card"><div class="title">Nice try 💪</div>' +
            '<div style="text-align:center;font-size:28px">' + score + ' / ' + total + '</div>' +
            '<div style="text-align:center;margin-top:10px">Keep practicing this level.</div>' +
            '<button class="btn green" style="margin-top:20px" onclick="showMenu()">Back to Menu</button></div>';
    }
}

async function speakUrdu(letter, harakat = 'fatha') {
    const URDU_MAP = {
        'ا': 'alif',
        'ب': 'bay',
        'پ': 'pey',
        'ت': 'ta',
        'ٹ': 'tey',
        'ث': 'tha',
        'ج': 'jiim',
        'چ': 'chey',
        'ح': 'hha',
        'خ': 'kha',
        'د': 'daal',
        'ڈ': 'daaal',
        'ذ': 'thaal',
        'ر': 'ra',
        'ڑ': 'rey',
        'ز': 'zay',
        'ژ': 'zhey',
        'س': 'siin',
        'ش': 'shiin',
        'ص': 'saad',
        'ض': 'daad',
        'ط': 'taa',
        'ظ': 'thaa',
        'ع': 'ayn',
        'غ': 'ghayn',
        'ف': 'fa',
        'ق': 'qaf',
        'ک': 'kaf',
        'گ': 'gaaf',
        'ل': 'lam',
        'م': 'miim',
        'ن': 'nuun',
        'و': 'waw',
        'ہ': 'he',
        'ی': 'ya'
    };

    const ARABIC_MAP = {
        'ا': 'alif',
        'ب': 'baa',
        'ت': 'ta',
        'ث': 'tha',
        'ج': 'jiim',
        'ح': 'hha',
        'خ': 'kha',
        'د': 'daal',
        'ذ': 'thaal',
        'ر': 'ra',
        'ز': 'zay',
        'س': 'siin',
        'ش': 'shiin',
        'ص': 'saad',
        'ض': 'daad',
        'ط': 'taa',
        'ظ': 'thaa',
        'ع': 'ayn',
        'غ': 'ghayn',
        'ف': 'fa',
        'ق': 'qaf',
        'ک': 'kaf',
        'ل': 'lam',
        'م': 'miim',
        'ن': 'nuun',
        'و': 'waw',
        'ی': 'ya'
    };

    const basePath = '/learning-app/audio/letters/';
    const candidates = [];

    const urduName = URDU_MAP[letter];
    const arabicName = ARABIC_MAP[letter];

    if (urduName) {
        candidates.push(`${basePath}ur_${urduName}_letter.ogg`);
    }

    if (arabicName) {
        candidates.push(`${basePath}ar_${arabicName}_letter.ogg`);
    }

    for (const src of candidates) {
        try {
            await playAudioFile(src);
            return;
        } catch (e) {
            console.warn('Audio failed:', src);
        }
    }

    try {
        const utter = new SpeechSynthesisUtterance(letter);
        utter.lang = 'ur-PK';
        speechSynthesis.cancel();
        speechSynthesis.speak(utter);
    } catch (e) {
        console.error('Urdu speech fallback failed:', e);
    }
}

function playAudioFile(src) {
    return new Promise((resolve, reject) => {
        const audio = new Audio(src);
        let finished = false;

        const cleanup = () => {
            audio.onended = null;
            audio.onerror = null;
            audio.oncanplaythrough = null;
        };

        audio.onended = () => {
            if (finished) return;
            finished = true;
            cleanup();
            resolve();
        };

        audio.onerror = (e) => {
            if (finished) return;
            finished = true;
            cleanup();
            reject(e);
        };

        audio.oncanplaythrough = () => {
            audio.play().catch(err => {
                if (finished) return;
                finished = true;
                cleanup();
                reject(err);
            });
        };

        audio.load();
    });
}