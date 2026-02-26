// ============ URDU 2-LETTER WORDS ============
function showUrdu2Letter() {
    const words = URDU_WORDS.slice(0, CONFIG.focusNumber);
    let current = 0;

    function render() {
        const w = words[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl">Read the Urdu Word!</div>';
        html += '<div style="text-align:center;font-size:72px;margin:20px;font-family:serif;direction:rtl;cursor:pointer" onclick="speak(\''+w.sound+'\')">'+w.word+'</div>';
        html += '<div style="text-align:center;margin:10px">';
        html += '<button class="btn green" style="font-size:24px;padding:15px 30px;display:inline-block" onclick="speak(\''+w.sound+'\')">🔊 '+w.sound+'</button>';
        html += '</div>';
        html += '<div style="text-align:center;color:#aaa;font-size:18px;margin:10px">'+w.meaning+'</div>';
        html += '<div style="display:flex;justify-content:space-between;margin-top:20px"><button class="key" onclick="prevUrdu2()">← Prev</button><span class="score">'+(current+1)+' / '+words.length+'</span><button class="key green" onclick="nextUrdu2()">Next →</button></div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.prevUrdu2 = () => { if (current > 0) { current--; render(); } };
    window.nextUrdu2 = () => { current++; if (current >= words.length) { completeWorksheet('Urdu 2-Letter Words', words.length, words.length); return; } render(); };
    render();
}
