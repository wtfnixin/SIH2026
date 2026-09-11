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
    Initializes all database tables in PostgreSQL and provisions the default administrator account.
    """
    import os
    import app.models  # noqa: F401
    from app.models.audit import User
    from app.auth.password import hash_password

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if default admin exists
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            initial_pw = os.getenv("INITIAL_ADMIN_PASSWORD", "Admin@Secure2026!")
            admin = User(
                username="admin",
                email="admin@sih2026.gov.in",
                full_name="Chief System Administrator",
                password_hash=hash_password(initial_pw),
                role="ADMIN",
                is_active=True,
                is_locked=False,
                failed_login_attempts=0
            )
            db.add(admin)
            db.commit()
            print("Successfully provisioned initial Administrator (username: admin)")
    except Exception as e:
        db.rollback()
        print("init_db admin seeder note:", e)
    finally:
        db.close()
