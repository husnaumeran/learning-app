// ============ ABC PHONICS SONG (video) ============
// A watch-together video the owner picked (2026-10-08). Opened from the worksheet
// grid only: it is not a skill, has no row in the skills table, and records nothing.
function showPhonicsVideo() {
    const VIDEO_ID = 'qKQAQc2NEuk';   // "ABC Phonics Song", Reading.com
    let h = '<button class="back" onclick="showMenu()">← Back</button>';
    h += '<div class="card"><div class="title">ABC Phonics Song 🎵</div>';
    h += '<div class="inst">Sing the letter sounds together!</div>';
    h += '<div style="position:relative;padding-bottom:56.25%;height:0;border-radius:12px;overflow:hidden">';
    h += '<iframe src="https://www.youtube.com/embed/' + VIDEO_ID + '?rel=0" '
       + 'style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" '
       + 'allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
    h += '</div></div>';
    document.getElementById('app').innerHTML = h;
}
