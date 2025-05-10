from pydantic import BaseModel

class UserSignup(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class DeleteFileRequest(BaseModel):
    file_name: str

class TextRequest(BaseModel):
    text: str