import uuid

from pydantic import BaseModel

from app.schemas.conversation import ChatMessage, Conversation


class ChatRequest(BaseModel):
    conversation_id: uuid.UUID | None = None
    message: str
    account_ids: list[uuid.UUID] | None = None


class ChatResponse(BaseModel):
    conversation: Conversation
    message: ChatMessage