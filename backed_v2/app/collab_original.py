import os

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/Users/rohanchatterjee/Downloads/ragai-07-032153161a35.json"

from google import genai
import vertexai

# Set Google Cloud project information and initialize Vertex AI SDK
PROJECT_ID = "ragai-07"
if not PROJECT_ID or PROJECT_ID == "[your-project-id]":
    PROJECT_ID = str(os.environ.get("GOOGLE_CLOUD_PROJECT"))

LOCATION = os.environ.get("GOOGLE_CLOUD_REGION", "us-central1")

vertexai.init(project=PROJECT_ID, location=LOCATION)
client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

from IPython.display import Markdown, display
from google.genai.types import GenerateContentConfig, Retrieval, Tool, VertexRagStore
from vertexai import rag

#   Creating Rag Corpus
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

# Upload a local file to the corpus
rag_file = rag.upload_file(
    corpus_name=rag_corpus.name,
    path="/content/10172016_2022_010.pdf",
    display_name="SEMESTER GRADE REPORT.pdf",
    description="SEMESTER GRADE REPORT",
)

INPUT_GCS_BUCKET = (
    "gs://cloud-samples-data/gen-app-builder/search/alphabet-investor-pdfs/"
)

# # Import files from Google Cloud Storage
# response = rag.import_files(
#     corpus_name=rag_corpus.name,
#     paths=[INPUT_GCS_BUCKET],
#     # Optional
#     transformation_config=rag.TransformationConfig(
#         chunking_config=rag.ChunkingConfig(chunk_size=1024, chunk_overlap=100)
#     ),
#     max_embedding_requests_per_min=900,  # Optional
# )

# #Import files from Google Drive
# response = rag.import_files(
#     corpus_name=rag_corpus.name,
#     paths=["https://drive.google.com/drive/folders/{folder_id}"],
#     # Optional
#     transformation_config=rag.TransformationConfig(
#         chunking_config=rag.ChunkingConfig(chunk_size=512, chunk_overlap=50)
#     ),
# )

# Direct context retrieval
response = rag.retrieval_query(
    rag_resources=[
        rag.RagResource(
            rag_corpus=rag_corpus.name,
            # Optional: supply IDs from `rag.list_files()`.
            # rag_file_ids=["rag-file-1", "rag-file-2", ...],
        )
    ],
    rag_retrieval_config=rag.RagRetrievalConfig(
        top_k=10,  # Optional
        filter=rag.Filter(
            vector_distance_threshold=0.5,  # Optional
        ),
    ),
    text="KIIT",
)
print(response)

# Optional: The retrieved context can be passed to any SDK or model generation API to generate final results.
# context = " ".join([context.text for context in response.contexts.contexts]).replace("\n", "")

# Create a tool for the RAG Corpus
rag_retrieval_tool = Tool(
    retrieval=Retrieval(
        vertex_rag_store=VertexRagStore(
            rag_corpora=[rag_corpus.name],
            similarity_top_k=10,
            vector_distance_threshold=0.5,
        )
    )
)

MODEL_ID = "gemini-2.0-flash-001"

#Generate Content with Gemini using RAG Retrieval Tool
response = client.models.generate_content(
    model=MODEL_ID,
    contents="gpa?",
    config=GenerateContentConfig(tools=[rag_retrieval_tool]),
)

display(Markdown(response.text))