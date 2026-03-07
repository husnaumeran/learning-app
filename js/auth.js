// ============ AUTH & PROFILE MANAGEMENT ============

// Entry point — called on app load instead of showMenu()
async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        await loadParentAndChildren(session.user);
    } else {
        showAuthScreen();
    }
}

function showAuthScreen() {
    let isSignUp = false;
    const app = document.getElementById('app');

    function render() {
        app.innerHTML = `
            <h1 style="text-align:center;margin-top:40px">🧠 Tiny Thinkers</h1>
            <div style="max-width:320px;margin:30px auto;padding:20px">
                <div style="display:flex;gap:10px;margin-bottom:20px">
                    <button id="btn-signin" onclick="toggleAuthMode(false)"
                        style="flex:1;padding:12px;border-radius:12px;border:2px solid ${!isSignUp?'#4169E1':'#ddd'};
                        background:${!isSignUp?'#4169E1':'white'};color:${!isSignUp?'white':'#333'};
                        font-family:Nunito;font-weight:700;font-size:1rem;cursor:pointer">
                        Sign In
                    </button>
                    <button id="btn-signup" onclick="toggleAuthMode(true)"
                        style="flex:1;padding:12px;border-radius:12px;border:2px solid ${isSignUp?'#4169E1':'#ddd'};
                        background:${isSignUp?'#4169E1':'white'};color:${isSignUp?'white':'#333'};
                        font-family:Nunito;font-weight:700;font-size:1rem;cursor:pointer">
                        Create Account
                    </button>
                </div>
                <input id="auth-email" type="email" placeholder="Email"
                    style="width:100%;padding:14px;border-radius:12px;border:2px solid #ddd;
                    font-family:Nunito;font-size:1rem;margin-bottom:10px;box-sizing:border-box">
                <input id="auth-password" type="password" placeholder="Password"
                    style="width:100%;padding:14px;border-radius:12px;border:2px solid #ddd;
                    font-family:Nunito;font-size:1rem;margin-bottom:10px;box-sizing:border-box">
                ${isSignUp ? `
                <input id="auth-name" type="text" placeholder="Parent Name"
                    style="width:100%;padding:14px;border-radius:12px;border:2px solid #ddd;
                    font-family:Nunito;font-size:1rem;margin-bottom:10px;box-sizing:border-box">
                ` : ''}
                <div id="auth-error" style="color:#e74c3c;text-align:center;margin:10px 0;font-size:0.9rem"></div>
                <button onclick="handleAuth()"
                    style="width:100%;padding:16px;border-radius:16px;border:none;
                    background:#22c55e;color:white;font-family:Nunito;font-weight:800;
                    font-size:1.1rem;cursor:pointer">
                    ${isSignUp ? 'Create Account 🚀' : 'Sign In 🎯'}
                </button>
            </div>
        `;
    }

    window.toggleAuthMode = function(signUp) {
        isSignUp = signUp;
        render();
    };

    window.handleAuth = async function() {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        const errorEl = document.getElementById('auth-error');
        errorEl.textContent = '';

        if (!email || !password) {
            errorEl.textContent = 'Please enter email and password';
            return;
        }

        let result;
        if (isSignUp) {
            result = await sb.auth.signUp({ email, password });
        } else {
            result = await sb.auth.signInWithPassword({ email, password });
        }

        if (result.error) {
            errorEl.textContent = result.error.message;
            return;
        }

        const user = result.data.user;

        // Upsert parent row
        const displayName = isSignUp
            ? (document.getElementById('auth-name')?.value.trim() || email.split('@')[0])
            : null;

        await upsertParent(user.id, displayName);
        await loadParentAndChildren(user);
    };

    render();
}

async function upsertParent(userId, displayName) {
    const { data } = await sb.from('parents').select('id').eq('id', userId).maybeSingle();
    if (!data) {
        await sb.from('parents').insert({
            id: userId,
            display_name: displayName || 'Parent'
        });
    }
}

async function loadParentAndChildren(user) {
    const { data: children } = await sb.from('children')
        .select('*')
        .eq('parent_id', user.id)
        .eq('is_active', true)
        .order('created_at');

    if (!children || children.length === 0) {
        showAddChild(user);
    } else if (children.length === 1) {
        // Single child — skip picker, go straight to menu
        selectChild(children[0]);
    } else {
        showChildPicker(children);
    }
}

function showAddChild(user) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <h1 style="text-align:center;margin-top:40px">👋 Welcome!</h1>
        <p style="text-align:center;color:#666;font-size:1.1rem">Let's add your first learner</p>
        <div style="max-width:320px;margin:30px auto;padding:20px">
            <input id="child-name" type="text" placeholder="Child's Name"
                style="width:100%;padding:14px;border-radius:12px;border:2px solid #ddd;
                font-family:Nunito;font-size:1rem;margin-bottom:10px;box-sizing:border-box">
            <div id="child-error" style="color:#e74c3c;text-align:center;margin:10px 0;font-size:0.9rem"></div>
            <button onclick="handleAddChild()"
                style="width:100%;padding:16px;border-radius:16px;border:none;
                background:#22c55e;color:white;font-family:Nunito;font-weight:800;
                font-size:1.1rem;cursor:pointer">
                Let's Go! 🎉
            </button>
        </div>
    `;

    window.handleAddChild = async function() {
        const name = document.getElementById('child-name').value.trim();
        const errorEl = document.getElementById('child-error');
        if (!name) {
            errorEl.textContent = 'Please enter a name';
            return;
        }

        const { error } = await sb.from('children').insert({
            parent_id: user.id,
            name: name
        });

        if (error) {
            errorEl.textContent = error.message;
            return;
        }

        await loadParentAndChildren(user);
    };
}

function showChildPicker(children) {
    const app = document.getElementById('app');
    const buttons = children.map(c => `
        <button onclick="pickChild('${c.id}')"
            style="width:100%;padding:20px;border-radius:16px;border:2px solid #4169E1;
            background:white;font-family:Nunito;font-weight:700;font-size:1.2rem;
            cursor:pointer;margin-bottom:12px;display:flex;align-items:center;gap:12px">
            <span style="font-size:2rem">${c.avatar || '🧒'}</span>
            <span>${c.name}</span>
        </button>
    `).join('');

    app.innerHTML = `
        <h1 style="text-align:center;margin-top:40px">🌟 Who's Ready to Learn?</h1>
        <div style="max-width:320px;margin:30px auto;padding:20px">
            ${buttons}
        </div>
    `;

    window.pickChild = function(childId) {
        const child = children.find(c => c.id === childId);
        selectChild(child);
    };
}

function selectChild(child) {
    CONFIG.childId = child.id;
    CONFIG.childName = child.name;
    CONFIG.focusNumber = child.focus_number;
    localStorage.setItem('focusNumber', child.focus_number);
    showMenu();
}

async function signOut() {
    await sb.auth.signOut();
    checkAuth();
}
