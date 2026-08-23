from collections.abc import Generator
from sqlalchemy.orm import Session
from app.db.connector import SessionLocal

def get_db() -> Generator[Session]:
    db = SessionLocal() # creates a session
    try:
        yield db # sends the session to the router
    finally:
        db.close() # closes the session after the request is done

# Every route that intere\acts with the db needs a session 
# So this file is in charge of creating a session for each request and closing it after the request is done.

