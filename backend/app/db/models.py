import uuid
from datetime import datetime
from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from decimal import Decimal
from app.db.connector import Base

# this file will contain all our entities

# the different plans a user can subscribe to
class Plan(Base): # inherits from the Base class, which is the parent class for all our models
    __tablename__ = "plans"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    max_daily_queries: Mapped[int] = mapped_column(Integer) # -1 = unlimited                          # -1 = unlimited
    memory_limit_gb: Mapped[float] = mapped_column(Numeric(6, 2))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

# the user table
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    primary_email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    profile_picture_url: Mapped[str] = mapped_column(String(255), nullable=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("plans.id", ondelete="RESTRICT"), nullable=True
    )
    plan_usage: Mapped[int] = mapped_column(Integer, default=0)
    last_plan_reset: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    plan: Mapped["Plan"] = relationship() 

# the different providers we can connect to
class Provider(Base):
    __tablename__ = "providers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    display_name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False) # `gmail`, `whatsapp`, `slack`, `sms`
    auth_type: Mapped[str] =   mapped_column(
        Enum("oauth", "phone_verification", name="auth_type", create_type=True)) # `oauth` vs `phone_flow`
    is_active: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    activated_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), nullable= True
    )

# connected account of a user
class ConnectedAccount(Base):
    __tablename__ = "connected_accounts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[uuid.UUID] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE")
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
                ForeignKey("providers.id", ondelete="RESTRICT")
    )
    account_identifier: Mapped[str] = mapped_column(String(50), nullable=False) # could be email or phone
    display_label: Mapped[str] =   mapped_column(String(50), nullable=False)
    credentials: Mapped[dict] = mapped_column(JSONB, default=dict) 
    is_active: Mapped[bool] = mapped_column(default=False)
    connected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    __table_args__ = (
        UniqueConstraint("user_id", "provider_id", "account_identifier"), # reading the index in descending order
    )
    

# emails/messages gotten from a connected account
class Email(Base):
    __tablename__ = "emails"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("connected_accounts.id", ondelete="CASCADE"), index=True)

    external_id: Mapped[str] = mapped_column(String(255), nullable=False)
    thread_id: Mapped[str | None] = mapped_column(String(255), nullable=False)

    sender: Mapped[str | None] = mapped_column(String(255), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(255))
    raw_body: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str | None] = mapped_column(String(255))

    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536))

    has_attachment: Mapped[bool] = mapped_column(default=False)
    has_link: Mapped[bool] = mapped_column(default=False)

    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("account_id", "external_id"),
        Index("ix_emails_user_sent", "user_id", text("sent_at DESC")), # reading the index in descending order
    ) 

# possible file attachments gotten from a connected account
class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    email_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("emails.id", ondelete="CASCADE"), index=True)

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str | None]
    size_bytes: Mapped[int | None]
    gmail_attachment_id: Mapped[str | None]

    extracted_text: Mapped[str | None]        
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536))   # same
    version_guess: Mapped[str | None]          

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

# possible link attachments gotten from a connected account
class Link(Base):
    __tablename__ = "links"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    email_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("emails.id", ondelete="CASCADE"), index=True)

    url: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(255))
    context_snippet: Mapped[str | None] = mapped_column(String(255))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

# a conversation started by a user, which can have multiple messages
class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    title: Mapped[str] = mapped_column(default="New chat")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_modified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),      # ← auto-refreshed on every UPDATE through the ORM
    )

# a message either sent by the user or generated by the assistant, which can have multiple sources
class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )

    direction: Mapped[str] = mapped_column(
        Enum("user", "assistant", name="message_direction", create_type=True)
    )
    content: Mapped[str]
    status: Mapped[str] = mapped_column(
        Enum("pending", "sent", "error", name="message_status", create_type=True),
        default="sent",
    )

    sources: Mapped[dict | None] = mapped_column(JSONB)          # assistant turns only
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536))   # reserved, stays null in v1

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_messages_conversation_created", "conversation_id", "created_at"),
    )