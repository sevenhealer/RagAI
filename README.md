# 🌐 Full Stack RAG AI Project

A full-stack project integrating a **FastAPI backend** and a **Next.js frontend**, connected to **Google Cloud Vertex AI**, **MongoDB**, and using **JWT authentication**.

---

## 🛠️ Tech Stack

- **Backend**: FastAPI, Uvicorn, Google Vertex AI SDK, MongoDB
- **Frontend**: Next.js
- **Database**: MongoDB
- **Auth**: JWT
- **Cloud AI**: Google Cloud Vertex AI (GenAI)

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
```

Copy your Google Cloud credentials file to the `backend` directory and name it:

```bash
credentials.json
```

---

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

### 4. Create `.env` File

In the `backend` directory, create a `.env` file with the following variables:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret
PROJECT_ID=your-google-cloud-project-id
LOCATION=us-central1
CREDENTIALS_PATH=credentials.json
```

---

### 5. Start the Backend Server

```bash
uvicorn main:app --reload
```

API will be available at `http://localhost:8000`.

---

### 6. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:3000`.

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
- Integration with Google Vertex AI for RAG (Retrieval-Augmented Generation)
- Next.js frontend for user interaction

---

## 📁 Project Structure

```
rag-ai-project/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env
│   └── credentials.json
│
└── frontend/
    ├── pages/
    ├── components/
    └── package.json
```

---

## 🧪 Running in Production

- Use `gunicorn` or `uvicorn` with ASGI for backend production deployment.
- Build the Next.js frontend with:

```bash
npm run build
npm start
```

---

## 📜 License

MIT License – feel free to use and adapt.