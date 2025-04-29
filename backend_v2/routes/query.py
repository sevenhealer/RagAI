from fastapi import APIRouter,Depends
from models.user import TextRequest
from utils.jwt import get_current_user
from services.rag_service import retrieve_context_service, ask_with_gemini_service

router = APIRouter()

@router.post("/retrieve")
def retrieve_context(request: TextRequest, user=Depends(get_current_user)):
    print(request.text)
    return retrieve_context_service(user['sub'], request.text)

@router.post("/query")
def ask_with_gemini(request: TextRequest, user=Depends(get_current_user)):
    return ask_with_gemini_service(user['sub'], request.text)
