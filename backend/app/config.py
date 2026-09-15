from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Recall API"
    app_version: str = "0.1.0"
    environment: str = "dev"

    database_url: str = ""

    gemini_api_key: str = ""

    # OpenRouter — free :free model variants / openrouter/free router (chat only;
    # embeddings stay on Gemini). Key from https://openrouter.ai/keys (no card).
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "openrouter/free"
    # auto | gemini | openrouter — first configured provider leads; Gemini
    # (gemini_api_key) is always the final fallback.
    llm_provider: str = "auto"

    # Semantic-search relevance gate — hits with cosine similarity below this
    # are treated as non-matches (no weak "Sources" chips). Lower = permissive.
    search_min_similarity: float = 0.30

    google_client_id: str = ""
    google_client_secret: str = ""
    oauth_redirect_uri: str = "http://localhost:8000/auth/callback"

    jwt_secret: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7
    app_origin: str = "https://macgpt-recall-ai.netlify.app/chat"

    # Session cookie flags. Local same-site dev stays SameSite=Lax / non-secure;
    # a cross-site frontend (Netlify) + HTTPS API (Render) needs SameSite=None;
    # Secure or the browser drops the cookie from API requests. Both are
    # auto-derived from `environment == "production"` and can be forced via env.
    auth_cookie_secure: bool | None = None
    auth_cookie_samesite: str | None = None

    cors_origins: list[str] = ["https://macgpt-recall-ai.netlify.app", "http://localhost:5173"]

    # SMTP — used by POST /support to send contact-form emails
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 465
    smtp_username: str = ""
    smtp_password: str = ""
    support_recipient: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


def auth_cookie_flags() -> tuple[bool, str]:
    """Return the (secure, samesite) pair for the session cookie.

    Cross-site deployments (frontend and API on different registrable domains)
    require SameSite=None + Secure, otherwise the browser won't attach the cookie
    to cross-site fetch() requests and every API call returns 401. Same-site dev
    (localhost frontend -> localhost API) keeps Lax / non-secure.
    """
    secure = (
        settings.auth_cookie_secure
        if settings.auth_cookie_secure is not None
        else settings.environment == "production"
    )
    samesite = settings.auth_cookie_samesite or ("none" if secure else "lax")
    return secure, samesite
