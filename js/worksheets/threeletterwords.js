// ============ 3-LETTER WORDS ============
function showThreeLetter() {
    const words = [...CONFIG.threeLetterWords].sort(() => Math.random()-0.5).slice(0, getFocusNumber('three_letter_words'));
    let current = 0;

    function render() {
        startItemTimer();
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Read the Word!</div>';
        html += '<div class="bigword">'+words[current]+'</div>';
        html += '<button class="btn green" onclick="nextWord3()">Next →</button>';
        html += '<div class="score">'+(current+1)+' / '+words.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.nextWord3 = () => {
        recordPassiveResponse('three_letter_words', {word: words[current]}, current);
        current++;
        if (current >= words.length) { completeWorksheet('3-Letter Words', words.length, words.length); return; }
        render();
    };
    render();
}