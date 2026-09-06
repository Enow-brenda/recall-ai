import uuid
from datetime import datetime

from pydantic import BaseModel


# request to start a connect flow for a specific provider
class ConnectProviderRequest(BaseModel):
    provider: str                       # the provider key, e.g. "gmail"


# public view of a provider (no internals)
class ProviderInfo(BaseModel):
    key: str
    display_name: str
    auth_type: str
    is_active: bool


# what the frontend sees for a connected account — never includes credentials
class AccountSummary(BaseModel):
    id: uuid.UUID
    provider_key: str
    provider_display_name: str
    account_identifier: str
    display_label: str
    is_active: bool
    connected_at: datetime