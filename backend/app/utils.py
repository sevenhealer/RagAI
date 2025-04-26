import os
import uuid
import logging
import requests
import tempfile
import asyncio
from typing import List, Union

from bs4 import BeautifulSoup
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document
from google.cloud import storage
from fastapi import UploadFile
import aiofiles
import urllib.parse
from app.config import settings

logger = logging.getLogger(__name__)

def get_text_splitter() -> RecursiveCharacterTextSplitter:
    """Returns a configured text splitter."""
    return RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        length_function=len,
        add_start_index=True, # Add byte offset of chunk start
    )

def scrape_website(url: str) -> Union[str, None]:
    """Scrapes text content from a given URL."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'}
        response = requests.get(url, headers=headers, timeout=30) # Increased timeout
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

        # Detect encoding, default to UTF-8
        response.encoding = response.apparent_encoding or 'utf-8'

        soup = BeautifulSoup(response.text, "html.parser")

        # More robust text extraction (remove script, style, nav, footers potentially)
        for element in soup(["script", "style", "nav", "footer", "aside", "form"]):
            element.decompose()

        # Get text, separate paragraphs, strip whitespace
        text_chunks = [p.get_text(strip=True) for p in soup.find_all(['p', 'h1', 'h2', 'h3', 'li', 'div'])]
        text = '\n\n'.join(chunk for chunk in text_chunks if chunk) # Join non-empty chunks

        if not text:
             # Fallback if specific tag search fails
             text = soup.get_text(separator='\n', strip=True)

        logger.info(f"Successfully scraped ~{len(text)} characters from URL: {url}")
        return text
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching or parsing URL {url}: {e}", exc_info=True)
        return None
    except Exception as e:
        logger.error(f"Unexpected error scraping URL {url}: {e}", exc_info=True)
        return None

def create_langchain_documents(text: str, metadata: dict) -> List[Document]:
    """Creates Langchain Document objects from raw text."""
    if not text:
        logger.warning("Received empty text for document creation.")
        return []
    # Ensure source is present for chunk ID generation
    source = metadata.get("source", "unknown_source")
    safe_source = urllib.parse.quote_plus(source)
    doc = Document(page_content=text, metadata=metadata)
    text_splitter = get_text_splitter()
    chunks = text_splitter.split_documents([doc])

    # Assign unique ID and enhance metadata for each chunk
    for i, chunk in enumerate(chunks):
        chunk_id = f"{safe_source}_{uuid.uuid4()}" # More robust unique ID
        chunk.metadata['chunk_id'] = chunk_id
        chunk.metadata['chunk_index'] = i # Keep track of the chunk order within the source
        # Add start index if available from splitter
        chunk.metadata.setdefault('start_index', chunk.metadata.get('start_index', -1))

    logger.info(f"Split text from source '{source}' into {len(chunks)} chunks.")
    return chunks

async def save_upload_file_to_gcs_async(
    upload_file: UploadFile,
    storage_client: storage.Client
) -> Union[str, None]:
    """
    Asynchronously uploads a FastAPI UploadFile to GCS using a temporary file
    to handle potentially large files efficiently.
    """
    if not upload_file.filename:
        logger.error("Cannot upload file without a filename.")
        return None

    bucket = storage_client.bucket(settings.gcs_bucket_name)
    # Use a unique name including a potential prefix
    blob_name = f"{settings.gcs_upload_prefix.strip('/')}/{uuid.uuid4()}_{upload_file.filename}"
    blob = bucket.blob(blob_name)
    gcs_uri = f"gs://{settings.gcs_bucket_name}/{blob_name}"

    tmp_file_path = None
    try:
        # Create a temporary file to buffer the upload
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            tmp_file_path = tmp_file.name
            # Stream the upload content to the temporary file asynchronously
            async with aiofiles.open(tmp_file_path, 'wb') as f:
                while content := await upload_file.read(1024 * 1024): # Read in 1MB chunks
                    await f.write(content)
            await upload_file.close() # Ensure the upload file stream is closed

        # Upload from the temporary file in a separate thread to avoid blocking
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None, # Use default executor (ThreadPoolExecutor)
            lambda: blob.upload_from_filename(tmp_file_path, content_type=upload_file.content_type)
        )

        logger.info(f"File '{upload_file.filename}' uploaded successfully to {gcs_uri}")
        return gcs_uri

    except Exception as e:
        logger.error(f"Error uploading file '{upload_file.filename}' to GCS: {e}", exc_info=True)
        return None
    finally:
        # Clean up the temporary file if it exists
        if tmp_file_path and os.path.exists(tmp_file_path):
            try:
                os.remove(tmp_file_path)
                # logger.debug(f"Removed temporary file: {tmp_file_path}")
            except OSError as e:
                logger.error(f"Error removing temporary file {tmp_file_path}: {e}")
        # Ensure upload_file is closed even if errors occurred earlier
        if upload_file and not upload_file.file.closed:
             await upload_file.close()


# Placeholder for future Document AI integration
# async def extract_text_from_gcs_pdf(gcs_uri: str, project_id: str, location: str):
#     # Requires google-cloud-documentai
#     # Initialize Document AI Client
#     # Call process_document method
#     # Return extracted text
#     logger.warning(f"PDF extraction via Document AI for {gcs_uri} is not implemented.")
#     return None

async def read_text_from_gcs(
    gcs_uri: str,
    storage_client: storage.Client
) -> Union[str, None]:
    """Reads text content from a GCS file."""
    try:
        blob = storage.Blob.from_string(gcs_uri, client=storage_client)
        # Run download_as_text in executor for potentially large files
        loop = asyncio.get_running_loop()
        text_content = await loop.run_in_executor(
            None, # Use default executor
            lambda: blob.download_as_text(encoding='utf-8') # Specify encoding
        )
        logger.info(f"Successfully read text content from {gcs_uri}")
        return text_content
    except Exception as e:
        logger.error(f"Failed to download/read text from GCS URI {gcs_uri}: {e}", exc_info=True)
        return None
