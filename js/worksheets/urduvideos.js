// ============ URDU VIDEOS ============
function showUrduVideos() {
    const videos = [
        {id:'pLjyEiJvTG4', title:'Alif se Sey tak', letters:'ا ب پ ت ٹ ث'},
        {id:'joaNf4e9pvU', title:'Jeem se Khey tak', letters:'ج چ ح خ'},
        {id:'L1xo6DDdbZE', title:'Daal se Yeh tak', letters:'د ڈ ذ ر ڑ ز ژ'},
        {id:'oBJvaAEmYLw', title:'Seen se Ghain tak', letters:'س ش ص ض ط ظ ع غ'},
        {id:'PvEiJnKr5AE', title:'Fay se Yeh tak', letters:'ف ق ک گ ل م ن و ہ ی ے'}
    ];
    let current = 0;

    function render() {
        const v = videos[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl">اردو Phonics 📺</div>';
        html += '<div style="text-align:center;color:#aaa;font-size:16px;margin:5px">'+v.title+' ('+v.letters+')</div>';
        html += '<div style="position:relative;width:100%;padding-bottom:56.25%;margin:10px 0">';
        html += '<iframe src="https://www.youtube-nocookie.com/embed/'+v.id+'?rel=0&modestbranding=1&playsinline=1" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:12px" allowfullscreen></iframe>';
        html += '</div>';
        html += '<div style="display:flex;justify-content:space-between;margin-top:10px">';
        html += '<button class="key" onclick="prevVid()" '+(current===0?'disabled style="opacity:0.3"':'')+'>← Prev</button>';
        html += '<span class="score">'+(current+1)+' / '+videos.length+'</span>';
        html += '<button class="key green" onclick="nextVid()" '+(current===videos.length-1?'disabled style="opacity:0.3"':'')+'>Next →</button>';
        html += '</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.prevVid = () => { if (current > 0) { current--; render(); } };
    window.nextVid = () => { if (current < videos.length-1) { current++; render(); } };
    render();
}
