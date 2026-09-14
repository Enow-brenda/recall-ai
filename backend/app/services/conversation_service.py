import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.db.models import Conversation, Message


def get_owned(db: Session, conversation_id: uuid.UUID, user_id: uuid.UUID) -> Conversation:
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
        .first()
    )
    if conv is None:
        raise NotFoundError("Conversation not found")
    return conv


def get_or_create(
    db: Session,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID | None,
    *,
    title: str | None = None,
) -> Conversation:
    if conversation_id is not None:
        return get_owned(db, conversation_id, user_id)

    now = datetime.now(timezone.utc)
    conv = Conversation(
        user_id=user_id,
        title=title or "New chat",
        started_at=now,
        last_modified_at=now,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def add_turn(
    db: Session,
    conv: Conversation,
    direction: str,
    content: str,
    *,
    sources: list[dict] | None = None,
) -> Message:
    if direction == "user" and conv.title == "New chat" and content.strip():
        conv.title = content.strip()[:60]
    conv.last_modified_at = datetime.now(timezone.utc)

    msg = Message(
        conversation_id=conv.id,
        direction=direction,
        content=content,
        status="sent",
        sources=sources if direction == "assistant" else None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_history(db: Session, conv: Conversation, limit: int = 10) -> list[Message]:
    rows = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(rows))