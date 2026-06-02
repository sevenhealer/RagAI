"""Persistent local vector store (ChromaDB) for offline documents.

Embeddings are computed externally (Ollama) and supplied explicitly, so the
collection uses no built-in embedding function.
"""

from __future__ import annotations

import logging
import os
import uuid

import chromadb

from app.settings import settings

logger = logging.getLogger(__name__)

_COLLECTION = "offline_docs"

os.makedirs(settings.chroma_path, exist_ok=True)
_client = chromadb.PersistentClient(path=settings.chroma_path)
_collection = _client.get_or_create_collection(name=_COLLECTION)


def add_chunks(filename: str, chunks: list[str], embeddings: list[list[float]]) -> int:
    """Store text chunks (with embeddings) for a document. Returns count added."""
    if not chunks:
        return 0
    ids = [f"{filename}::{uuid.uuid4().hex}" for _ in chunks]
    metadatas = [{"source": filename, "chunk": i} for i in range(len(chunks))]
    _collection.add(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)
    return len(chunks)


def query(embedding: list[float], k: int) -> list[dict]:
    """Return the top-k most similar chunks as {text, source, distance}."""
    res = _collection.query(query_embeddings=[embedding], n_results=k)
    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]
    out = []
    for doc, meta, dist in zip(docs, metas, dists):
        out.append({"text": doc, "source": (meta or {}).get("source", "document"), "distance": dist})
    return out


def list_documents() -> list[dict]:
    """Return distinct ingested documents with their chunk counts."""
    res = _collection.get(include=["metadatas"])
    counts: dict[str, int] = {}
    for meta in res.get("metadatas") or []:
        source = (meta or {}).get("source")
        if source:
            counts[source] = counts.get(source, 0) + 1
    return [{"name": name, "chunks": n} for name, n in sorted(counts.items())]


def delete_document(filename: str) -> None:
    _collection.delete(where={"source": filename})
