"""
Investigation Event & Temporal Analytics Data Models.
Tracks time-stamped events across calls, FIRs, surveillance, vehicle movements, and transactions.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.postgres_driver import Base


class InvestigationEvent(Base):
    __tablename__ = "investigation_events"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), index=True, default="CASE-2026-DEFAULT")
    timestamp_start = Column(DateTime, index=True, nullable=False)
    timestamp_end = Column(DateTime, nullable=True)
    timestamp_precision = Column(String(20), default="EXACT") # EXACT, APPROXIMATE, DATE_ONLY, RANGE, UNKNOWN
    
    event_type = Column(String(50), index=True, nullable=False) # CALL, MESSAGE, TRANSACTION, LOCATION, VEHICLE_MOVEMENT, MEETING, CRIME, ARREST, SURVEILLANCE, EVIDENCE, OTHER
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    source_id = Column(String(100), index=True, nullable=False) # e.g. FIR-2026-1024, CDR-102
    source_type = Column(String(50), nullable=False) # FIR, CDR, BANK, SURVEILLANCE, MANUAL
    
    location_name = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    confidence_score = Column(Float, default=0.90) # 0.0 to 1.0
    metadata_json = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    participants = relationship("EventParticipant", back_populates="event", cascade="all, delete-orphan")


class EventParticipant(Base):
    __tablename__ = "event_participants"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("investigation_events.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_id = Column(String(255), nullable=False, index=True) # e.g. Rahul Sharma, +919123456789, KA02CD5678
    entity_type = Column(String(50), default="SUSPECT") # SUSPECT, PHONE, VEHICLE, LOCATION, BANK_ACCOUNT
    role = Column(String(50), default="PARTICIPANT") # CALLER, RECEIVER, DRIVER, SUBJECT, INFORMANT, SIGHTED

    event = relationship("InvestigationEvent", back_populates="participants")
