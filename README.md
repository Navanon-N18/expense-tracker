# Expense Tracker

A full-stack expense tracking web application with authentication, real-time analytics, and monthly financial insights.

**[Live Demo](https://expense-tracker-navanon.vercel.app/)** | **[API](https://expense-tracker-9ecz.onrender.com)**

## Features

- 🔐 User authentication with JWT and bcrypt password hashing
- 💰 Full CRUD for income/expense transactions
- 📊 Real-time dashboard with balance, income, and expense summary
- 📈 Yearly trend chart (line chart) with All/Expense/Income toggle
- 📅 Monthly summary table and month/year filtering
- 🎨 Minimal dark-themed responsive UI

## Tech Stack

**Backend**
- Python, FastAPI
- PostgreSQL (hosted on Supabase)
- SQLAlchemy (ORM)
- JWT (python-jose) + bcrypt for authentication

**Frontend**
- HTML, CSS, Vanilla JavaScript
- Tailwind CSS
- Chart.js

**Deployment**
- Backend: Render
- Frontend: Vercel
- Database: Supabase (PostgreSQL)

## Screenshots

*(เพิ่ม screenshot หน้า login และหน้า dashboard ตรงนี้)*

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| POST | `/register` | Create new user | No |
| POST | `/login` | Login and receive JWT | No |
| GET | `/transactions` | Get all transactions | Yes |
| POST | `/transactions` | Create new transaction | Yes |
| DELETE | `/transactions/{id}` | Delete a transaction | Yes |

## Running Locally

### Backend
```bash
git clone https://github.com/Navanon-N18/expense-tracker.git
cd expense-tracker
python -m venv venv
source venv/Scripts/activate   # Windows (Git Bash)
pip install -r requirements.txt
```

Create a `.env` file:
\`\`\`
DATABASE_URL=your_postgresql_connection_string
SECRET_KEY=your_secret_key
\`\`\`

Run the server:
```bash
uvicorn main:app --reload
```

### Frontend
Open `index.html` directly in a browser, or serve it with a local server. Make sure `API_URL` in `script.js` points to your backend (`http://127.0.0.1:8000` for local development).

## What I Learned

- Designing a normalized database schema with foreign key relationships
- Implementing secure authentication (password hashing, JWT tokens)
- Debugging real-world deployment issues (IPv6/IPv4 connectivity, environment variables, dependency conflicts)
- Building a responsive dashboard with data visualization

## Author

Navanon Phimngam — [LinkedIn](https://www.linkedin.com/in/navanon-phimngam-52307b308/) | [GitHub](https://github.com/Navanon-N18)