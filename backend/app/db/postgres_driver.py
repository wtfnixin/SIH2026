"""
PostgreSQL Database Driver Module
Provides SQLAlchemy engine, Base class, and session factory for PostgreSQL.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

engine = create_engine(settings.SQLALCHEMY_DATABASE_URI, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """
    Dependency generator for FastAPI database sessions.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initializes all database tables in PostgreSQL.
    """
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
