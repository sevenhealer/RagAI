"""Thin wrapper around a local Ollama server for embeddings and chat."""

from __future__ import annotations

import logging
from typing import Iterator

from ollama import Client

from app.settings import settings

logger = logging.getLogger(__name__)

_client = Client(host=settings.ollama_host)


def embed(texts: list[str]) -> list[list[float]]:
    """Return an embedding vector for each input text using the embed model."""
    if not texts:
        return []
    # Newer ollama clients support batched `embed`; fall back to per-text.
    try:
        resp = _client.embed(model=settings.ollama_embed_model, input=texts)
        return list(resp["embeddings"])
    except (AttributeError, KeyError, TypeError):
        return [
            _client.embeddings(model=settings.ollama_embed_model, prompt=t)["embedding"]
            for t in texts
        ]


def embed_one(text: str) -> list[float]:
    return embed([text])[0]


def chat_stream(messages: list[dict]) -> Iterator[str]:
    """Stream assistant content tokens for the given chat messages."""
    for chunk in _client.chat(
        model=settings.ollama_llm_model, messages=messages, stream=True
    ):
        token = chunk.get("message", {}).get("content", "")
        if token:
            yield token


def health() -> dict:
    """Report Ollama reachability and whether the configured models are present."""
    try:
        installed = {m.get("model") or m.get("name") for m in _client.list().get("models", [])}
    except Exception as exc:  # noqa: BLE001 - report any connection failure to caller
        logger.warning("Ollama health check failed: %s", exc)
        return {
            "ok": False,
            "host": settings.ollama_host,
            "error": str(exc),
        }

    def _present(name: str) -> bool:
        return any(name == m or (m or "").startswith(f"{name}:") for m in installed)

    llm_ok = _present(settings.ollama_llm_model)
    embed_ok = _present(settings.ollama_embed_model)
    return {
        "ok": llm_ok and embed_ok,
        "host": settings.ollama_host,
        "llm_model": settings.ollama_llm_model,
        "embed_model": settings.ollama_embed_model,
        "llm_model_present": llm_ok,
        "embed_model_present": embed_ok,
    }
