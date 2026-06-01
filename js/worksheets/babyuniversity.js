// ============ BABY UNIVERSITY BOOK READER ============
const BABY_UNIVERSITY_BOOKS = [
    {
        id: 'quantum_physics',
        title: 'Quantum Physics for Babies',
        pages: 25,
        path: 'books/quantum_physics'
    },
    {
        id: 'newtonian_physics',
        title: 'Newtonian Physics for Babies',
        pages: 25,
        path: 'books/newtonian_physics'
    }
];

function showBabyUniversity() {
    let html = '<button class="back" onclick="showMenu()">← Back</button><div class="card">';
    html += '<div class="title">📚 Baby University</div>';
    html += '<div style="display:grid;grid-template-columns:1fr;gap:15px;margin-top:15px">';
    BABY_UNIVERSITY_BOOKS.forEach(book => {
        html += '<div class="prob" style="cursor:pointer;padding:20px;text-align:center" onclick="openBook(\'' + book.id + '\')">';
        html += '<img src="' + book.path + '/page_01.jpeg" style="width:120px;border-radius:8px;margin-bottom:10px"><br>';
        html += '<div style="font-size:18px;font-weight:bold">' + book.title + '</div>';
        html += '</div>';
    });
    html += '</div></div>';
    document.getElementById('app').innerHTML = html;
}

function openBook(bookId) {
    const book = BABY_UNIVERSITY_BOOKS.find(b => b.id === bookId);
    if (!book) return;
    let current = 0;

    function render() {
        const pageNum = current + 1;
        let html = '<button class="back" onclick="showBabyUniversity()">← Back</button>';
        html += '<div class="card" style="padding:10px">';
        html += '<div class="title" style="font-size:18px;margin-bottom:5px">📚 ' + book.title + '</div>';
        html += '<div style="text-align:center;margin:5px 0">';
        html += '<img src="' + book.path + '/page_' + String(pageNum).padStart(2, '0') + '.jpeg" style="max-width:100%;max-height:60vh;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.3)">';
        html += '</div>';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">';
        html += '<button class="key" onclick="prevBUPage()" ' + (current === 0 ? 'disabled style="opacity:0.3"' : '') + '>← Prev</button>';
        html += '<span class="score">' + pageNum + ' / ' + book.pages + '</span>';
        if (current < book.pages - 1) {
            html += '<button class="key green" onclick="nextBUPage()">Next →</button>';
        } else {
            html += '<button class="btn green" onclick="finishBook()">✓ Done!</button>';
        }
        html += '</div></div>';
        document.getElementById('app').innerHTML = html;
    }

    window.prevBUPage = () => { if (current > 0) { current--; render(); } };
    window.nextBUPage = () => { if (current < book.pages - 1) { current++; render(); } };

    window.finishBook = async () => {
        if (CONFIG.sessionId) {
            await recordResponse('baby_university',
                { type: 'book_read', book_id: book.id, pages: book.pages },
                'completed', 'completed', true, true, 1, 0, 0
            );
        }
        document.getElementById('app').innerHTML =
            '<div class="card"><div class="title">Great job! 🎉</div>' +
            '<div style="text-align:center;margin:20px;font-size:20px">You read ' + book.title + '!</div>' +
            '<button class="btn green" onclick="showBabyUniversity()">More Books</button>' +
            '<div style="margin-top:10px"><button class="btn" onclick="showMenu()">← Menu</button></div></div>';
    };

    render();
}
