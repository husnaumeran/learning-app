// ============ 2-LETTER WORDS ============
function showTwoLetter() {
    const words = [...CONFIG.twoLetterWords].sort(() => Math.random()-0.5).slice(0, getQuestionCount('two_letter_words'));
    let current = 0;

    function render() {
        startItemTimer();
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Read the Word!</div>';
        html += '<div class="bigword">'+words[current]+'</div>';
        html += '<button class="btn green" onclick="nextWord2()">Next →</button>';
        html += '<div class="score">'+(current+1)+' / '+words.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.nextWord2 = () => {
        recordPassiveResponse('two_letter_words', {word: words[current]}, current);
        current++;
        if (current >= words.length) { completeWorksheet('2-Letter Words', words.length, words.length); return; }
        render();
    };
    render();
}