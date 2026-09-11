"""
SQLAlchemy Tamper-Evident Cryptographic Audit Ledger Model.
Implements an immutable, cryptographically hash-chained audit block architecture
for sensitive police investigative events (Blockchain / Hyperledger-ready).
"""
from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from app.db.postgres_driver import Base


class AuditLedgerBlock(Base):
    __tablename__ = "audit_ledger_blocks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    block_index = Column(Integer, unique=True, index=True, nullable=False)
    event_id = Column(String(64), unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    
    actor_username = Column(String(50), index=True, nullable=False)
    action = Column(String(100), index=True, nullable=False)
    target_entity = Column(String(100), nullable=True)
    case_id = Column(String(50), index=True, nullable=True)
    
    details = Column(Text, nullable=True)
    details_hash = Column(String(64), nullable=False)
    
    session_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    
    previous_hash = Column(String(64), nullable=False)
    current_hash = Column(String(64), unique=True, index=True, nullable=False)
    status = Column(String(20), default="COMMITTED", nullable=False)
