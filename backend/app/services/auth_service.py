"""User authentication: signup (creates a RAG corpus) and signin (JWT)."""

from fastapi import HTTPException
from passlib.context import CryptContext

import app.config as config
from app.services.rag_service import create_user_corpus
from app.core.security import create_access_token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _users():
    if config.users is None:
        raise HTTPException(status_code=503, detail="Online mode is not configured")
    return config.users


def get_user(username: str) -> dict | None:
    return _users().find_one({"username": username})


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def signup_user(data) -> dict:
    if get_user(data.username):
        raise HTTPException(status_code=400, detail="User already exists")

    corpus = create_user_corpus(data.username)
    _users().insert_one(
        {
            "username": data.username,
            "password": hash_password(data.password),
            "corpus": corpus,
        }
    )
    return {"message": "User created", "corpus": corpus}


def signin_user(data) -> dict:
    user = get_user(data.username)
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user["username"]})
    return {"access_token": token}
