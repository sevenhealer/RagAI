"""Document management routes (authenticated, per-user RAG corpus)."""

from fastapi import APIRouter, Depends, File, UploadFile

from app.models.schemas import DeleteFileRequest
from app.services.rag_service import delete_user_file, list_user_files, upload_user_file
from app.core.security import get_current_user

router = APIRouter()


@router.post("/upload-file")
def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    return upload_user_file(user["sub"], file)


@router.delete("/delete-file")
def delete_file(request: DeleteFileRequest, user=Depends(get_current_user)):
    return delete_user_file(user["sub"], request)


@router.get("/documents")
def documents(user=Depends(get_current_user)):
    return list_user_files(user["sub"])
