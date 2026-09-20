import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text
from passlib.context import CryptContext
from jose import jwt
from pydantic import BaseModel

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = (
    "your-secret-key-change-this-later"  # ใช้เข้ารหัส JWT (จะย้ายไป .env ทีหลัง)
)
ALGORITHM = "HS256"

engine = create_engine(DATABASE_URL)
app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],  # อนุญาตทุก origin (สำหรับตอนพัฒนา ทีหลังค่อยจำกัดเฉพาะ domain จริง)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ตัวช่วย hash รหัสผ่าน (ใช้ bcrypt algorithm)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Pydantic Models: กำหนดรูปแบบข้อมูลที่ user ต้องส่งเข้ามา
# Pydantic เช็คให้อัตโนมัติว่าข้อมูลครบ/ถูกชนิดไหม ก่อนเข้าฟังก์ชันเลย
class UserRegister(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


# ฟังก์ชันสร้าง JWT Token
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)  # token หมดอายุใน 24 ชม.
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@app.get("/")
def read_root():
    return {"message": "Expense Tracker API is running"}


@app.get("/test-db")
def test_db_connection():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            return {"status": "success", "message": "Database connected!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/register")
def register(user: UserRegister):
    hashed_password = pwd_context.hash(user.password)

    with engine.connect() as connection:
        existing_user = connection.execute(
            text("SELECT * FROM users WHERE email = :email"), {"email": user.email}
        ).fetchone()

        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        connection.execute(
            text("INSERT INTO users (email, password) VALUES (:email, :password)"),
            {"email": user.email, "password": hashed_password},
        )
        connection.commit()

    return {"message": "User registered successfully"}


@app.post("/login")
def login(user: UserLogin):
    with engine.connect() as connection:
        db_user = connection.execute(
            text("SELECT * FROM users WHERE email = :email"), {"email": user.email}
        ).fetchone()

        if not db_user or not pwd_context.verify(user.password, db_user.password):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        access_token = create_access_token(
            data={"user_id": db_user.user_id, "email": db_user.email}
        )

    return {"access_token": access_token, "token_type": "bearer"}


from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import date
from typing import Optional

security = HTTPBearer()


# ===== ฟังก์ชันตรวจสอบ JWT Token =====
# ใช้เป็น "ยาม" ตรวจบัตรผ่านก่อนเข้าใช้ endpoint ที่ต้อง login
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload  # คืนข้อมูล user_id, email ที่อยู่ใน token
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# Pydantic Model สำหรับสร้าง transaction ใหม่
class TransactionCreate(BaseModel):
    item: str
    amount: float
    date: date
    type: str  # "income" หรือ "expense"


# ===== ENDPOINT: เพิ่มรายการใหม่ =====
@app.post("/transactions")
def create_transaction(
    transaction: TransactionCreate, user_data: dict = Depends(verify_token)
):
    user_id = user_data[
        "user_id"
    ]  # ดึง user_id จาก token (ไม่ต้องรับจาก user เอง ป้องกันการปลอมแปลง)

    with engine.connect() as connection:
        connection.execute(
            text("""
                INSERT INTO transactions (user_id, item, amount, date, type)
                VALUES (:user_id, :item, :amount, :date, :type)
            """),
            {
                "user_id": user_id,
                "item": transaction.item,
                "amount": transaction.amount,
                "date": transaction.date,
                "type": transaction.type,
            },
        )
        connection.commit()

    return {"message": "Transaction created successfully"}


# ===== ENDPOINT: ดูรายการทั้งหมดของ user คนนั้น =====
@app.get("/transactions")
def get_transactions(user_data: dict = Depends(verify_token)):
    user_id = user_data["user_id"]

    with engine.connect() as connection:
        result = connection.execute(
            text(
                "SELECT * FROM transactions WHERE user_id = :user_id ORDER BY date DESC"
            ),
            {"user_id": user_id},
        )
        transactions = [dict(row._mapping) for row in result]

    return {"transactions": transactions}


# ===== ENDPOINT: ลบรายการ =====
@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, user_data: dict = Depends(verify_token)):
    user_id = user_data["user_id"]

    with engine.connect() as connection:
        # เช็คก่อนว่ารายการนี้เป็นของ user คนนี้จริงไหม (ป้องกันลบของคนอื่น)
        existing = connection.execute(
            text(
                "SELECT * FROM transactions WHERE transaction_id = :tid AND user_id = :uid"
            ),
            {"tid": transaction_id, "uid": user_id},
        ).fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Transaction not found")

        connection.execute(
            text("DELETE FROM transactions WHERE transaction_id = :tid"),
            {"tid": transaction_id},
        )
        connection.commit()

    return {"message": "Transaction deleted successfully"}
