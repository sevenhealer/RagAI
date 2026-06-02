"""Offline RAG orchestration: retrieve from ChromaDB, generate with Ollama.

Mirrors the online contract in ``agent/runner.py``: ``run_query`` returns
``{answer, citations, session_id}`` and ``stream_query`` yields the same SSE
shape (``data: {"token": ...}`` then ``event: done`` with citations + session).
Conversation history is held in-memory per ``session_id`` for multi-turn parity.
"""

from __future__ import annotations

import json
import uuid

from app.settings import settings
from app.offline import llm, store

# session_id -> list of {role, content} (trimmed to recent turns).
_sessions: dict[str, list[dict]] = {}
_MAX_HISTORY = 10

_SYSTEM_PROMPT = (
    "You are RAG Assistant running fully offline. Answer the user's question "
    "using ONLY the provided document context. If the context is insufficient, "
    "say so plainly. Be concise."
)


def _retrieve(text: str) -> list[dict]:
    embedding = llm.embed_one(text)
    return store.query(embedding, settings.retrieval_top_k)


def _build_messages(session_id: str, text: str, contexts: list[dict]) -> list[dict]:
    context_block = "\n\n".join(
        f"[{i + 1}] (source: {c['source']})\n{c['text']}" for i, c in enumerate(contexts)
    ) or "(no documents have been uploaded yet)"

    history = _sessions.get(session_id, [])
    messages = [{"role": "system", "content": _SYSTEM_PROMPT}, *history]
    messages.append(
        {
            "role": "user",
            "content": f"Document context:\n{context_block}\n\nQuestion: {text}",
        }
    )
    return messages


def _citations(contexts: list[dict]) -> list[dict]:
    seen, out = set(), []
    for c in contexts:
        src = c["source"]
        if src not in seen:
            seen.add(src)
            out.append({"source": src, "type": "corpus"})
    return out


def _remember(session_id: str, user_text: str, answer: str) -> None:
    history = _sessions.setdefault(session_id, [])
    history.append({"role": "user", "content": user_text})
    history.append({"role": "assistant", "content": answer})
    del history[:-_MAX_HISTORY]  # keep only the most recent turns


def run_query(session_id: str | None, text: str) -> dict:
    """Non-streaming offline answer."""
    session_id = session_id or uuid.uuid4().hex
    contexts = _retrieve(text)
    messages = _build_messages(session_id, text, contexts)
    answer = "".join(llm.chat_stream(messages))
    _remember(session_id, text, answer)
    return {"answer": answer, "citations": _citations(contexts), "session_id": session_id}


def stream_query(session_id: str | None, text: str):
    """Async-iterable-compatible generator yielding SSE lines (sync generator)."""
    session_id = session_id or uuid.uuid4().hex
    contexts = _retrieve(text)
    messages = _build_messages(session_id, text, contexts)

    parts: list[str] = []
    for token in llm.chat_stream(messages):
        parts.append(token)
        yield f"data: {json.dumps({'token': token})}\n\n"

    _remember(session_id, text, "".join(parts))
    payload = {"citations": _citations(contexts), "session_id": session_id}
    yield f"event: done\ndata: {json.dumps(payload)}\n\n"
