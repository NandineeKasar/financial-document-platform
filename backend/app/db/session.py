"""
session.py — Database engine and session factory.

SQLAlchemy needs two things:
  - Engine: manages the actual database connection pool
  - SessionLocal: a factory that creates Session objects for each request
"""
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)

# create_engine() sets up the connection pool.
# pool_pre_ping=True tests the connection before using it (handles
# dropped connections from database restarts).
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    # For PostgreSQL, these are sensible defaults:
    pool_size=10,       # Maximum number of persistent connections
    max_overflow=20,    # Extra connections allowed above pool_size
    echo=settings.DEBUG,  # Log all SQL statements when DEBUG=True
)

# sessionmaker() creates a Session class configured with our engine.
# autocommit=False means we must explicitly call db.commit()
# autoflush=False means changes are not sent to DB until flush/commit
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
