"""Document ingestion for offline mode: extract -> chunk -> embed -> store.

Supported inputs: plain text/markdown, digital PDFs (pypdf), and scanned PDFs /
images via OCR (pytesseract + poppler). OCR is best-effort: if the system
binaries are missing it is skipped with a warning rather than failing the upload.
"""

from __future__ import annotations

import io
import logging

from pypdf import PdfReader

from app.settings import settings
from app.offline import llm, store

logger = logging.getLogger(__name__)

_TEXT_EXT = {"txt", "md", "markdown", "csv", "log", "json"}
_IMAGE_EXT = {"png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif", "gif"}


def _ext(filename: str) -> str:
    return filename.lower().rsplit(".", 1)[-1] if "." in filename else ""


def _ocr_image(data: bytes) -> str:
    try:
        import pytesseract
        from PIL import Image

        return pytesseract.image_to_string(Image.open(io.BytesIO(data)))
    except Exception as exc:  # noqa: BLE001 - OCR deps are optional
        logger.warning("Image OCR unavailable/failed: %s", exc)
        return ""


def _ocr_pdf(data: bytes) -> str:
    try:
        import pytesseract
        from pdf2image import convert_from_bytes

        pages = convert_from_bytes(data)
        return "\n".join(pytesseract.image_to_string(p) for p in pages)
    except Exception as exc:  # noqa: BLE001 - OCR deps are optional
        logger.warning("PDF OCR unavailable/failed: %s", exc)
        return ""


def _extract_pdf(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    text = "\n".join((page.extract_text() or "") for page in reader.pages).strip()
    # Sparse text usually means a scanned PDF -> fall back to OCR.
    if len(text) < 100:
        ocr = _ocr_pdf(data)
        if len(ocr) > len(text):
            return ocr
    return text


def extract_text(filename: str, data: bytes) -> str:
    ext = _ext(filename)
    if ext in _TEXT_EXT:
        return data.decode("utf-8", errors="ignore")
    if ext == "pdf":
        return _extract_pdf(data)
    if ext in _IMAGE_EXT:
        return _ocr_image(data)
    # Unknown type: best-effort decode.
    return data.decode("utf-8", errors="ignore")


def chunk_text(text: str) -> list[str]:
    text = text.strip()
    if not text:
        return []
    size, overlap = settings.chunk_size, settings.chunk_overlap
    step = max(size - overlap, 1)
    return [text[i : i + size] for i in range(0, len(text), step)]


def ingest(filename: str, data: bytes) -> int:
    """Extract, chunk, embed and store a document. Returns chunks stored."""
    text = extract_text(filename, data)
    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("No extractable text found in the document")
    embeddings = llm.embed(chunks)
    return store.add_chunks(filename, chunks, embeddings)
