// ============ MATCH NUMBERS ============
function showMatchNumbers() {
    const pairs = generateMatchPairs(CONFIG.focusNumber);
    let score = 0, selected = null;
    const solved = new Set();
    const nums = pairs.map(p => p[0]).sort(() => Math.random() - 0.5);
    const emojiOrder = pairs.map((_, i) => i).sort(() => Math.random() - 0.5);
    // Ensure no number is next to its matching emoji
    for (let i = 0; i < nums.length; i++) {
        if (nums[i] === pairs[emojiOrder[i]][0]) {
            const swapWith = (i + 1) % nums.length;
            [emojiOrder[i], emojiOrder[swapWith]] = [emojiOrder[swapWith], emojiOrder[i]];
        }
    }

    function render() {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Match Numbers!</div><div class="inst">Tap a number, then tap the matching objects</div>';
        pairs.forEach((_, i) => {
            const [n, emoji] = pairs[emojiOrder[i]];
            const numCls = solved.has(nums[i]) ? 'opacity:0.3' : (selected === nums[i] ? 'background:#fffbeb;border:3px solid #FF6B35' : '');
            const emojiCls = solved.has(n) ? 'opacity:0.3' : '';
            html += '<div style="display:flex;gap:20px;align-items:center;margin:10px 0">';
            html += '<button style="padding:15px 30px;font-size:32px;border-radius:10px;min-width:80px;'+numCls+'" onclick="selectNum('+nums[i]+')">'+nums[i]+'</button>';
            html += '<div class="prob" style="flex:1;font-size:28px;text-align:right;padding-right:20px;margin-left:30px;'+emojiCls+'" onclick="selectEmoji('+n+')">'+emoji+'</div>';
            html += '</div>';
        });
        html += '<div class="score">⭐ '+score+' / '+pairs.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.selectNum = (n) => { if (!solved.has(n)) { selected = n; render(); } };
    window.selectEmoji = (n) => {
        if (!selected || solved.has(n)) return;
        const correct = selected === n;
        currentAnswers.push({q: 'Match '+selected, a: n, correct: correct});
        showFeedback(correct, () => {
            if (correct) { solved.add(n); score++; }
            selected = null;
            if (score === pairs.length) { completeWorksheet('Match Numbers', score, pairs.length); return; }
            render();
        });
    };

    render();
}