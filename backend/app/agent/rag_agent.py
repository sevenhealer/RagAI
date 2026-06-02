"""ADK agent that answers questions over a user's Vertex AI RAG corpus.

The agent exposes two function tools:

  - ``retrieve_documents`` : queries the user's RAG Engine corpus (the primary
    source of truth, and where citations come from).
  - ``web_search``         : a Google Search grounded fallback for when the
    corpus has no relevant answer.

We deliberately use plain ``FunctionTool``s rather than ADK's built-in
``google_search`` / ``VertexAiRagRetrieval`` tools: ADK forbids mixing a
built-in tool with other tools in a single agent, and function tools let us
return structured citation data (filenames for corpus hits, URLs for web hits).
"""

from functools import partial

from vertexai import rag
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from google.genai.types import GenerateContentConfig, GoogleSearch, Tool

from app.config import MODEL_ID, client

# Retrieval tuning (mirrors the legacy retrieve_context_service settings).
TOP_K = 10
VECTOR_DISTANCE_THRESHOLD = 0.5

# Built agents cached per corpus so we don't rebuild on every request.
_agent_cache: dict[str, LlmAgent] = {}


def _retrieve_documents(corpus_name: str, query: str) -> dict:
    """Search the user's document corpus for passages relevant to ``query``.

    Bound to a specific corpus via functools.partial in build_agent.
    """
    response = rag.retrieval_query(
        rag_resources=[rag.RagResource(rag_corpus=corpus_name)],
        rag_retrieval_config=rag.RagRetrievalConfig(
            top_k=TOP_K,
            filter=rag.Filter(vector_distance_threshold=VECTOR_DISTANCE_THRESHOLD),
        ),
        text=query,
    )

    contexts = []
    for ctx in response.contexts.contexts:
        contexts.append(
            {
                "text": ctx.text,
                # Different RAG Engine versions expose the file name under
                # different attributes; fall back gracefully.
                "source": getattr(ctx, "source_display_name", None)
                or getattr(ctx, "source_uri", None)
                or "document",
            }
        )
    return {"contexts": contexts}


def web_search(query: str) -> dict:
    """Search the public web (Google Search grounding) for ``query``.

    Use only when the document corpus has no relevant answer.
    """
    response = client.models.generate_content(
        model=MODEL_ID,
        contents=query,
        config=GenerateContentConfig(tools=[Tool(google_search=GoogleSearch())]),
    )

    sources = []
    try:
        meta = response.candidates[0].grounding_metadata
        for chunk in (meta.grounding_chunks or []):
            web = getattr(chunk, "web", None)
            if web is not None:
                sources.append({"title": web.title, "url": web.uri})
    except (AttributeError, IndexError, TypeError):
        pass

    return {"summary": response.text, "sources": sources}


INSTRUCTION = (
    "You are RAG Assistant, answering questions about the user's uploaded "
    "documents. Always call `retrieve_documents` FIRST and base your answer on "
    "the returned passages. Only if the corpus has no relevant information "
    "should you call `web_search`. Be concise and always tell the user whether "
    "the answer came from their documents or the web."
)


def build_agent(corpus_name: str) -> LlmAgent:
    """Return an LlmAgent whose retrieval tool is bound to ``corpus_name``."""
    if corpus_name in _agent_cache:
        return _agent_cache[corpus_name]

    # Bind the corpus into the retrieval tool. partial keeps the LLM-visible
    # signature as just `query`. Give the wrapper a clean name/docstring so the
    # auto-generated tool schema is correct.
    retrieve = partial(_retrieve_documents, corpus_name)
    retrieve.__name__ = "retrieve_documents"
    retrieve.__doc__ = (
        "Search the user's uploaded document corpus for passages relevant to "
        "the query. Returns a list of {text, source} contexts."
    )

    agent = LlmAgent(
        name="rag_assistant",
        model=MODEL_ID,
        instruction=INSTRUCTION,
        tools=[FunctionTool(retrieve), FunctionTool(web_search)],
    )
    _agent_cache[corpus_name] = agent
    return agent
