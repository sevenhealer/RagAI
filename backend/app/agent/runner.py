"""Run the RAG agent inside FastAPI: sessions, citations, and SSE streaming."""

import json
import uuid

from google.genai import types
from google.adk.runners import Runner
from google.adk.agents.run_config import RunConfig, StreamingMode

from app.config import APP_NAME, session_service
from app.agent.rag_agent import build_agent


def _new_message(text: str) -> types.Content:
    return types.Content(role="user", parts=[types.Part(text=text)])


async def _ensure_session(user_id: str, session_id: str | None) -> str:
    """Return an existing session id or create a new one (per-user memory)."""
    session_id = session_id or uuid.uuid4().hex
    existing = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
    if existing is None:
        await session_service.create_session(
            app_name=APP_NAME, user_id=user_id, session_id=session_id
        )
    return session_id


def _citations_from_event(event) -> list[dict]:
    """Turn a tool-response event into UI-facing citations."""
    citations: list[dict] = []
    for fr in event.get_function_responses():
        response = fr.response or {}
        # retrieve_documents -> corpus citations
        for ctx in response.get("contexts", []) or []:
            citations.append({"source": ctx.get("source", "document"), "type": "corpus"})
        # web_search -> web citations
        for src in response.get("sources", []) or []:
            citations.append(
                {"source": src.get("title", src.get("url", "web")), "type": "web", "url": src.get("url")}
            )
    return citations


def _runner(corpus_name: str) -> Runner:
    return Runner(
        app_name=APP_NAME,
        agent=build_agent(corpus_name),
        session_service=session_service,
    )


async def run_query(user_id: str, corpus_name: str, session_id: str | None, text: str) -> dict:
    """Non-streaming: return {answer, citations, session_id}."""
    session_id = await _ensure_session(user_id, session_id)
    runner = _runner(corpus_name)

    answer_parts: list[str] = []
    citations: list[dict] = []
    seen = set()

    async for event in runner.run_async(
        user_id=user_id, session_id=session_id, new_message=_new_message(text)
    ):
        for c in _citations_from_event(event):
            key = (c["source"], c["type"])
            if key not in seen:
                seen.add(key)
                citations.append(c)
        if event.is_final_response() and event.content and event.content.parts:
            answer_parts.extend(p.text for p in event.content.parts if p.text)

    return {
        "answer": "".join(answer_parts) or "I couldn't find an answer to your question.",
        "citations": citations,
        "session_id": session_id,
    }


async def stream_query(user_id: str, corpus_name: str, session_id: str | None, text: str):
    """Async generator yielding Server-Sent Events.

    Emits ``data:`` lines carrying incremental text tokens, then a final
    ``event: done`` line carrying citations and the session id.
    """
    session_id = await _ensure_session(user_id, session_id)
    runner = _runner(corpus_name)

    citations: list[dict] = []
    seen = set()
    streamed_any = False

    run_config = RunConfig(streaming_mode=StreamingMode.SSE)

    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=_new_message(text),
        run_config=run_config,
    ):
        for c in _citations_from_event(event):
            key = (c["source"], c["type"])
            if key not in seen:
                seen.add(key)
                citations.append(c)

        if not (event.content and event.content.parts):
            continue
        chunk = "".join(p.text for p in event.content.parts if p.text)
        if not chunk:
            continue

        # Stream incremental deltas; if the model didn't emit partials, fall
        # back to streaming the single final response.
        if event.partial:
            streamed_any = True
            yield f"data: {json.dumps({'token': chunk})}\n\n"
        elif event.is_final_response() and not streamed_any:
            yield f"data: {json.dumps({'token': chunk})}\n\n"

    yield f"event: done\ndata: {json.dumps({'citations': citations, 'session_id': session_id})}\n\n"
