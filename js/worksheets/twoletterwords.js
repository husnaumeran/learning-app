// ============ 2-LETTER WORDS ============
function showTwoLetter() {
    const words = CONFIG.twoLetterWords.slice(0, CONFIG.focusNumber);
    let current = 0;

    function render() {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Read the Word!</div>';
        html += '<div class="bigword">'+words[current]+'</div>';
        html += '<button class="btn green" onclick="nextWord2()">Next →</button>';
        html += '<div class="score">'+(current+1)+' / '+words.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.nextWord2 = () => { current++; if (current >= words.length) { completeWorksheet('2-Letter Words', words.length, words.length); return; } render(); };
    render();
}