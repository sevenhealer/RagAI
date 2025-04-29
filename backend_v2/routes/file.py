from fastapi import APIRouter, UploadFile, File, Depends
from services.rag_service import upload_user_file, delete_user_file, list_user_files
from utils.jwt import get_current_user
from models.user import DeleteFileRequest

router = APIRouter()

@router.post("/upload-file")
def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    print(user)
    return upload_user_file(user['sub'], file)

@router.delete("/delete-file")
def delete_file(request: DeleteFileRequest, user=Depends(get_current_user)):
    print(user)
    return delete_user_file(user['sub'], request)

@router.get("/documents")
def documents(user=Depends(get_current_user)):
    return list_user_files(user['sub'])
