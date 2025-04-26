import logging
import os
import asyncio
import time # Import time for logging in background task
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any, Union # Ensure Union is imported

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, Depends, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

# Google Cloud Clients (will be initialized in lifespan)
from google.cloud import storage, firestore
from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from google.cloud import aiplatform
from langchain_google_vertexai import VertexAIEmbeddings, ChatVertexAI

# App modules
from app import config, models, rag_service, utils
from app.config import settings, VECTOR_SEARCH_INDEX_ENDPOINT_NAME

# Configure logging if not already done in config
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# --- Global State for Clients (Managed by Lifespan) ---
class AppState:
    def __init__(self):
        self.gcs_client: Optional[storage.Client] = None
        self.firestore_client: Optional[AsyncFirestoreClient] = None
        self.embedding_service: Optional[VertexAIEmbeddings] = None
        self.llm: Optional[ChatVertexAI] = None
        self.index_endpoint: Optional[aiplatform.MatchingEngineIndexEndpoint] = None
        self.vector_index: Optional[aiplatform.MatchingEngineIndex] = None # Definition for the Index object
        self.clients_initialized: bool = False
        self.initialization_error: Optional[str] = None

# Create the global state instance
app_state = AppState()


# --- Lifespan for Initialization and Shutdown ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    # Attach app_state to the app instance for access in dependencies via request
    app.state.app_state = app_state
    logger.info("FastAPI application startup...")
    logger.info(f"Using GCP Project: {settings.gcp_project_id}, Region: {settings.gcp_region}")
    logger.info(f"Using GCS Bucket: {settings.gcs_bucket_name}")
    logger.info(f"Using Firestore Collection: {settings.firestore_collection}")
    logger.info(f"Using Embedding Model: {settings.vertex_embedding_model}")
    logger.info(f"Using LLM Model: {settings.vertex_llm_model}")
    logger.info(f"Using Vector Search Endpoint ID: {settings.vector_search_index_endpoint_id}")
    logger.info(f"Using Vector Search Index ID: {settings.vector_search_index_id}")
    logger.info(f"Using Vector Search Deployed Index ID: {settings.vector_search_deployed_index_id}")

    try:
        # Ensure GOOGLE_APPLICATION_CREDENTIALS is set if path provided
        if os.path.exists(settings.google_application_credentials):
             os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.google_application_credentials
        else:
             logger.warning("Credentials file not found, relying on Application Default Credentials (ADC).")

        # Initialize AI Platform (required for other Vertex clients)
        logger.info("Initializing Google AI Platform...")
        aiplatform.init(project=settings.gcp_project_id, location=settings.gcp_region)
        logger.info("AI Platform initialized.")

        # Initialize GCS Client
        logger.info("Initializing Google Cloud Storage client...")
        app_state.gcs_client = storage.Client(project=settings.gcp_project_id)
        logger.info("GCS client initialized.")

        # Initialize Firestore Client (Async)
        logger.info("Initializing Google Cloud Firestore client (async)...")
        app_state.firestore_client = AsyncFirestoreClient(project=settings.gcp_project_id)
        logger.info("Firestore client initialized.")

        # Initialize Vertex AI Embeddings Service
        logger.info(f"Initializing Vertex AI Embeddings model: {settings.vertex_embedding_model}...")
        app_state.embedding_service = VertexAIEmbeddings(
            model_name=settings.vertex_embedding_model,
            project=settings.gcp_project_id,
            location=settings.gcp_region
        )
        logger.info("Vertex AI Embeddings service initialized.")

        # Initialize Vertex AI LLM
        logger.info(f"Initializing Vertex AI LLM model: {settings.vertex_llm_model}...")
        app_state.llm = ChatVertexAI(
            model_name=settings.vertex_llm_model,
            project=settings.gcp_project_id,
            location=settings.gcp_region,
            temperature=0.2,
            max_output_tokens=1024,
            convert_system_message_to_human=True
        )
        logger.info("Vertex AI LLM initialized.")

        # Initialize Vector Search Index Endpoint Client
        logger.info(f"Initializing Vector Search Index Endpoint: {VECTOR_SEARCH_INDEX_ENDPOINT_NAME}...")
        if not VECTOR_SEARCH_INDEX_ENDPOINT_NAME:
             raise ValueError("VECTOR_SEARCH_INDEX_ENDPOINT_NAME is not configured correctly.")
        app_state.index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
             index_endpoint_name=VECTOR_SEARCH_INDEX_ENDPOINT_NAME
        )
        logger.info("Vector Search Index Endpoint client initialized.")

        # Initialize Vector Search Index Client
        logger.info(f"Initializing Vector Search Index: {settings.vector_search_index_id}...")
        index_resource_name = f"projects/{settings.gcp_project_id}/locations/{settings.gcp_region}/indexes/{settings.vector_search_index_id}"
        # Use aiplatform.MatchingEngineIndex or aiplatform.Index depending on library version specifics
        app_state.vector_index = aiplatform.MatchingEngineIndex(
            index_name=index_resource_name
        )
        logger.info(f"Vector Search Index client initialized for: {index_resource_name}")


        app_state.clients_initialized = True
        logger.info("All clients initialized successfully.")

    except Exception as e:
        app_state.initialization_error = f"Failed to initialize resources during startup: {e}"
        logger.exception(app_state.initialization_error, exc_info=True)
        # raise RuntimeError(app_state.initialization_error) from e # Optionally raise to stop startup

    yield # Application runs here

    # Shutdown
    logger.info("FastAPI application shutdown.")
    # Add cleanup if needed


app = FastAPI(
    title="Google Cloud RAG API",
    description="API for Retrieval-Augmented Generation using Vertex AI, Vector Search, GCS, and Firestore",
    version="0.2.1", # Incremented version
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # CHANGE FOR PRODUCTION!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependency Injection Functions ---

# Pass request to get app state attached by lifespan
async def get_app_state(request: Request) -> AppState:
     state = request.app.state.app_state
     if not state.clients_initialized and state.initialization_error:
          raise HTTPException(status_code=503, detail=f"Service Unavailable: {state.initialization_error}")
     elif not state.clients_initialized:
          logger.error("AppState accessed before clients were initialized without an error flag.")
          raise HTTPException(status_code=503, detail="Service Unavailable: Clients not initialized")
     return state

async def get_gcs_client(state: AppState = Depends(get_app_state)) -> storage.Client:
    if state.gcs_client is None:
        raise HTTPException(status_code=503, detail="GCS Client not available")
    return state.gcs_client

async def get_firestore_client(state: AppState = Depends(get_app_state)) -> AsyncFirestoreClient:
    if state.firestore_client is None:
        raise HTTPException(status_code=503, detail="Firestore Client not available")
    return state.firestore_client

async def get_embedding_service(state: AppState = Depends(get_app_state)) -> VertexAIEmbeddings:
    if state.embedding_service is None:
        raise HTTPException(status_code=503, detail="Embedding Service not available")
    return state.embedding_service

async def get_llm(state: AppState = Depends(get_app_state)) -> ChatVertexAI:
    if state.llm is None:
        raise HTTPException(status_code=503, detail="LLM Service not available")
    return state.llm

async def get_index_endpoint(state: AppState = Depends(get_app_state)) -> aiplatform.MatchingEngineIndexEndpoint:
    if state.index_endpoint is None:
        raise HTTPException(status_code=503, detail="Vector Search Index Endpoint not available")
    return state.index_endpoint

# Dependency for the Index object
async def get_vector_index(state: AppState = Depends(get_app_state)) -> aiplatform.MatchingEngineIndex:
    if state.vector_index is None:
        raise HTTPException(status_code=503, detail="Vector Search Index client not available")
    return state.vector_index


# --- Background Task for Ingestion ---
# Ensure signature matches arguments passed in add_task calls
async def run_ingestion_background(
    text: str,
    metadata: Dict[str, Any],
    firestore_client: AsyncFirestoreClient,
    embedding_service: VertexAIEmbeddings,
    vector_index: aiplatform.MatchingEngineIndex, # Expecting Index object
    index_endpoint: aiplatform.MatchingEngineIndexEndpoint # Expecting Endpoint object (kept for potential future use/consistency)
):
    """Helper function to run ingestion steps in the background."""
    source = metadata.get("source", "unknown_source")
    task_start_time = time.time()
    logger.info(f"BG TASK [{source}]: Starting.")
    # --- Logging added for debugging ---
    logger.info(f"BG TASK [{source}]: Type of vector_index received: {type(vector_index)}")
    logger.info(f"BG TASK [{source}]: Resource name of vector_index: {getattr(vector_index, 'resource_name', 'N/A')}")
    logger.info(f"BG TASK [{source}]: Type of index_endpoint received: {type(index_endpoint)}")
    logger.info(f"BG TASK [{source}]: Resource name of index_endpoint: {getattr(index_endpoint, 'resource_name', 'N/A')}")
    # ------------------------------------
    try:
        # 1. Create Langchain Documents & Chunk
        logger.info(f"BG TASK [{source}]: Creating document chunks...")
        documents = utils.create_langchain_documents(text, metadata)
        if not documents:
            logger.error(f"BG TASK [{source}]: Failed to create document chunks.")
            return

        chunk_ids = [doc.metadata['chunk_id'] for doc in documents if 'chunk_id' in doc.metadata]
        logger.info(f"BG TASK [{source}]: Created {len(documents)} chunks.")

        # 2. Store Chunks in Firestore
        logger.info(f"BG TASK [{source}]: Storing chunks in Firestore...")
        stored_ids = await rag_service.store_chunks_firestore(documents, firestore_client)
        if not stored_ids:
            logger.error(f"BG TASK [{source}]: Failed to store chunks in Firestore. Aborting indexing.")
            return
        if len(stored_ids) != len(documents):
             logger.warning(f"BG TASK [{source}]: Mismatch storing chunks. Stored {len(stored_ids)}/{len(documents)}.")

        # 3. Embed Chunks
        texts_to_embed = [chunk.page_content for chunk in documents if chunk.metadata.get('chunk_id') in stored_ids]
        ids_to_embed = [chunk.metadata['chunk_id'] for chunk in documents if chunk.metadata.get('chunk_id') in stored_ids]

        if not texts_to_embed:
            logger.error(f"BG TASK [{source}]: No texts available to embed after Firestore check.")
            return

        logger.info(f"BG TASK [{source}]: Generating embeddings for {len(texts_to_embed)} chunks...")
        embeddings = await rag_service.embed_texts(texts_to_embed, embedding_service)
        if not embeddings or len(embeddings) != len(ids_to_embed):
             logger.error(f"BG TASK [{source}]: Failed to generate embeddings or count mismatch.")
             return
        logger.info(f"BG TASK [{source}]: Embeddings generated.")

        # 4. Add Embeddings to Vector Search (using Index object)
        logger.info(f"BG TASK [{source}]: Adding embeddings to Vector Search...")
        # Pass the vector_index object received by this function
        success = await rag_service.add_embeddings_to_vector_search(ids_to_embed, embeddings, vector_index)
        if success:
            task_end_time = time.time()
            logger.info(f"BG TASK [{source}]: Successfully indexed {len(ids_to_embed)} chunks. Total time: {task_end_time - task_start_time:.2f}s")
        else:
            logger.error(f"BG TASK [{source}]: Failed to add embeddings to Vector Search.")

    except Exception as e:
        logger.error(f"BG TASK [{source}]: Unhandled exception during ingestion: {e}", exc_info=True)


# --- API Endpoints ---

@app.post("/ingest/url", response_model=models.IngestResponse, status_code=202)
async def ingest_url(
    request: models.IngestURLRequest,
    background_tasks: BackgroundTasks,
    # Ensure ALL dependencies are correctly injected
    firestore_client: AsyncFirestoreClient = Depends(get_firestore_client),
    embedding_service: VertexAIEmbeddings = Depends(get_embedding_service),
    vector_index: aiplatform.MatchingEngineIndex = Depends(get_vector_index), # Inject Index
    index_endpoint: aiplatform.MatchingEngineIndexEndpoint = Depends(get_index_endpoint) # Inject Endpoint
):
    """
    Accepts a URL, scrapes it, and triggers background ingestion.
    """
    logger.info(f"Received ingestion request for URL: {request.url}")
    scraped_text = utils.scrape_website(request.url) # Consider making async
    if not scraped_text:
        raise HTTPException(status_code=400, detail=f"Failed to scrape or process URL: {request.url}")

    metadata = {"source": request.url, "type": "url"}
    if request.metadata:
        metadata.update(request.metadata)

    # Verify arguments passed to add_task match run_ingestion_background signature
    logger.info(f"/INGEST/URL: Passing vector_index of type: {type(vector_index)} to background task.") # Debug log
    background_tasks.add_task(
        run_ingestion_background, # Target function
        # Arguments (MUST match function signature order)
        scraped_text,           # 1 text
        metadata,               # 2 metadata
        firestore_client,       # 3 firestore_client
        embedding_service,      # 4 embedding_service
        vector_index,           # 5 vector_index (the Index object)
        index_endpoint          # 6 index_endpoint (the Endpoint object)
    )

    return models.IngestResponse(
        success=True,
        message="URL received. Ingestion processing started in background."
    )

@app.post("/ingest/text", response_model=models.IngestResponse, status_code=202)
async def ingest_text(
    request: models.IngestTextRequest,
    background_tasks: BackgroundTasks,
    # Inject all needed dependencies
    firestore_client: AsyncFirestoreClient = Depends(get_firestore_client),
    embedding_service: VertexAIEmbeddings = Depends(get_embedding_service),
    vector_index: aiplatform.MatchingEngineIndex = Depends(get_vector_index),
    index_endpoint: aiplatform.MatchingEngineIndexEndpoint = Depends(get_index_endpoint)
):
    """
    Accepts raw text and triggers background ingestion.
    """
    logger.info(f"Received ingestion request for text source_id: {request.source_id}")
    if not request.text or not request.source_id:
        raise HTTPException(status_code=400, detail="Text content and source_id are required.")

    metadata = {"source": request.source_id, "type": "text"}
    if request.metadata:
        metadata.update(request.metadata)

    # Verify arguments passed to add_task match run_ingestion_background signature
    logger.info(f"/INGEST/TEXT: Passing vector_index of type: {type(vector_index)} to background task.") # Debug log
    background_tasks.add_task(
        run_ingestion_background,
        request.text,           # 1 text
        metadata,               # 2 metadata
        firestore_client,       # 3 firestore_client
        embedding_service,      # 4 embedding_service
        vector_index,           # 5 vector_index
        index_endpoint          # 6 index_endpoint
    )

    return models.IngestResponse(
        success=True,
        message="Text received. Ingestion processing started in background."
    )

@app.post("/ingest/file", response_model=models.IngestResponse, status_code=202)
async def ingest_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    metadata_json: str = Form("{}", description="JSON string containing metadata"),
    # Inject all needed dependencies
    gcs_client: storage.Client = Depends(get_gcs_client),
    firestore_client: AsyncFirestoreClient = Depends(get_firestore_client),
    embedding_service: VertexAIEmbeddings = Depends(get_embedding_service),
    vector_index: aiplatform.MatchingEngineIndex = Depends(get_vector_index),
    index_endpoint: aiplatform.MatchingEngineIndexEndpoint = Depends(get_index_endpoint)
):
    """
    Accepts a file, uploads to GCS, extracts text (plain text only),
    and triggers background ingestion.
    """
    logger.info(f"Received file upload: {file.filename} ({file.content_type})")
    try:
        file_metadata_model = models.FileUploadMetadata.model_validate_json(metadata_json)
        parsed_metadata = file_metadata_model.metadata
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid metadata JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse metadata JSON string: {e}")

    gcs_uri = await utils.save_upload_file_to_gcs_async(file, gcs_client)
    if not gcs_uri:
        raise HTTPException(status_code=500, detail="Failed to upload file to GCS.")

    text_content = None
    if file.content_type == "text/plain":
        text_content = await utils.read_text_from_gcs(gcs_uri, gcs_client)
        if text_content is None:
             raise HTTPException(status_code=500, detail="Could not read text content from uploaded file in GCS.")
        logger.info(f"Extracted {len(text_content)} chars from GCS file: {gcs_uri}")
    elif file.content_type in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
         logger.warning(f"File type {file.content_type} received, but text extraction is not implemented.")
         raise HTTPException(status_code=501, detail=f"Text extraction for {file.content_type} not yet implemented.")
    else:
         logger.warning(f"Unsupported file type for text extraction: {file.content_type}")
         raise HTTPException(status_code=415, detail=f"Unsupported file type for automatic text extraction: {file.content_type}")

    if text_content is None:
         raise HTTPException(status_code=400, detail="Could not extract text content from the uploaded file.")

    final_metadata = {
        "source": file.filename or "uploaded_file",
        "gcs_uri": gcs_uri,
        "content_type": file.content_type,
        "type": "file"
    }
    final_metadata.update(parsed_metadata)

    # Verify arguments passed to add_task match run_ingestion_background signature
    logger.info(f"/INGEST/FILE: Passing vector_index of type: {type(vector_index)} to background task.") # Debug log
    background_tasks.add_task(
        run_ingestion_background,
        text_content,           # 1 text
        final_metadata,         # 2 metadata
        firestore_client,       # 3 firestore_client
        embedding_service,      # 4 embedding_service
        vector_index,           # 5 vector_index
        index_endpoint          # 6 index_endpoint
    )

    return models.IngestResponse(
        success=True,
        message=f"File '{file.filename}' uploaded to {gcs_uri}. Ingestion processing started."
    )


@app.post("/query", response_model=models.QueryResponse)
async def query_rag(
    request: models.QueryRequest,
    # Inject dependencies needed for querying
    firestore_client: AsyncFirestoreClient = Depends(get_firestore_client),
    embedding_service: VertexAIEmbeddings = Depends(get_embedding_service),
    index_endpoint: aiplatform.MatchingEngineIndexEndpoint = Depends(get_index_endpoint),
    llm: ChatVertexAI = Depends(get_llm)
):
    """
    Takes query, retrieves context (IDs from VS, data from Firestore), generates answer.
    """
    logger.info(f"Received query: '{request.query}' with top_k={request.top_k}")
    start_query_time = time.time()
    try:
        # Pass the correct dependencies to the service functions
        retrieved_chunks = await rag_service.retrieve_relevant_chunks(
            request.query,
            request.top_k,
            embedding_service,
            index_endpoint, # Querying uses the endpoint
            firestore_client
        )
        answer = await rag_service.generate_answer(request.query, retrieved_chunks, llm)

        end_query_time = time.time()
        logger.info(f"Query processed successfully in {end_query_time - start_query_time:.2f} seconds.")
        return models.QueryResponse(answer=answer, retrieved_context=retrieved_chunks)

    except Exception as e:
        logger.error(f"Critical error processing query '{request.query}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An internal error occurred while processing the query.")

@app.get("/health", status_code=200)
async def health_check(request: Request):
    """Checks the status of initialized clients."""
    state: AppState = request.app.state.app_state
    status = {}
    overall_healthy = True

    if state.initialization_error:
        status["status"] = "error"
        status["error_message"] = state.initialization_error
        status_code = 503
    elif not state.clients_initialized:
         status["status"] = "initializing"
         status_code = 503
    else:
        # Basic check: are clients not None?
        client_checks = {
            "gcs_client": state.gcs_client,
            "firestore_client": state.firestore_client,
            "embedding_service": state.embedding_service,
            "llm": state.llm,
            "index_endpoint": state.index_endpoint,
            "vector_index": state.vector_index
        }
        for name, client in client_checks.items():
            if client is None:
                status[name] = "error"
                overall_healthy = False
            else:
                 status[name] = "ok"

        if not overall_healthy:
            status["status"] = "unhealthy"
            status_code = 503
        else:
            status["status"] = "ok"
            status_code = 200

    # Use response object to set status code correctly
    from fastapi.responses import JSONResponse
    return JSONResponse(content=status, status_code=status_code)

# # Optional: Entrypoint for direct running (mainly for debugging)
# if __name__ == "__main__":
#    import uvicorn
#    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)