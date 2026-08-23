from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


# the parent class all our model classes will inherit from
class Base(DeclarativeBase):
    pass


#  This entire file is in charge of handling the connection to the database and creating a session for each request.
#  The session is used to interact with the database and is closed after each request to prevent memory leaks.
#  The Base class is used to define our models, which will inherit from it.