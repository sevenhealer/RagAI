import os
import logging
from pydantic_settings import BaseSettings
from pydantic import Field, validator

# Configure logging early
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    google_application_credentials: str = Field(..., env="GOOGLE_APPLICATION_CREDENTIALS")
    gcp_project_id: str = Field(..., env="GCP_PROJECT_ID")
    gcp_region: str = Field(..., env="GCP_REGION")
    gcs_bucket_name: str = Field(..., env="GCS_BUCKET_NAME")

    vertex_embedding_model: str = Field("text-embedding-005", env="VERTEX_EMBEDDING_MODEL")
    vertex_llm_model: str = Field("gemini-2.0-flash-lite-001", env="VERTEX_LLM_MODEL") # Check availability

    vector_search_index_id: str = Field(..., env="VECTOR_SEARCH_INDEX_ID")
    vector_search_index_endpoint_id: str = Field(..., env="VECTOR_SEARCH_INDEX_ENDPOINT_ID")
    vector_search_deployed_index_id: str = Field(..., env="VECTOR_SEARCH_DEPLOYED_INDEX_ID")
    vector_search_num_neighbors: int = Field(5, env="VECTOR_SEARCH_NUM_NEIGHBORS")

    chunk_size: int = Field(1000, env="CHUNK_SIZE")
    chunk_overlap: int = Field(150, env="CHUNK_OVERLAP")

    firestore_collection: str = Field("rag_chunks", env="FIRESTORE_COLLECTION") # Collection for storing chunks

    # Optional: Specify a specific GCS upload prefix
    gcs_upload_prefix: str = Field("uploads/", env="GCS_UPLOAD_PREFIX")


    @validator('google_application_credentials')
    def check_credentials_file(cls, v):
        if not os.path.isfile(v):
            logger.warning(f"Credentials file not found at path: {v}. Authentication might rely on ADC.")
            # Depending on your environment, this might be okay (e.g., Cloud Run, GCE)
            # raise ValueError(f"Google Application Credentials file not found: {v}")
        return v

    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'
        extra = 'forbid' # Prevent unexpected environment variables

settings = Settings()

# Construct the full endpoint name needed by the client library
# Ensure the env var is just the numeric ID part
try:
    VECTOR_SEARCH_INDEX_ENDPOINT_NAME = f"projects/{settings.gcp_project_id}/locations/{settings.gcp_region}/indexEndpoints/{settings.vector_search_index_endpoint_id}"
    logger.info(f"Constructed Vector Search Endpoint Name: {VECTOR_SEARCH_INDEX_ENDPOINT_NAME}")
except Exception as e:
    logger.error(f"Error constructing VECTOR_SEARCH_INDEX_ENDPOINT_NAME: {e}")
    VECTOR_SEARCH_INDEX_ENDPOINT_NAME = None # Handle potential failure
