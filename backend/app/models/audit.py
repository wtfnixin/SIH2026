"""
SQLAlchemy Audit & User Models
Stores police officer accounts and tamper-proof search audit trails.
"""
from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from app.db.postgres_driver import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    role = Column(String(20), default="INVESTIGATOR")
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    officer_username = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    target_entity = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
