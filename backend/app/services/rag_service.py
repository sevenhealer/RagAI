"""Online RAG corpus operations backed by Vertex AI RAG Engine."""

import logging
import os
import tempfile

from fastapi import HTTPException
from vertexai import rag

import app.config as config

logger = logging.getLogger(__name__)

# Retrieval tuning for the online corpus.
TOP_K = 10
VECTOR_DISTANCE_THRESHOLD = 0.5
EMBEDDING_MODEL = "publishers/google/models/text-embedding-005"


def _get_user(username: str) -> dict:
    """Look up a user (and their corpus) or raise 404."""
    if config.users is None:
        raise HTTPException(status_code=503, detail="Online mode is not configured")
    user = config.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def create_user_corpus(username: str) -> str:
    """Create a per-user RAG corpus and return its resource name."""
    corpus = rag.create_corpus(
        display_name=f"{username}-corpus",
        backend_config=rag.RagVectorDbConfig(
            rag_embedding_model_config=rag.RagEmbeddingModelConfig(
                vertex_prediction_endpoint=rag.VertexPredictionEndpoint(
                    publisher_model=EMBEDDING_MODEL
                )
            )
        ),
    )
    return corpus.name


def upload_user_file(username: str, file) -> dict:
    user = _get_user(username)

    suffix = os.path.splitext(file.filename or "")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file.file.read())
        temp_path = tmp.name

    try:
        rag_file = rag.upload_file(
            corpus_name=user["corpus"], path=temp_path, display_name=file.filename
        )
    finally:
        os.remove(temp_path)

    logger.info("Uploaded %s to corpus %s", file.filename, user["corpus"])
    return {"message": "File uploaded", "file_id": rag_file.name}


def delete_user_file(username: str, request) -> dict:
    user = _get_user(username)

    files = rag.list_files(corpus_name=user["corpus"]).rag_files
    file_to_delete = next((f for f in files if f.display_name == request.file_name), None)
    if not file_to_delete:
        raise HTTPException(status_code=404, detail="File not found")

    rag.delete_file(name=file_to_delete.name)
    return {"message": f"File '{request.file_name}' deleted"}


def list_user_files(username: str) -> list[dict]:
    user = _get_user(username)
    files = rag.list_files(corpus_name=user["corpus"]).rag_files
    return [{"name": f.name, "display_name": f.display_name} for f in files]


def retrieve_context_service(username: str, text: str) -> dict:
    user = _get_user(username)
    response = rag.retrieval_query(
        rag_resources=[rag.RagResource(rag_corpus=user["corpus"])],
        rag_retrieval_config=rag.RagRetrievalConfig(
            top_k=TOP_K, filter=rag.Filter(vector_distance_threshold=VECTOR_DISTANCE_THRESHOLD)
        ),
        text=text,
    )
    return {"contexts": [ctx.text for ctx in response.contexts.contexts]}
