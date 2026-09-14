import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.middleware.auth_backend import get_current_user
from app.core.exceptions import NotFoundError
from app.db.db_instance import get_db
from app.db.models import Conversation, Message, User
from app.schemas.common import ok
from app.services.serializers import conversation_to_schema, message_to_schema

router = APIRouter(tags=["Conversations"])


class ConversationCreate(BaseModel):
    title: str | None = None


@router.get("")
def list_conversations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Conversation)
        .filter(Conversation.user_id == user.id)
        .order_by(Conversation.last_modified_at.desc())
        .all()
    )
    return ok([conversation_to_schema(c) for c in rows])


@router.post("")
def create_conversation(
    payload: ConversationCreate | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.conversation_service import get_or_create

    conv = get_or_create(db, user.id, None, title=(payload.title if payload else None))
    return ok(conversation_to_schema(conv), "Conversation created")


@router.get("/{conversation_id}")
def get_conversation_messages(
    conversation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = _owned_conversation(db, conversation_id, user.id)
    rows = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return ok([message_to_schema(m) for m in rows])


@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = _owned_conversation(db, conversation_id, user.id)
    db.delete(conv)
    db.commit()
    return ok(None, "Conversation deleted")


def _owned_conversation(db: Session, conversation_id: uuid.UUID, user_id: uuid.UUID) -> Conversation:
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
        .first()
    )
    if conv is None:
        raise NotFoundError("Conversation not found")
    return conv