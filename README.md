# 🌐 Full Stack RAG AI Project

A full-stack project integrating a **FastAPI backend** and a **Next.js frontend**, connected to **Google Cloud Vertex AI**, **MongoDB**, and using **JWT authentication**.

The RAG flow is built as a **Google Agent Development Kit (ADK)** agent that runs in-process
inside the FastAPI backend. It keeps Vertex AI **RAG Engine** as the vector store but exposes
retrieval through agent tools, and adds streaming, citations, conversation memory, and a
web-search fallback.

---

## 🛠️ Tech Stack

- **Backend**: FastAPI, Uvicorn, Google ADK (`google-adk`), Google Gen AI SDK (`google-genai`), Vertex AI RAG Engine, MongoDB
- **Frontend**: Next.js
- **Database**: MongoDB
- **Auth**: JWT
- **Cloud AI**: Google Cloud Vertex AI (RAG Engine + Gemini via ADK)

---

## 📦 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/RagAI.git
cd RagAI
```

---

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Copy your Google Cloud service-account key into the `backend` directory as `credentials.json`
(or, on a GCP instance, use the attached service account — see [Deployment](#-deployment)).

---

### 3. Configure `.env`

Configuration lives in a **single `.env` at the repo root** (shared by local dev and Docker).
Copy the template and fill it in:

```bash
cp .env.example .env      # at the repo root
```

Key variables (see `.env.example` for the full list):

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/?retryWrites=true&w=majority
JWT_SECRET=<generate: python -c "import secrets; print(secrets.token_urlsafe(48))">
PROJECT_ID=your-gcp-project-id
LOCATION=us-central1
CREDENTIALS_PATH=credentials.json
MODEL_ID=gemini-2.5-flash      # optional
CORS_ORIGINS=*                 # lock down in production
```

> **Security:** `JWT_SECRET` must be a strong, random value of at least 32 bytes. The default
> placeholder is rejected with a startup warning.

---

### 4. Start the Backend Server

```bash
# from backend/ (the app is a package: app.main:app)
uvicorn app.main:app --reload     # dev
```

API at `http://localhost:8000` (interactive docs at `/docs`, health at `/health`).

---

### 5. Frontend Setup

```bash
cd ../frontend
pnpm install      # uses pnpm (the lockfile is pnpm); npm fails on peer deps
pnpm dev
```

Frontend at `http://localhost:3000`. Set the backend URL in the in-app API settings if it isn't
`http://localhost:8000`.

---

## 🐳 Run with Docker

The whole stack runs via Docker Compose (backend image is FastAPI; frontend is a Next.js
standalone build):

```bash
# from the repo root, with backend/.env and backend/credentials.json in place
docker compose up --build
```

- Backend → `http://localhost:8000` (with a `/health` HEALTHCHECK)
- Frontend → `http://localhost:3000`
- `extra_hosts: host.docker.internal` is preconfigured so a future offline mode can reach a
  host-run Ollama.

---

## 🚀 Deployment

Runs on any container host (Azure Container Apps, AWS ECS, GCP Cloud Run, etc.):

- **Port:** the backend binds `$PORT` if the platform injects one (Azure/Cloud Run), else `8000`.
  The frontend (Next standalone) binds `$PORT`, else `3000`.
- **GCP credentials** (resolved in this order):
  1. `GOOGLE_CREDENTIALS_JSON` — the full key JSON as a secret env var (best for **Azure**, which
     can't easily mount a key file).
  2. `CREDENTIALS_PATH` — a mounted key file (AWS, local, compose).
  3. **Application Default Credentials** — attached service account on a GCP instance (no key needed).
- **Config** is 12-factor (env vars); no `.env` or key is baked into the image.
- Set a strong `JWT_SECRET`, a locked-down `CORS_ORIGINS` (your frontend's URL), and point the
  frontend's in-app API setting at the backend's public URL.

### Deploy to Azure (Container Apps)

```bash
# 0. Names
RG=ragai-rg; LOC=eastus; ACR=ragaiacr$RANDOM; ENV=ragai-env

az group create -n $RG -l $LOC
az acr create -n $ACR -g $RG --sku Basic --admin-enabled true

# 1. Build & push both images to ACR
az acr build -r $ACR -t ragai-backend:latest  ./backend
az acr build -r $ACR -t ragai-frontend:latest ./frontend

# 2. Container Apps environment
az containerapp env create -n $ENV -g $RG -l $LOC

# 3. Backend (store the GCP key + secrets as Container App secrets)
az containerapp create -n ragai-backend -g $RG --environment $ENV \
  --image $ACR.azurecr.io/ragai-backend:latest --registry-server $ACR.azurecr.io \
  --target-port 8000 --ingress external \
  --secrets gcpkey="$(cat backend/credentials.json)" jwt="<strong-secret>" mongo="<mongo-uri>" \
  --env-vars PROJECT_ID=<gcp-project> LOCATION=us-central1 \
             GOOGLE_CREDENTIALS_JSON=secretref:gcpkey JWT_SECRET=secretref:jwt \
             MONGO_URI=secretref:mongo CORS_ORIGINS="https://<your-frontend-url>"

# 4. Frontend
az containerapp create -n ragai-frontend -g $RG --environment $ENV \
  --image $ACR.azurecr.io/ragai-frontend:latest --registry-server $ACR.azurecr.io \
  --target-port 3000 --ingress external
```

Then open the frontend URL, go to the in-app **API settings**, and set the backend URL to the
`ragai-backend` ingress FQDN. (Vertex AI usage is still billed to your GCP project.)

---

## ✅ Environment Requirements

- Python 3.8+
- Node.js 16+
- Google Cloud account with Vertex AI enabled
- MongoDB Atlas or local MongoDB instance

---

## 🧠 Features

- JWT-based user authentication
- MongoDB for persistent storage
- **ADK agent** over a per-user Vertex AI RAG Engine corpus
- **Streaming responses** (Server-Sent Events) into the chat UI
- **Citations** — answers show which documents (or web pages) they came from
- **Conversation memory** — multi-turn follow-ups via per-session history
- **Web-search fallback** — Google Search grounding when the corpus has no answer
- Next.js frontend for user interaction

---

## 🤖 Agent Architecture

```
POST /rag/stream ─► Runner(agent, session_service) ─► LlmAgent (Gemini)
                                                        ├─ retrieve_documents()  → Vertex AI RAG Engine
                                                        └─ web_search()          → Gemini + Google Search
```

- **`backend/app/agent/rag_agent.py`** — the ADK `LlmAgent` and its two function tools.
- **`backend/app/agent/runner.py`** — session management, non-streaming `run_query`, and SSE `stream_query`.
- **`backend/app/config.py`** — `MODEL_ID`, `APP_NAME`, and the shared `session_service`.

Endpoints (all under `/rag`, JWT-protected):

| Method | Path        | Purpose                                              |
|--------|-------------|------------------------------------------------------|
| POST   | `/query`    | Non-streaming. Returns `{answer, citations, session_id}` |
| POST   | `/stream`   | SSE stream of tokens, then a `done` event with citations |
| POST   | `/retrieve` | Raw corpus retrieval (unchanged)                     |

Send the returned `session_id` back on the next request to continue a conversation
(this is what powers multi-turn memory).

> **Memory persistence:** sessions use ADK's `InMemorySessionService`, so conversation
> history lives only while the server runs. For durable memory, swap it in
> `backend/app/config.py` for `DatabaseSessionService` (SQL) or a Mongo-backed session service.

---

## ☁️ Optional: Deploy to Vertex AI Agent Engine

The agent runs in-process by default. To instead deploy it to Google's managed
**Agent Engine** runtime, use the scaffold (bills separately, creates a cloud resource):

```bash
cd backend
python deploy_agent_engine.py --corpus "projects/.../ragCorpora/<id>" --bucket gs://your-staging-bucket
```

---

## 📁 Project Structure

```
RagAI/
├── .env                      # single config for the whole stack (gitignored)
├── .env.example
├── docker-compose.yml
├── backend/
│   ├── app/                  # FastAPI application package
│   │   ├── main.py           #   app: CORS, logging, /health, router wiring
│   │   ├── settings.py       #   typed config (pydantic-settings)
│   │   ├── config.py         #   cloud/Mongo clients (lazy, ADC-aware)
│   │   ├── api/              #   routers: auth.py, files.py, rag.py
│   │   ├── services/        #   auth_service.py, rag_service.py
│   │   ├── core/            #   security.py (JWT)
│   │   ├── models/          #   schemas.py (request models)
│   │   ├── agent/           #   ADK agent (rag_agent) + runner (streaming)
│   │   └── offline/         #   local Ollama+Chroma stack (staged, not wired)
│   ├── requirements.txt      # online deps
│   ├── requirements-offline.txt
│   ├── credentials.json      # GCP service-account key (gitignored)
│   └── Dockerfile
└── frontend/                 # Next.js app (standalone build)
    └── Dockerfile
```

Run locally with `uvicorn app.main:app` from `backend/`; the app reads the repo-root `.env`.

> **Offline mode** (local Ollama + ChromaDB, no auth) is scaffolded under `backend/app/offline/`
> but not yet wired into the app — a work in progress.

---

## 🧪 Production Notes

- The backend runs under `uvicorn[standard]` (uvloop/httptools); scale with multiple workers or
  replicas behind a load balancer.
- Both images run as **non-root**; the backend has a `/health` HEALTHCHECK.
- Frontend ships as a Next.js **standalone** server (`node server.js`) — small runtime image.
- See [Run with Docker](#-run-with-docker) and [Deployment](#-deployment) above.

---

## 📜 License

MIT License – feel free to use and adapt.