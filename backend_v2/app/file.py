import os
from vertexai import rag
import vertexai
import shutil
from typing import Optional
from vertexai.rag.utils.resources import TransformationConfig


PROJECT_ID = "ragai-07"
LOCATION = "us-central1"
CREDENTIALS_PATH = "/Users/rohanchatterjee/Documents/Projects/ragai-07-3af2fb185f78_new.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_PATH
vertexai.init(project="ragai-07", location="us-central1")

#Single File
def upload_file(
    path: str,
    corpus: str,
    display_name: Optional[str] = None,
    description: Optional[str] = None,
    transformation_config: Optional[TransformationConfig] = None
):
    rag_file = rag.upload_file(
        corpus,
        path,
        display_name,
        description,
        transformation_config
    )

    print(f"Uploaded RAG file: {rag_file.name}")
    return rag_file

# print(upload_file(path="/Users/rohanchatterjee/Documents/Projects/RagAI/backend_v2/app/goog-10-k-2024.pdf",
#                   corpus="projects/ragai-07/locations/us-central1/ragCorpora/3212192434222006272"))

#From Drive
    # paths = [
    #     "https://drive.google.com/file/d/123",
    #     "https://drive.google.com/drive/folders/456"
    # ]
def import_file(paths, corpus):
    # Call the import function
    response = rag.import_files(
        corpus_name=corpus,
        paths=paths,
        # Optional: Add transformation config if needed
        # transformation_config=rag.TransformationConfig(
        #     chunking_config=rag.ChunkingConfig(
        #         chunk_size=512,
        #         chunk_overlap=100,
        #     ),
        # ),
        # max_embedding_requests_per_min=1000,
    )

    # Print summary
    print(f"Imported {response.imported_rag_files_count} file(s) to corpus.")

    # If individual file details are present, list them
    if hasattr(response, "rag_files") and response.rag_files:
        for rag_file in response.rag_files:
            print(f"File: {rag_file.name}")
    else:
        print("No individual file details available.")

    return response

# path = [
#      "https://drive.google.com/file/d/1oIjIs8TAfsFk_ubp20ZdhFydv0YVPLQq/view?usp=drive_link"
# ]
# print(import_file(path,
#             corpus="projects/ragai-07/locations/us-central1/ragCorpora/3212192434222006272"))


def list_file(corpus_name, page_size=10, page_token: Optional[str] = None):
     return rag.list_files(corpus_name,page_size,page_token)

# print(list_file(corpus_name="projects/ragai-07/locations/us-central1/ragCorpora/3212192434222006272"))


def delete_file(name,corpus_name: Optional[str] = None):
     return rag.delete_file(name,corpus_name)

# print(delete_file(name="projects/750217035946/locations/us-central1/ragCorpora/3212192434222006272/ragFiles/5422496499940563833"))