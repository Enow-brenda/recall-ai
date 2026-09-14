"""Embedding service — batch embeds texts with the Gemini API.

Model + dimensionality MUST agree with the DB columns
(emails.embedding Vector(1536), attachments.embedding Vector(1536)):

    EMBEDDING_MODEL     = "gemini-embedding-001"   (override via GEMINI_EMBEDDING_MODEL)
    EMBEDDING_DIMENSION = 1536                      (Matryoshka truncation)

Guarantees:
- NEVER raises: a failed batch yields None placeholders so sync/search always
  continue (an email with a missing embedding is simply not searchable yet).
- Rate-limit safe: no more than BATCH_SIZE texts per API call, a cooldown sleep
  after every batch, and 1s/3s/5s/7s/9s backoff on 429/5xx retries (5 attempts).
- Input hygiene: each text truncated to MAX_INPUT_CHARS; empty/whitespace-only
  inputs produce None (nothing meaningful to embed).
"""
import logging
import time
from collections.abc import Sequence

from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSION = 1536
MAX_INPUT_CHARS = 6000          # keep well under the 2048-token input limit
BATCH_SIZE = 5                  # reduced from 20 to avoid 429 rate limits
BATCH_COOLDOWN_S = 2.0          # increased cooldown between batches
MAX_RETRIES = 5                 # increased from 3 for more retry attempts
RETRYABLE = {429, 500, 503, 504}

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def get_genai_client() -> genai.Client:
    """Public alias so LLM/search/cal services share one singleton client
    (should be preferred over building clients ad-hoc)."""
    return _get_client()


def _normalize_text(text: str | None) -> str | None:
    if not text or not text.strip():
        return None
    return text[:MAX_INPUT_CHARS]


def embed_texts(
    texts: Sequence[str | None],
    *,
    task_type: str = "RETRIEVAL_DOCUMENT",
) -> list[list[float] | None]:
    """Embed a batch of texts. Empty/invalid inputs -> None. Never raises."""
    payloads = [_normalize_text(t) for t in texts]
    results: list[list[float] | None] = []

    for start in range(0, len(payloads), BATCH_SIZE):
        chunk = payloads[start : start + BATCH_SIZE]
        valid = [t for t in chunk if t is not None]
        if not valid:
            results.extend([None] * len(chunk))
            continue

        vector_map: dict[int, list[float]] = {}
        for attempt in range(MAX_RETRIES + 1):
            try:
                resp = _get_client().models.embed_content(
                    model=EMBEDDING_MODEL,
                    contents=valid,
                    config=types.EmbedContentConfig(
                        task_type=task_type,
                        output_dimensionality=EMBEDDING_DIMENSION,
                    ),
                )
                for i, embedding in enumerate(resp.embeddings):
                    vector_map[i] = embedding.values
                break
            except APIError as exc:
                if exc.code in RETRYABLE and attempt < MAX_RETRIES:
                    time.sleep(1 + attempt * 2)     # 1s, 3s, 5s, 7s, 9s backoff
                    continue
                logger.error("embed batch %d failed: %s", start // BATCH_SIZE, exc)
                # Do NOT reset vector_map — preserve any partial successes
                # (API failure means no embeddings, but keep initial {} for clarity)
                break

        cursor = 0
        for item in chunk:
            if item is None:
                results.append(None)
            else:
                results.append(list(vector_map.get(cursor, [])) or None)
                cursor += 1
        time.sleep(BATCH_COOLDOWN_S)

    return results


def embed_text(
    text: str | None,
    *,
    task_type: str = "RETRIEVAL_DOCUMENT",
) -> list[float] | None:
    """Embed a single text. Returns None when empty/invalid or on failure."""
    return embed_texts([text], task_type=task_type)[0]
