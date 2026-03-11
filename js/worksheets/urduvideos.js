// ============ URDU VIDEOS ============
// Progressive: 1 video per level, unlock next after watching
function showUrduVideos() {
    const SKILL_ID = 'urdu_videos';
    const STORAGE_KEY = 'uv_level';
    const videos = [
        {id:'pLjyEiJvTG4', title:'Alif se Sey tak', letters:'ا ب پ ت ٹ ث'},
        {id:'joaNf4e9pvU', title:'Jeem se Khey tak', letters:'ج چ ح خ'},
        {id:'L1xo6DDdbZE', title:'Daal se Yeh tak', letters:'د ڈ ذ ر ڑ ز ژ'},
        {id:'oBJvaAEmYLw', title:'Seen se Ghain tak', letters:'س ش ص ض ط ظ ع غ'},
        {id:'PvEiJnKr5AE', title:'Fay se Yeh tak', letters:'ف ق ک گ ل م ن و ہ ی ے'}
    ];

    let maxLevel = parseInt(localStorage.getItem(STORAGE_KEY) || '1');

    // ==================== LEVEL PICKER ====================
    function showLevelPicker() {
        let h = '<button class="back" onclick="showMenu()">← Back</button>';
        h += '<div class="card"><div class="title" style="direction:rtl">اردو Phonics 📺</div>';
        h += '<div class="inst">Watch Urdu letter videos!</div>';
        for (let i = 0; i < videos.length; i++) {
            const unlocked = i + 1 <= maxLevel, done = i + 1 < maxLevel;
            h += '<button class="' + (unlocked ? 'btn blue' : 'btn') + '" onclick="goUV(' + (i + 1) + ')" '
              + (unlocked ? '' : 'disabled')
              + ' style="font-size:18px;padding:12px;margin:6px 0;width:100%">'
              + (done ? '✅' : unlocked ? '▶️' : '🔒')
              + ' Video ' + (i + 1) + ': ' + videos[i].title
              + '</button>';
        }
        h += '</div>';
        document.getElementById('app').innerHTML = h;
    }

    window.goUV = function(lvl) { playVideo(lvl); };
    window.showUVLevelPicker = showLevelPicker;

    // ==================== PLAY VIDEO ====================
    function playVideo(lvl) {
        const v = videos[lvl - 1];
        let h = '<button class="back" onclick="showUVLevelPicker()">← Back</button>';
        h += '<div class="card"><div class="title" style="direction:rtl">اردو Phonics 📺</div>';
        h += '<div style="text-align:center;font-size:18px;color:#888">Video ' + lvl + ' / ' + videos.length + '</div>';
        h += '<div style="text-align:center;margin:10px 0;font-size:20px;direction:rtl;color:white">' + v.letters + '</div>';
        h += '<div style="position:relative;width:100%;padding-top:56.25%;margin:15px 0">';
        h += '<iframe src="https://www.youtube.com/embed/' + v.id + '?rel=0" '
          + 'style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:10px" '
          + 'allowfullscreen></iframe>';
        h += '</div>';
        h += '<button class="btn green" style="font-size:20px;padding:15px" onclick="doneUV(' + lvl + ')">Done ✅</button>';
        h += '</div>';
        document.getElementById('app').innerHTML = h;
        startItemTimer();
    }

    // ==================== DONE ====================
    window.doneUV = function(lvl) {
        const v = videos[lvl - 1];
        recordPassiveResponse(SKILL_ID, {type: 'video', video: lvl, title: v.title, letters: v.letters}, 'uv_' + lvl);
        // Unlock next level
        if (lvl >= maxLevel && lvl < videos.length) {
            maxLevel = lvl + 1;
            localStorage.setItem(STORAGE_KEY, String(maxLevel));
        }
        completeWorksheet('Urdu Video: ' + v.title, 1, 1);
    };

    showLevelPicker();
}
