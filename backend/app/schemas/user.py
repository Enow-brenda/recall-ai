import uuid
from datetime import datetime

from pydantic import BaseModel, Field

# all this are response DTos 
# the user must enter a delete to delete accounts
class DeleteAccountRequest(BaseModel):
    confirm: str   

class PlanInfo(BaseModel):
    id: uuid.UUID
    name: str                                # must equal "DELETE"

# this is returned when we get a user
class UserProfile(BaseModel):                       # response shape for GET/PATCH
    id: uuid.UUID
    name: str | None
    primary_email: str
    profile_picture_url: str | None
    plan: PlanInfo
    plan_usage: int
    last_plan_reset: datetime
    created_at: datetime

# this returns the user's stats info
class UsageStats(BaseModel):
    emails_indexed: int
    attachments: int
    links: int
    conversations: int
    messages_sent: int
    quota_used: int
    quota_limit: int



