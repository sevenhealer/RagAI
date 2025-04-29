from fastapi import HTTPException
from config import users
from utils.jwt import create_access_token
from passlib.context import CryptContext
from services.rag_service import create_user_corpus

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user(username):
    return users.find_one({"username": username})

def hash_password(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def signup_user(data):
    if get_user(data.username):
        raise HTTPException(status_code=400, detail="User already exists")

    corpus = create_user_corpus(data.username)
    users.insert_one({
        "username": data.username,
        "password": hash_password(data.password),
        "corpus": corpus
    })
    return {"message": "User created", "corpus": corpus}

def signin_user(data):
    user = get_user(data.username)
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user["username"]})
    return {"access_token": token}
