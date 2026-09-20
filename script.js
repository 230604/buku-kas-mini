// --- AUTHENTICATION & WEBAUTHN LOGIC ---
const authScreen = document.getElementById('auth-screen');
const appMain = document.getElementById('app-main');
const regForm = document.getElementById('auth-register-form');
const loginForm = document.getElementById('auth-login-form');
const bioSection = document.getElementById('biometric-section');
const btnSetupFingerprint = document.getElementById('btn-setup-fingerprint');
const btnFingerprint = document.getElementById('btn-fingerprint');

let userPin = localStorage.getItem('fin_auth_pin');
let credentialIdBase64 = localStorage.getItem('fin_auth_credential');
let userName = localStorage.getItem('fin_user_name') || 'User';

function updateUserNameUI() {
    // Update all brand name spans
    document.querySelectorAll('.app-brand-name').forEach(el => el.textContent = userName.toUpperCase());
    
    // Update login screen
    if(document.getElementById('login-display-name')) document.getElementById('login-display-name').textContent = userName;
    if(document.getElementById('login-avatar')) document.getElementById('login-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;
    
    // Update mobile hero
    if(document.getElementById('mh-display-name')) document.getElementById('mh-display-name').textContent = `Halo, ${userName}!`;
    if(document.getElementById('mh-avatar-img')) document.getElementById('mh-avatar-img').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;
}

function bufferToBase64(buffer) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
}
function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

function unlockApp() {
    authScreen.style.display = 'none';
    appMain.style.display = 'flex'; // It's a flex container in CSS
    // Optional chart re-render fix
    if (typeof Chart !== 'undefined' && document.getElementById('stats').classList.contains('active')) {
        renderCharts();
    }
}

function initAuth() {
    updateUserNameUI();
    if (!userPin) {
        regForm.style.display = 'block';
    } else {
        loginForm.style.display = 'block';
        if (credentialIdBase64 && window.PublicKeyCredential) {
            bioSection.style.display = 'block';
        } else if (window.PublicKeyCredential) {
            btnSetupFingerprint.style.display = 'inline-block';
        }
    }
}

window.openSettings = function() {
    document.getElementById('settings-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random&size=128`;
    document.getElementById('settings-name').textContent = `Halo, ${userName}!`;
    document.getElementById('settings-modal').style.display = 'flex';
};

window.changeName = function() {
    const newName = prompt("Masukkan Nama Panggilan baru Anda:", userName);
    if (newName && newName.trim() !== '') {
        userName = newName.trim();
        localStorage.setItem('fin_user_name', userName);
        updateUserNameUI();
        document.getElementById('settings-name').textContent = `Halo, ${userName}!`;
        alert("Nama berhasil diubah!");
    }
};

window.resetData = function() {
    if (confirm("PERINGATAN BAHAYA!\n\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA keuangan dan PIN Anda? Data yang dihapus tidak bisa dikembalikan!")) {
        if (confirm("Apakah Anda benar-benar yakin?")) {
            localStorage.clear();
            alert("Seluruh data telah dihapus. Aplikasi akan dimuat ulang.");
            location.reload();
        }
    }
};

window.changePin = function() {
    const oldPin = prompt("Untuk mengubah PIN, masukkan PIN 6-digit LAMA Anda:");
    if (oldPin === null) return; // User cancelled
    
    if (oldPin === localStorage.getItem('fin_auth_pin')) {
        const newPin = prompt("Masukkan 6-digit PIN BARU Anda:");
        if (newPin && newPin.length === 6 && !isNaN(newPin)) {
            localStorage.setItem('fin_auth_pin', newPin);
            userPin = newPin; // Update memory
            alert("Berhasil! PIN Anda telah diubah.");
        } else {
            alert("Gagal! PIN baru harus terdiri dari 6 angka.");
        }
    } else {
        alert("Gagal! PIN lama yang Anda masukkan SALAH.");
    }
};

if(regForm) {
    regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        userName = document.getElementById('reg-name').value || 'User';
        userPin = document.getElementById('reg-pin').value;
        localStorage.setItem('fin_user_name', userName);
        localStorage.setItem('fin_auth_pin', userPin);
        updateUserNameUI();
        
        alert('Data berhasil disimpan! JANGAN SAMPAI LUPA PIN ANDA!');
        unlockApp();
        // Show setup FP button after registration if supported
        if (window.PublicKeyCredential && !credentialIdBase64) {
            if(confirm('Apakah Anda ingin mengaktifkan login dengan Sidik Jari?')) {
                btnSetupFingerprint.click();
            }
        }
    });
}

if(loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputPin = document.getElementById('login-pin').value;
        if (inputPin === userPin) {
            document.getElementById('login-pin').value = '';
            unlockApp();
        } else {
            alert('PIN SALAH!');
            document.getElementById('login-pin').value = '';
        }
    });
}

if(btnSetupFingerprint) {
    btnSetupFingerprint.addEventListener('click', async () => {
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);
            const userId = new Uint8Array(16);
            window.crypto.getRandomValues(userId);
            
            const publicKey = {
                challenge: challenge,
                rp: { name: "Buku Kas Ryan" },
                user: {
                    id: userId,
                    name: "ryan@buku.kas",
                    displayName: "Ryan"
                },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
                timeout: 60000
            };
            
            const credential = await navigator.credentials.create({ publicKey });
            localStorage.setItem('fin_auth_credential', bufferToBase64(credential.rawId));
            alert('Sidik jari berhasil didaftarkan! Anda bisa menggunakannya untuk login berikutnya.');
            
            btnSetupFingerprint.style.display = 'none';
            bioSection.style.display = 'block';
        } catch (err) {
            console.error(err);
            alert('Gagal mendaftarkan sidik jari. Pastikan perangkat mendukung (HP/Laptop) dan situs diakses via HTTPS.');
        }
    });
}

if(btnFingerprint) {
    btnFingerprint.addEventListener('click', async () => {
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);
            const rawId = base64ToBuffer(localStorage.getItem('fin_auth_credential'));
            
            const publicKey = {
                challenge: challenge,
                allowCredentials: [{ type: 'public-key', id: rawId }],
                userVerification: "required",
                timeout: 60000
            };
            
            const assertion = await navigator.credentials.get({ publicKey });
            if (assertion) {
                document.getElementById('login-pin').value = '';
                unlockApp();
            }
        } catch (err) {
            console.error(err);
            alert('Autentikasi sidik jari gagal atau dibatalkan.');
        }
    });
}

initAuth();

// --- DATA STRUCTURES & LOCAL STORAGE ---
let transactions = JSON.parse(localStorage.getItem('fin_transactions')) || [];
let accounts = JSON.parse(localStorage.getItem('fin_accounts')) || [
    { id: 1, name: 'Cash', type: 'Cash', initBalance: 0 },
    { id: 2, name: 'Rekening Utama', type: 'Rekening Bank', initBalance: 0 }
];
let budgets = JSON.parse(localStorage.getItem('fin_budgets')) || [];
let savingGoals = JSON.parse(localStorage.getItem('fin_goals')) || [];

function saveData() {
    localStorage.setItem('fin_transactions', JSON.stringify(transactions));
    localStorage.setItem('fin_accounts', JSON.stringify(accounts));
    localStorage.setItem('fin_budgets', JSON.stringify(budgets));
    localStorage.setItem('fin_goals', JSON.stringify(savingGoals));
}


// Categories Configuration (Mahasiswa Edition)
const categories = {
    income: ['Uang bulanan dari orang tua', 'Uang tambahan dari orang tua', 'Uang hadiah', 'Penghasilan sampingan', 'Lainnya'],
    expense: ['Makan dan minum', 'Bensin', 'Transportasi', 'Parkir', 'Pulsa dan internet', 'Keperluan kuliah', 'Fotokopi dan print', 'Alat tulis', 'Praktikum', 'Tugas/proyek', 'Uang organisasi/kegiatan kampus', 'Nongkrong', 'Hiburan', 'Belanja', 'Perawatan kendaraan', 'Kebutuhan pribadi', 'Keperluan mendadak', 'Lainnya']
};

// --- NAVIGATION & UI SETUP ---
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view-section');
const pageTitle = document.getElementById('page-title');

const viewTitles = {
    'dashboard': 'DASHBOARD UTAMA',
    'transactions': 'MANAJEMEN TRANSAKSI',
    'savings': 'TABUNGAN & TARGET',
    'balances': 'POSISI SALDO',
    'budget': 'BUDGET BULANAN',
    'stats': 'REKAP & STATISTIK'
};

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.getAttribute('data-target');
        
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        views.forEach(view => {
            view.classList.remove('active');
            if(view.id === target) view.classList.add('active');
        });
        
        pageTitle.innerText = viewTitles[target];
        renderAll();
    });
});

// Utilities
const formatRp = (num) => 'Rp ' + Math.abs(num).toLocaleString('id-ID');
const genID = () => Math.floor(Math.random() * 1000000);

// --- GLOBAL RENDER ---
function renderAll() {
    renderForms();
    const calc = calculateCoreMetrics();
    
    renderDashboard(calc);
    renderTransactions();
    renderSavings(calc);
    renderBalances(calc);
    renderBudgets(calc);
    renderStats(calc);
}

// Calculate Core Metrics for Current Month
function calculateCoreMetrics() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filter this month
    const thisMonthTrx = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    let incThisMonth = 0;
    let expThisMonth = 0;
    let savedThisMonth = 0;
    
    // Orang Tua Tracking
    let ortuTotal = 0;

    thisMonthTrx.forEach(t => {
        if(t.type === 'income') {
            incThisMonth += t.amount;
            if(t.category === 'Uang bulanan dari orang tua') ortuTotal += t.amount;
        }
        if(t.type === 'expense') expThisMonth += t.amount;
        if(t.type === 'transfer') savedThisMonth += t.amount;
    });

    const remaining = incThisMonth - expThisMonth - savedThisMonth;
    const savingRate = incThisMonth > 0 ? (savedThisMonth / incThisMonth) * 100 : 0;

    // Accounts balance logic
    const accBalances = {};
    accounts.forEach(a => accBalances[a.id] = a.initBalance);
    
    transactions.forEach(t => {
        if(t.account && accBalances[t.account] !== undefined) {
            if(t.type === 'income') accBalances[t.account] += t.amount;
            if(t.type === 'expense') accBalances[t.account] -= t.amount;
            if(t.type === 'transfer') accBalances[t.account] -= t.amount; 
        }
    });

    const totalBalance = Object.values(accBalances).reduce((a,b)=>a+b, 0);

    return {
        incThisMonth, expThisMonth, savedThisMonth, remaining, savingRate,
        ortuTotal,
        accBalances, totalBalance, thisMonthTrx
    };
}

// --- POPULATE FORMS ---
function renderForms() {
    const trxType = document.getElementById('trx-type').value;
    const catSelect = document.getElementById('trx-cat');
    catSelect.innerHTML = '';
    
    if(trxType === 'income') {
        categories.income.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
    } else if(trxType === 'expense') {
        categories.expense.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
    } else {
        catSelect.innerHTML = `<option value="Tabungan">Transfer Tabungan</option>`;
    }

    const accSelect = document.getElementById('trx-account');
    accSelect.innerHTML = accounts.map(a => `<option value="${a.id}">${a.name} (${a.type})</option>`).join('');

    const goalGroup = document.getElementById('group-saving-goal');
    if(trxType === 'transfer') {
        goalGroup.style.display = 'block';
        const goalSelect = document.getElementById('trx-saving-goal');
        if(savingGoals.length === 0) {
            goalSelect.innerHTML = `<option value="">Belum ada target (Buat di menu Tabungan)</option>`;
        } else {
            goalSelect.innerHTML = savingGoals.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        }
    } else {
        goalGroup.style.display = 'none';
    }

    const budgCat = document.getElementById('budget-cat');
    if(budgCat) budgCat.innerHTML = categories.expense.map(c => `<option value="${c}">${c}</option>`).join('');
}

document.getElementById('trx-type').addEventListener('change', renderForms);

// --- 1. DASHBOARD ---
let chartIncExp, chartSavings, chartCat;

function renderDashboard(calc) {
    document.getElementById('dash-remaining-big').innerText = formatRp(calc.remaining);
    const mobileRemaining = document.getElementById('dash-remaining-mobile');
    if (mobileRemaining) mobileRemaining.innerText = formatRp(calc.remaining);
    
    // Quick KPIs
    document.getElementById('dash-income').innerText = formatRp(calc.incThisMonth);
    document.getElementById('dash-expense').innerText = formatRp(calc.expThisMonth);
    document.getElementById('dash-saved').innerText = formatRp(calc.savedThisMonth);

    // Uang Orang Tua tracking
    document.getElementById('dash-ortu-total').innerText = formatRp(calc.ortuTotal);
    const ortuUsed = calc.expThisMonth + calc.savedThisMonth;
    document.getElementById('dash-ortu-used').innerText = formatRp(ortuUsed);

    // Status Keuangan & Prediksi Runway
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - currentDay + 1; // +1 includes today
    
    const avgDailyExpense = currentDay > 1 ? (calc.expThisMonth / (currentDay - 1)) : calc.expThisMonth;
    const projectedRemainingNeed = avgDailyExpense * daysRemaining;

    const statusEl = document.getElementById('dash-status');
    const statusDescEl = document.getElementById('dash-status-desc');

    if (calc.remaining < 0) {
        statusEl.innerHTML = `OVER BUDGET 🔴`;
        statusEl.style.color = 'var(--danger-red)';
        statusDescEl.innerText = `Uang jatah Anda sudah minus ${formatRp(calc.remaining)}!`;
    } else if (calc.remaining < projectedRemainingNeed) {
        statusEl.innerHTML = `WASPADA 🟡`;
        statusEl.style.color = 'var(--warning-orange)';
        statusDescEl.innerText = `Sisa uang Anda berisiko habis sebelum akhir bulan. Kurangi jajan!`;
    } else {
        statusEl.innerHTML = `AMAN 🟢`;
        statusEl.style.color = 'var(--success-green)';
        statusDescEl.innerText = `Estimasi jatah Anda cukup sampai akhir bulan. Pertahankan!`;
    }

    // Recent Transactions (Last 5)
    const recentTbody = document.getElementById('dash-recent-tbody');
    const recentTrx = transactions.slice(0, 5);
    
    if (recentTrx.length === 0) {
        recentTbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--text-muted);">Belum ada transaksi</td></tr>`;
    } else {
        recentTbody.innerHTML = recentTrx.map(t => {
            let amountHtml = '';
            if(t.type === 'income') amountHtml = `<span class="text-green">+${formatRp(t.amount)}</span>`;
            else if(t.type === 'expense') amountHtml = `<span class="text-red">-${formatRp(t.amount)}</span>`;
            else amountHtml = `<span class="text-purple">${formatRp(t.amount)}</span>`;
            
            return `
                <tr>
                    <td>${t.date}</td>
                    <td><b>${t.desc}</b></td>
                    <td><span class="badge gray">${t.category}</span></td>
                    <td class="text-right"><b>${amountHtml}</b></td>
                </tr>
            `;
        }).join('');
    }

    renderCharts();
}

function renderCharts() {
    const monthlyData = {};
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    
    transactions.forEach(t => {
        const d = new Date(t.date);
        const mKey = d.getFullYear() + '-' + d.getMonth();
        if(!monthlyData[mKey]) monthlyData[mKey] = { inc:0, exp:0, sav:0, label: months[d.getMonth()] + ' ' + d.getFullYear() };
        
        if(t.type==='income') monthlyData[mKey].inc += t.amount;
        if(t.type==='expense') monthlyData[mKey].exp += t.amount;
        if(t.type==='transfer') monthlyData[mKey].sav += t.amount;
    });

    const sortedKeys = Object.keys(monthlyData).sort();
    const labels = sortedKeys.map(k => monthlyData[k].label);
    const dataInc = sortedKeys.map(k => monthlyData[k].inc);
    const dataExp = sortedKeys.map(k => monthlyData[k].exp);
    const dataSav = sortedKeys.map(k => monthlyData[k].sav);

    const ctx1 = document.getElementById('chart-inc-exp');
    if(chartIncExp) chartIncExp.destroy();
    chartIncExp = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Uang Masuk', data: dataInc, backgroundColor: '#10b981' },
                { label: 'Uang Keluar', data: dataExp, backgroundColor: '#ef4444' }
            ]
        },
        options: { maintainAspectRatio: false }
    });

    const ctx2 = document.getElementById('chart-savings');
    if(chartSavings) chartSavings.destroy();
    chartSavings = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: 'Ditabung', data: dataSav, borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.2)', fill: true, tension: 0.3 }]
        },
        options: { maintainAspectRatio: false }
    });

    const now = new Date();
    const expCats = {};
    transactions.filter(t => t.type==='expense' && new Date(t.date).getMonth() === now.getMonth()).forEach(t => {
        expCats[t.category] = (expCats[t.category] || 0) + t.amount;
    });
    
    const ctx3 = document.getElementById('chart-expense-cat');
    if(chartCat) chartCat.destroy();
    chartCat = new Chart(ctx3, {
        type: 'doughnut',
        data: {
            labels: Object.keys(expCats),
            datasets: [{ data: Object.values(expCats), backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#14b8a6', '#8b5cf6', '#64748b', '#10b981'] }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
}

// --- 2. TRANSACTIONS ---
document.getElementById('trx-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('trx-type').value;
    const amount = parseFloat(document.getElementById('trx-amount').value);
    
    const t = {
        id: genID(),
        type: type,
        date: document.getElementById('trx-date').value,
        desc: document.getElementById('trx-desc').value,
        category: document.getElementById('trx-cat').value,
        account: parseInt(document.getElementById('trx-account').value),
        goal: type === 'transfer' ? parseInt(document.getElementById('trx-saving-goal').value) : null,
        amount: amount,
        notes: document.getElementById('trx-notes').value
    };

    transactions.unshift(t);
    saveData();
    e.target.reset();
    document.getElementById('trx-date').valueAsDate = new Date(); // reset date to today
    renderAll();
});

function renderTransactions() {
    const tbody = document.getElementById('trx-tbody');
    tbody.innerHTML = transactions.map(t => {
        const acc = accounts.find(a => a.id === t.account)?.name || '-';
        let inc = '-', exp = '-';
        let badge = '';
        if(t.type === 'income') { inc = formatRp(t.amount); badge = `<span class="badge green">Pemasukan</span>`; }
        if(t.type === 'expense') { exp = formatRp(t.amount); badge = `<span class="badge red">Pengeluaran</span>`; }
        if(t.type === 'transfer') { exp = formatRp(t.amount); badge = `<span class="badge purple">Tabungan</span>`; }

        return `
            <tr>
                <td>${t.date}</td>
                <td><b>${t.desc}</b><br><small>${badge}</small></td>
                <td>${t.category}</td>
                <td>${acc}</td>
                <td>${t.notes || '-'}</td>
                <td class="text-right text-green">${inc}</td>
                <td class="text-right text-red">${exp}</td>
                <td class="print-hide"><button class="btn-danger-outline" onclick="delTrx(${t.id})"><i class="fa fa-trash"></i></button></td>
            </tr>
        `;
    }).join('');
}
function delTrx(id) { transactions = transactions.filter(t => t.id !== id); saveData(); renderAll(); }

// --- 3. SAVINGS ---
document.getElementById('goal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    savingGoals.push({
        id: genID(),
        name: document.getElementById('goal-name').value,
        amount: parseFloat(document.getElementById('goal-amount').value)
    });
    saveData();
    e.target.reset();
    renderAll();
});

function renderSavings() {
    const container = document.getElementById('savings-goals-container');
    const collected = {};
    savingGoals.forEach(g => collected[g.id] = 0);
    transactions.filter(t => t.type === 'transfer' && t.goal).forEach(t => {
        if(collected[t.goal] !== undefined) collected[t.goal] += t.amount;
    });

    container.innerHTML = savingGoals.map(g => {
        const c = collected[g.id];
        const p = Math.min((c / g.amount) * 100, 100).toFixed(1);
        const rem = g.amount - c;
        
        let colorClass = 'danger';
        if(p > 30) colorClass = 'warning';
        if(p > 70) colorClass = 'info-blue';
        if(p >= 100) colorClass = 'success';

        return `
            <div class="card">
                <div class="card-header" style="display:flex; justify-content:space-between;">
                    <h3 class="card-title">${g.name}</h3>
                    <button class="print-hide btn-danger-outline" onclick="delGoal(${g.id})" style="border:none;"><i class="fa fa-trash"></i></button>
                </div>
                <div style="font-size:12px; color:var(--text-muted); display:flex; justify-content:space-between;">
                    <span>Terkumpul: <b class="text-dark">${formatRp(c)}</b></span>
                    <span>Target: <b>${formatRp(g.amount)}</b></span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar ${colorClass}" style="width: ${p}%"></div>
                </div>
                <div style="font-size:11px; margin-top:8px; text-align:right;">
                    Progress: <b>${p}%</b> ${rem > 0 ? `| Kurang ${formatRp(rem)}` : '| <b>SELESAI!</b>'}
                </div>
            </div>
        `;
    }).join('');
}
function delGoal(id) { savingGoals = savingGoals.filter(g => g.id !== id); saveData(); renderAll(); }

// --- 4. BALANCES ---
document.getElementById('account-form').addEventListener('submit', (e) => {
    e.preventDefault();
    accounts.push({
        id: genID(),
        name: document.getElementById('acc-name').value,
        type: document.getElementById('acc-type').value,
        initBalance: parseFloat(document.getElementById('acc-init-balance').value)
    });
    saveData();
    e.target.reset();
    renderAll();
});

function renderBalances(calc) {
    const container = document.getElementById('accounts-container');
    container.innerHTML = accounts.map(a => {
        const bal = calc.accBalances[a.id];
        return `
            <div class="card">
                <div class="card-header" style="display:flex; justify-content:space-between;">
                    <h3 class="card-title">${a.name}</h3>
                    ${a.id > 2 ? `<button class="print-hide btn-danger-outline" onclick="delAcc(${a.id})" style="border:none;"><i class="fa fa-trash"></i></button>` : ''}
                </div>
                <span class="badge gray mb-20">${a.type}</span>
                <div style="font-size: 24px; font-weight:800; color:var(--info-blue);">${formatRp(bal)}</div>
            </div>
        `;
    }).join('');
}
function delAcc(id) { accounts = accounts.filter(a => a.id !== id); saveData(); renderAll(); }

// --- 5. BUDGETS ---
document.getElementById('budget-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const cat = document.getElementById('budget-cat').value;
    const ex = budgets.find(b => b.category === cat);
    if(ex) { ex.amount = parseFloat(document.getElementById('budget-amount').value); }
    else {
        budgets.push({ id: genID(), category: cat, amount: parseFloat(document.getElementById('budget-amount').value) });
    }
    saveData();
    e.target.reset();
    renderAll();
});

function renderBudgets(calc) {
    const tbody = document.getElementById('budget-tbody');
    
    const actuals = {};
    calc.thisMonthTrx.filter(t => t.type === 'expense').forEach(t => {
        actuals[t.category] = (actuals[t.category] || 0) + t.amount;
    });

    tbody.innerHTML = budgets.map(b => {
        const act = actuals[b.category] || 0;
        const rem = b.amount - act;
        const p = Math.min((act / b.amount) * 100, 100).toFixed(1);
        
        let stat = `<span class="badge green">Aman</span>`;
        let barCol = 'success';
        if(p > 75) { stat = `<span class="badge warning">Warning</span>`; barCol = 'warning'; }
        if(rem < 0) { stat = `<span class="badge red">OVER BUDGET</span>`; barCol = 'danger'; }

        return `
            <tr>
                <td><b>${b.category}</b></td>
                <td class="text-right">${formatRp(b.amount)}</td>
                <td class="text-right text-red">${formatRp(act)}</td>
                <td class="text-right ${rem < 0 ? 'text-red' : 'text-green'}">${formatRp(rem)}</td>
                <td>
                    <div class="progress-container"><div class="progress-bar ${barCol}" style="width:${p}%"></div></div>
                    <div style="font-size:10px; margin-top:4px; text-align:right;">Terpakai ${p}%</div>
                </td>
                <td class="text-center">${stat} <button class="print-hide btn-danger-outline" onclick="delBudg(${b.id})" style="border:none; margin-left:10px;"><i class="fa fa-trash"></i></button></td>
            </tr>
        `;
    }).join('');
}
function delBudg(id) { budgets = budgets.filter(b => b.id !== id); saveData(); renderAll(); }

// --- 6. STATS & RECAP ---
function renderStats(calc) {
    const now = new Date();
    const currentDay = now.getDate();
    
    document.getElementById('stat-avg-daily').innerText = formatRp(currentDay > 1 ? calc.expThisMonth / (currentDay - 1) : calc.expThisMonth);
    
    const maxExp = Math.max(0, ...transactions.filter(t => t.type==='expense').map(t=>t.amount));
    document.getElementById('stat-max-exp').innerText = formatRp(maxExp);
    
    const maxInc = Math.max(0, ...transactions.filter(t => t.type==='income').map(t=>t.amount));
    document.getElementById('stat-max-inc').innerText = formatRp(maxInc);

    const expCats = {};
    transactions.filter(t => t.type==='expense').forEach(t => expCats[t.category] = (expCats[t.category] || 0) + t.amount);
    let topCat = '-'; let topCatVal = 0;
    for(const [c, v] of Object.entries(expCats)) { if(v > topCatVal) { topCatVal = v; topCat = c; } }
    document.getElementById('stat-top-cat').innerText = topCat;

    const monthlyData = {};
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    
    transactions.forEach(t => {
        const d = new Date(t.date);
        const mKey = d.getFullYear() + '-' + String(d.getMonth()).padStart(2,'0');
        if(!monthlyData[mKey]) monthlyData[mKey] = { inc:0, exp:0, sav:0, label: months[d.getMonth()] + ' ' + d.getFullYear() };
        
        if(t.type==='income') monthlyData[mKey].inc += t.amount;
        if(t.type==='expense') monthlyData[mKey].exp += t.amount;
        if(t.type==='transfer') monthlyData[mKey].sav += t.amount;
    });

    const tbody = document.getElementById('recap-tbody');
    tbody.innerHTML = Object.keys(monthlyData).sort().reverse().map(k => {
        const m = monthlyData[k];
        const rem = m.inc - m.exp - m.sav;
        const rate = m.inc > 0 ? ((m.sav / m.inc) * 100).toFixed(1) : 0;
        
        return `
            <tr>
                <td><b>${m.label}</b></td>
                <td class="text-right text-green">${formatRp(m.inc)}</td>
                <td class="text-right text-red">${formatRp(m.exp)}</td>
                <td class="text-right text-purple">${formatRp(m.sav)}</td>
                <td class="text-right text-dark"><b>${formatRp(rem)}</b></td>
                <td class="text-center"><span class="badge blue">${rate}%</span></td>
            </tr>
        `;
    }).join('');
}

// Mobile Sidebar Toggle
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
if(sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        if(window.innerWidth <= 768) {
            sidebar.classList.toggle('open');
        } else {
            sidebar.classList.toggle('closed');
        }
    });
}
// Close sidebar when clicking a nav item on mobile
navItems.forEach(item => {
   item.addEventListener('click', () => {
       if(window.innerWidth <= 768) {
           sidebar.classList.remove('open');
       }
   });
});

// Bottom Nav Logic (Mobile)
const bNavItems = document.querySelectorAll('.b-nav-item');
bNavItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.currentTarget.getAttribute('data-target');
        
        // Remove active class from all views and b-nav items
        document.querySelectorAll('.view-section').forEach(section => section.classList.remove('active'));
        bNavItems.forEach(nav => nav.classList.remove('active'));
        
        // Also update desktop nav to sync
        navItems.forEach(nav => nav.classList.remove('active'));
        const matchingDesktop = document.querySelector(`.nav-item[data-target="${target}"]`);
        if(matchingDesktop) matchingDesktop.classList.add('active');

        // Add active class to target
        document.getElementById(target).classList.add('active');
        e.currentTarget.classList.add('active');
    });
});

// Start
document.getElementById('trx-date').valueAsDate = new Date();
renderAll();
