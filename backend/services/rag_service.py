import os, shutil
from fastapi import HTTPException
from vertexai import rag
from config import client, PROJECT_ID
from google.genai.types import GenerateContentConfig, Retrieval, Tool, VertexRagStore


def create_user_corpus(username):
    corpus = rag.create_corpus(
        display_name=f"{username}-corpus",
        backend_config=rag.RagVectorDbConfig(
            rag_embedding_model_config=rag.RagEmbeddingModelConfig(
                vertex_prediction_endpoint=rag.VertexPredictionEndpoint(
                    publisher_model="publishers/google/models/text-embedding-005"
                )
            )
        ),
    )
    return corpus.name

def upload_user_file(username, file):
    from config import users
    user = users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    print(user["corpus"])
    print(file.filename)

    rag_file = rag.upload_file(
        corpus_name=user["corpus"],
        path=temp_path,
        display_name=file.filename
    )

    os.remove(temp_path)
    return {"message": "File uploaded", "file_id": rag_file.name}


def delete_user_file(username, request):
    from config import users
    user = users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    files = rag.list_files(corpus_name=user["corpus"]).rag_files
    file_to_delete = next((f for f in files if f.display_name == request.file_name), None)
    if not file_to_delete:
        raise HTTPException(status_code=404, detail="File not found")

    rag.delete_file(name=file_to_delete.name)
    return {"message": f"File '{request.file_name}' deleted"}

def list_user_files(username):
    from config import users
    user = users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    files = rag.list_files(corpus_name=user["corpus"]).rag_files
    return [{"name": f.name, "display_name": f.display_name} for f in files]

def retrieve_context_service(username, text):
    from config import users
    user = users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    response = rag.retrieval_query(
        rag_resources=[rag.RagResource(rag_corpus=user["corpus"])],
        rag_retrieval_config=rag.RagRetrievalConfig(top_k=10, filter=rag.Filter(vector_distance_threshold=0.5)),
        text=text,
    )
    return {"contexts": [ctx.text for ctx in response.contexts.contexts]}

def ask_with_gemini_service(username, text):
    from config import users
    user = users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rag_retrieval_tool = Tool(
        retrieval=Retrieval(
            vertex_rag_store=VertexRagStore(
                rag_corpora=[user["corpus"]],
                similarity_top_k=10,
                vector_distance_threshold=0.5,
            )
        )
    )

    MODEL_ID = "gemini-2.0-flash-001"

    response = client.models.generate_content(
            model=MODEL_ID,
            contents=text,
            config=GenerateContentConfig(tools=[rag_retrieval_tool]),
    )
    return {"answer": response.text}