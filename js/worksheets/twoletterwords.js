// ============ 2-LETTER WORDS ============
function showTwoLetter() {
    const level = Math.max(1, Number(getFocusNumber('two_letter_words')) || 1);
    const words = [...CONFIG.twoLetterWords]
        .sort(() => Math.random() - 0.5)
        .slice(0, level);

    let current = 0;

    function render() {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Read the Word!</div>';
        html += '<div class="bigword">' + words[current] + '</div>';
        html += '<button class="btn green" onclick="nextWord2()">Next →</button>';
        html += '<div class="score">' + (current + 1) + ' / ' + words.length + '</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.nextWord2 = () => {
        currentAnswers.push({
            q: words[current],
            answer: words[current],
            correct: true
        });

        current++;

        if (current >= words.length) {
            completeWorksheet('2-Letter Words', words.length, words.length);
            return;
        }

        render();
    };

    render();
}