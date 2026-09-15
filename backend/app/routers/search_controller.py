import re
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import QuotaExceededError
from app.core.middleware.auth_backend import get_current_user
from app.core.middleware.usage_guard import check_quota, increment_usage
from app.db.db_instance import get_db
from app.db.models import ConnectedAccount, Provider, User
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.common import ok
from app.schemas.conversation import Source
from app.services import conversation_service
from app.services.llm_service import LLMQuotaLimited, answer, rewrite_query
from app.services.search_service import search
from app.services.serializers import conversation_to_schema, message_to_schema

router = APIRouter(tags=["Chat"])

CITE_RE = re.compile(r"\[(\d+)\]")
SNIPPET_CHARS = 300
TOP_SOURCES_FOR_PROMPT = 5

SMALL_TALK_REPLY = (
    "Hi! I can search your connected inbox — try a sender, topic, or "
    "date-range question."
)

_PUNCT_RE = re.compile(r"[^a-z0-9\s]")
_SINGLE_WORD_GREETINGS = {
    "hi", "hello", "hey", "heya", "hiya", "hola", "yo", "sup", "howdy",
    "hru", "ty", "thanks", "bye", "goodbye", "goodnight", "ok", "okay",
}
_PHRASE_GREETINGS = {
    "what s up", "whats up", "how are you", "how are u", "how r u", "how do u do",
    "how do you do", "good morning", "good afternoon", "good evening", "good night",
    "thank you", "hey there", "hi there", "hello there", "hope u are well",
    "how s it going", "how is it going",
}


@router.post("/chat")
def chat_endpoint(
    payload: ChatRequest,
    user: User = Depends(check_quota),
    db: Session = Depends(get_db),
):
    conv = conversation_service.get_or_create(db, user.id, payload.conversation_id)

    # Add user message turn first
    try:
        conversation_service.add_turn(db, conv, "user", payload.message)
    except Exception:
        db.rollback()
        raise QuotaExceededError("Failed to record your message. Please try again.")

    history = conversation_service.get_history(db, conv, limit=10)

    if _is_small_talk(payload.message):
        answer_text = SMALL_TALK_REPLY
        sources: list[Source] = []
        qualified = False
    else:
        prior_turns = history[:-1]  # exclude the message we just stored
        context = [{"direction": m.direction, "content": m.content} for m in prior_turns]
        query = rewrite_query(context, payload.message)

        hits = search(
            db,
            user.id,
            query,
            account_ids=payload.account_ids,
            k=TOP_SOURCES_FOR_PROMPT,
            min_similarity=settings.search_min_similarity,
        )

        qualified = False
        if not hits:
            answer_text = "I couldn't find anything about that in your connected accounts."
            sources = []
        else:
            try:
                answer_text = answer(payload.message, [_llm_source(hit) for hit in hits])
            except LLMQuotaLimited:
                answer_text = "I've reached my daily AI limit — please try again tomorrow."
                sources = []
            except Exception:
                answer_text = "I couldn't generate an answer just now — please try again in a moment."
                sources = []
            else:
                if answer_text and answer_text.strip():
                    sources = _build_cited_sources(db, user.id, answer_text, hits)
                    qualified = True
                else:
                    answer_text = "I couldn't generate an answer just now — please try again in a moment."
                    sources = []

    serializable_sources = [_serializable_source(s) for s in sources]

    # Add assistant message turn
    try:
        msg = conversation_service.add_turn(
            db, conv, "assistant", answer_text, sources=serializable_sources
        )
    except Exception:
        db.rollback()
        # Don't increment usage on failure - user should not be charged
        raise QuotaExceededError("Server is saturated. Please try again later.")

    # Only charge quota when a real answer was generated and stored
    if qualified:
        increment_usage(db, user)

    return ok(
        ChatResponse(
            conversation=conversation_to_schema(conv),
            message=message_to_schema(msg),
        ).model_dump()
    )


def _is_small_talk(message: str) -> bool:
    """True for greetings/small talk that don't warrant a search (no sources,
    no LLM call, no quota charge). e.g. "hi", "hello!", "good morning"."""
    text = (message or "").strip().lower()
    if not text:
        return True
    tokens = [t for t in _PUNCT_RE.sub(" ", text).split() if t]
    if " ".join(tokens) in _PHRASE_GREETINGS:
        return True
    return len(tokens) <= 2 and set(tokens) <= _SINGLE_WORD_GREETINGS


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
    rows = (
        db.query(ConnectedAccount, Provider)
        .join(Provider, ConnectedAccount.provider_id == Provider.id)
        .filter(ConnectedAccount.user_id == user_id, ConnectedAccount.id.in_(account_ids))
        .all()
    )
    label_map = {a.id: a.display_label for a, _ in rows}
    provider_key_map = {a.id: p.key for a, p in rows}

    sources = []
    for idx in indexes:
        hit = hits[idx]
        email = hit["email"]
        url = _source_url(provider_key_map.get(email.account_id), email)
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
                    url=url,
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
                    url=url,
                )
            )
    return sources


def _source_url(provider_key: str | None, email) -> str | None:
    if provider_key == "gmail" and getattr(email, "external_id", None):
        return f"https://mail.google.com/mail/u/0/#all/{email.external_id}"
    return None


def _serializable_source(source: Source) -> dict:
    d = source.model_dump()
    for key, value in list(d.items()):
        if isinstance(value, uuid.UUID):
            d[key] = str(value)
    return d


def _cited_indexes(answer_text: str, hits: list[dict]) -> list[int]:
    seen = set()
    ordered = []
    for m in CITE_RE.findall(answer_text):
        n = int(m)
        if 1 <= n <= len(hits) and n not in seen:
            seen.add(n)
            ordered.append(n - 1)
    return ordered