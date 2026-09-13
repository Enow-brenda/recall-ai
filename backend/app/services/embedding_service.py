# this file contains all the embedding logic
import logging
import time
from typing import Sequence

from google import genai
from google.genai import types
from google.genai.errors import APIError


from app.config import settings

logger = logging.getLogger(__name__)

# constantsin an    

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSION = 1536
MAX_INPUT_CHARS = 6000
MAX_RETRIES = 3
RETRYABLE = {429, 500, 503, 504}
BATCH_COOLDOWN_S = 0.5
BATCH_SIZE = 20 # this is to keep the request fast

_client : genai.Client | None = None

def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GENAI_API_KEY)
    return _client

def _normalize_text(text: str) -> str:
    if not text or not text.strip():
        return None
    return text[:MAX_INPUT_CHARS]

def embed_texts(
        texts: Sequence[str |None],
        *,
        task_type: str ="RETRIEVAL_DOCUMENT",
) -> list[list[float] | None]:
   
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
                    time.sleep(1 + attempt * 2)         # 1s, 3s, 5s backoff
                    continue
                logger.error("embed batch %d failed: %s", start // BATCH_SIZE, exc)
                vector_map = {}
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
    return embed_texts([text], task_type=task_type)[0]
   