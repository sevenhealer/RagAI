import logging
import time
import uuid
import asyncio
import urllib.parse
from typing import List, Dict, Any, Union # Ensure Union is imported

# Langchain & Google Cloud Imports
from langchain_google_vertexai import VertexAIEmbeddings, ChatVertexAI
from google.cloud import aiplatform
try:
    # Try direct import first (should work with recent lib versions)
    from google.cloud.aiplatform import IndexDatapoint
except ImportError:
    # Fallback for potentially older versions or different structures
    from google.cloud.aiplatform_v1.types import IndexDatapoint

from google.cloud import firestore
from google.cloud.firestore_v1.async_client import AsyncClient
from google.api_core.exceptions import GoogleAPICallError, NotFound, FailedPrecondition

# App specific imports
from app.config import settings
from app.models import RetrievedChunk
from langchain.docstore.document import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter # Import needed for utils if not already there


logger = logging.getLogger(__name__)

# --- Utility Functions (Moved from utils.py if only used here, or keep in utils.py) ---
# If get_text_splitter is only used here, can move it. Let's assume it stays in utils.py for now.
# from app.utils import get_text_splitter # Assuming it's in utils

# --- Firestore Interaction ---

async def store_chunks_firestore(
    chunks: List[Document],
    firestore_client: AsyncClient
) -> List[str]:
    """Stores document chunks (text and metadata) in Firestore."""
    if not chunks:
        return []

    stored_ids = []
    collection_ref = firestore_client.collection(settings.firestore_collection)
    batch = firestore_client.batch()
    count = 0
    total_stored = 0

    try:
        start_time = time.time()
        for chunk in chunks:
            chunk_id = chunk.metadata.get('chunk_id')
            if not chunk_id:
                logger.warning("Chunk missing 'chunk_id' in metadata, skipping Firestore store.")
                continue

            doc_ref = collection_ref.document(chunk_id)
            data_to_store = {
                "text": chunk.page_content,
                "metadata": chunk.metadata,
                "created_at": firestore.SERVER_TIMESTAMP
            }
            batch.set(doc_ref, data_to_store)
            stored_ids.append(chunk_id)
            count += 1
            total_stored += 1

            # Commit batch periodically
            if count >= 400: # Commit when batch size reaches limit
                logger.info(f"Committing batch of {count} chunks to Firestore...")
                await batch.commit()
                logger.info(f"Committed batch. Total stored so far: {total_stored}")
                batch = firestore_client.batch() # Start a new batch
                count = 0 # Reset counter for the new batch

        # Commit any remaining chunks
        if count > 0:
            logger.info(f"Committing final batch of {count} chunks to Firestore...")
            await batch.commit()
            logger.info(f"Committed final batch. Total stored: {total_stored}")

        end_time = time.time()
        logger.info(f"Stored {total_stored} chunks in Firestore collection '{settings.firestore_collection}' in {end_time - start_time:.2f} seconds.")
        return stored_ids
    except (GoogleAPICallError, FailedPrecondition) as e:
        logger.error(f"Firestore error storing chunks: {e}", exc_info=True)
        return [] # Return empty on failure
    except Exception as e:
        logger.error(f"Unexpected error storing chunks in Firestore: {e}", exc_info=True)
        return []


async def fetch_chunk_data_by_id(
    chunk_id: str,
    firestore_client: AsyncClient
) -> Union[Dict[str, Any], None]:
    """Fetches chunk data (text and metadata) from Firestore by ID."""
    try:
        doc_ref = firestore_client.collection(settings.firestore_collection).document(chunk_id)
        doc_snapshot = await doc_ref.get()

        if doc_snapshot.exists:
            return doc_snapshot.to_dict()
        else:
            logger.warning(f"Chunk ID not found in Firestore: {chunk_id}")
            return None
    except (GoogleAPICallError, FailedPrecondition) as e:
        logger.error(f"Firestore error fetching chunk {chunk_id}: {e}", exc_info=True)
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching chunk {chunk_id} from Firestore: {e}", exc_info=True)
        return None


# --- Embedding ---

async def embed_texts(
    texts: List[str],
    embedding_service: VertexAIEmbeddings
) -> List[List[float]]:
    """Generates embeddings for a list of texts using Vertex AI (async)."""
    if not texts:
        return []
    try:
        start_time = time.time()
        embeddings = await embedding_service.aembed_documents(texts)
        end_time = time.time()
        logger.info(f"Generated {len(embeddings)} embeddings in {end_time - start_time:.2f} seconds.")
        if not embeddings or len(embeddings) != len(texts):
             logger.error(f"Mismatch between number of texts ({len(texts)}) and generated embeddings ({len(embeddings) if embeddings else 0}).")
             raise ValueError("Embedding generation failed or returned unexpected results.")
        return embeddings
    except (GoogleAPICallError, FailedPrecondition) as e:
        logger.error(f"Vertex AI API error generating embeddings: {e}", exc_info=True)
        raise
    except Exception as e:
        logger.error(f"Unexpected error generating embeddings: {e}", exc_info=True)
        raise

async def embed_query(
    query: str,
    embedding_service: VertexAIEmbeddings
) -> List[float]:
    """Generates embedding for a single query (async)."""
    try:
        start_time = time.time()
        embedding = await embedding_service.aembed_query(query)
        end_time = time.time()
        logger.info(f"Generated query embedding in {end_time - start_time:.2f} seconds.")
        return embedding
    except (GoogleAPICallError, FailedPrecondition) as e:
        logger.error(f"Vertex AI API error generating query embedding: {e}", exc_info=True)
        raise
    except Exception as e:
        logger.error(f"Unexpected error generating query embedding: {e}", exc_info=True)
        raise

# --- Vector Search Interaction ---

async def add_embeddings_to_vector_search(
    chunk_ids: List[str],
    embeddings: List[List[float]],
    vector_index: aiplatform.MatchingEngineIndex # Expecting Index object
) -> bool:
    """Upserts embeddings into Google Cloud Vector Search using the Index object."""
    # --- Logging added for debugging ---
    logger.info(f"ADD EMBEDDINGS: Received vector_index of type: {type(vector_index)}")
    logger.info(f"ADD EMBEDDINGS: Resource name of vector_index: {getattr(vector_index, 'resource_name', 'N/A')}")
    # ------------------------------------

    if not chunk_ids or not embeddings or len(chunk_ids) != len(embeddings):
        logger.error("Mismatch between chunk IDs and embeddings provided for Vector Search upsert.")
        return False

    datapoints = [
        IndexDatapoint( # Use imported IndexDatapoint directly
            datapoint_id=chunk_id,
            feature_vector=embedding
        )
        for chunk_id, embedding in zip(chunk_ids, embeddings)
    ]

    try:
        start_time = time.time()
        # Use the Index object's resource name in the log
        logger.info(f"Upserting {len(datapoints)} datapoints to Vector Search index '{vector_index.resource_name}'...")

        # --- USE THE 'vector_index' OBJECT's METHOD ---
        # Call upsert_datapoints on the vector_index object.
        # Wrap in run_in_executor as it's likely blocking.
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
             None, # Use default thread pool executor
             lambda: vector_index.upsert_datapoints(datapoints=datapoints)
             # If the above fails later with AttributeError for upsert_datapoints, try update_datapoints:
             # lambda: vector_index.update_datapoints(datapoints=datapoints)
        )
        # ---------------------------------------------

        end_time = time.time()
        logger.info(f"Upsert operation to Vector Search index completed in {end_time - start_time:.2f} seconds.")
        return True
    except AttributeError as e:
         # Catch if 'upsert_datapoints' (or 'update_datapoints') method doesn't exist on vector_index
         logger.error(f"Method error upserting to Vector Search Index ({vector_index.resource_name}): {e}. Check SDK version for correct method name on Index object.", exc_info=True)
         return False
    except (GoogleAPICallError, FailedPrecondition) as e: # Catch specific API errors
        logger.error(f"Vector Search API error upserting datapoints via Index: {e}", exc_info=True)
        return False
    except Exception as e:
        logger.error(f"Unexpected error upserting datapoints to Vector Search via Index: {e}", exc_info=True)
        return False


# --- Querying still uses the IndexEndpoint ---
async def retrieve_relevant_chunks(
    query: str,
    top_k: int,
    embedding_service: VertexAIEmbeddings,
    index_endpoint: aiplatform.MatchingEngineIndexEndpoint, # Querying uses Endpoint
    firestore_client: AsyncClient
) -> List[RetrievedChunk]:
    """Embeds query, retrieves relevant chunk IDs from Vector Search, and fetches full data from Firestore."""
    logger.info(f"RETRIEVE: Retrieving top {top_k} chunks for query...")
    try:
        query_embedding = await embed_query(query, embedding_service)
    except Exception:
         logger.error("RETRIEVE: Failed to generate query embedding.", exc_info=True)
         return [] # Cannot proceed

    try:
        start_time = time.time()
        # Wrap find_neighbors in run_in_executor as it might be blocking
        loop = asyncio.get_running_loop()
        find_neighbors_response = await loop.run_in_executor(
             None,
             lambda: index_endpoint.find_neighbors(
                 deployed_index_id=settings.vector_search_deployed_index_id,
                 queries=[query_embedding],
                 num_neighbors=top_k
                 # Add filter=[] here if implementing session filtering later
            )
        )
        end_time = time.time()

        retrieved_chunks = []
        if find_neighbors_response and find_neighbors_response[0]:
            neighbors = find_neighbors_response[0]
            logger.info(f"RETRIEVE: Retrieved {len(neighbors)} neighbors from Vector Search in {end_time - start_time:.2f} seconds.")

            # Fetch data from Firestore for each neighbor concurrently
            fetch_tasks = [fetch_chunk_data_by_id(match.id, firestore_client) for match in neighbors]
            results = await asyncio.gather(*fetch_tasks, return_exceptions=True)

            for i, result in enumerate(results):
                match = neighbors[i] # Get corresponding neighbor match
                if isinstance(result, Exception):
                    logger.error(f"RETRIEVE: Error fetching data for chunk {match.id} from Firestore: {result}")
                elif result:
                    retrieved_chunks.append(
                        RetrievedChunk(
                            id=match.id,
                            text=result.get("text", "Error: Text not found in Firestore"),
                            distance=match.distance,
                            metadata=result.get("metadata", {})
                        )
                    )
                # else: # fetch_chunk_data_by_id logs warning if not found
        else:
            logger.info("RETRIEVE: No neighbors found in Vector Search for the query.")

        logger.info(f"RETRIEVE: Formatted {len(retrieved_chunks)} retrieved chunks.")
        return retrieved_chunks

    except (GoogleAPICallError, FailedPrecondition) as e:
        logger.error(f"RETRIEVE: Vector Search API error retrieving neighbors: {e}", exc_info=True)
        return []
    except Exception as e:
        logger.error(f"RETRIEVE: Unexpected error during retrieval: {e}", exc_info=True)
        return []


# --- Generation ---

async def generate_answer(
    query: str,
    retrieved_chunks: List[RetrievedChunk],
    llm: ChatVertexAI
) -> str:
    """Generates an answer using the LLM based on the query and retrieved context."""

    if not retrieved_chunks:
        logger.warning("GENERATE: No relevant chunks retrieved. Generating answer based on query alone.")
        prompt = f"Please answer the following question based on your general knowledge:\n\nQuestion: {query}\n\nAnswer:"
        context_available = False
    else:
        context_parts = []
        for i, chunk in enumerate(retrieved_chunks):
            source = chunk.metadata.get('source', 'Unknown Source')
            context_parts.append(f"Context Chunk {i+1} (Source: {source}, ID: {chunk.id}):\n{chunk.text}")
        context = "\n\n---\n\n".join(context_parts)

        prompt = f"""You are a helpful assistant. Answer the following question based ONLY on the context provided below. If the context doesn't contain the answer, state that clearly. Do not use any prior knowledge.

Context:
---
{context}
---

Question: {query}

Answer:
"""
        context_available = True

    logger.info(f"GENERATE: Context available: {context_available}. Prompt length: {len(prompt)} chars.")
    # Consider adding token count logging here

    try:
        start_time = time.time()
        response = await llm.ainvoke(prompt)
        answer = response.content
        end_time = time.time()
        logger.info(f"GENERATE: LLM generated answer in {end_time - start_time:.2f} seconds.")
        return answer

    except (GoogleAPICallError, FailedPrecondition) as e:
        logger.error(f"GENERATE: Vertex AI API error during generation: {e}", exc_info=True)
        return "Error: Could not generate answer due to an API issue with the language model."
    except Exception as e:
        logger.error(f"GENERATE: Unexpected error generating answer with LLM: {e}", exc_info=True)
        return "An error occurred while generating the answer."