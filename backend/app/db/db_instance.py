import logging
from collections.abc import Generator
from sqlalchemy.orm import Session
from app.db.connector import SessionLocal

logger = logging.getLogger(__name__)


def get_db() -> Generator[Session]:
    db = SessionLocal()  # creates a session
    try:
        yield db  # sends the session to the router
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        try:
            db.close()  # closes the session after the request is done
        except Exception:
            # A failed close (e.g. psycopg "received 2 results" glitches through
            # Neon's pooled endpoint) must not turn a completed request into a 500.
            logger.exception("Error closing DB session")

# Every route that intere\acts with the db needs a session 
# So this file is in charge of creating a session for each request and closing it after the request is done.

