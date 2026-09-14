from app.db.models import Conversation, Message
from app.schemas.conversation import ChatMessage, Conversation as ConversationSchema, Source


def conversation_to_schema(conv: Conversation) -> ConversationSchema:
    return ConversationSchema(
        id=conv.id,
        title=conv.title,
        started_at=conv.started_at,
        last_modified_at=conv.last_modified_at,
    )


def message_to_schema(msg: Message) -> ChatMessage:
    sources = None
    if msg.sources:
        parsed = []
        for src in msg.sources:
            try:
                parsed.append(Source.model_validate(src))
            except Exception:
                continue
        sources = parsed or None
    return ChatMessage(
        id=msg.id,
        conversation_id=msg.conversation_id,
        direction=msg.direction,
        content=msg.content,
        status=msg.status,
        sources=sources,
        created_at=msg.created_at,
    )