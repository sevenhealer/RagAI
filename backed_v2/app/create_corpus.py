import os
import vertexai
from google import genai
from vertexai import rag
from google.oauth2 import service_account



PROJECT_ID = "ragai-07"
LOCATION = "us-central1"
CREDENTIALS_PATH = "/Users/rohanchatterjee/Documents/Projects/RagAI/ragai-07-3af2fb185f78_new.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_PATH

# Specify required scopes
# SCOPES = [
#     "https://www.googleapis.com/auth/cloud-platform",
#     "https://www.googleapis.com/auth/vertex-ai"
# ]

# Load service account credentials with scopes
# credentials = service_account.Credentials.from_service_account_file(
#     CREDENTIALS_PATH, scopes=SCOPES
# )

# Initialize Vertex AI
# vertexai.init(project=PROJECT_ID, location=LOCATION, credentials=credentials)

# Initialize genai client
# client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION, credentials=credentials)


vertexai.init(project=PROJECT_ID, location=LOCATION)
client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

# EMBEDDING_MODEL = "publishers/google/models/text-embedding-005"

# rag_corpus = rag.create_corpus(
#     display_name="my-rag-corpus",
#     backend_config=rag.RagVectorDbConfig(
#         rag_embedding_model_config=rag.RagEmbeddingModelConfig(
#             vertex_prediction_endpoint=rag.VertexPredictionEndpoint(
#                 publisher_model=EMBEDDING_MODEL
#             )
#         )
#     ),
# )

print(rag.list_corpora())

# print(f"Corpus created: {rag_corpus.name}")
