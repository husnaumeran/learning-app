// ============ QURAN MEMORISATION ============
// Contract: docs/QURAN.md. One surah per level (1-15, see QURAN_LEVELS below), porting
// the owner's own quran-memorize app's method, not its code:
//   for i = 1..n: "verse i alone" x N repeats, then (for i>1) "verses 1..i together" x N
//   repeats -- 2n-1 steps total. One repetition of a block plays its verses in order,
//   back to back. Each STEP (one pattern entry, already carrying its own N repeats) is
//   recorded once via recordPassiveResponse -- practice is listening/repeating, not
//   evidence, so it never touches mastery.
//
// From the SECOND session of a surah onward (tracked per child+surah in localStorage,
// every access wrapped in try/catch), the session opens with a parent-judged "Recite it
// to me" check -- no audio -- before practice, because recall after a night's sleep is
// memory and recall straight after repetition is only echo. The grown-up has a clearly
// labelled way to skip it. Each verse in the check is one recordResponse, first-attempt
// only, purpose:'check', judge:'parent'.
//
// Text and audio both come live from api.quran.com / verses.quran.com and are cached in
// localStorage per surah+script+reciter -- never hand-typed, matched by verse_key, never
// by array position. A verse whose audio fails to load is noted and skipped, not fatal.
//
// Audio: ONE HTMLAudioElement for the whole practice session, its src swapped in the
// `ended` handler, created inside the Start tap's own click handler so iOS's gesture
// unlock carries through the whole chained sequence. A container-alive check before
// every chained play, plus a MutationObserver on #app, stop a stray player from
// reciting over whatever screen comes next once the child leaves.

// ---- Defaults the owner can change (docs/QURAN.md "Defaults") ----
const QURAN_SKILL_ID = 'quran_memorize';
const QURAN_SCRIPT_FIELD = 'text_uthmani';   // Uthmani script
const QURAN_RECITER_ID = 7;                  // Mishary al-Afasy
const QURAN_REPEATS = 3;                     // N in the owner's method
const QURAN_AUDIO_BASE = 'https://verses.quran.com/';
const QURAN_API_BASE = 'https://api.quran.com/api/v4';

// Level -> surah. Al-Fatiha, then Juz Amma backwards (An-Nas -> Al-Qari'ah), the
// conventional children's order. Verse counts are NEVER hardcoded here -- always
// taken from the API.
const QURAN_LEVELS = [
    { level: 1, surah: 1, name: 'Al-Fatiha' },
    { level: 2, surah: 114, name: 'An-Nas' },
    { level: 3, surah: 113, name: 'Al-Falaq' },
    { level: 4, surah: 112, name: 'Al-Ikhlas' },
    { level: 5, surah: 111, name: 'Al-Masad' },
    { level: 6, surah: 110, name: 'An-Nasr' },
    { level: 7, surah: 109, name: 'Al-Kafirun' },
    { level: 8, surah: 108, name: 'Al-Kawthar' },
    { level: 9, surah: 107, name: "Al-Ma'un" },
    { level: 10, surah: 106, name: 'Quraysh' },
    { level: 11, surah: 105, name: 'Al-Fil' },
    { level: 12, surah: 104, name: 'Al-Humazah' },
    { level: 13, surah: 103, name: 'Al-Asr' },
    { level: 14, surah: 102, name: 'At-Takathur' },
    { level: 15, surah: 101, name: "Al-Qari'ah" }
];

function quranClampLevel(level) {
    const n = parseInt(level, 10);
    if (!n || n < 1) return 1;
    if (n > 15) return 15;
    return n;
}

function quranLevelInfo(level) {
    return QURAN_LEVELS[quranClampLevel(level) - 1] || QURAN_LEVELS[0];
}

function quranEscapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ---- Scheherazade New, injected once, first time the section opens ----
function quranEnsureFont() {
    if (document.getElementById('quranFontLink')) return;
    const link = document.createElement('link');
    link.id = 'quranFontLink';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&display=swap';
    document.head.appendChild(link);
}

// ---- "Has this surah been practised before?" (gates the check) ----
function quranPracticedKey(surah) {
    return 'quran_practiced_' + (CONFIG && CONFIG.childId ? CONFIG.childId : 'anon') + '_' + surah;
}
function quranHasPracticedBefore(surah) {
    try { return localStorage.getItem(quranPracticedKey(surah)) === '1'; } catch (e) { return false; }
}
function quranMarkPracticed(surah) {
    try { localStorage.setItem(quranPracticedKey(surah), '1'); } catch (e) {}
}

// ---- localStorage cache: text + audio manifest, per surah+script+reciter ----
function quranCacheKey(kind, surah) {
    return 'quran_cache_' + kind + '_' + surah + '_' + QURAN_SCRIPT_FIELD + '_r' + QURAN_RECITER_ID;
}
function quranCacheGet(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}
function quranCacheSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

// ---- Data: verses (text_uthmani) ----
async function quranFetchVerses(surah) {
    const key = quranCacheKey('verses', surah);
    const cached = quranCacheGet(key);
    if (cached) return cached;
    const res = await fetch(QURAN_API_BASE + '/verses/by_chapter/' + surah + '?fields=' + QURAN_SCRIPT_FIELD + '&per_page=50');
    if (!res.ok) throw new Error('verses fetch failed: HTTP ' + res.status);
    const data = await res.json();
    const list = (data.verses || []).map(function (v) {
        return { verse_key: v.verse_key, verse_number: v.verse_number, text: v[QURAN_SCRIPT_FIELD] };
    });
    list.sort(function (a, b) { return a.verse_number - b.verse_number; });
    if (!list.length) throw new Error('no verses returned for surah ' + surah);
    quranCacheSet(key, list);
    return list;
}

// ---- Data: audio manifest (verse_key -> relative url) ----
async function quranFetchAudioManifest(surah) {
    const key = quranCacheKey('audio', surah);
    const cached = quranCacheGet(key);
    if (cached) return cached;
    const res = await fetch(QURAN_API_BASE + '/recitations/' + QURAN_RECITER_ID + '/by_chapter/' + surah + '?per_page=300');
    if (!res.ok) throw new Error('audio manifest fetch failed: HTTP ' + res.status);
    const data = await res.json();
    const map = {};
    (data.audio_files || []).forEach(function (af) {
        if (af && af.verse_key && af.url) map[af.verse_key] = af.url;
    });
    quranCacheSet(key, map);
    return map;
}

// Combines both, matching strictly by verse_key -- never by array position.
async function quranLoadSurah(surah) {
    const results = await Promise.all([quranFetchVerses(surah), quranFetchAudioManifest(surah)]);
    const verseList = results[0];
    const audioMap = results[1];
    return verseList.map(function (v) {
        const rel = audioMap[v.verse_key];
        return {
            verse_key: v.verse_key,
            verse_number: v.verse_number,
            text: v.text,
            audioUrl: rel ? (QURAN_AUDIO_BASE + rel) : null
        };
    });
}

// ---- The owner's practice pattern: 2n-1 steps, each already carrying its own repeats ----
function quranBuildPattern(n, repeats) {
    const pattern = [];
    for (let i = 1; i <= n; i++) {
        pattern.push({ verses: [i], repeats: repeats });
        if (i > 1) {
            const together = [];
            for (let k = 1; k <= i; k++) together.push(k);
            pattern.push({ verses: together, repeats: repeats });
        }
    }
    return pattern;
}

// One repetition of a block plays each of its verses in order, back to back; the flat
// queue below is just that, repeated `repeats` times.
function quranFlattenStep(step) {
    const out = [];
    for (let r = 0; r < step.repeats; r++) {
        for (let j = 0; j < step.verses.length; j++) out.push(step.verses[j]);
    }
    return out;
}

// ============ MAIN ============
function showQuran() {
    quranEnsureFont();

    // ---- per-session state ----
    let level = null, surahNumber = null, levelInfo = null;
    let verses = [], versesByNumber = {};
    let pattern = [], stepIdx = 0, flatQueue = [], queuePos = 0;
    let paused = false;
    let audioEl = null;
    let quranObserver = null;
    let checkCurrent = 0, checkQStartMs = null, checkScore = 0, checkTotal = 0;
    let loadToken = 0; // guards against a superseded quranOpenLevel() call's fetch resolving late
    // True only while waiting on the CURRENT play() attempt to end/error. Pause/skip/back
    // clear it before interrupting audioEl, so that attempt's now-stale ended/error/catch
    // callback (which can still fire after we've already moved the queue on) is a no-op
    // instead of double-advancing queuePos.
    let awaitingSettle = false;

    const defaultLevel = quranClampLevel(getContentLevel(QURAN_SKILL_ID));
    const unlockedLevel = quranClampLevel(getUnlockedLevel(QURAN_SKILL_ID));

    // ---------- shared shell ----------
    function quranCardOpen(titleExtra) {
        let html = '<button class="back" onclick="quranBack()">← Back</button><div class="card">';
        html += '<div class="title">📖 ' + (levelInfo ? levelInfo.name : 'Qur’an') + (titleExtra || '') + '</div>';
        return html;
    }

    // ---------- picker (only offered when more than one surah is unlocked) ----------
    function renderPicker() {
        let html = '<button class="back" onclick="quranBack()">← Back</button><div class="card">';
        html += '<div class="title">📖 Qur’an</div>';
        html += '<div class="inst">Pick a surah to recite today</div>';
        for (let lvl = 1; lvl <= unlockedLevel; lvl++) {
            const info = quranLevelInfo(lvl);
            const isDefault = lvl === defaultLevel;
            html += '<button class="btn' + (isDefault ? ' green' : '') + '" style="font-size:18px" onclick="quranOpenLevel(' + lvl + ')">'
                + (isDefault ? '⭐ ' : '') + 'Surah ' + info.surah + ': ' + info.name + '</button>';
        }
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    // ---------- loading / error ----------
    function renderLoading() {
        let html = '<button class="back" onclick="quranBack()">← Back</button><div class="card">';
        html += '<div class="title">📖 ' + (levelInfo ? levelInfo.name : 'Qur’an') + '</div>';
        html += '<div style="text-align:center;color:#666;font-size:18px;margin:30px 10px">Loading… 🕋</div>';
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    function renderDataError() {
        let html = '<button class="back" onclick="quranBack()">← Back</button><div class="card">';
        html += '<div class="title">📖 ' + (levelInfo ? levelInfo.name : 'Qur’an') + '</div>';
        html += '<div style="text-align:center;color:#666;font-size:17px;margin:25px 10px">We couldn’t load this surah right now. Please check the internet connection and try again. 💙</div>';
        html += '<button class="btn green" onclick="quranOpenLevel(' + level + ')">Try Again</button>';
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    // ---------- check: "Recite it to me" ----------
    function renderCheckIntro() {
        let html = quranCardOpen(' — Check time! 🎤');
        html += '<div style="text-align:center;font-size:18px;color:#333;margin:10px 0 16px">Ask your child to recite <b>' + levelInfo.name + '</b> to you, verse by verse, from memory — no audio this time.</div>';
        html += '<button class="btn green" style="font-size:20px;padding:16px" onclick="quranStartCheck()">Start the Check 🎤</button>';
        html += '<button class="btn" style="margin-top:8px" onclick="quranSkipCheck()">Skip check, just practice today →</button>';
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    function renderCheckVerse() {
        startItemTimer();
        checkQStartMs = Date.now();
        const v = verses[checkCurrent];
        let html = quranCardOpen(' — Recite it to me 🎤');
        html += '<div class="score" style="margin-bottom:10px">Verse ' + (checkCurrent + 1) + ' of ' + verses.length + '</div>';
        html += '<div style="text-align:center;color:#888;font-size:14px;margin-bottom:6px">👨‍👩‍👧 For the grown-up — follow along, no audio plays</div>';
        html += '<div style="text-align:center;font-size:clamp(24px,6vw,32px);line-height:1.9;font-family:\'Scheherazade New\',serif;direction:rtl;color:#333;background:#faf7f2;border-radius:12px;padding:16px;margin-bottom:16px">' + quranEscapeHtml(v.text) + '</div>';
        html += '<div style="display:flex;gap:12px">';
        html += '<button class="btn green qCheckBtn" style="font-size:19px;flex:1" onclick="quranCheckMark(true)">✓ Got it</button>';
        html += '<button class="btn qCheckBtn" style="font-size:19px;flex:1;background:#f59e0b;color:white" onclick="quranCheckMark(false)">Not yet</button>';
        html += '</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.quranStartCheck = function () {
        checkCurrent = 0;
        checkScore = 0;
        checkTotal = verses.length;
        renderCheckVerse();
    };

    window.quranSkipCheck = function () {
        checkScore = 0;
        checkTotal = 0;
        quranRenderPracticeIntro();
    };

    window.quranCheckMark = function (isCorrect) {
        document.querySelectorAll('.qCheckBtn').forEach(function (el) { el.onclick = null; el.style.pointerEvents = 'none'; });
        const v = verses[checkCurrent];
        const responseTimeMs = checkQStartMs ? Date.now() - checkQStartMs : null;
        const questionData = {
            type: 'quran_check',
            purpose: 'check',
            judge: 'parent',
            surah: surahNumber,
            verse: v.verse_number,
            level: level
        };
        recordResponse(QURAN_SKILL_ID, questionData, 'recited', isCorrect ? 'recited' : 'not_yet', isCorrect, true, 1, responseTimeMs, checkCurrent, false, level);
        if (isCorrect) checkScore++;
        checkCurrent++;
        if (checkCurrent >= verses.length) quranRenderPracticeIntro();
        else renderCheckVerse();
    };

    // ---------- practice: the owner's method ----------
    function quranRenderPracticeIntro() {
        let html = quranCardOpen(' — Practice 🎧');
        html += '<div style="text-align:center;font-size:18px;color:#333;margin:10px 0 4px">We’ll say each verse together, again and again — hands-free once you tap Start!</div>';
        html += '<div style="text-align:center;color:#888;font-size:14px;margin-bottom:14px">' + verses.length + ' verse' + (verses.length === 1 ? '' : 's') + ' • ' + QURAN_REPEATS + '× repeats each</div>';
        html += '<button class="btn green" style="font-size:22px;padding:18px" onclick="quranStartPractice()">▶️ Start</button>';
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    function renderPracticeScreen() {
        let html = '<button class="back" onclick="quranBack()">← Back</button><div class="card" id="qPracticeCard">';
        html += '<div class="title">📖 ' + levelInfo.name + '</div>';
        html += '<div id="qProgress" style="text-align:center;color:#666;font-size:15px;margin-bottom:10px">Getting ready…</div>';
        html += '<div style="direction:rtl">';
        verses.forEach(function (v) {
            html += '<div id="qVerseRow' + v.verse_number + '" style="background:#faf7f2;border-radius:12px;padding:14px 16px;margin:8px 0;text-align:center;transition:background 0.2s,transform 0.2s,box-shadow 0.2s">';
            html += '<span style="display:inline-block;background:#333;color:white;border-radius:50%;width:24px;height:24px;line-height:24px;text-align:center;font-size:12px;margin:0 6px;vertical-align:middle">' + v.verse_number + '</span>';
            html += '<span style="font-family:\'Scheherazade New\',serif;font-size:clamp(24px,6vw,36px);line-height:1.9;color:#222;vertical-align:middle">' + quranEscapeHtml(v.text) + '</span>';
            html += '</div>';
        });
        html += '</div>';
        html += '<div style="display:flex;gap:10px;margin-top:14px">';
        html += '<button id="qPauseBtn" class="btn" style="background:#6b7280;color:white;flex:1" onclick="quranTogglePause()">⏸ Pause</button>';
        html += '<button class="btn" style="flex:1" onclick="quranSkipStep()">⏭ Next</button>';
        html += '</div>';
        html += '</div>';
        document.getElementById('app').innerHTML = html;
    }

    function quranHighlightVerse(vNum) {
        verses.forEach(function (v) {
            const row = document.getElementById('qVerseRow' + v.verse_number);
            if (!row) return;
            const active = v.verse_number === vNum;
            row.style.background = active ? '#fff3cd' : '#faf7f2';
            row.style.boxShadow = active ? '0 0 0 3px #f59e0b' : 'none';
            row.style.transform = active ? 'scale(1.02)' : 'scale(1)';
        });
    }

    function quranUpdateProgress() {
        const el = document.getElementById('qProgress');
        if (!el || !pattern[stepIdx]) return;
        const step = pattern[stepIdx];
        const label = step.verses.length === 1
            ? ('Verse ' + step.verses[0] + ' alone')
            : ('Verses ' + step.verses[0] + '–' + step.verses[step.verses.length - 1] + ' together');
        el.textContent = 'Step ' + (stepIdx + 1) + ' of ' + pattern.length + ' — ' + label;
    }

    function quranStepQuestionData(step, idx, skipped) {
        return {
            type: 'quran_practice',
            surah: surahNumber,
            level: level,
            step: idx,
            verses: step.verses.slice(),
            repeats: step.repeats,
            skipped: !!skipped
        };
    }

    // ---- container-alive guard + MutationObserver belt-and-braces ----
    function quranContainerAlive() {
        return !!document.getElementById('qPracticeCard');
    }

    function quranWatchContainer() {
        const appEl = document.getElementById('app');
        if (!appEl || typeof MutationObserver === 'undefined') return;
        quranObserver = new MutationObserver(function () {
            if (!quranContainerAlive()) quranCleanupAudio();
        });
        quranObserver.observe(appEl, { childList: true, subtree: true });
    }

    function quranCleanupAudio() {
        paused = true;
        awaitingSettle = false;
        if (audioEl) {
            try { audioEl.pause(); } catch (e) {}
            try { audioEl.removeEventListener('ended', quranOnAudioEnded); } catch (e) {}
            try { audioEl.removeEventListener('error', quranOnAudioError); } catch (e) {}
            try { audioEl.src = ''; } catch (e) {}
            audioEl = null;
        }
        if (quranObserver) {
            try { quranObserver.disconnect(); } catch (e) {}
            quranObserver = null;
        }
    }

    function quranOnAudioEnded() {
        if (!awaitingSettle) return; // a stale event for an attempt we already moved past
        awaitingSettle = false;
        queuePos++;
        playCurrentQueueItem();
    }

    function quranOnAudioError() {
        if (!awaitingSettle) return;
        awaitingSettle = false;
        console.warn('Quran: audio errored for verse ' + flatQueue[queuePos] + ', skipping');
        queuePos++;
        playCurrentQueueItem();
    }

    function playCurrentQueueItem() {
        if (!quranContainerAlive()) { quranCleanupAudio(); return; }
        if (paused) return;
        if (queuePos >= flatQueue.length) {
            recordPassiveResponse(QURAN_SKILL_ID, quranStepQuestionData(pattern[stepIdx], stepIdx, false), stepIdx, level);
            startStep(stepIdx + 1);
            return;
        }
        const vNum = flatQueue[queuePos];
        quranHighlightVerse(vNum);
        const v = versesByNumber[vNum];
        if (!v || !v.audioUrl) {
            // A verse whose audio is missing must not stall the session: note, skip, carry on.
            console.warn('Quran: no audio available for verse ' + vNum + ', skipping');
            queuePos++;
            playCurrentQueueItem();
            return;
        }
        audioEl.src = v.audioUrl;
        awaitingSettle = true;
        audioEl.play().catch(function () {
            // pause()/skip reassigning src rejects this same promise -- if awaitingSettle
            // was already cleared by that intentional interruption, this is not a real
            // failure, and the queue has already moved on; do not advance it a second time.
            if (!awaitingSettle) return;
            awaitingSettle = false;
            console.warn('Quran: playback failed for verse ' + vNum + ', skipping');
            queuePos++;
            playCurrentQueueItem();
        });
    }

    function startStep(idx) {
        stepIdx = idx;
        if (stepIdx >= pattern.length) { quranFinishPractice(); return; }
        flatQueue = quranFlattenStep(pattern[stepIdx]);
        queuePos = 0;
        quranUpdateProgress();
        playCurrentQueueItem();
    }

    function quranFinishPractice() {
        quranCleanupAudio();
        completeWorksheet('Quran', checkScore, checkTotal);
    }

    window.quranTogglePause = function () {
        paused = !paused;
        const btn = document.getElementById('qPauseBtn');
        if (paused) {
            // Abandon whatever play() attempt is in flight BEFORE interrupting it, so its
            // now-stale catch/ended/error callback is a no-op instead of double-advancing
            // the queue once we resume.
            awaitingSettle = false;
            if (audioEl) { try { audioEl.pause(); } catch (e) {} }
            if (btn) btn.textContent = '▶️ Resume';
        } else {
            if (btn) btn.textContent = '⏸ Pause';
            // Mid-file pause (has progress, hasn't ended): resume natively. Otherwise the
            // queue had already moved on while paused, so dispatch the current item fresh.
            if (audioEl && audioEl.src && !audioEl.ended && audioEl.currentTime > 0) {
                awaitingSettle = true;
                audioEl.play().catch(function () {
                    if (!awaitingSettle) return;
                    awaitingSettle = false;
                    playCurrentQueueItem();
                });
            } else {
                playCurrentQueueItem();
            }
        }
    };

    window.quranSkipStep = function () {
        // Same reasoning as pause above: disarm the in-flight attempt's callback first.
        awaitingSettle = false;
        if (audioEl) { try { audioEl.pause(); } catch (e) {} }
        paused = false;
        const btn = document.getElementById('qPauseBtn');
        if (btn) btn.textContent = '⏸ Pause';
        if (pattern[stepIdx]) {
            recordPassiveResponse(QURAN_SKILL_ID, quranStepQuestionData(pattern[stepIdx], stepIdx, true), stepIdx, level);
        }
        startStep(stepIdx + 1);
    };

    window.quranStartPractice = function () {
        quranMarkPracticed(surahNumber);
        pattern = quranBuildPattern(verses.length, QURAN_REPEATS);
        paused = false;
        // Created inside this click handler (not before) so iOS treats the whole chained
        // sequence as unlocked by this user gesture.
        audioEl = new Audio();
        audioEl.addEventListener('ended', quranOnAudioEnded);
        audioEl.addEventListener('error', quranOnAudioError);
        renderPracticeScreen();
        quranWatchContainer();
        startStep(0);
    };

    window.quranBack = function () {
        quranCleanupAudio();
        showMenu();
    };

    window.quranOpenLevel = function (lvl) {
        level = quranClampLevel(lvl);
        levelInfo = quranLevelInfo(level);
        surahNumber = levelInfo.surah;
        checkScore = 0;
        checkTotal = 0;
        renderLoading();
        // If the parent taps two different surahs before the first fetch returns (picker
        // double-tap), only the LATEST call's response may land -- an earlier, superseded
        // fetch resolving late must not overwrite it with a mismatched title/verse-count.
        const myLoadToken = ++loadToken;
        quranLoadSurah(surahNumber).then(function (loadedVerses) {
            if (myLoadToken !== loadToken) return;
            verses = loadedVerses;
            versesByNumber = {};
            verses.forEach(function (v) { versesByNumber[v.verse_number] = v; });
            if (quranHasPracticedBefore(surahNumber)) renderCheckIntro();
            else quranRenderPracticeIntro();
        }).catch(function (err) {
            if (myLoadToken !== loadToken) return;
            console.error('Quran: data load failed for surah ' + surahNumber + ':', err);
            renderDataError();
        });
    };

    if (unlockedLevel > 1) renderPicker();
    else window.quranOpenLevel(defaultLevel);
}
