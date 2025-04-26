# 📄 Project Title: **RAG AI Backend and Frontend**

This project is an end-to-end **Retrieval-Augmented Generation (RAG) system** built with:
- **FastAPI** for backend APIs
- **Vertex AI** for embeddings and document management
- **Gemini 2.0 Flash Model** for final answering
- **Next.js** frontend to upload files, ask questions, and get intelligent answers from your uploaded documents!

---

# 🛠️ Tech Stack

| Frontend  | Backend  | Cloud  |
|:---------|:---------|:-------|
| Next.js  | FastAPI   | Google Vertex AI (RAG + Gemini) |

---

# ⚙️ Setup Instructions

## 1. Clone the repository
```bash
git clone https://github.com/your-username/rag-ai-project.git
cd rag-ai-project
```

---

## 2. Backend Setup

### 2.1 Create Python Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows
```

### 2.2 Install dependencies
```bash
pip install -r requirements.txt
```

> Create a `requirements.txt` with:
> ```
> fastapi
> uvicorn
> google-cloud-aiplatform
> google-generativeai
> pydantic
> python-multipart
> ```

---

### 2.3 Setup Google Cloud Credentials
- Create a **Service Account** on GCP with `Vertex AI User` and `Vertex AI Administrator` roles.
- Download the **JSON key**.
- Update the `CREDENTIALS_PATH` in your backend `main.py`:

```python
CREDENTIALS_PATH = "/path/to/your/service-account.json"
```

---

### 2.4 Run the FastAPI server
```bash
uvicorn main:app --reload
```

Server will run at `http://localhost:8000`.

---

## 3. Frontend Setup (Next.js)

Navigate to the frontend folder:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

Update your API base URLs in frontend code to match FastAPI (`http://localhost:8000`).

Run the frontend server:

```bash
npm run dev
```

Frontend will run at `http://localhost:3000`.

---

# 🛤️ API Endpoints

| Method | Endpoint        | Description                         |
|:------|:----------------|:------------------------------------|
| POST  | `/upload`        | Upload a file to RAG corpus         |
| GET   | `/retrieve`      | Retrieve contexts based on query   |
| GET   | `/query`         | Ask questions using Gemini + RAG   |

---

# 📸 Screenshots

> _Add screenshots of the frontend upload page, chat page, or backend console._

---

# 📚 Folder Structure

```
/backend
    - main.py
    - requirements.txt
/frontend
    - pages/
    - components/
    - public/
    - next.config.js
```

---

# ✅ Future Improvements
- Add file types validation (.pdf, .docx only).
- Allow deleting files from corpus.
- Handle authentication for frontend users.
- Deploy backend (Cloud Run, AWS, etc.).
- Deploy frontend (Vercel, Netlify).

---

# 📢 Acknowledgements
- [Google Vertex AI](https://cloud.google.com/vertex-ai)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Next.js](https://nextjs.org/)
- [Gemini Flash Model](https://cloud.google.com/vertex-ai/docs/generative-ai/learn/models)

---

# 🌟 Star this repo if you like the project!
