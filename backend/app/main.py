"""RagAI backend application entrypoint."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.config as config
from app.settings import settings
from app.api import auth, files, rag

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("ragai")

app = FastAPI(
    title="RagAI API",
    version="1.0.0",
    description="Retrieval-Augmented Generation API (Vertex AI RAG Engine + ADK).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(files.router, prefix="/file", tags=["files"])
app.include_router(rag.router, prefix="/rag", tags=["rag"])


@app.get("/", tags=["meta"])
def root() -> dict:
    return {"service": "RagAI API", "version": app.version, "docs": "/docs"}


@app.get("/health", tags=["meta"])
def health() -> dict:
    """Liveness/readiness probe used by Docker, load balancers and orchestration."""
    online_ready = config.client is not None and config.users is not None
    return {
        "status": "ok",
        "online": {
            "configured": settings.cloud_enabled,
            "ready": online_ready,
        },
    }


@app.on_event("startup")
def _startup() -> None:
    logger.info(
        "RagAI starting — online=%s (project=%s, location=%s)",
        config.client is not None,
        settings.project_id,
        settings.location,
    )
    if settings.jwt_secret == "change-me-in-production":
        logger.warning("JWT_SECRET is the default value — set a strong secret in production!")
