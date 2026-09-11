"""
SQLAlchemy Session Model.
Tracks server-side active sessions and hashed refresh tokens for revocation and audit.
"""
from datetime import datetime
import uuid
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.postgres_driver import Base


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    refresh_token_hash = Column(String(64), unique=True, index=True, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    last_used_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

    user = relationship("User", backref="sessions")

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None and self.expires_at > datetime.utcnow()
