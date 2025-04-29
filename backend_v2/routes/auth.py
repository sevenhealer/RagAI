from fastapi import APIRouter, HTTPException
from models.user import UserSignup, UserLogin
from services.auth_service import signup_user, signin_user

router = APIRouter()

@router.post("/signup")
def signup(data: UserSignup):
    return signup_user(data)

@router.post("/signin")
def signin(data: UserLogin):
    return signin_user(data)