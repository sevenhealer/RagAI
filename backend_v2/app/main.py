from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import os
import shutil

from google import genai
import vertexai
from vertexai import rag
from google.genai.types import GenerateContentConfig, Retrieval, Tool, VertexRagStore

# Config
PROJECT_ID = "ragai-07"
LOCATION = "us-central1"
CREDENTIALS_PATH = "/Users/rohanchatterjee/Documents/Projects/ragai-07-3af2fb185f78_new.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_PATH

vertexai.init(project=PROJECT_ID, location=LOCATION)
client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

app = FastAPI()

# Create corpus
EMBEDDING_MODEL = "publishers/google/models/text-embedding-005"
rag_corpus = rag.create_corpus(
    display_name="my-rag-corpus",
    backend_config=rag.RagVectorDbConfig(
        rag_embedding_model_config=rag.RagEmbeddingModelConfig(
            vertex_prediction_endpoint=rag.VertexPredictionEndpoint(
                publisher_model=EMBEDDING_MODEL
            )
        )
    ),
)



print(f"Corpus created: {rag_corpus.name}")




app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)


# Routes

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_path = f"/tmp/{file.filename}"
        print(file_path)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(file)
        print(file.filename)

        rag_file = rag.upload_file(
            corpus_name=rag_corpus.name,
            path=file_path,
            display_name=file.filename,
            description="Uploaded via FastAPI",
        )

        print(rag_file)

        return {"message": "File uploaded", "file_id": rag_file.name}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/retrieve")
def retrieve_context(text: str):
    try:
        response = rag.retrieval_query(
            rag_resources=[
                rag.RagResource(rag_corpus=rag_corpus.name)
            ],
            rag_retrieval_config=rag.RagRetrievalConfig(
                top_k=10,
                filter=rag.Filter(vector_distance_threshold=0.5),
            ),
            text=text,
        )
        context_data = [ctx.text for ctx in response.contexts.contexts]
        return {"contexts": context_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
MODEL_ID = "gemini-2.0-flash-001"
# Retrival config
rag_retrieval_tool = Tool(
    retrieval=Retrieval(
        vertex_rag_store=VertexRagStore(
            rag_corpora=[rag_corpus.name],
            similarity_top_k=10,
            vector_distance_threshold=0.5,
        )
    )
)
@app.get("/query")
def ask_with_gemini(text: str):
    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=text,
            config=GenerateContentConfig(tools=[rag_retrieval_tool]),
        )
        print(response)
        return {"answer": response.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))