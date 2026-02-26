// ============  Connect Dots ============
function showConnectDots() {
    const shapes = [
        {name:'Star', dots:[[150,30],[180,100],[250,100],[195,145],[215,220],[150,175],[85,220],[105,145],[50,100],[120,100]], emoji:'⭐'},
        {name:'House', dots:[[100,200],[100,100],[150,50],[200,100],[200,200],[150,200],[150,150],[120,150],[120,200]], emoji:'🏠'},
        {name:'Heart', dots:[[150,180],[100,130],[80,90],[100,60],[130,60],[150,90],[170,60],[200,60],[220,90],[200,130]], emoji:'❤️'}
    ];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    let current = 0;
    const connected = [];

    function render() {
        let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card"><div class="title">Connect the Dots!</div>';
        html += '<canvas id="dotCanvas" width="300" height="250" style="background:white;border-radius:10px;display:block;margin:0 auto"></canvas>';
        html += '<div class="score">Tap '+((current < shape.dots.length) ? (current+1) : 'Done!')+' / '+shape.dots.length+'</div></div>';
        document.getElementById('app').innerHTML = html;
        drawCanvas();
    }

    function drawCanvas() {
        const canvas = document.getElementById('dotCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,300,250);

        // Draw connected lines
        ctx.strokeStyle = '#4169E1';
        ctx.lineWidth = 3;
        for (let i = 1; i < connected.length; i++) {
            ctx.beginPath();
            ctx.moveTo(shape.dots[connected[i-1]][0], shape.dots[connected[i-1]][1]);
            ctx.lineTo(shape.dots[connected[i]][0], shape.dots[connected[i]][1]);
            ctx.stroke();
        }

        // Draw dots
        shape.dots.forEach(([x,y], i) => {
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.fillStyle = connected.includes(i) ? '#22c55e' : '#4169E1';
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(i+1, x, y);
        });

        // Done?
        if (current >= shape.dots.length) {
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = '#22c55e';
            ctx.fillText(shape.emoji, 150, 125);
            completeWorksheet('Connect Dots', shape.dots.length, shape.dots.length);
            return;
        }


        canvas.onclick = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const [dotX, dotY] = shape.dots[current];
            if (Math.abs(x - dotX) < 20 && Math.abs(y - dotY) < 20) {
                connected.push(current);
                current++;
                render();
            }
        };
    }
    render();
}