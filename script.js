const API_URL = "http://127.0.0.1:8000";

// เก็บ token ไว้ใช้ยืนยันตัวตนในทุก request ถัดไป
let token = localStorage.getItem("token");

// เช็คตอนโหลดหน้าเว็บว่า login ค้างอยู่ไหม
if (token) {
    showApp();
    loadTransactions();
}

// ===== Register =====
async function register() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
        document.getElementById("auth-message").textContent = "สมัครสำเร็จ! กด Login ได้เลย";
    } else {
        document.getElementById("auth-message").textContent = data.detail;
    }
}

// ===== Login =====
async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
        token = data.access_token;
        localStorage.setItem("token", token);
        showApp();
        loadTransactions();
    } else {
        document.getElementById("auth-message").textContent = data.detail;
    }
}

// ===== Logout =====
function logout() {
    token = null;
    localStorage.removeItem("token");
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("app-section").style.display = "none";
    document.getElementById("logout-btn").classList.add("hidden");
}

function showApp() {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("app-section").style.display = "block";
    document.getElementById("logout-btn").classList.remove("hidden");
}

// ===== เพิ่มรายการใหม่ =====
async function addTransaction() {
    const item = document.getElementById("item").value;
    const amount = document.getElementById("amount").value;
    const date = document.getElementById("date").value;
    const type = document.getElementById("type").value;

    const response = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ item, amount: parseFloat(amount), date, type })
    });

    if (response.ok) {
        loadTransactions();
        document.getElementById("item").value = "";
        document.getElementById("amount").value = "";
    } else {
        alert("เพิ่มรายการไม่สำเร็จ");
    }
}

// ===== โหลดรายการทั้งหมดมาแสดง =====
async function loadTransactions() {
    const response = await fetch(`${API_URL}/transactions`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await response.json();
    const tbody = document.getElementById("transactions-body");
    tbody.innerHTML = "";

    data.transactions.forEach(t => {
        const row = document.createElement("tr");
                row.innerHTML = `
            <td class="px-4 py-3">${t.item}</td>
            <td class="px-4 py-3 ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}">${t.amount}</td>
            <td class="px-4 py-3 text-gray-400">${t.date}</td>
            <td class="px-4 py-3 text-right"><button onclick="deleteTransaction(${t.transaction_id})" class="text-gray-500 hover:text-red-400 text-xs">ลบ</button></td>
        `;
        tbody.appendChild(row);
    });
    updateSummary(data.transactions);
}

// ===== ลบรายการ =====
async function deleteTransaction(id) {
    const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.ok) {
        loadTransactions();
    }
}

// ===== Tab switching (Login/Register) =====
let currentTab = "login";

function switchTab(tab) {
    currentTab = tab;
    document.getElementById("auth-message").textContent = "";

    const loginTab = document.getElementById("tab-login");
    const registerTab = document.getElementById("tab-register");
    const submitBtn = document.getElementById("auth-submit-btn");

    if (tab === "login") {
        loginTab.className = "flex-1 py-2 text-sm rounded-md transition-colors bg-white text-black font-medium";
        registerTab.className = "flex-1 py-2 text-sm rounded-md transition-colors text-gray-400";
        submitBtn.textContent = "Login";
    } else {
        registerTab.className = "flex-1 py-2 text-sm rounded-md transition-colors bg-white text-black font-medium";
        loginTab.className = "flex-1 py-2 text-sm rounded-md transition-colors text-gray-400";
        submitBtn.textContent = "Register";
    }
}

function handleAuthSubmit() {
    if (currentTab === "login") {
        login();
    } else {
        register();
    }
}

// ===== คำนวณและแสดงสรุปยอด + วาดกราฟ =====
let chartInstance = null;

function updateSummary(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        if (t.type === "income") {
            totalIncome += parseFloat(t.amount);
        } else {
            totalExpense += parseFloat(t.amount);
        }
    });

    const balance = totalIncome - totalExpense;

    document.getElementById("summary-balance").textContent = balance.toLocaleString();
    document.getElementById("summary-income").textContent = totalIncome.toLocaleString();
    document.getElementById("summary-expense").textContent = totalExpense.toLocaleString();

    drawChart(totalIncome, totalExpense);
}

function drawChart(income, expense) {
    const ctx = document.getElementById("summary-chart").getContext("2d");

    // ถ้ามีกราฟเก่าอยู่ ต้องทำลายทิ้งก่อน ไม่งั้นจะซ้อนกันมั่ว
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["รายรับ", "รายจ่าย"],
            datasets: [{
                data: [income, expense],
                backgroundColor: ["#4ade80", "#f87171"],
                borderWidth: 0
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            }
        }
    });
}