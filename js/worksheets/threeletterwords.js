// ============ 3-LETTER WORDS ============
function showThreeLetter() {
    const words = CONFIG.threeLetterWords.slice(0, CONFIG.focusNumber);
    let current = 0;

    function render() {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Read the Word!</div>';
        html += '<div class="bigword">'+words[current]+'</div>';
        html += '<button class="btn green" onclick="nextWord3()">Next →</button>';
        html += '<div class="score">'+(current+1)+' / '+words.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.nextWord3 = () => { current++; if (current >= words.length) { completeWorksheet('3-Letter Words', words.length, words.length); return; } render(); };
    render();
}