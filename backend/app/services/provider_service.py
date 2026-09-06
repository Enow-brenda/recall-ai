from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ProviderDisabledError
from app.db.models import Provider


# ensure a provider is known and enabled before letting a user act on it
def get_active_provider(db: Session, key: str) -> Provider:
    provider = db.query(Provider).filter_by(key=key).first()
    if provider is None:
        raise NotFoundError(f"Provider '{key}' not found")
    if not provider.is_active:
        raise ProviderDisabledError(f"{provider.display_name} is not available yet")
    return provider