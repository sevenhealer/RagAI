import json
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any

# Correctly import settings from the config module
from app.config import settings

class IngestBase(BaseModel):
    metadata: Optional[Dict[str, Any]] = None # Optional metadata to store with chunks

class IngestURLRequest(IngestBase):
    url: str

class IngestTextRequest(IngestBase):
    text: str
    source_id: str # e.g., filename or unique identifier for the text

class FileUploadMetadata(BaseModel):
    """Pydantic model for parsing JSON metadata from form data."""
    metadata: Dict[str, Any] = {}

    @validator('metadata', pre=True)
    def parse_json_string(cls, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                raise ValueError("Invalid JSON string provided for metadata")
        return value

class IngestResponse(BaseModel):
    success: bool
    message: str
    task_id: Optional[str] = None # Optional: ID to track background task status
    indexed_chunk_ids: Optional[List[str]] = None # Optional: Return IDs if processed synchronously (not recommended)

class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = Field(default=settings.vector_search_num_neighbors) # Allow overriding default

class RetrievedChunk(BaseModel):
    id: str
    text: str
    distance: float
    metadata: Dict[str, Any] # Include source, chunk_index, etc.

class QueryResponse(BaseModel):
    answer: str
    retrieved_context: List[RetrievedChunk]