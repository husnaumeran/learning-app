function showJora() {
    const catNames = Object.keys(CONFIG.categories);
    const cat = catNames[Math.floor(Math.random() * catNames.length)];
    const numPairs = Math.min(CONFIG.focusNumber, CONFIG.categories[cat].length);
    const emojis = CONFIG.categories[cat].sort(() => Math.random() - 0.5).slice(0, numPairs);
    const cards = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
    let flipped = [], matched = [], score = 0;

    // Responsive grid: pick columns based on total cards
    const totalCards = cards.length;
    const cols = totalCards <= 8 ? 3 : totalCards <= 12 ? 4 : 4;
    const fontSize = totalCards <= 8 ? 32 : totalCards <= 12 ? 28 : 24;
    const pad = totalCards <= 8 ? 15 : totalCards <= 12 ? 10 : 8;

    function render() {
        if (matched.length === cards.length) { completeWorksheet('Find Pairs', score, emojis.length); return; }
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Find the Pairs! 🧩</div>';
        html += '<div style="display:grid;grid-template-columns:repeat('+cols+',1fr);gap:8px;margin:10px 0">';
        cards.forEach((emoji, i) => {
            const isFlipped = flipped.includes(i) || matched.includes(i);
            const isMatched = matched.includes(i);
            const bg = isMatched ? '#dcfce7' : (isFlipped ? '#fffbeb' : '#f0f4f8');
            const border = isMatched ? '2px solid #22c55e' : (isFlipped ? '2px solid #f59e0b' : '2px solid #ddd');
            html += '<div style="display:flex;align-items:center;justify-content:center;font-size:'+fontSize+'px;padding:'+pad+'px;cursor:pointer;min-height:50px;background:'+bg+';border:'+border+';border-radius:10px;aspect-ratio:1;overflow:hidden" onclick="flipCard('+i+')">'+(isFlipped ? emoji : '❓')+'</div>';
        });
        html += '</div><div style="text-align:center;font-size:20px;margin-top:10px;color:#666">Pairs: '+score+' / '+numPairs+'</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.flipCard = (i) => {
        if (flipped.length >= 2 || flipped.includes(i) || matched.includes(i)) return;
        flipped.push(i);
        render();
        if (flipped.length === 2) {
            setTimeout(() => {
                if (cards[flipped[0]] === cards[flipped[1]]) {
                    matched.push(flipped[0], flipped[1]);
                    score++;
                    currentAnswers.push({q: 'Found pair', a: cards[flipped[0]], correct: true});
                }
                flipped = [];
                render();
            }, 800);
        }
    };
    render();
}
