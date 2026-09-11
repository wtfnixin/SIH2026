"""
SQLAlchemy Break-Glass Emergency Access Model.
Tracks time-bound, justified emergency overrides for restricted case investigations.
"""
from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from app.db.postgres_driver import Base


class BreakGlassRequest(Base):
    __tablename__ = "break_glass_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    request_id = Column(String(64), unique=True, index=True, nullable=False)
    officer_username = Column(String(50), index=True, nullable=False)
    user_id = Column(Integer, nullable=True)
    case_id = Column(String(50), index=True, nullable=False)
    
    reason_category = Column(String(100), nullable=False)  # LIFE_SAFETY, TERROR_THREAT, COURT_ORDER, CRITICAL_PURSUIT
    justification = Column(Text, nullable=False)
    duration_minutes = Column(Integer, default=30, nullable=False)
    
    granted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, EXPIRED, REVOKED
