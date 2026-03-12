// ============ FIGURE MATRICES (CogAT Prep) ============
function showFigureMatrices() {
    const SHAPES = ['circle','square','triangle','star','diamond'];
    const COLORS = ['#FF0000','#0066FF','#00AA00','#FFD700','#FF6600','#FF69B4'];
    const CNAMES = ['red','blue','green','yellow','orange','pink'];
    const SIZES = [80, 40]; // big, small
    const SNAMES = ['big','small'];
    const QUESTIONS = getFocusNumber('figure_matrices');
    const LEVEL_NAMES = ['Color','Size','Shape','Direction','Color+Size','Color+Shape','Size+Shape','All Three'];

    let level = parseInt(localStorage.getItem('fm_level') || '1');
    const history = JSON.parse(localStorage.getItem('fm_history') || '{}');

    function pick(a) { return a[Math.floor(Math.random()*a.length)]; }
    function pickDiff(a,x) { const o=a.filter(v=>v!==x); return o[Math.floor(Math.random()*o.length)]; }
    function shuffle(a) { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; }
    function rci() { return Math.floor(Math.random()*COLORS.length); }
    function rciDiff(x) { let c; do{c=rci();}while(c===x); return c; }

    // SVG shape renderer
    function svg(shape, color, size) {
        const s=size, h=s/2;
        let d;
        switch(shape) {
            case 'circle': d=`<circle cx="${h}" cy="${h}" r="${h-3}" fill="${color}" stroke="#333" stroke-width="2"/>`; break;
            case 'square': d=`<rect x="3" y="3" width="${s-6}" height="${s-6}" rx="3" fill="${color}" stroke="#333" stroke-width="2"/>`; break;
            case 'triangle': d=`<polygon points="${h},5 ${s-5},${s-5} 5,${s-5}" fill="${color}" stroke="#333" stroke-width="2"/>`; break;
            case 'star': {
                const cx=h,cy=h,or=h-5,ir=or*0.4; let p=[];
                for(let i=0;i<5;i++){const a1=(i*72-90)*Math.PI/180,a2=((i*72+36)-90)*Math.PI/180;
                p.push(`${cx+or*Math.cos(a1)},${cy+or*Math.sin(a1)}`);p.push(`${cx+ir*Math.cos(a2)},${cy+ir*Math.sin(a2)}`);}
                d=`<polygon points="${p.join(' ')}" fill="${color}" stroke="#333" stroke-width="2"/>`; break;
            }
            case 'diamond': d=`<polygon points="${h},5 ${s-5},${h} ${h},${s-5} 5,${h}" fill="${color}" stroke="#333" stroke-width="2"/>`; break;
        }
        return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${d}</svg>`;
    }

    // Generate one problem for current level
    function makeProblem(lvl) {
        const ci1=rci(), ci2=rciDiff(ci1);
        const [sh1,sh2]=shuffle(SHAPES).slice(0,2);
        const esh=pick(SHAPES.slice(0,3)); // easy shape for single-rule levels
        let tl,tr,bl,ans;

        switch(lvl) {
            case 1: // Color across
                tl={shape:'circle',ci:ci1,si:0}; tr={shape:'circle',ci:ci2,si:0};
                bl={shape:'circle',ci:ci1,si:0}; ans={shape:'circle',ci:ci2,si:0}; break;
            case 2: // Size across
                tl={shape:esh,ci:ci1,si:0}; tr={shape:esh,ci:ci1,si:1};
                bl={shape:esh,ci:ci1,si:0}; ans={shape:esh,ci:ci1,si:1}; break;
            case 3: // Shape across
                tl={shape:sh1,ci:ci1,si:0}; tr={shape:sh2,ci:ci1,si:0};
                bl={shape:sh1,ci:ci1,si:0}; ans={shape:sh2,ci:ci1,si:0}; break;
            case 4: { // Property changes DOWN
                const rule=pick(['color','size','shape']);
                if(rule==='color'){
                    tl={shape:esh,ci:ci1,si:0};tr={shape:esh,ci:ci1,si:0};
                    bl={shape:esh,ci:ci2,si:0};ans={shape:esh,ci:ci2,si:0};
                } else if(rule==='size'){
                    tl={shape:esh,ci:ci1,si:0};tr={shape:esh,ci:ci1,si:0};
                    bl={shape:esh,ci:ci1,si:1};ans={shape:esh,ci:ci1,si:1};
                } else {
                    tl={shape:sh1,ci:ci1,si:0};tr={shape:sh1,ci:ci1,si:0};
                    bl={shape:sh2,ci:ci1,si:0};ans={shape:sh2,ci:ci1,si:0};
                } break;
            }
            case 5: // Color + Size
                if(Math.random()>0.5){
                    tl={shape:esh,ci:ci1,si:0};tr={shape:esh,ci:ci2,si:0};
                    bl={shape:esh,ci:ci1,si:1};ans={shape:esh,ci:ci2,si:1};
                } else {
                    tl={shape:esh,ci:ci1,si:0};tr={shape:esh,ci:ci1,si:1};
                    bl={shape:esh,ci:ci2,si:0};ans={shape:esh,ci:ci2,si:1};
                } break;
            case 6: // Color + Shape
                if(Math.random()>0.5){
                    tl={shape:sh1,ci:ci1,si:0};tr={shape:sh1,ci:ci2,si:0};
                    bl={shape:sh2,ci:ci1,si:0};ans={shape:sh2,ci:ci2,si:0};
                } else {
                    tl={shape:sh1,ci:ci1,si:0};tr={shape:sh2,ci:ci1,si:0};
                    bl={shape:sh1,ci:ci2,si:0};ans={shape:sh2,ci:ci2,si:0};
                } break;
            case 7: // Size + Shape
                if(Math.random()>0.5){
                    tl={shape:sh1,ci:ci1,si:0};tr={shape:sh1,ci:ci1,si:1};
                    bl={shape:sh2,ci:ci1,si:0};ans={shape:sh2,ci:ci1,si:1};
                } else {
                    tl={shape:sh1,ci:ci1,si:0};tr={shape:sh2,ci:ci1,si:0};
                    bl={shape:sh1,ci:ci1,si:1};ans={shape:sh2,ci:ci1,si:1};
                } break;
            case 8: // All three: color+shape across, size down
                tl={shape:sh1,ci:ci1,si:0};tr={shape:sh2,ci:ci2,si:0};
                bl={shape:sh1,ci:ci1,si:1};ans={shape:sh2,ci:ci2,si:1}; break;
        }

        // Generate 3 distractors (close but wrong in 1 property)
        const choices=[ans], tried=new Set([JSON.stringify(ans)]);
        let att=0;
        while(choices.length<4 && att<100) {
            att++;
            let d={...ans};
            const prop=pick(['shape','ci','si']);
            if(prop==='shape') d.shape=pickDiff(SHAPES,ans.shape);
            else if(prop==='ci') d.ci=rciDiff(ans.ci);
            else d.si=1-ans.si;
            const k=JSON.stringify(d);
            if(!tried.has(k)){tried.add(k);choices.push(d);}
        }
        while(choices.length<4) choices.push({shape:pick(SHAPES),ci:rci(),si:Math.floor(Math.random()*2)});

        return {grid:[[tl,tr],[bl,ans]], answer:ans, choices:shuffle(choices)};
    }

    let problems=[], current=0, score=0, tried=false;
    let questionStartMs = null;
    const attemptCounts = {};

    function startLevel(l) {
        level=l;
        problems=[];
        const seen=new Set();
        let attempts=0;
        while(problems.length<QUESTIONS && attempts<200){
            const p=makeProblem(level);
            const key=JSON.stringify(p.grid);
            if(!seen.has(key)){seen.add(key);problems.push(p);}
            attempts++;
        }
        current=0; score=0; tried=false;
        renderGame();
    }

    // Level picker screen
    function renderPicker() {
        const maxLevel=parseInt(localStorage.getItem('fm_level')||'1');
        let html='<button class="back" onclick="showMenu()">← Back</button>';
        html+='<div class="card"><div class="title">🧩 Figure Matrices</div>';
        html+='<div class="inst">Pick a level!</div>';
        html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:15px 0">';
        for(let l=1;l<=8;l++){
            const unlocked=l<=maxLevel;
            const h=history['L'+l]||[];
            const best=h.length?Math.max(...h):0;
            const bg=l===maxLevel?'#22c55e':unlocked?'#4169E1':'#555';
            html+='<div style="background:'+bg+';color:white;padding:14px 10px;border-radius:12px;text-align:center;'+(unlocked?'cursor:pointer':'opacity:0.6')+'" ';
            if(unlocked) html+='onclick="fmStart('+l+')"';
            html+='><div style="font-size:18px;font-weight:bold">'+(unlocked?'Level '+l:'🔒 Level '+l)+'</div>';
            html+='<div style="font-size:11px;margin-top:3px">'+LEVEL_NAMES[l-1]+'</div>';
            if(unlocked && h.length) html+='<div style="font-size:11px;margin-top:2px">Best: '+best+'/'+QUESTIONS+' (×'+h.length+')</div>';
            html+='</div>';
        }
        html+='</div></div>';
        document.getElementById('app').innerHTML=html;
    }

    window.fmStart = startLevel;

    // Game screen
    function renderGame() {
        if(current>=QUESTIONS) {
            // Save history & check level-up
            const key='L'+level;
            const h=history[key]||[];
            h.push(score);
            history[key]=h;
            localStorage.setItem('fm_history',JSON.stringify(history));
            const maxLevel=parseInt(localStorage.getItem('fm_level')||'1');
            const recent=h.slice(-3);
            const threshold=Math.ceil(QUESTIONS*0.8);
            if(recent.length>=3 && recent.every(s=>s>=threshold) && level>=maxLevel && level<8){
                localStorage.setItem('fm_level',String(level+1));
            }
            completeWorksheet('Figure Matrices',score,QUESTIONS);
            return;
        }

        const prob=problems[current];
        let html='<button class="back" onclick="showMenu()">← Back</button>';
        html+='<div class="card"><div class="title">🧩 Puzzle Time!</div>';
        html+='<div class="inst">Level '+level+' — '+LEVEL_NAMES[level-1]+'</div>';

        // 2x2 grid
        html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;justify-items:center;max-width:230px;margin:15px auto">';
        for(let r=0;r<2;r++) for(let c=0;c<2;c++){
            if(r===1&&c===1){
                html+='<div style="width:95px;height:95px;background:#fff8e1;border:3px dashed #ffc107;border-radius:12px;display:flex;align-items:center;justify-content:center"><span style="font-size:40px">❓</span></div>';
            } else {
                const cell=prob.grid[r][c];
                html+='<div style="width:95px;height:95px;background:#f8f9fa;border:2px solid #dee2e6;border-radius:12px;display:flex;align-items:center;justify-content:center">';
                html+=svg(cell.shape,COLORS[cell.ci],SIZES[cell.si]);
                html+='</div>';
            }
        }
        html+='</div>';

        // Answer choices
        html+='<div class="inst" style="margin-top:12px">Which one fits? 👇</div>';
        html+='<div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin:10px 0">';
        prob.choices.forEach((ch,i)=>{
            html+='<div id="fmc'+i+'" style="width:75px;height:75px;background:white;border:3px solid #adb5bd;border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer" onclick="fmPick('+i+')">';
            html+=svg(ch.shape,COLORS[ch.ci],SIZES[ch.si]);
            html+='</div>';
        });
        html+='</div>';

        html+='<div class="score">'+(current+1)+' / '+QUESTIONS+' &nbsp;⭐ '+score+'</div></div>';
        document.getElementById('app').innerHTML=html;
        questionStartMs = Date.now();
    }

    window.fmPick = (idx) => {
        const responseTimeMs = Date.now() - questionStartMs;
        attemptCounts[current] = (attemptCounts[current] || 0) + 1;
        const prob=problems[current];
        const ch=prob.choices[idx];
        const correct=ch.shape===prob.answer.shape && ch.ci===prob.answer.ci && ch.si===prob.answer.si;
        const firstTry=!tried;

        if (attemptCounts[current] === 1) currentAnswers.push({
            q:'L'+level+' '+LEVEL_NAMES[level-1],
            answer:SNAMES[ch.si]+' '+CNAMES[ch.ci]+' '+ch.shape,
            correct, first_try:firstTry
        });

        const ansDesc = SNAMES[prob.answer.si]+' '+CNAMES[prob.answer.ci]+' '+prob.answer.shape;
        const chDesc = SNAMES[ch.si]+' '+CNAMES[ch.ci]+' '+ch.shape;
        recordResponse('figure_matrices', {type:'figure_matrices', level_name:LEVEL_NAMES[level-1]}, ansDesc, chDesc, correct, attemptCounts[current]===1, attemptCounts[current], responseTimeMs, current, false, level);

        if(correct) {
            if(firstTry) score++;
            showFeedback(true, ()=>{ tried=false; current++; renderGame(); });
        } else {
            tried=true;
            // Gentle retry feedback (don't use showFeedback which says "next time")
            const el=document.getElementById('fmc'+idx);
            if(el){el.style.borderColor='#ef4444';el.style.background='#fee2e2';}
            const title=document.querySelector('.title');
            if(title){title.innerHTML='🤔 Try again!';title.style.color='#ef4444';}
            const card=document.querySelector('.card');
            if(card) card.style.animation='shake 0.5s';
            setTimeout(()=>{
                if(el){el.style.borderColor='#adb5bd';el.style.background='white';}
                const t2=document.querySelector('.title');
                if(t2){t2.innerHTML='🧩 Puzzle Time!';t2.style.color='#FF6B35';}
                if(card) card.style.animation='';
            },1000);
        }
    };

    renderPicker();
}
