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
}

function showApp() {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("app-section").style.display = "block";
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
            <td>${t.item}</td>
            <td class="${t.type}">${t.amount}</td>
            <td>${t.date}</td>
            <td>${t.type}</td>
            <td><button onclick="deleteTransaction(${t.transaction_id})">ลบ</button></td>
        `;
        tbody.appendChild(row);
    });
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