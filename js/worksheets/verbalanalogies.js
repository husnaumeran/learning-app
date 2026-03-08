// ============ VERBAL ANALOGIES (CogAT Prep) ============
function showVerbalAnalogies() {
    const QUESTIONS = CONFIG.focusNumber;
    const MIN_FOR_UNLOCK = 5;
    const LEVELS = [
        null,
        {
            name:'Opposites', conn:' means ',
            pairs:[
                {a:'big',b:'small',ea:'🐘',eb:'🐭'},
                {a:'hot',b:'cold',ea:'🔥',eb:'❄️'},
                {a:'up',b:'down',ea:'⬆️',eb:'⬇️'},
                {a:'happy',b:'sad',ea:'😊',eb:'😢'},
                {a:'fast',b:'slow',ea:'🐇',eb:'🐢'},
                {a:'day',b:'night',ea:'☀️',eb:'🌙'},
                {a:'open',b:'close',ea:'📖',eb:'📕'},
                {a:'loud',b:'quiet',ea:'🔔',eb:'🤫'},
                {a:'go',b:'stop',ea:'🟢',eb:'🛑'},
                {a:'wet',b:'dry',ea:'🌧️',eb:'☀️'},
                {a:'full',b:'empty',ea:'🥤',eb:'📦'},
                {a:'in',b:'out',ea:'📥',eb:'📤'}
            ]
        },
        {
            name:'Function', conn:' is for ',
            pairs:[
                {a:'pen',b:'write',ea:'🖊️',eb:'✍️'},
                {a:'scissors',b:'cut',ea:'✂️',eb:''},
                {a:'oven',b:'cook',ea:'🍳',eb:'👨‍🍳'},
                {a:'broom',b:'sweep',ea:'🧹',eb:''},
                {a:'phone',b:'call',ea:'📱',eb:'📞'},
                {a:'camera',b:'photo',ea:'📷',eb:'🖼️'},
                {a:'toothbrush',b:'brush',ea:'🪥',eb:''},
                {a:'key',b:'unlock',ea:'🔑',eb:'🔓'},
                {a:'crayon',b:'color',ea:'🖍️',eb:'🎨'},
                {a:'drum',b:'beat',ea:'🥁',eb:'🎵'},
                {a:'soap',b:'wash',ea:'🧼',eb:''},
                {a:'bell',b:'ring',ea:'🔔',eb:'🎶'}
            ]
        },
        {
            name:'Associations', conn:' → ',
            pairs:[
                {a:'rain',b:'umbrella',ea:'🌧️',eb:'☂️'},
                {a:'cold',b:'coat',ea:'❄️',eb:'🧥'},
                {a:'night',b:'moon',ea:'🌃',eb:'🌙'},
                {a:'bee',b:'honey',ea:'🐝',eb:'🍯'},
                {a:'teacher',b:'school',ea:'👩‍🏫',eb:'🏫'},
                {a:'doctor',b:'hospital',ea:'👨‍⚕️',eb:'🏥'},
                {a:'baby',b:'bottle',ea:'👶',eb:'🍼'},
                {a:'fish',b:'water',ea:'🐟',eb:'💧'},
                {a:'bird',b:'nest',ea:'🐦',eb:'🪺'},
                {a:'snow',b:'snowman',ea:'❄️',eb:'⛄'},
                {a:'sun',b:'sunglasses',ea:'☀️',eb:'🕶️'},
                {a:'dog',b:'bone',ea:'🐕',eb:'🦴'}
            ]
        },
        {
            name:'Relational', conn:' → ',
            pairs:[
                {a:'kitten',b:'cat',ea:'🐱',eb:'🐈'},
                {a:'puppy',b:'dog',ea:'🐶',eb:'🐕'},
                {a:'baby',b:'adult',ea:'👶',eb:'🧑'},
                {a:'cub',b:'bear',ea:'🧸',eb:'🐻'},
                {a:'chick',b:'chicken',ea:'🐥',eb:'🐔'},
                {a:'lamb',b:'sheep',ea:'🐑',eb:'🐏'},
                {a:'foal',b:'horse',ea:'🐴',eb:'🐎'},
                {a:'calf',b:'cow',ea:'🐄',eb:'🐮'},
                {a:'duckling',b:'duck',ea:'🐣',eb:'🦆'},
                {a:'caterpillar',b:'butterfly',ea:'🐛',eb:'🦋'},
                {a:'piglet',b:'pig',ea:'🐷',eb:'🐖'},
                {a:'seed',b:'flower',ea:'🌱',eb:'🌸'}
            ]
        },
        {
            name:'Categories', conn:' → ',
            pairs:[
                {a:'dog',b:'animal',ea:'🐕',eb:'🐾'},
                {a:'apple',b:'fruit',ea:'🍎',eb:'🍏'},
                {a:'car',b:'vehicle',ea:'🚗',eb:'🚙'},
                {a:'shirt',b:'clothing',ea:'👕',eb:'👗'},
                {a:'chair',b:'furniture',ea:'🪑',eb:'🛋️'},
                {a:'banana',b:'fruit',ea:'🍌',eb:'🍏'},
                {a:'cat',b:'animal',ea:'🐱',eb:'🐾'},
                {a:'shoe',b:'clothing',ea:'👟',eb:'👗'},
                {a:'carrot',b:'vegetable',ea:'🥕',eb:'🥦'},
                {a:'truck',b:'vehicle',ea:'🚛',eb:'🚙'},
                {a:'bed',b:'furniture',ea:'🛏️',eb:'🛋️'},
                {a:'orange',b:'fruit',ea:'🍊',eb:'🍏'}
            ]
        },
        {
            name:'Parts', conn:' → ',
            pairs:[
                {a:'wheel',b:'car',ea:'🛞',eb:'🚗'},
                {a:'page',b:'book',ea:'📄',eb:'📚'},
                {a:'petal',b:'flower',ea:'🌺',eb:'💐'},
                {a:'branch',b:'tree',ea:'🪵',eb:'🌳'},
                {a:'door',b:'house',ea:'🚪',eb:'🏠'},
                {a:'feather',b:'bird',ea:'🪶',eb:'🐦'},
                {a:'button',b:'shirt',ea:'🔘',eb:'👕'},
                {a:'window',b:'house',ea:'🪟',eb:'🏠'},
                {a:'leaf',b:'tree',ea:'🍃',eb:'🌳'},
                {a:'candle',b:'cake',ea:'🕯️',eb:'🎂'},
                {a:'seed',b:'plant',ea:'🌱',eb:'🪴'},
                {a:'roof',b:'building',ea:'🏗️',eb:'🏢'}
            ]
        }
    ];

    let level = parseInt(localStorage.getItem('va_level') || '1');
    const history = JSON.parse(localStorage.getItem('va_history') || '{}');
    let problems=[], current=0, score=0, skips=0, tried=false;
    let questionStartMs = null;
    const attemptCounts = {};

    function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
    function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}

    function getSpeech(lvl, exA, exB, qA) {
        switch(lvl) {
            case 1: return exA+' means '+exB+'. '+qA+' means?';
            case 2: return 'You use '+exA+' to '+exB+'. You use '+qA+' to?';
            case 3: return exA+' goes with '+exB+'. '+qA+' goes with?';
            case 4: return exA+' grows into '+exB+'. '+qA+' grows into?';
            case 5: return exA+' is a type of '+exB+'. '+qA+' is a type of?';
            case 6: return exA+' is part of '+exB+'. '+qA+' is part of?';
            default: return exA+' and '+exB+'. '+qA+' and?';
        }
    }

    function generateProblems(lvl) {
        const pairs = LEVELS[lvl].pairs;
        const result = [];
        const used = new Set();
        let attempts = 0;
        const bMap = {};
        pairs.forEach(p => { if(p.eb && !bMap[p.b]) bMap[p.b] = p.eb; });

        while (result.length < QUESTIONS && attempts < 200) {
            const sh = shuffle(pairs);
            const ex = sh[0];
            const qCandidates = sh.filter(p => p !== ex && p.b !== ex.b);
            if (!qCandidates.length) { attempts++; continue; }
            const q = qCandidates[0];
            const key = ex.a + ':' + q.a;
            if (used.has(key)) { attempts++; continue; }
            used.add(key);

            const uniqueBs = [...new Set(pairs.filter(p => p.b !== q.b).map(p => p.b))];
            const wrong = shuffle(uniqueBs).slice(0, 3);
            const choices = shuffle([
                {text: q.b, emoji: bMap[q.b]||'', correct: true},
                ...wrong.map(w => ({text: w, emoji: bMap[w]||'', correct: false}))
            ]);
            result.push({ example: ex, question: q, choices });
            attempts++;
        }
        return result;
    }

    function startLevel(l) {
        level = l;
        problems = generateProblems(level);
        current = 0; score = 0; skips = 0; tried = false;
        renderGame();
    }

    function renderPicker() {
        const maxUnlocked = parseInt(localStorage.getItem('va_level') || '1');
        let html = '<button class="back" onclick="showMenu()">← Back</button>';
        html += '<div class="card"><div class="title">🗣️ Verbal Analogies</div>';
        html += '<div class="inst">Pick a level!</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:15px 0">';
        for (let l = 1; l <= 6; l++) {
            const unlocked = l <= maxUnlocked;
            const h = history['L'+l] || [];
            const best = h.length ? Math.max(...h.map(s => s.score)) : 0;
            const bg = !unlocked ? '#555' : (l === maxUnlocked ? '#22c55e' : '#3b82f6');
            html += '<div onclick="' + (unlocked ? 'startVALevel('+l+')' : '') + '" style="background:'+bg+';color:white;padding:15px;border-radius:12px;text-align:center;cursor:'+(unlocked?'pointer':'not-allowed')+';opacity:'+(unlocked?'1':'0.5')+'">';
            html += '<div style="font-size:24px;font-weight:bold">L'+l+'</div>';
            html += '<div style="font-size:11px;margin-top:3px">'+LEVELS[l].name+'</div>';
            if (unlocked && h.length) html += '<div style="font-size:11px;margin-top:2px">Best: '+best+'/'+QUESTIONS+' (×'+h.length+')</div>';
            html += '</div>';
        }
        html += '</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.startVALevel = function(l) { startLevel(l); };

    function renderGame() {
        if (current >= problems.length) {
            const key = 'L' + level;
            const h = history[key] || [];
            const answered = QUESTIONS - skips;
            const qualifies = answered >= MIN_FOR_UNLOCK && (skips / QUESTIONS) <= 0.25;
            h.push({score, skips, qualifies});
            history[key] = h;
            localStorage.setItem('va_history', JSON.stringify(history));

            const maxUnlocked = parseInt(localStorage.getItem('va_level') || '1');
            const threshold = Math.ceil(QUESTIONS * 0.8);
            const qualifying = h.filter(s => s.qualifies).slice(-3);
            if (qualifying.length >= 3 && qualifying.every(s => s.score >= threshold) && level >= maxUnlocked && level < 6) {
                localStorage.setItem('va_level', String(level + 1));
            }
            completeWorksheet('Verbal Analogies', score, QUESTIONS);
            return;
        }

        const p = problems[current];
        const conn = LEVELS[level].conn;
        let html = '<button class="back" onclick="showMenu()">← Back</button>';
        html += '<div class="card"><div class="title">🗣️ Verbal Analogies</div>';
        html += '<div style="text-align:center;font-size:18px;color:#888;margin-bottom:5px">'+(current+1)+' / '+problems.length+'</div>';
        html += '<div class="inst">Level '+level+': '+LEVELS[level].name+'</div>';

        // Example pair (green)
        html += '<div style="text-align:center;padding:15px;background:#e8f5e9;border-radius:12px;margin:10px 0;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:5px">';
        if(p.example.ea) html += '<span style="font-size:32px">'+p.example.ea+'</span>';
        html += '<span style="font-size:22px;font-weight:bold">'+cap(p.example.a)+'</span>';
        html += '<span style="font-size:18px;color:#666">'+conn+'</span>';
        if(p.example.eb) html += '<span style="font-size:32px">'+p.example.eb+'</span>';
        html += '<span style="font-size:22px;font-weight:bold">'+cap(p.example.b)+'</span>';
        html += '</div>';

        // Question pair (orange)
        html += '<div style="text-align:center;padding:15px;background:#fff3e0;border-radius:12px;margin:10px 0;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:5px">';
        if(p.question.ea) html += '<span style="font-size:32px">'+p.question.ea+'</span>';
        html += '<span style="font-size:22px;font-weight:bold">'+cap(p.question.a)+'</span>';
        html += '<span style="font-size:18px;color:#666">'+conn+'</span>';
        html += '<span style="font-size:36px">❓</span>';
        html += '</div>';

        // 4 choices
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px">';
        p.choices.forEach((ch, i) => {
            html += '<div id="vach'+i+'" onclick="pickVA('+i+')" style="display:flex;align-items:center;justify-content:center;gap:5px;padding:15px;background:white;border:3px solid #ddd;border-radius:12px;cursor:pointer;min-height:60px;transition:all 0.2s">';
            if(ch.emoji) html += '<span style="font-size:24px">'+ch.emoji+'</span>';
            html += '<span style="font-size:18px;font-weight:bold">'+cap(ch.text)+'</span>';
            html += '</div>';
        });
        html += '</div>';

        // Skip
        html += '<div style="text-align:center;margin-top:12px">';
        html += '<span onclick="skipVA()" style="color:#aaa;font-size:14px;cursor:pointer;text-decoration:underline">Skip →</span>';
        html += '</div></div>';

        document.getElementById('app').innerHTML = html;
        tried = false;
        questionStartMs = Date.now();

        // Speak the analogy
        speak(getSpeech(level, cap(p.example.a), cap(p.example.b), cap(p.question.a)));
    }

    window.pickVA = function(i) {
        const responseTimeMs = Date.now() - questionStartMs;
        attemptCounts[current] = (attemptCounts[current] || 0) + 1;
        const p = problems[current];
        const ch = p.choices[i];
        const el = document.getElementById('vach'+i);
        if(ch.correct) {
            if(!tried) score++;
            currentAnswers.push({q:p.example.a+'→'+p.example.b+', '+p.question.a+'→?', answer:ch.text, correct:true, firstTry:!tried});
            recordResponse('verbal_analogies', {type:'verbal_analogies', example_a:p.example.a, example_b:p.example.b, question_a:p.question.a, correct_answer:p.question.b}, p.question.b, ch.text, true, attemptCounts[current]===1, attemptCounts[current], responseTimeMs, current, false, level);
            el.style.borderColor = '#22c55e';
            el.style.background = '#dcfce7';
            showFeedback(true);
            setTimeout(() => { current++; renderGame(); }, 1200);
        } else {
            tried = true;
            recordResponse('verbal_analogies', {type:'verbal_analogies', example_a:p.example.a, example_b:p.example.b, question_a:p.question.a, correct_answer:p.question.b}, p.question.b, ch.text, false, attemptCounts[current]===1, attemptCounts[current], responseTimeMs, current, false, level);
            el.style.borderColor = '#ef4444';
            el.style.background = '#fee2e2';
            el.style.opacity = '0.5';
            el.onclick = null;
            showFeedback(false);
        }
    };

    window.skipVA = function() {
        const responseTimeMs = Date.now() - questionStartMs;
        skips++;
        currentAnswers.push({q:problems[current].question.a+'→?', answer:'skipped', correct:false, firstTry:false});
        recordResponse('verbal_analogies', {type:'verbal_analogies', question_a:problems[current].question.a}, problems[current].question.b, 'skipped', false, false, 1, responseTimeMs, current, true, level);
        current++;
        renderGame();
    };

    renderPicker();
}
