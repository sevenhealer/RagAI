"""Shared clients and configuration.

Cloud clients (Vertex AI, Gemini, MongoDB) are initialised lazily and guarded so
the application still boots when only the offline (Ollama) stack is configured.
Names exported here (``client``, ``users``, ``MODEL_ID`` …) are imported across
the online modules; in an offline-only deployment they are ``None`` and the
online routes fail gracefully at request time rather than at import time.
"""

import logging
import os
import tempfile

import vertexai
from google import genai
from google.adk.sessions import InMemorySessionService
from pymongo import MongoClient

from app.settings import settings

logger = logging.getLogger(__name__)

# --- JWT / auth ---
JWT_SECRET = settings.jwt_secret
JWT_ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

# --- Cloud identifiers ---
PROJECT_ID = settings.project_id
LOCATION = settings.location
CREDENTIALS_PATH = settings.credentials_path
MODEL_ID = settings.model_id
APP_NAME = "ragai"

# --- Vertex AI / Gemini (online) ---
client: genai.Client | None = None
if settings.cloud_enabled:
    # Credential resolution order:
    #   1. Inline JSON (GOOGLE_CREDENTIALS_JSON) — written to a temp file. Used by
    #      hosts that pass secrets as env vars (e.g. Azure Container Apps).
    #   2. An explicit key file (CREDENTIALS_PATH).
    #   3. Application Default Credentials (e.g. a GCP instance service account).
    if settings.google_credentials_json:
        cred_file = os.path.join(tempfile.gettempdir(), "gcp-credentials.json")
        with open(cred_file, "w") as fh:
            fh.write(settings.google_credentials_json)
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_file
    elif CREDENTIALS_PATH:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_PATH
    # Route the Gen AI SDK / ADK through Vertex AI rather than the API-key endpoint.
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "TRUE"
    os.environ["GOOGLE_CLOUD_PROJECT"] = PROJECT_ID
    os.environ["GOOGLE_CLOUD_LOCATION"] = LOCATION
    try:
        vertexai.init(project=PROJECT_ID, location=LOCATION)
        client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)
        logger.info("Vertex AI initialised (project=%s, location=%s)", PROJECT_ID, LOCATION)
    except Exception:  # pragma: no cover - depends on external cloud state
        logger.exception("Failed to initialise Vertex AI; online mode disabled")
        client = None
else:
    logger.warning("Cloud config absent; online mode disabled, offline mode only")

# ADK session service (in-memory conversation history for the online agent).
session_service = InMemorySessionService()

# --- MongoDB (online users) ---
mongo_client: MongoClient | None = None
db = None
users = None
if settings.mongo_uri:
    try:
        mongo_client = MongoClient(settings.mongo_uri)
        db = mongo_client["ragai"]
        users = db["users"]
    except Exception:  # pragma: no cover
        logger.exception("Failed to connect to MongoDB; online auth disabled")
