function showJora() {
    const catNames = Object.keys(CONFIG.categories);
    const cat = catNames[Math.floor(Math.random() * catNames.length)];
    const emojis = CONFIG.categories[cat].sort(() => Math.random() - 0.5).slice(0, 4);
    const cards = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
    let flipped = [], matched = [], score = 0;

    function render() {
        if (matched.length === cards.length) { completeWorksheet('Find Jora', score, 4); return; }
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Find the Jora!</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0">';
        cards.forEach((emoji, i) => {
            const isFlipped = flipped.includes(i) || matched.includes(i);
            html += '<div class="prob" style="justify-content:center;font-size:32px;padding:20px;cursor:pointer;min-height:60px" onclick="flipCard('+i+')">'+(isFlipped ? emoji : '❓')+'</div>';
        });
        html += '</div><div class="score">Pairs: '+score+' / 4</div></div>';
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
                    speak('Jora!');
                    currentAnswers.push({q: 'Found pair', a: cards[flipped[0]], correct: true});
                }

                flipped = [];
                render();
            }, 800);
        }
    };
    render();
}