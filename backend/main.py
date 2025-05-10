from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, file, query

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth")
app.include_router(file.router, prefix="/file")
app.include_router(query.router, prefix="/rag")