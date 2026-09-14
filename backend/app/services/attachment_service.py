"""Attachment text extraction — turns file bytes into searchable text.

Dispatcher `extract_text(filename, data)`:
  - PDF   → PyMuPDF (`fitz`, first page + incremental pages, joined)
  - DOCX  → python-docx (paragraphs only — tables are a Phase-2 nicety)
  - TXT/CSV/MD/LOG/JSON → utf-8 decode
  - anything else → None

Contract (identical to gmail/embedding services):
- NEVER raises. A missing extractor, a corrupt file, or an import that isn't
  installed simply yields None, so sync/search keep moving.
- Output is capped at MAX_EXTRACT_CHARS (6000) — well under the 2048-token
  Gemini input limit so the attachment can be embedded in the same call path.

NOTE: plain PDF extraction without OCR only gives you the *digital text layer*.
Scanned (image-only) PDFs return little/nothing; OCR is explicitly out of scope
for v1 (spec: "OCR is out of scope").
"""
import io
import logging
from pathlib import PurePath

logger = logging.getLogger(__name__)

MAX_EXTRACT_CHARS = 6000
TEXT_EXTENSIONS = {".txt", ".csv", ".md", ".log", ".json"}

# imageless extractors — import lazily so a missing wheel never breaks startup
_fitz = None
_docx_mod = None


def _load_fitz():
    global _fitz
    if _fitz is None:
        try:
            import fitz
            _fitz = fitz
        except ImportError:
            _fitz = False
    return _fitz or None


def _load_docx():
    global _docx_mod
    if _docx_mod is None:
        try:
            import docx
            _docx_mod = docx
        except ImportError:
            _docx_mod = False
    return _docx_mod or None


def extract_text(filename: str | None, data: bytes) -> str | None:
    """Best-effort text from attachment bytes. None on anything unexpected."""
    if not filename or not data:
        return None
    name = (filename or "").lower()
    try:
        if name.endswith(".pdf"):
            return _extract_pdf(data)
        if name.endswith(".docx"):
            return _extract_docx(data)
        if name.endswith(".doc"):
            logger.warning("legacy .doc not supported (no text layer): %s", name)
            return None
        ext = PurePath(name).suffix
        if ext in TEXT_EXTENSIONS:
            return data.decode("utf-8", errors="replace")[:MAX_EXTRACT_CHARS]
    except Exception as exc:
        logger.warning("extract_text(%s) failed: %s", name, exc)
    return None


def _extract_pdf(data: bytes) -> str | None:
    fz = _load_fitz()
    if fz is None:
        logger.warning("pymupdf not installed; cannot extract PDF")
        return None
    doc = fz.open(stream=data, filetype="pdf")
    try:
        pages = []
        for page in doc:
            text = page.get_text()
            if text.strip():
                pages.append(text)
        if not pages:
            return None
        joined = "\n".join(pages)
        return joined[:MAX_EXTRACT_CHARS]
    finally:
        doc.close()


def _extract_docx(data: bytes) -> str | None:
    d = _load_docx()
    if d is None:
        logger.warning("python-docx not installed; cannot extract DOCX")
        return None
    document = d.Document(io.BytesIO(data))
    paragraphs = [p.text.strip() for p in document.paragraphs if p.text.strip()]
    if not paragraphs:
        return None
    joined = "\n".join(paragraphs)
    return joined[:MAX_EXTRACT_CHARS]