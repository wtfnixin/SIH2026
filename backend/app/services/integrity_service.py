"""
Cryptographic Evidence Integrity Service.
Computes SHA-256 cryptographic signatures on evidence files upon ingestion,
registers evidence records in PostgreSQL, and conducts automated / on-demand
integrity checks against stored immutable hashes.
"""
import hashlib
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.evidence import EvidenceVaultRecord


def compute_sha256(file_path: Path | str) -> str:
    """
    Computes SHA-256 checksum of a file on disk in streaming chunks.
    """
    sha256 = hashlib.sha256()
    path = Path(file_path)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"File not found: {file_path}")

    with open(path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest().upper()


def generate_evidence_id(db: Session) -> str:
    """Generates unique sequential evidence ID (e.g. EVD-2026-001042)."""
    count = db.query(EvidenceVaultRecord).count() + 1
    return f"EVD-2026-{count:06d}"


def register_evidence_file(
    db: Session,
    file_path: Path | str,
    case_id: str,
    evidence_type: str = "CDR",
    ingested_by: str = "SYSTEM",
    classification: str = "CONFIDENTIAL"
) -> EvidenceVaultRecord:
    """
    Computes cryptographic hash and registers evidence in the Evidence Vault table.
    """
    path = Path(file_path)
    sha256_hash = compute_sha256(path)
    file_size = path.stat().st_size
    now = datetime.utcnow()

    # Check if record already exists for this exact file path
    existing = db.query(EvidenceVaultRecord).filter(
        EvidenceVaultRecord.file_path == str(path)
    ).first()

    if existing:
        existing.sha256_hash = sha256_hash
        existing.file_size_bytes = file_size
        existing.last_verified_at = now
        existing.integrity_status = "VERIFIED"
        db.commit()
        db.refresh(existing)
        return existing

    evidence_id = generate_evidence_id(db)
    record = EvidenceVaultRecord(
        evidence_id=evidence_id,
        case_id=case_id,
        evidence_type=evidence_type.upper(),
        file_name=path.name,
        file_path=str(path),
        sha256_hash=sha256_hash,
        file_size_bytes=file_size,
        classification=classification.upper(),
        ingested_by=ingested_by,
        ingested_at=now,
        last_verified_at=now,
        integrity_status="VERIFIED"
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def verify_evidence_integrity(db: Session, evidence_id: str) -> Dict[str, Any]:
    """
    Recalculates file hash on disk and compares with stored immutable signature.
    """
    record = db.query(EvidenceVaultRecord).filter(
        EvidenceVaultRecord.evidence_id == evidence_id
    ).first()

    if not record:
        return {"status": "NOT_FOUND", "evidence_id": evidence_id}

    path = Path(record.file_path)
    now = datetime.utcnow()
    record.last_verified_at = now

    if not path.exists():
        record.integrity_status = "MISSING"
        db.commit()
        return {
            "evidence_id": evidence_id,
            "file_name": record.file_name,
            "status": "FILE_MISSING",
            "stored_hash": record.sha256_hash,
            "calculated_hash": None,
            "integrity": "FAILED"
        }

    current_hash = compute_sha256(path)
    is_valid = (current_hash == record.sha256_hash)
    record.integrity_status = "VERIFIED" if is_valid else "FAILED"
    db.commit()

    return {
        "evidence_id": evidence_id,
        "file_name": record.file_name,
        "status": "VERIFIED" if is_valid else "INTEGRITY_COMPROMISED",
        "stored_hash": record.sha256_hash,
        "calculated_hash": current_hash,
        "integrity": "PASSED" if is_valid else "FAILED",
        "verified_at": now.isoformat()
    }


def scan_all_evidence_integrity(db: Session) -> Dict[str, Any]:
    """
    Performs batch SHA-256 verification across all stored evidence files in vault.
    """
    records = db.query(EvidenceVaultRecord).all()
    results = []
    total = len(records)
    verified_count = 0
    compromised_count = 0
    missing_count = 0

    now = datetime.utcnow()
    for rec in records:
        path = Path(rec.file_path)
        rec.last_verified_at = now
        if not path.exists():
            rec.integrity_status = "MISSING"
            missing_count += 1
            results.append({
                "evidence_id": rec.evidence_id,
                "file_name": rec.file_name,
                "case_id": rec.case_id,
                "status": "MISSING",
                "sha256": rec.sha256_hash
            })
        else:
            current_hash = compute_sha256(path)
            if current_hash == rec.sha256_hash:
                rec.integrity_status = "VERIFIED"
                verified_count += 1
                results.append({
                    "evidence_id": rec.evidence_id,
                    "file_name": rec.file_name,
                    "case_id": rec.case_id,
                    "status": "VERIFIED",
                    "sha256": rec.sha256_hash
                })
            else:
                rec.integrity_status = "FAILED"
                compromised_count += 1
                results.append({
                    "evidence_id": rec.evidence_id,
                    "file_name": rec.file_name,
                    "case_id": rec.case_id,
                    "status": "COMPROMISED",
                    "sha256": rec.sha256_hash,
                    "recomputed_sha256": current_hash
                })

    db.commit()

    integrity_pct = round((verified_count / total * 100), 1) if total > 0 else 100.0

    return {
        "total_files": total,
        "verified": verified_count,
        "compromised": compromised_count,
        "missing": missing_count,
        "overall_integrity_percentage": integrity_pct,
        "overall_status": "SECURE" if (compromised_count == 0 and missing_count == 0) else "ALERT",
        "scanned_at": now.isoformat(),
        "files": results
    }
