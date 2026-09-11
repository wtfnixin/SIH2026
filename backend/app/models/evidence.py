"""
SQLAlchemy Evidence Models for PostgreSQL
Stores structured, cleaned criminal evidence records including calls, transactions,
vehicle sightings, surveillance feeds, and police FIRs.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON
from datetime import datetime
from app.db.postgres_driver import Base


class CallRecord(Base):
    __tablename__ = "calls"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    caller_number = Column(String(20), index=True, nullable=False)
    receiver_number = Column(String(20), index=True, nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    duration_seconds = Column(Integer, default=0)
    source_file = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class TransactionRecord(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transaction_id = Column(String(50), unique=True, index=True, nullable=False)
    sender = Column(String(100), index=True, nullable=False)
    receiver = Column(String(100), index=True, nullable=False)
    amount = Column(Float, nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    mode = Column(String(30), default="UPI")
    is_structured = Column(Boolean, default=False, index=True)
    source_file = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class VehicleSightingRecord(Base):
    __tablename__ = "vehicle_sightings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    registration_number = Column(String(20), index=True, nullable=False)
    registered_owner = Column(String(100), index=True, nullable=True)
    location = Column(String(150), index=True, nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    camera_id = Column(String(50), nullable=True)
    source_file = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SurveillanceRecord(Base):
    __tablename__ = "surveillance_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(String(50), index=True, nullable=False)
    entity_type = Column(String(30), index=True, nullable=False)
    entity_value = Column(String(100), index=True, nullable=False)
    location = Column(String(150), index=True, nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    observed_by = Column(String(100), default="Field Unit")
    source_file = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FirRecord(Base):
    __tablename__ = "fir_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    fir_no = Column(String(50), unique=True, index=True, nullable=False)
    police_station = Column(String(150), index=True, nullable=False)
    incident_date = Column(DateTime, index=True, nullable=True)
    crime_category = Column(String(100), index=True, default="GENERAL CRIME")
    status = Column(String(50), default="ACTIVE INVESTIGATION")
    sections = Column(JSON, default=list)
    suspects = Column(JSON, default=list)
    vehicles = Column(JSON, default=list)
    locations = Column(JSON, default=list)
    narrative = Column(Text, nullable=True)
    source_file = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
