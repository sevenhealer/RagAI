import os
from vertexai import rag
import vertexai

PROJECT_ID = "ragai-07"
LOCATION = "us-central1"
CREDENTIALS_PATH = "/Users/rohanchatterjee/Documents/Projects/RagAI/ragai-07-3af2fb185f78_new.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_PATH
vertexai.init(project="ragai-07", location="us-central1")

rag_file = rag.upload_file(
    corpus_name="projects/750217035946/locations/us-central1/ragCorpora/1837468647967162368",
    path="/Users/rohanchatterjee/Documents/Projects/RagAI/backed_v2/app/10172016_2024_010.pdf",
    display_name="SEMESTER GRADE REPORT.pdf",
    description="SEMESTER GRADE REPORT",
)

print(f" Uploaded file: {rag_file.name}")

# rag_file = rag.import_files(
#     rag_corpus,
#     path,
#     # Optional
#     transformation_config=rag.TransformationConfig(
#         chunking_config=rag.ChunkingConfig(
#             chunk_size=512,
#             chunk_overlap=100,
#         ),
#     ),
#     max_embedding_requests_per_min=1000,  # Optional
# )

# print(f" Uploaded file: {rag_file.name}")
