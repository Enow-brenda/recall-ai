import uuid

from fastapi import Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import InvalidRequestError, NotFoundError
from app.core.middleware.usage_guard import maybe_reset_usage
from app.db.db_instance import get_db
from app.db.models import Attachment, ConnectedAccount, Conversation, Email, Link, Message, User
from app.schemas.user import (
    PlanInfo,
    UsageStats,
    UserProfile,
)

def get_profile(db: Session, user_id: uuid.UUID) -> UserProfile:
    user = (
        db.query(User)
        .options(joinedload(User.plan))
        .filter(User.id == user_id)
        .first()
    )
    if user is None:
        raise NotFoundError("User not found")
    
    return UserProfile(
        id=user.id,
        name=user.name,
        primary_email=user.primary_email,
        profile_picture_url=user.profile_picture_url,
        plan=PlanInfo(
            id=user.plan.id,
            name=user.plan.name,
            max_daily_queries=user.plan.max_daily_queries,
            memory_limit_gb=user.plan.memory_limit_gb,
        ),
        plan_usage=user.plan_usage,
        last_plan_reset=user.last_plan_reset,
        created_at=user.created_at,
    )

def get_stats(db: Session, user_id: uuid.UUID) -> UsageStats:
    def count(model, *filters):
        return db.query(func.count()).select_from(model).filter(*filters).scalar()

    emails_indexed = count(Email, Email.user_id == user_id)

    attachments = (
        db.query(func.count())
        .select_from(Attachment)
        .join(Email, Attachment.email_id == Email.id)
        .filter(Email.user_id == user_id)
        .scalar()
    )
    links = (
        db.query(func.count())
        .select_from(Link)
        .join(Email, Link.email_id == Email.id)
        .filter(Email.user_id == user_id)
        .scalar()
    )

    conversations = count(Conversation, Conversation.user_id == user_id)
    messages_sent = (
        db.query(func.count())
        .select_from(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .filter(Conversation.user_id == user_id, Message.direction == "user")
        .scalar()
    )

    user = db.get(User, user_id)
    if maybe_reset_usage(user):
        db.commit()
    limit = user.plan.max_daily_queries if user.plan else -1

    emails_bytes = (
        db.query(
            func.coalesce(func.sum(func.octet_length(Email.raw_body)), 0)
            + func.coalesce(func.sum(func.length(func.coalesce(Email.subject, ""))), 0)
            + func.coalesce(func.sum(func.length(func.coalesce(Email.sender, ""))), 0)
        )
        .filter(Email.user_id == user_id)
        .scalar()
    )
    attachment_bytes = (
        db.query(
            func.coalesce(func.sum(func.coalesce(Attachment.size_bytes, 0)), 0)
            + func.coalesce(
                func.sum(func.length(func.coalesce(Attachment.extracted_text, ""))), 0
            )
        )
        .select_from(Attachment)
        .join(Email, Attachment.email_id == Email.id)
        .filter(Email.user_id == user_id)
        .scalar()
    )
    link_bytes = (
        db.query(
            func.coalesce(func.sum(func.length(Link.url)), 0)
            + func.coalesce(
                func.sum(func.length(func.coalesce(Link.context_snippet, ""))), 0
            )
        )
        .select_from(Link)
        .join(Email, Link.email_id == Email.id)
        .filter(Email.user_id == user_id)
        .scalar()
    )

    return UsageStats(
        emails_indexed=emails_indexed,
        attachments=attachments,
        links=links,
        conversations=conversations,
        messages_sent=messages_sent,
        quota_used=user.plan_usage,
        quota_limit=limit,
        storage_used=int((emails_bytes or 0) + (attachment_bytes or 0) + (link_bytes or 0)),
    )

def delete_account(db: Session, user_id: uuid.UUID, confirm: str):
    if confirm != "DELETE":
        raise InvalidRequestError("Confirmation string does not match 'DELETE'")

    user = db.get(User, user_id)
    if not user:
        raise NotFoundError("User not found")
    accounts = db.query(ConnectedAccount).filter(ConnectedAccount.user_id == user_id).all()
    for account in accounts:
        db.delete(account)
    db.delete(user)
    db.commit()
