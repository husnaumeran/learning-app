// ============ NUMBERS — ALL LANGUAGES ============
function showNumbersAll() {
    const URDU_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
    const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
    const count = getFocusNumber('numbers_all');

    // Number words for TTS
    const URDU_WORDS = ['','ek','do','teen','chaar','paanch','chay','saat','aath','nau','das',
        'gyaara','baara','tera','chauda','pandra','sola','satra','athara','unees','bees'];
    const ARABIC_WORDS = ['','wahid','ithnan','thalatha','arba\'a','khamsa','sitta','sab\'a','thamania','tis\'a','ashara',
        'ahad ashar','ithna ashar','thalatha ashar','arba\'a ashar','khamsa ashar','sitta ashar','sab\'a ashar','thamania ashar','tis\'a ashar','ishreen'];
    const ENGLISH_WORDS = ['','one','two','three','four','five','six','seven','eight','nine','ten',
        'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];

    function toUrdu(n) { return String(n).split('').map(d => URDU_DIGITS[parseInt(d)]).join(''); }
    function toArabic(n) { return String(n).split('').map(d => ARABIC_DIGITS[parseInt(d)]).join(''); }

    const nums = [];
    for (let i = 1; i <= Math.max(count, 1); i++) nums.push(i);
    let current = 0;
    let questionStartMs = Date.now();
    let autoTimers = [];

    function cancelAuto() { autoTimers.forEach(t => clearTimeout(t)); autoTimers = []; }

    function render() {
        cancelAuto();
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
        const enWord = ENGLISH_WORDS[n] || String(n);
        const urWord = URDU_WORDS[n] || String(n);
        const arWord = ARABIC_WORDS[n] || String(n);
        autoTimers.push(setTimeout(() => speak(enWord), 300));
        autoTimers.push(setTimeout(() => speakUrdu(urWord), 1500));
        autoTimers.push(setTimeout(() => speakArabic(arWord), 2700));
    }

    window.playNA = (lang, n) => {
        cancelAuto();
        speechSynthesis.cancel(); // stop any current speech
        const enWord = ENGLISH_WORDS[n] || String(n);
        const urWord = URDU_WORDS[n] || String(n);
        const arWord = ARABIC_WORDS[n] || String(n);
        if (lang === 'en') speak(enWord);
        else if (lang === 'ur') speakUrdu(urWord);
        else if (lang === 'ar') speakArabic(arWord);
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
