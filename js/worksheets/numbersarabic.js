// ============ NUMBERS ARABIC ============
// Progressive levels: L1 learn 1-5, L2 learn 1-10, L3 practice 1-10, L4 learn 1-15, L5 practice 1-15
function showNumbersArabic() {
    const SKILL_ID = 'numbers_arabic';
    const STORAGE_KEY = 'na_level';
    const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
    const QUIZ_COUNT = 5;
    const PRACTICE_COUNT = 8;
    const LEVELS = [
        { type: 'learn', teach: [1, 5], quiz: [1, 5] },
        { type: 'learn', teach: [6, 10], quiz: [1, 10] },
        { type: 'practice', range: [1, 10] },
        { type: 'learn', teach: [11, 15], quiz: [1, 15] },
        { type: 'practice', range: [1, 15] }
    ];

    let level = parseInt(localStorage.getItem(STORAGE_KEY) || '1');

    function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
    function makeRange(a, b) { return Array.from({ length: b - a + 1 }, (_, i) => i + a); }
    function dn(n) { return String(n).split('').map(d => ARABIC_DIGITS[parseInt(d)]).join(''); }
    function say(n) { speakArabic(String(n)); }
    function pickChoices(correct, pool, count) { return shuffle([correct, ...shuffle(pool.filter(x => x !== correct)).slice(0, count)]); }

    const LEVEL_NAMES = [
        'Learn ' + dn(1) + '–' + dn(5),
        'Learn ' + dn(6) + '–' + dn(10),
        'Practice ' + dn(1) + '–' + dn(10),
        'Learn ' + dn(11) + '–' + dn(15),
        'Practice ' + dn(1) + '–' + dn(15)
    ];

    // ==================== LEVEL PICKER ====================
    function showLevelPicker() {
        let h = '<button class="back" onclick="showMenu()">← Back</button>';
        h += '<div class="card"><div class="title" style="color:#22c55e">🔢 عربی Arabic Numbers</div>';
        h += '<div class="inst">Pick a level:</div>';
        for (let i = 0; i < 5; i++) {
            const unlocked = i + 1 <= level, done = i + 1 < level;
            h += '<button class="' + (unlocked ? 'btn blue' : 'btn') + '" onclick="goNALevel(' + (i + 1) + ')" ' + (unlocked ? '' : 'disabled') + ' style="font-size:18px;padding:12px;margin:6px 0;width:100%">' + (done ? '✅' : unlocked ? '▶️' : '🔒') + ' Level ' + (i + 1) + ': ' + LEVEL_NAMES[i] + '</button>';
        }
        h += '</div>';
        document.getElementById('app').innerHTML = h;
    }

    window.goNALevel = function(l) { LEVELS[l - 1].type === 'learn' ? startLearn(l) : startPractice(l); };
    window.showNALevelPicker = showLevelPicker;

    // ==================== LEARN (L1, L2, L4) ====================
    function startLearn(lvl) {
        const cfg = LEVELS[lvl - 1], run = Math.random().toString(36).slice(2, 6);
        const teachNums = makeRange(cfg.teach[0], cfg.teach[1]);
        const quizPool = makeRange(cfg.quiz[0], cfg.quiz[1]);
        let fIdx = 0, qNums, qIdx = 0, score = 0, tried = false, t0;

        function flash() {
            const n = teachNums[fIdx];
            let h = '<button class="back" onclick="showNALevelPicker()">← Back</button>';
            h += '<div class="card"><div class="title" style="color:#22c55e">🔢 Level ' + lvl + ': ' + LEVEL_NAMES[lvl - 1] + '</div>';
            h += '<div class="inst">Learn the Arabic numbers!</div>';
            h += '<div style="text-align:center;font-size:18px;color:#888">' + (fIdx + 1) + ' / ' + teachNums.length + '</div>';
            h += '<div style="text-align:center;margin:25px 0">';
            h += '<div style="font-size:90px;font-weight:bold;direction:rtl;cursor:pointer" onclick="playNAFlash()">' + dn(n) + '</div>';
            h += '<div style="font-size:40px;color:#666;margin-top:10px">= ' + n + '</div>';
            h += '<button onclick="playNAFlash()" style="font-size:40px;background:none;border:none;cursor:pointer;margin-top:10px">🔊</button>';
            h += '</div><button class="btn green" onclick="nextNAFlash()" style="font-size:20px;padding:15px">Next →</button></div>';
            document.getElementById('app').innerHTML = h;
            startItemTimer();
            setTimeout(function() { say(n); }, 400);
        }

        window.playNAFlash = function() { say(teachNums[fIdx]); };
        window.nextNAFlash = function() {
            recordPassiveResponse(SKILL_ID, { type: 'flash', number: teachNums[fIdx], display: dn(teachNums[fIdx]) }, 'L' + lvl + '_' + run + '_f' + fIdx);
            fIdx++;
            if (fIdx < teachNums.length) flash();
            else { qNums = shuffle([].concat(quizPool)).slice(0, QUIZ_COUNT); quiz(); }
        };

        function quiz() {
            if (qIdx >= qNums.length) { finishLevel(); return; }
            var n = qNums[qIdx], choices = pickChoices(n, quizPool, 3);
            tried = false; t0 = Date.now();
            let h = '<button class="back" onclick="showNALevelPicker()">← Back</button>';
            h += '<div class="card"><div class="title" style="color:#22c55e">🔢 Quiz: What number is this?</div>';
            h += '<div style="text-align:center;font-size:18px;color:#888">' + (qIdx + 1) + ' / ' + qNums.length + '</div>';
            h += '<div style="text-align:center;margin:20px 0">';
            h += '<div style="font-size:80px;font-weight:bold;direction:rtl;cursor:pointer" onclick="playNAFlash()">' + dn(n) + '</div>';
            h += '<button onclick="playNAFlash()" style="font-size:36px;background:none;border:none;cursor:pointer">🔊</button>';
            h += '</div><div class="choices">';
            choices.forEach(function(c) { h += '<button class="btn choice" onclick="pickNAQuiz(' + c + ',' + n + ',this)" style="font-size:28px;padding:15px;min-width:80px">' + c + '</button>'; });
            h += '</div></div>';
            document.getElementById('app').innerHTML = h;
            window.playNAFlash = function() { say(n); };
            setTimeout(function() { say(n); }, 300);
        }

        window.pickNAQuiz = function(picked, correct, btn) {
            var ok = picked === correct, first = !tried; tried = true;
            var ms = Date.now() - t0;
            if (ok) {
                if (first) score++;
                btn.style.background = '#22c55e'; btn.style.color = '#fff';
                recordResponse(SKILL_ID, { type: 'quiz', number: correct, display: dn(correct) }, String(correct), String(picked), true, first, first ? 1 : 2, ms, 'L' + lvl + '_' + run + '_q' + qIdx, false, lvl);
                setTimeout(function() { qIdx++; quiz(); }, 800);
            } else {
                btn.style.background = '#ef4444'; btn.style.color = '#fff'; btn.disabled = true;
                showFeedback(false, dn(correct) + ' = ' + correct);
                if (first) recordResponse(SKILL_ID, { type: 'quiz', number: correct, display: dn(correct) }, String(correct), String(picked), false, true, 1, ms, 'L' + lvl + '_' + run + '_q' + qIdx, false, lvl);
            }
        };

        function finishLevel() {
            if (lvl >= level) { level = lvl + 1; localStorage.setItem(STORAGE_KEY, String(level)); }
            let h = '<div class="card"><div class="title" style="color:#22c55e">🎉 Level ' + lvl + ' Complete!</div>';
            h += '<div style="text-align:center;font-size:60px;margin:15px 0">' + (score >= qNums.length ? '🏆' : score >= Math.ceil(qNums.length * 0.6) ? '💪' : '📚') + '</div>';
            h += '<div style="text-align:center;font-size:24px;margin:10px 0">' + score + ' / ' + qNums.length + '</div></div>';
            document.getElementById('app').innerHTML = h;
            setTimeout(function() { completeWorksheet(SKILL_ID); }, 2000);
        }

        flash();
    }

    // ==================== PRACTICE (L3, L5) ====================
    function startPractice(lvl) {
        const cfg = LEVELS[lvl - 1], run = Math.random().toString(36).slice(2, 6);
        const pool = makeRange(cfg.range[0], cfg.range[1]);
        const total = PRACTICE_COUNT;
        let qi = 0, score = 0, tried = false, t0, _tgt = null;

        // Build mode sequence
        const modes = [];
        if (lvl === 3) {
            for (let i = 0; i < total; i++) modes.push(i % 2 === 0 ? 'hear_tap' : 'find');
        } else {
            var seq = ['hear_tap', 'find', 'hear_tap', 'find', 'hear_tap', 'more', 'less', 'hear_tap', 'find', 'closest'];
            for (let i = 0; i < total; i++) modes.push(seq[i % seq.length]);
        }

        function nextQ() {
            if (qi >= total) { finishP(); return; }
            tried = false; t0 = Date.now();
            var m = modes[qi];
            if (m === 'hear_tap') hearTap();
            else if (m === 'find') findNum();
            else if (m === 'more') moreLess('more');
            else if (m === 'less') moreLess('less');
            else closestQ();
        }

        // --- Hear & Tap: hear number, tap Urdu digit ---
        function hearTap() {
            var n = pool[Math.floor(Math.random() * pool.length)];
            _tgt = n;
            var ch = pickChoices(n, pool, 3);
            let h = '<button class="back" onclick="showNALevelPicker()">← Back</button>';
            h += '<div class="card"><div class="title" style="color:#22c55e">🔊 Hear & Tap</div>';
            h += '<div style="text-align:center;font-size:18px;color:#888">' + (qi + 1) + ' / ' + total + '</div>';
            h += '<div style="text-align:center;margin:20px 0">';
            h += '<button onclick="playNAP()" style="font-size:60px;background:none;border:none;cursor:pointer">🔊</button>';
            h += '<div style="font-size:18px;color:#888;margin-top:5px">Tap the number you hear</div>';
            h += '</div><div class="choices">';
            ch.forEach(function(c) { h += '<button class="btn choice" onclick="pickNAP(' + c + ',' + n + ',\'hear_tap\',this)" style="font-size:44px;padding:18px;min-width:90px;direction:rtl">' + dn(c) + '</button>'; });
            h += '</div></div>';
            document.getElementById('app').innerHTML = h;
            window.playNAP = function() { say(n); };
            setTimeout(function() { say(n); }, 400);
        }

        // --- Find the Number: see Urdu digit, pick English ---
        function findNum() {
            var n = pool[Math.floor(Math.random() * pool.length)];
            _tgt = n;
            var ch = pickChoices(n, pool, 3);
            let h = '<button class="back" onclick="showNALevelPicker()">← Back</button>';
            h += '<div class="card"><div class="title" style="color:#22c55e">🔢 Find the Number</div>';
            h += '<div style="text-align:center;font-size:18px;color:#888">' + (qi + 1) + ' / ' + total + '</div>';
            h += '<div style="text-align:center;margin:20px 0">';
            h += '<div style="font-size:80px;font-weight:bold;direction:rtl;cursor:pointer" onclick="playNAP()">' + dn(n) + '</div>';
            h += '<button onclick="playNAP()" style="font-size:36px;background:none;border:none;cursor:pointer">🔊</button>';
            h += '<div style="font-size:18px;color:#888;margin-top:5px">What number is this?</div>';
            h += '</div><div class="choices">';
            ch.forEach(function(c) { h += '<button class="btn choice" onclick="pickNAP(' + c + ',' + n + ',\'find\',this)" style="font-size:28px;padding:15px;min-width:80px">' + c + '</button>'; });
            h += '</div></div>';
            document.getElementById('app').innerHTML = h;
            window.playNAP = function() { say(n); };
            setTimeout(function() { say(n); }, 300);
        }

        // --- More / Less ---
        function moreLess(dir) {
            var lo = cfg.range[0], hi = cfg.range[1];
            var tgt;
            if (dir === 'more') { var mn = lo + 2, mx = hi - 1; tgt = mn + Math.floor(Math.random() * (mx - mn + 1)); }
            else { var mn = lo + 1, mx = hi - 2; tgt = mn + Math.floor(Math.random() * (mx - mn + 1)); }
            _tgt = tgt;
            var eligible = pool.filter(function(x) { return dir === 'more' ? x > tgt : x < tgt; });
            var correct = eligible[Math.floor(Math.random() * eligible.length)];
            var wrongs = shuffle(pool.filter(function(x) { return x !== correct && (dir === 'more' ? x <= tgt : x >= tgt); })).slice(0, 3);
            var ch = shuffle([correct].concat(wrongs));
            var label = dir === 'more' ? 'MORE' : 'LESS';
            let h = '<button class="back" onclick="showNALevelPicker()">← Back</button>';
            h += '<div class="card"><div class="title" style="color:#22c55e">' + (dir === 'more' ? '📈' : '📉') + ' Which is ' + label + '?</div>';
            h += '<div style="text-align:center;font-size:18px;color:#888">' + (qi + 1) + ' / ' + total + '</div>';
            h += '<div style="text-align:center;margin:20px 0">';
            h += '<div style="font-size:60px;font-weight:bold;direction:rtl">' + dn(tgt) + '</div>';
            h += '<div style="font-size:20px;color:#666;margin-top:5px">= ' + tgt + '</div>';
            h += '<div style="font-size:18px;color:#888;margin-top:10px">Which is <b>' + label + '</b> than ' + tgt + '?</div>';
            h += '</div><div class="choices">';
            ch.forEach(function(c) { h += '<button class="btn choice" onclick="pickNAP(' + c + ',' + correct + ',\'' + dir + '\',this)" style="font-size:36px;padding:15px;min-width:90px;direction:rtl">' + dn(c) + ' <span style="font-size:16px;color:#888">(' + c + ')</span></button>'; });
            h += '</div></div>';
            document.getElementById('app').innerHTML = h;
            window.playNAP = function() { say(tgt); };
        }

        // --- Closest ---
        function closestQ() {
            var n = pool[Math.floor(Math.random() * pool.length)];
            _tgt = n;
            var others = pool.filter(function(x) { return x !== n; }).sort(function(a, b) { return Math.abs(a - n) - Math.abs(b - n); });
            var best = others[0], bestDist = Math.abs(best - n);
            var further = others.filter(function(x) { return Math.abs(x - n) > bestDist; });
            var wrongs = further.length >= 3 ? shuffle(further).slice(0, 3) : shuffle(others.slice(1)).slice(0, 3);
            var ch = shuffle([best].concat(wrongs));
            let h = '<button class="back" onclick="showNALevelPicker()">← Back</button>';
            h += '<div class="card"><div class="title" style="color:#22c55e">🎯 Which is closest?</div>';
            h += '<div style="text-align:center;font-size:18px;color:#888">' + (qi + 1) + ' / ' + total + '</div>';
            h += '<div style="text-align:center;margin:20px 0">';
            h += '<div style="font-size:60px;font-weight:bold;direction:rtl">' + dn(n) + '</div>';
            h += '<div style="font-size:20px;color:#666;margin-top:5px">= ' + n + '</div>';
            h += '<div style="font-size:18px;color:#888;margin-top:10px">Which is <b>closest</b> to ' + n + '?</div>';
            h += '</div><div class="choices">';
            ch.forEach(function(c) { h += '<button class="btn choice" onclick="pickNAP(' + c + ',' + best + ',\'closest\',this)" style="font-size:36px;padding:15px;min-width:90px;direction:rtl">' + dn(c) + ' <span style="font-size:16px;color:#888">(' + c + ')</span></button>'; });
            h += '</div></div>';
            document.getElementById('app').innerHTML = h;
            window.playNAP = function() { say(n); };
        }

        // --- Shared answer handler ---
        window.pickNAP = function(picked, correct, mode, btn) {
            var ok;
            if (mode === 'closest') ok = Math.abs(picked - _tgt) <= Math.abs(correct - _tgt);
            else ok = picked === correct;
            var first = !tried; tried = true;
            var ms = Date.now() - t0;
            var qd;
            if (mode === 'more' || mode === 'less' || mode === 'closest') {
                qd = { type: mode, target: _tgt, target_display: dn(_tgt), answer: correct, answer_display: dn(correct) };
            } else {
                qd = { type: mode, number: correct, display: dn(correct) };
            }
            if (ok) {
                if (first) score++;
                btn.style.background = '#22c55e'; btn.style.color = '#fff';
                showFeedback(true);
                recordResponse(SKILL_ID, qd, String(correct), String(picked), true, first, first ? 1 : 2, ms, 'L' + lvl + '_' + run + '_q' + qi, false, lvl);
                setTimeout(function() { qi++; nextQ(); }, 1000);
            } else {
                btn.style.background = '#ef4444'; btn.style.color = '#fff'; btn.disabled = true;
                showFeedback(false, dn(correct) + ' = ' + correct);
                if (first) recordResponse(SKILL_ID, qd, String(correct), String(picked), false, true, 1, ms, 'L' + lvl + '_' + run + '_q' + qi, false, lvl);
            }
        };

        function finishP() {
            if (lvl >= level) { level = Math.min(lvl + 1, 6); localStorage.setItem(STORAGE_KEY, String(level)); }
            var pct = Math.round(score / total * 100);
            let h = '<div class="card"><div class="title" style="color:#22c55e">🎉 Practice Complete!</div>';
            h += '<div style="text-align:center;font-size:60px;margin:15px 0">' + (pct >= 80 ? '🏆' : pct >= 60 ? '💪' : '📚') + '</div>';
            h += '<div style="text-align:center;font-size:24px;margin:10px 0">' + score + ' / ' + total + '</div></div>';
            document.getElementById('app').innerHTML = h;
            setTimeout(function() { completeWorksheet(SKILL_ID); }, 2000);
        }

        nextQ();
    }

    // ==================== ENTRY ====================
    showLevelPicker();
}
