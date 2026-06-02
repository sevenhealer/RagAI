from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

import app.config as config
from app.models.schemas import TextRequest
from app.core.security import get_current_user
from app.services.rag_service import retrieve_context_service
from app.agent.runner import run_query, stream_query

router = APIRouter()


def _get_corpus(username: str) -> str:
    if config.users is None:
        raise HTTPException(status_code=503, detail="Online mode is not configured")
    user = config.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user["corpus"]


@router.post("/retrieve")
def retrieve_context(request: TextRequest, user=Depends(get_current_user)):
    return retrieve_context_service(user["sub"], request.text)


@router.post("/query")
async def ask_with_gemini(request: TextRequest, user=Depends(get_current_user)):
    corpus = _get_corpus(user["sub"])
    return await run_query(user["sub"], corpus, request.session_id, request.text)


@router.post("/stream")
async def ask_with_gemini_stream(request: TextRequest, user=Depends(get_current_user)):
    corpus = _get_corpus(user["sub"])
    return StreamingResponse(
        stream_query(user["sub"], corpus, request.session_id, request.text),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
