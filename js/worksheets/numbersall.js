// ============ NUMBERS — ALL LANGUAGES ============
function showNumbersAll() {
    const URDU_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
    const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
    const count = getFocusNumber('numbers_all');

    function toUrdu(n) { return String(n).split('').map(d => URDU_DIGITS[parseInt(d)]).join(''); }
    function toArabic(n) { return String(n).split('').map(d => ARABIC_DIGITS[parseInt(d)]).join(''); }

    const nums = [];
    for (let i = 1; i <= Math.max(count, 1); i++) nums.push(i);
    let current = 0;
    let questionStartMs = Date.now();

    function render() {
        if (current >= nums.length) {
            completeWorksheet('Numbers All', nums.length, nums.length);
            return;
        }
        const n = nums[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button>';
        html += '<div class="card">';
        html += '<div class="title" style="font-size:22px">🔢 Numbers — All Languages</div>';
        html += '<div style="text-align:center;font-size:16px;color:#888;margin:5px 0">' + (current + 1) + ' / ' + nums.length + '</div>';
        html += '<div style="display:flex;justify-content:space-around;align-items:center;margin:20px 0;gap:10px">';

        // English
        html += '<div style="flex:1;text-align:center;padding:15px;border-radius:15px;background:#e3f2fd;cursor:pointer" onclick="playNA(\'en\',' + n + ')">';
        html += '<div style="font-size:16px;font-weight:bold;color:#1565c0">🔊 English</div>';
        html += '<div style="font-size:60px;font-weight:bold;margin:10px 0">' + n + '</div>';
        html += '</div>';

        // Urdu
        html += '<div style="flex:1;text-align:center;padding:15px;border-radius:15px;background:#fff3e0;cursor:pointer" onclick="playNA(\'ur\',' + n + ')">';
        html += '<div style="font-size:16px;font-weight:bold;color:#e65100">🔊 Urdu</div>';
        html += '<div style="font-size:60px;font-weight:bold;direction:rtl;margin:10px 0">' + toUrdu(n) + '</div>';
        html += '</div>';

        // Arabic
        html += '<div style="flex:1;text-align:center;padding:15px;border-radius:15px;background:#e8f5e9;cursor:pointer" onclick="playNA(\'ar\',' + n + ')">';
        html += '<div style="font-size:16px;font-weight:bold;color:#2e7d32">🔊 Arabic</div>';
        html += '<div style="font-size:60px;font-weight:bold;direction:rtl;margin:10px 0">' + toArabic(n) + '</div>';
        html += '</div>';

        html += '</div>'; // end flex row

        // Navigation
        html += '<div style="display:flex;justify-content:space-between;margin-top:20px">';
        if (current > 0) {
            html += '<button class="btn" style="font-size:18px;padding:12px 25px" onclick="prevNA()">← Prev</button>';
        } else {
            html += '<div></div>';
        }
        html += '<button class="btn green" style="font-size:18px;padding:12px 25px" onclick="nextNA()">Next →</button>';
        html += '</div>';

        html += '</div>'; // end card
        document.getElementById('app').innerHTML = html;

        // Auto-play all three with delays
        setTimeout(() => speak(String(n)), 300);
        setTimeout(() => speakUrdu(String(n)), 1500);
        setTimeout(() => speakArabic(String(n)), 2700);
    }

    window.playNA = (lang, n) => {
        if (lang === 'en') speak(String(n));
        else if (lang === 'ur') speakUrdu(String(n));
        else if (lang === 'ar') speakArabic(String(n));
    };

    window.nextNA = () => {
        const responseTimeMs = Date.now() - questionStartMs;
        recordResponse('numbers_all',
            { number: nums[current] },
            String(nums[current]), String(nums[current]), true, true, 1,
            responseTimeMs, current, false);
        current++;
        questionStartMs = Date.now();
        render();
    };

    window.prevNA = () => {
        if (current > 0) { current--; render(); }
    };

    render();
}
