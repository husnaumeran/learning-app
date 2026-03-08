// ============  Which Doesn't Belong ============
function showDoesntBelong() {
    const catNames = Object.keys(CONFIG.categories);
    const problems = [];
    for (let i = 0; i < CONFIG.focusNumber; i++) {
        const cat1 = catNames[Math.floor(Math.random() * catNames.length)];
        let cat2;
        do { cat2 = catNames[Math.floor(Math.random() * catNames.length)]; } while (cat2 === cat1);
        const items1 = CONFIG.categories[cat1].sort(() => Math.random() - 0.5).slice(0, 3);
        const oddOne = CONFIG.categories[cat2][Math.floor(Math.random() * CONFIG.categories[cat2].length)];
        problems.push([[...items1, oddOne], oddOne, cat1]);
    }
    let current = 0, score = 0;
    let questionStartMs = null;

    function render() {
        if (current >= problems.length) { completeWorksheet('Doesnt Belong', score, problems.length); return; }
        const [items, ans, category] = problems[current];
        const shuffled = [...items].sort(() => Math.random() - 0.5);
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Which Doesn\'t Belong?</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin:20px 0">';
        shuffled.forEach(item => html += '<div class="prob" style="justify-content:center;font-size:48px;padding:25px;cursor:pointer" onclick="pickOdd(\''+item+'\')">'+item+'</div>');
        html += '</div><div class="score">'+(current+1)+' / '+problems.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
        questionStartMs = Date.now();
    }

    window.pickOdd = async (choice) => {
        const responseTimeMs = Date.now() - questionStartMs;
        const [items, ans, category] = problems[current];
        const correct = choice === ans;
        currentAnswers.push({q: 'Odd one out', a: choice, correct: correct});
        const wrongCat = Object.keys(CONFIG.categories).find(cat => CONFIG.categories[cat].includes(ans));
        const explanation = ans + ' is ' + wrongCat.toUpperCase() + ', not ' + category.toUpperCase();

        const boxes = document.querySelectorAll('.card .prob');
        boxes.forEach(b => {
            if (b.textContent === ans) b.style.background = '#22c55e';
            else if (b.textContent === choice && !correct) b.style.background = '#ef4444';
        });

        document.querySelector('.title').innerHTML = explanation;
        await speak(explanation);

        // Record response to Supabase (fire and forget, log errors)
        if (CONFIG.sessionId && CONFIG.childId) {
            sb.rpc('record_response', {
                p_session_id: CONFIG.sessionId,
                p_child_id: CONFIG.childId,
                p_skill_id: 'which_doesnt_belong',
                p_question_data: {
                    type: 'which_doesnt_belong',
                    items: items,
                    correct_answer: ans,
                    category: category
                },
                p_correct_answer: ans,
                p_final_answer: choice,
                p_is_correct: correct,
                p_is_first_try: true,
                p_attempt_count: 1,
                p_is_skipped: false,
                p_response_time_ms: responseTimeMs,
                p_client_event_id: CONFIG.sessionId + '_doesntbelong_' + current
            }).then(({data, error}) => {
                if (error) console.error('record_response error:', error);
                else console.log('record_response OK:', data);
            });
        }

        showFeedback(correct, () => { if (correct) score++; current++; render(); });
    };

    render();
}
