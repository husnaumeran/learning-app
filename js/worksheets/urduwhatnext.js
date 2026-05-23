// ============ URDU WHAT COMES NEXT (Smart Sequencing + Spaced Repetition) ============
async function showUrduWhatNext() {
    const letters = URDU_LETTERS.slice(0, getContentLevel('urdu_reading'));
    const questionCount = getFocusNumber('urdu_what_next');
    
    // 1. Fetch previous wrong answers for spaced repetition
    let wrongSequences = [];
    if (CONFIG.childId) {
        const { data } = await sb.from('responses')
            .select('question_data')
            .eq('child_id', CONFIG.childId)
            .eq('skill_id', 'urdu_what_next')
            .eq('correct', false)
            .order('created_at', { ascending: false })
            .limit(10);
        wrongSequences = (data || []).map(r => r.question_data?.sequence?.join(',')).filter(Boolean);
    }
    
    // 2. Smart sequencing: prioritize recently learned letters
    // Weighted random: newer letters (higher index) have higher probability
    function weightedRandomStart() {
        const maxStart = Math.max(0, letters.length - 4);
        if (maxStart === 0) return 0;
        // Bias toward the end (recently learned): use exponential weighting
        const rand = Math.random();
        const weighted = Math.pow(rand, 0.5); // 0.5 = bias toward 1.0 (higher indices)
        return Math.floor(weighted * maxStart);
    }
    
    // 3. Generate problems
    const problems = [];
    const usedSequences = new Set();
    
    // First, add any wrong sequences from spaced repetition (up to 30% of questions)
    const reviewCount = Math.min(Math.floor(questionCount * 0.3), wrongSequences.length);
    for (let i = 0; i < reviewCount && problems.length < questionCount; i++) {
        const seqStr = wrongSequences[i];
        if (usedSequences.has(seqStr)) continue;
        
        const seqLetters = seqStr.split(',');
        const startIdx = letters.findIndex(l => l.letter === seqLetters[0]);
        if (startIdx >= 0 && startIdx + 3 < letters.length) {
            const seq = letters.slice(startIdx, startIdx + 3);
            const ans = letters[startIdx + 3];
            problems.push(makeProblem(seq, ans, letters, true)); // true = review
            usedSequences.add(seqStr);
        }
    }
    
    // Fill remaining with smart-sequenced new problems
    let attempts = 0;
    while (problems.length < questionCount && attempts < questionCount * 3) {
        attempts++;
        const start = weightedRandomStart();
        const seq = letters.slice(start, start + 3);
        const ans = letters[start + 3];
        const seqStr = seq.map(l => l.letter).join(',');
        
        if (!usedSequences.has(seqStr)) {
            problems.push(makeProblem(seq, ans, letters, false));
            usedSequences.add(seqStr);
        }
    }
    
    // Shuffle so reviews don't all appear at start
    problems.sort(() => Math.random() - 0.5);
    
    runUrduWhatNext(problems);
}

function makeProblem(seq, ans, letters, isReview) {
    const choices = [ans];
    while (choices.length < 4) {
        const r = letters[Math.floor(Math.random() * letters.length)];
        if (!choices.some(c => c.letter === r.letter)) choices.push(r);
    }
    return {seq, ans, choices: choices.sort(() => Math.random() - 0.5), isReview};
}

function runUrduWhatNext(problems) {
    let current = 0, score = 0;
    let questionStartMs = null;
    
    function render() {
        if (current >= problems.length) { completeWorksheet('Urdu What Next', score, problems.length); return; }
        const p = problems[current];
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
        html += '<div class="title" style="direction:rtl">اردو What Comes Next?' + (p.isReview ? ' ⭐' : '') + '</div>';
        html += '<div style="display:flex;justify-content:center;gap:15px;margin:20px 0;direction:rtl">';
        p.seq.forEach(l => html += '<div style="font-size:48px;font-family:serif;padding:10px 15px;background:#333;border-radius:10px;color:white">'+l.letter+'</div>');
        html += '<div style="font-size:48px;padding:10px 15px;background:#ffd700;border-radius:10px;color:#333;font-weight:bold">?</div>';
        html += '</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:15px 0">';
        p.choices.forEach(ch => {
            html += '<div class="prob" style="font-size:40px;font-family:serif;justify-content:center;cursor:pointer;direction:rtl" onclick="pickUrduNext(\''+ch.letter+'\')">'+ch.letter+'</div>';
        });
        html += '</div>';
        html += '<div class="score">'+(current+1)+' / '+problems.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
        questionStartMs = Date.now();
    }

    window.pickUrduNext = (choice) => {
        const responseTimeMs = Date.now() - questionStartMs;
        const correct = choice === problems[current].ans.letter;
        currentAnswers.push({q: problems[current].seq.map(l=>l.letter).join('→')+'→?', answer: choice, correct: correct});
        const boxes = document.querySelectorAll('.card div[onclick]');
        boxes.forEach(b => {
            if (b.textContent === problems[current].ans.letter) b.style.background = '#22c55e';
            else if (b.textContent === choice && !correct) b.style.background = '#ef4444';
        });

        recordResponse('urdu_what_next', {type:'urdu_what_next', sequence:problems[current].seq.map(l=>l.letter), correct_answer:problems[current].ans.letter}, problems[current].ans.letter, choice, correct, true, 1, responseTimeMs, current);

        showFeedback(correct, () => { if (correct) score++; current++; render(); });
    };
    render();
}
