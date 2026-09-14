import re

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.middleware.auth_backend import get_current_user
from app.core.middleware.usage_guard import check_quota, increment_usage
from app.db.db_instance import get_db
from app.db.models import ConnectedAccount, User
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.common import ok
from app.schemas.conversation import Source
from app.services import conversation_service
from app.services.llm_service import answer, rewrite_query
from app.services.search_service import search
from app.services.serializers import conversation_to_schema, message_to_schema

router = APIRouter(tags=["Chat"])

CITE_RE = re.compile(r"\[(\d+)\]")
SNIPPET_CHARS = 300
TOP_SOURCES_FOR_PROMPT = 5


@router.post("/chat")
def chat_endpoint(
    payload: ChatRequest,
    user: User = Depends(check_quota),
    db: Session = Depends(get_db),
):
    conv = conversation_service.get_or_create(db, user.id, payload.conversation_id)
    conversation_service.add_turn(db, conv, "user", payload.message)

    history = conversation_service.get_history(db, conv, limit=10)
    context = [{"direction": m.direction, "content": m.content} for m in history]
    query = rewrite_query(context, payload.message)

    hits = search(db, user.id, query, account_ids=payload.account_ids, k=TOP_SOURCES_FOR_PROMPT)
    prompt_sources = [_llm_source(hit) for hit in hits]
    answer_text = answer(payload.message, prompt_sources)

    sources = _build_cited_sources(db, user.id, answer_text, hits)
    msg = conversation_service.add_turn(
        db, conv, "assistant", answer_text, sources=[s.model_dump() for s in sources]
    )
    increment_usage(db, user)

    return ok(
        ChatResponse(
            conversation=conversation_to_schema(conv),
            message=message_to_schema(msg),
        ).model_dump()
    )


def _llm_source(hit: dict) -> dict:
    email = hit["email"]
    if hit["type"] == "attachment":
        snippet = (hit["att"].extracted_text or "")[:SNIPPET_CHARS]
    else:
        snippet = (email.raw_body or "")[:SNIPPET_CHARS]
    return {
        "subject": email.subject,
        "sender": email.sender,
        "sent_at": email.sent_at.isoformat() if email.sent_at else "",
        "snippet": " ".join(snippet.split()),
    }


def _build_cited_sources(db: Session, user_id, answer_text: str, hits: list[dict]) -> list[Source]:
    cited = _cited_indexes(answer_text, hits)
    indexes = cited or list(range(min(2, len(hits))))

    account_ids = {h["email"].account_id for h in hits}
    accounts = (
        db.query(ConnectedAccount)
        .filter(ConnectedAccount.user_id == user_id, ConnectedAccount.id.in_(account_ids))
        .all()
    )
    label_map = {a.id: a.display_label for a in accounts}

    sources = []
    for idx in indexes:
        hit = hits[idx]
        email = hit["email"]
        if hit["type"] == "attachment":
            att = hit["att"]
            sources.append(
                Source(
                    type="attachment",
                    ref_id=att.id,
                    account_label=label_map.get(email.account_id),
                    subject=email.subject,
                    sender=email.sender,
                    snippet=(att.extracted_text or "")[:SNIPPET_CHARS],
                )
            )
        else:
            sources.append(
                Source(
                    type="email",
                    ref_id=email.id,
                    account_label=label_map.get(email.account_id),
                    subject=email.subject,
                    sender=email.sender,
                    snippet=(email.raw_body or "")[:SNIPPET_CHARS],
                )
            )
    return sources


def _cited_indexes(answer_text: str, hits: list[dict]) -> list[int]:
    seen = set()
    ordered = []
    for m in CITE_RE.findall(answer_text):
        n = int(m)
        if 1 <= n <= len(hits) and n not in seen:
            seen.add(n)
            ordered.append(n - 1)
    return ordered