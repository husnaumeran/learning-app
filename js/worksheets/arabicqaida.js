// ============ ARABIC QAIDA ============
function showArabicQaida() {
    const levels = [
        {name:'Letters (حروف)', key:'qaida_l1', icon:'🔤'},
        {name:'Harakat (حركات)', key:'qaida_l2', icon:'🔊'},
        {name:'Connections (مركبات)', key:'qaida_l3', icon:'🔗'},
        {name:'2-Letter (مقطع)', key:'qaida_l4', icon:'📖'},
        {name:'3-Letter Words (كلمات)', key:'qaida_l5', icon:'📚'}
    ];
    const REQUIRED_COMPLETIONS = 5;

    function getCompletions(level) {
        return JSON.parse(localStorage.getItem(levels[level].key) || '[]');
    }
    function isUnlocked(level) {
        if (level === 0) return true;
        const override = parseInt(localStorage.getItem('qaida_unlocked') || '0');
        if (override >= level) return true;
        return getCompletions(level - 1).length >= REQUIRED_COMPLETIONS;
    }
    function addCompletion(level) {
        const key = levels[level].key;
        const completions = getCompletions(level);
        const today = new Date().toISOString().split('T')[0];
        if (!completions.includes(today)) { completions.push(today); localStorage.setItem(key, JSON.stringify(completions)); }
    }

    function showLevelPicker() {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl;color:#22c55e">📖 القاعدة — Arabic Qaida</div>';
        levels.forEach((l, i) => {
            const unlocked = isUnlocked(i);
            const completions = getCompletions(i);
            const progress = Math.min(completions.length, REQUIRED_COMPLETIONS);
            const bgColor = unlocked ? '#1a5e1a' : '#333';
            const cursor = unlocked ? 'pointer' : 'default';
            html += '<div style="background:'+bgColor+';padding:15px;border-radius:12px;margin:8px 0;cursor:'+cursor+';display:flex;align-items:center;gap:12px" ';
            if (unlocked) html += 'onclick="startLevel('+i+')"';
            else html += 'data-level="'+i+'" ontouchstart="this.holdTimer=setTimeout(()=>{forceUnlock('+i+')},3000)" ontouchend="clearTimeout(this.holdTimer)" onmousedown="this.holdTimer=setTimeout(()=>{forceUnlock('+i+')},3000)" onmouseup="clearTimeout(this.holdTimer)"';
            html += '>';
            html += '<span style="font-size:28px">'+(unlocked ? l.icon : '🔒')+'</span>';
            html += '<div style="flex:1"><div style="color:white;font-size:18px">Level '+(i+1)+': '+l.name+'</div>';
            if (unlocked) {
                html += '<div style="color:#aaa;font-size:12px">Practiced: '+progress+' / '+REQUIRED_COMPLETIONS+' days</div>';
                html += '<div style="background:#444;border-radius:4px;height:6px;margin-top:4px"><div style="background:#22c55e;border-radius:4px;height:6px;width:'+(progress/REQUIRED_COMPLETIONS*100)+'%"></div></div>';
            } else {
                html += '<div style="color:#666;font-size:12px">Complete Level '+i+' more to unlock (hold 3s to override)</div>';
            }
            html += '</div></div>';
        });
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    window.forceUnlock = (level) => {
        const current = parseInt(localStorage.getItem('qaida_unlocked') || '0');
        if (level > current) { localStorage.setItem('qaida_unlocked', level); showLevelPicker(); speak('Level unlocked!'); }
    };

    window.startLevel = (level) => {
        if (level === 0) levelLetters();
        else if (level === 1) levelHarakat();
        else if (level === 2) levelConnections();
        else if (level === 3) level2Letter();
        else if (level === 4) level3Letter();
    };

    // ===== LEVEL 1: Individual Letters =====
    function levelLetters() {
        const letters = ARABIC_LETTERS.slice(0, CONFIG.focusNumber);
        let current = 0;
        function render() {
            const l = letters[current];
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#22c55e;direction:rtl">Level 1: Letters 🔤</div>';
            html += '<div style="text-align:center;font-size:100px;margin:15px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakArabic(\''+l.name+'\')">'+l.letter+'</div>';
            html += '<div style="text-align:center;color:white;font-size:24px">'+l.name+'</div>';
            html += '<button class="btn green" style="font-size:20px;padding:12px 25px;margin:10px auto;display:block" onclick="speakArabic(\''+l.name+'\')">🔊 Listen</button>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevQL()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextQL()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.prevQL = () => { if (current > 0) { current--; render(); } };
        window.nextQL = () => { current++; if (current >= letters.length) { addCompletion(0); completeWorksheet('Arabic Qaida L1', letters.length, letters.length); return; } render(); };
        render();
    }

    // ===== LEVEL 2: Harakat =====
    function levelHarakat() {
        const letters = ARABIC_LETTERS.slice(0, CONFIG.focusNumber);
        let current = 0, harakatMode = 0;
        const harakatNames = ['فَتْحَة (Fatha)', 'كَسْرَة (Kasra)', 'ضَمَّة (Damma)'];
        const harakatKeys = ['fatha', 'kasra', 'damma'];
        const soundKeys = ['sf', 'sk', 'sd'];
        function render() {
            const l = letters[current];
            const display = l[harakatKeys[harakatMode]];
            const sound = l[soundKeys[harakatMode]];
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#22c55e;direction:rtl">Level 2: Harakat 🔊</div>';
            html += '<div style="text-align:center;font-size:80px;margin:10px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakArabic(\''+sound+'\')">'+display+'</div>';
            html += '<div style="text-align:center;color:white;font-size:22px;margin:5px">'+sound+'</div>';
            html += '<div style="display:flex;justify-content:center;gap:8px;margin:10px 0">';
            harakatNames.forEach((h, i) => {
                const active = i === harakatMode ? 'background:#22c55e;color:white' : 'background:#444;color:#aaa';
                html += '<button style="padding:8px 12px;border-radius:8px;border:none;font-size:13px;cursor:pointer;'+active+'" onclick="setQH('+i+')">'+h+'</button>';
            });
            html += '</div>';
            html += '<div style="display:flex;justify-content:center;gap:15px;margin:10px 0">';
            [{key:'fatha',skey:'sf',color:'#22c55e'},{key:'kasra',skey:'sk',color:'#0099FF'},{key:'damma',skey:'sd',color:'#FF6B35'}].forEach(h => {
                html += '<div style="text-align:center;cursor:pointer;padding:10px;border-radius:10px;background:#333" onclick="speakArabic(\''+l[h.skey]+'\')"><div style="font-size:36px;font-family:serif;direction:rtl">'+l[h.key]+'</div><div style="color:'+h.color+';font-size:16px">'+l[h.skey]+'</div></div>';
            });
            html += '</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:10px"><button class="key" onclick="prevQH()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextQH()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.setQH = (m) => { harakatMode = m; render(); };
        window.prevQH = () => { if (current > 0) { current--; render(); } };
        window.nextQH = () => { current++; if (current >= letters.length) { addCompletion(1); completeWorksheet('Arabic Qaida L2', letters.length, letters.length); return; } render(); };
        render();
    }

    // ===== LEVEL 3: Letter Connections =====
    function levelConnections() {
        const letters = ARABIC_LETTERS.slice(0, CONFIG.focusNumber);
        let current = 0;
        function render() {
            const l = letters[current];
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#22c55e;direction:rtl">Level 3: Connections 🔗</div>';
            html += '<div style="text-align:center;font-size:60px;margin:10px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakArabic(\''+l.name+'\')">'+l.letter+'</div>';
            html += '<div style="display:flex;justify-content:center;gap:20px;margin:15px 0;direction:rtl">';
            [{form:'initial',label:'Beginning'},{form:'medial',label:'Middle'},{form:'final',label:'End'}].forEach(f => {
                html += '<div style="text-align:center;padding:12px 15px;background:#333;border-radius:10px"><div style="font-size:40px;font-family:serif;color:white">'+l[f.form]+'</div><div style="color:#22c55e;font-size:13px;margin-top:5px">'+f.label+'</div></div>';
            });
            html += '</div>';
            html += '<div style="text-align:center;color:#aaa;font-size:16px">'+l.name+'</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevQC()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextQC()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.prevQC = () => { if (current > 0) { current--; render(); } };
        window.nextQC = () => { current++; if (current >= letters.length) { addCompletion(2); completeWorksheet('Arabic Qaida L3', letters.length, letters.length); return; } render(); };
        render();
    }

    // ===== LEVEL 4: 2-Letter Combos =====
    function level2Letter() {
        const words = ARABIC_2LETTER.slice(0, CONFIG.focusNumber);
        let current = 0;
        function render() {
            const w = words[current];
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#22c55e;direction:rtl">Level 4: 2-Letter 📖</div>';
            html += '<div style="text-align:center;font-size:72px;margin:20px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakArabic(\''+w.sound+'\')">'+w.word+'</div>';
            html += '<button class="btn green" style="font-size:22px;padding:12px 25px;margin:10px auto;display:block" onclick="speakArabic(\''+w.sound+'\')">🔊 '+w.sound+'</button>';
            html += '<div style="text-align:center;color:#aaa;font-size:18px;margin:10px">'+w.meaning+'</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevQ2()">← Prev</button><span class="score">'+(current+1)+' / '+words.length+'</span><button class="key green" onclick="nextQ2()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.prevQ2 = () => { if (current > 0) { current--; render(); } };
        window.nextQ2 = () => { current++; if (current >= words.length) { addCompletion(3); completeWorksheet('Arabic Qaida L4', words.length, words.length); return; } render(); };
        render();
    }

    // ===== LEVEL 5: 3-Letter Words =====
    function level3Letter() {
        const words = ARABIC_3LETTER.slice(0, CONFIG.focusNumber);
        let current = 0;
        function render() {
            const w = words[current];
            let html = '<button class="back" onclick="showArabicQaida()">← Back</button><div class="card">';
            html += '<div class="title" style="color:#22c55e;direction:rtl">Level 5: 3-Letter Words 📚</div>';
            html += '<div style="text-align:center;font-size:72px;margin:20px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakArabic(\''+w.sound+'\')">'+w.word+'</div>';
            html += '<button class="btn green" style="font-size:22px;padding:12px 25px;margin:10px auto;display:block" onclick="speakArabic(\''+w.sound+'\')">🔊 '+w.sound+'</button>';
            html += '<div style="text-align:center;color:#aaa;font-size:18px;margin:10px">'+w.meaning+'</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevQ3()">← Prev</button><span class="score">'+(current+1)+' / '+words.length+'</span><button class="key green" onclick="nextQ3()">Next →</button></div></div>';
            document.getElementById('app').innerHTML = html;
        }
        window.prevQ3 = () => { if (current > 0) { current--; render(); } };
        window.nextQ3 = () => { current++; if (current >= words.length) { addCompletion(4); completeWorksheet('Arabic Qaida L5', words.length, words.length); return; } render(); };
        render();
    }

    showLevelPicker();
}
