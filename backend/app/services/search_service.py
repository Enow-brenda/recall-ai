"""Semantic search over the user's emails + attachment extracts.

Searches two pgvector columns in one metric space (both 1536-dim):
    emails.embedding      — subject + "\\n\\n" + raw_body
    attachments.embedding — attachment extracted text

The query is embedded with task_type=RETRIEVAL_QUERY (same space as the stored
RETRIEVAL_DOCUMENT vectors); results are ranked by cosine distance (<=>), which
postgres computes over the HNSW index.

Guarantees / contract:
- Never raises. A query with no usable embedding (empty/normalized away, or a
  transient embedding API failure) yields [] — the caller renders "no hits".
- Searchable rows are only those with embedding IS NOT NULL (partial HNSW index
  already excludes the rest).
- account_ids is optional; when given, results are restricted to those accounts.
- Themed k: DEFAULT_K = 5 in this file; routers may override per endpoint.
"""
import logging
import uuid
from collections.abc import Sequence

from sqlalchemy.orm import Session

from app.db.models import Attachment, Email
from app.services.embedding_service import embed_text

logger = logging.getLogger(__name__)

DEFAULT_K = 5
DEFAULT_SNIPPET_CHARS = 300


def _normalize_snippet(text: str | None, *, limit: int) -> str:
    if not text:
        return ""
    text = " ".join(text.split())
    return text[:limit] + ("…" if len(text) > limit else "")


def _email_snippet(email: Email) -> str:
    return _normalize_snippet(email.raw_body, limit=DEFAULT_SNIPPET_CHARS)


def search(
    db: Session,
    user_id: uuid.UUID,
    query: str,
    *,
    account_ids: Sequence[uuid.UUID] | None = None,
    k: int = DEFAULT_K,
) -> list[dict]:
    """Return up to `k` ranked hits.

    Each hit is a dict:
        {"type": "email",      "email": <Email>,      "att": None,        "dist": float}
        {"type": "attachment", "email": <Email>,      "att": <Attachment>, "dist": float}
    sorted by ascending cosine distance. Empty query / no embedding → [].
    """
    qvec = embed_text(query, task_type="RETRIEVAL_QUERY")
    if not qvec:
        return []

    account_filter: list[object] = []
    if account_ids:
        account_filter.append(Email.account_id.in_(account_ids))

    email_rows = (
        db.query(
            Email, Email.embedding.cosine_distance(qvec).label("dist")
        )
        .filter(
            Email.user_id == user_id,
            Email.embedding.isnot(None),
            *account_filter,
        )
        .order_by("dist")
        .limit(k)
        .all()
    )

    att_rows = (
        db.query(
            Attachment,
            Attachment.embedding.cosine_distance(qvec).label("dist"),
            Email,
        )
        .join(Email, Attachment.email_id == Email.id)
        .filter(
            Email.user_id == user_id,
            Attachment.embedding.isnot(None),
            *account_filter,
        )
        .order_by("dist")
        .limit(k)
        .all()
    )

    hits: list[dict] = []
    for email, dist in email_rows:
        hits.append({"type": "email", "email": email, "att": None, "dist": float(dist)})
    for att, dist, email in att_rows:
        hits.append({"type": "attachment", "email": email, "att": att, "dist": float(dist)})

    hits.sort(key=lambda h: h["dist"])
    return hits[:k]
