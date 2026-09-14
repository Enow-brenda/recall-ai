import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


# a source cited in an assistant answer; mirrors frontend Source type
class Source(BaseModel):
    type: Literal["email", "attachment", "link"]
    ref_id: uuid.UUID
    account_label: str | None = None
    subject: str | None = None
    sender: str | None = None
    snippet: str
    url: str | None = None


# conversation row the frontend sees
class Conversation(BaseModel):
    id: uuid.UUID
    title: str
    started_at: datetime
    last_modified_at: datetime


# a single message in a conversation
class ChatMessage(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    direction: Literal["user", "assistant"]
    content: str
    status: Literal["pending", "sent", "error"]
    sources: list[Source] | None = None
    created_at: datetime