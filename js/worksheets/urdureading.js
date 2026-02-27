// ============ URDU READING ============
function showUrduReading() {
    const letters = URDU_LETTERS.slice(0, CONFIG.focusNumber);
    let current = 0;

    function render() {
        const l = letters[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl">Read: '+l.name+'</div>';
        html += '<div style="text-align:center;font-size:80px;margin:10px;font-family:serif;direction:rtl;cursor:pointer" onclick="speakUrdu(\''+l.letter+'\')">'+l.letter+'</div>';
        html += '<div style="display:flex;justify-content:center;gap:15px;margin:15px 0;flex-wrap:wrap">';
        // Show all 3 harakat versions
        [{key:'fatha',label:'زَبَر',skey:'sf',color:'#FF6B35'},{key:'kasra',label:'زِیر',skey:'sk',color:'#00CC66'},{key:'damma',label:'پِیش',skey:'sd',color:'#0099FF'}].forEach(h => {
            html += '<div style="text-align:center;cursor:pointer;padding:10px 15px;border-radius:12px;background:#333" onclick="speakUrdu(\''+l[h.key]+'\');speak(\''+l[h.skey]+'\');">';
            html += '<div style="font-size:48px;font-family:serif;direction:rtl">'+l[h.key]+'</div>';
            html += '<div style="color:'+h.color+';font-size:14px">'+h.label+'</div>';
            html += '<div style="color:white;font-size:18px">'+l[h.skey]+'</div>';
            html += '</div>';
        });
        html += '</div>';
        html += '<div style="display:flex;justify-content:space-between;margin-top:15px"><button class="key" onclick="prevUrduRead()">← Prev</button><span class="score">'+(current+1)+' / '+letters.length+'</span><button class="key green" onclick="nextUrduRead()">Next →</button></div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.prevUrduRead = () => { if (current > 0) { current--; render(); } };
    window.nextUrduRead = () => { current++; if (current >= letters.length) { completeWorksheet('Urdu Reading', letters.length, letters.length); return; } render(); };
    render();
}
