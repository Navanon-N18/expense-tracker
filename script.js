const API_URL = "https://expense-tracker-9ecz.onrender.com";
let token = localStorage.getItem("token");
let allTransactions = [];   // เก็บข้อมูลทั้งหมดไว้ ไม่ผ่านการกรอง
let chartInstance = null;
let compareChartInstance = null;
let currentTab = "login";

if (token) {
    showApp();
    initMonthPicker();
    loadTransactions();
}

// ===== Tab switching =====
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
    currentTab === "login" ? login() : register();
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
        document.getElementById("auth-message").className = "text-xs text-green-400 pt-1";
    } else {
        document.getElementById("auth-message").textContent = data.detail;
        document.getElementById("auth-message").className = "text-xs text-red-400 pt-1";
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
        initMonthPicker();
        loadTransactions();
    } else {
        document.getElementById("auth-message").textContent = data.detail;
    }
}

// ===== Logout =====
function logout() {
    token = null;
    localStorage.removeItem("token");
    document.getElementById("auth-section").classList.remove("hidden");
    document.getElementById("app-section").classList.add("hidden");
    document.getElementById("logout-btn").classList.add("hidden");
}

function showApp() {
    document.getElementById("auth-section").classList.add("hidden");
    document.getElementById("app-section").classList.remove("hidden");
    document.getElementById("logout-btn").classList.remove("hidden");
}

// ===== ตั้งค่า month picker เป็นเดือนปัจจุบันตอนเริ่ม =====
function initMonthPicker() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

    // สร้างตัวเลือกปี: ย้อนหลัง 3 ปี ถึงปีปัจจุบัน
    const yearSelect = document.getElementById("year-select");
    yearSelect.innerHTML = "";
    for (let y = currentYear; y >= currentYear - 3; y--) {
        const option = document.createElement("option");
        option.value = y;
        option.textContent = y;
        yearSelect.appendChild(option);
    }

    document.getElementById("month-select").value = currentMonth;
    yearSelect.value = currentYear;
}

// ===== รวมค่าจาก 2 dropdown เป็น "YYYY-MM" =====
function getSelectedMonthStr() {
    const month = document.getElementById("month-select").value;
    const year = document.getElementById("year-select").value;
    return `${year}-${month}`;
}

function onMonthChange() {
    renderForSelectedMonth();
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
        document.getElementById("item").value = "";
        document.getElementById("amount").value = "";
        loadTransactions();
    } else {
        alert("เพิ่มรายการไม่สำเร็จ");
    }
}

// ===== โหลดข้อมูลทั้งหมดจาก API =====
async function loadTransactions() {
    const response = await fetch(`${API_URL}/transactions`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();
    allTransactions = data.transactions;   // เก็บดิบไว้ทั้งหมด
    renderForSelectedMonth();
}

// ===== กรองข้อมูลตามเดือนที่เลือก แล้ววาดทุกอย่างใหม่ =====
function renderForSelectedMonth() {
    const selectedMonth = getSelectedMonthStr();
    const year = selectedMonth.split("-")[0];

    const filtered = allTransactions.filter(t => t.date.startsWith(selectedMonth));

    renderTable(filtered);
    updateSummary(filtered);
    drawTrendChart(year);
    renderMonthlySummaryTable(year);
}

// ===== วาดตาราง =====
function renderTable(transactions) {
    const tbody = document.getElementById("transactions-body");
    tbody.innerHTML = "";

    transactions.forEach(t => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="px-4 py-3">${t.item}</td>
            <td class="px-4 py-3 ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}">${t.amount}</td>
            <td class="px-4 py-3 text-gray-400">${t.date}</td>
            <td class="px-4 py-3 text-right"><button onclick="deleteTransaction(${t.transaction_id})" class="text-gray-500 hover:text-red-400 text-xs">ลบ</button></td>
        `;
        tbody.appendChild(row);
    });
}

// ===== สรุปยอด + กราฟวงกลม (เฉพาะเดือนที่เลือก) =====
function updateSummary(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        if (t.type === "income") totalIncome += parseFloat(t.amount);
        else totalExpense += parseFloat(t.amount);
    });

    const balance = totalIncome - totalExpense;
    document.getElementById("summary-balance").textContent = balance.toLocaleString();
    document.getElementById("summary-income").textContent = totalIncome.toLocaleString();
    document.getElementById("summary-expense").textContent = totalExpense.toLocaleString();

    drawDonutChart(totalIncome, totalExpense);
}

function drawDonutChart(income, expense) {
    const ctx = document.getElementById("summary-chart").getContext("2d");
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["รายรับ", "รายจ่าย"],
            datasets: [{ data: [income, expense], backgroundColor: ["#4ade80", "#f87171"], borderWidth: 0 }]
        },
        options: { plugins: { legend: { display: false } } }
    });
}

// ===== กราฟเทียบเดือนนี้ vs เดือนก่อนหน้า =====
function getMonthTotals(monthStr) {
    const monthData = allTransactions.filter(t => t.date.startsWith(monthStr));
    let income = 0, expense = 0;

    monthData.forEach(t => {
        if (t.type === "income") income += parseFloat(t.amount);
        else expense += parseFloat(t.amount);
    });

    return { income, expense };
}

let trendChartInstance = null;
let trendMode = "all";
const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function setTrendMode(mode) {
    trendMode = mode;
    ["all", "expense", "income"].forEach(m => {
        const btn = document.getElementById(`trend-${m}`);
        btn.className = m === mode
            ? "px-3 py-1 text-xs rounded-md bg-white text-black font-medium"
            : "px-3 py-1 text-xs rounded-md text-gray-400";
    });

    const selectedMonth = getSelectedMonthStr();
    const year = selectedMonth.split("-")[0];
    drawTrendChart(year);
}

// ===== รวมยอดรายรับ-รายจ่ายแยกตามเดือน (ม.ค.-ธ.ค.) ของปีที่เลือก =====
function getYearlyMonthlyTotals(year) {
    const income = new Array(12).fill(0);
    const expense = new Array(12).fill(0);

    allTransactions.forEach(t => {
        const [tYear, tMonth] = t.date.split("-");
        if (tYear === year) {
            const monthIndex = parseInt(tMonth) - 1;
            if (t.type === "income") income[monthIndex] += parseFloat(t.amount);
            else expense[monthIndex] += parseFloat(t.amount);
        }
    });

    return { income, expense };
}

// ===== วาดกราฟเส้นแนวโน้มรายปี =====
function drawTrendChart(year) {
    const { income, expense } = getYearlyMonthlyTotals(year);
    const ctx = document.getElementById("trend-chart").getContext("2d");
    if (trendChartInstance) trendChartInstance.destroy();

    let datasets = [];
    if (trendMode === "all" || trendMode === "income") {
        datasets.push({
            label: "รายรับ",
            data: income,
            borderColor: "#4ade80",
            backgroundColor: "rgba(74, 222, 128, 0.1)",
            tension: 0.3,
            fill: trendMode === "income"
        });
    }
    if (trendMode === "all" || trendMode === "expense") {
        datasets.push({
            label: "รายจ่าย",
            data: expense,
            borderColor: "#f87171",
            backgroundColor: "rgba(248, 113, 113, 0.1)",
            tension: 0.3,
            fill: trendMode === "expense"
        });
    }

    trendChartInstance = new Chart(ctx, {
        type: "line",
        data: { labels: monthNames, datasets: datasets },
        options: {
            plugins: {
                legend: { display: trendMode === "all", labels: { color: "#9ca3af", font: { size: 10 } } }
            },
            scales: {
                x: { ticks: { color: "#9ca3af", font: { size: 10 } }, grid: { color: "#1f2937" } },
                y: { ticks: { color: "#9ca3af", font: { size: 10 } }, grid: { color: "#1f2937" } }
            }
        }
    });
}

// ===== ตารางสรุปรายเดือน (เรียงล่าสุดก่อน) =====
function renderMonthlySummaryTable(year) {
    const { income, expense } = getYearlyMonthlyTotals(year);
    const tbody = document.getElementById("monthly-summary-body");
    tbody.innerHTML = "";

    for (let i = 11; i >= 0; i--) {
        const balance = income[i] - expense[i];
        if (income[i] === 0 && expense[i] === 0) continue; // ข้ามเดือนที่ไม่มีข้อมูลเลย

        const row = document.createElement("tr");
        row.className = "border-b border-gray-800/50";
        row.innerHTML = `
            <td class="px-4 py-3">${monthNames[i]} ${year}</td>
            <td class="px-4 py-3 text-green-400">${income[i].toLocaleString()}</td>
            <td class="px-4 py-3 text-red-400">${expense[i].toLocaleString()}</td>
            <td class="px-4 py-3 ${balance >= 0 ? 'text-green-400' : 'text-red-400'}">${balance.toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    }
}


// ===== ลบรายการ =====
async function deleteTransaction(id) {
    const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (response.ok) loadTransactions();
}