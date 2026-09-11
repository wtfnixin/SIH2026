"""
FastAPI Security Operations Center (SOC) & Cryptographic Audit Router.
Provides unified oversight endpoints for Active Officer Sessions, Failed Logins,
IDOR/Access Denials, Tamper-Evident Ledger Block Explorer, SHA-256 Evidence Integrity Scans,
and Time-Bound Emergency Break-Glass Authorization.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.postgres_driver import get_db
from app.models.audit import User, AuditLog
from app.models.session import UserSession
from app.models.ledger import AuditLedgerBlock
from app.models.evidence import EvidenceVaultRecord
from app.models.break_glass import BreakGlassRequest
from app.auth.dependencies import get_current_user, require_permission
from app.auth.service import log_security_event
from app.services.ledger_service import verify_chain_integrity
from app.services.integrity_service import scan_all_evidence_integrity, verify_evidence_integrity


router = APIRouter(prefix="/security", tags=["Security Operations Center"])


class BreakGlassSubmitRequest(BaseModel):
    case_id: str = Field(..., description="Restricted Case ID to access")
    reason_category: str = Field(..., description="LIFE_SAFETY, TERROR_THREAT, COURT_ORDER, CRITICAL_PURSUIT")
    justification: str = Field(..., min_length=15, description="Detailed emergency operational justification")
    duration_minutes: int = Field(30, ge=5, le=120, description="Duration in minutes (max 120)")


@router.get("/metrics")
def get_security_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns comprehensive real-time security posture metrics:
    - Active Sessions count
    - Failed Login Attempts (24h)
    - Unauthorized Access / IDOR Blocks (24h)
    - Evidence Integrity percentage & status
    - Tamper-Evident Ledger validity & total blocks
    - System Security Status
    """
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)

    # 1. Active sessions
    active_sessions = db.query(UserSession).filter(
        UserSession.revoked_at.is_(None),
        UserSession.expires_at > now
    ).count()

    # 2. Failed logins
    failed_logins = db.query(AuditLog).filter(
        AuditLog.action.in_(["LOGIN_FAILED", "ACCOUNT_LOCKED"]),
        AuditLog.timestamp >= last_24h
    ).count()

    # 3. Access denials (403 / IDOR attempts)
    access_denials = db.query(AuditLog).filter(
        AuditLog.status == "DENIED",
        AuditLog.timestamp >= last_24h
    ).count()

    # 4. Evidence vault metrics
    total_evidence = db.query(EvidenceVaultRecord).count()
    verified_evidence = db.query(EvidenceVaultRecord).filter(
        EvidenceVaultRecord.integrity_status == "VERIFIED"
    ).count()
    compromised_evidence = db.query(EvidenceVaultRecord).filter(
        EvidenceVaultRecord.integrity_status.in_(["FAILED", "MISSING"])
    ).count()
    evidence_pct = round((verified_evidence / total_evidence * 100), 1) if total_evidence > 0 else 100.0

    # 5. Ledger chain validation
    chain_info = verify_chain_integrity(db)

    # 6. Active break-glass grants
    active_break_glass = db.query(BreakGlassRequest).filter(
        BreakGlassRequest.status == "ACTIVE",
        BreakGlassRequest.expires_at > now
    ).count()

    overall_status = "SECURE"
    if not chain_info.get("is_valid") or compromised_evidence > 0:
        overall_status = "CRITICAL_ALERT"
    elif failed_logins > 10 or access_denials > 5:
        overall_status = "ELEVATED_WATCH"

    return {
        "overall_status": overall_status,
        "active_sessions": active_sessions,
        "failed_logins_24h": failed_logins,
        "access_denials_24h": access_denials,
        "active_break_glass_overrides": active_break_glass,
        "evidence_vault": {
            "total_files": total_evidence,
            "verified_files": verified_evidence,
            "compromised_files": compromised_evidence,
            "integrity_percentage": evidence_pct,
            "status": "VERIFIED" if compromised_evidence == 0 else "COMPROMISED"
        },
        "audit_ledger": {
            "is_valid": chain_info.get("is_valid", True),
            "total_blocks": chain_info.get("total_blocks", 0),
            "latest_block_hash": chain_info.get("latest_block_hash"),
            "status": "VALID_AND_UNALTERED" if chain_info.get("is_valid") else "TAMPER_DETECTED"
        },
        "timestamp": now.isoformat()
    }


@router.get("/ledger")
def get_audit_ledger_blocks(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Fetches cryptographically chained audit blocks for the visual block explorer.
    """
    total = db.query(AuditLedgerBlock).count()
    blocks = db.query(AuditLedgerBlock).order_by(
        AuditLedgerBlock.block_index.desc()
    ).offset(offset).limit(limit).all()

    return {
        "total_blocks": total,
        "blocks": [
            {
                "id": b.id,
                "block_index": b.block_index,
                "event_id": b.event_id,
                "timestamp": b.timestamp.isoformat(),
                "actor_username": b.actor_username,
                "action": b.action,
                "target_entity": b.target_entity,
                "case_id": b.case_id,
                "details": b.details,
                "details_hash": b.details_hash,
                "previous_hash": b.previous_hash,
                "current_hash": b.current_hash,
                "status": b.status,
                "session_id": b.session_id,
                "ip_address": b.ip_address
            }
            for b in blocks
        ]
    }


@router.post("/ledger/verify")
def run_ledger_verification(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Runs full cryptographic mathematical verification across all hash-chained audit blocks.
    """
    res = verify_chain_integrity(db)

    # Log the verification action itself into the audit trail
    log_security_event(
        db=db,
        officer_username=current_user.username,
        user_id=current_user.id,
        action="LEDGER_VERIFICATION",
        details=f"Officer triggered ledger verification (Status: {res['chain_status']}, Blocks: {res['total_blocks']})",
        status_str="SUCCESS" if res["is_valid"] else "ALERT"
    )
    db.commit()

    return res


@router.get("/evidence-vault")
def list_evidence_vault(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Lists evidence files in the cryptographic vault with SHA-256 hashes and integrity status.
    """
    total = db.query(EvidenceVaultRecord).count()
    records = db.query(EvidenceVaultRecord).order_by(
        EvidenceVaultRecord.ingested_at.desc()
    ).limit(limit).all()

    return {
        "total_evidence_records": total,
        "evidence": [
            {
                "id": r.id,
                "evidence_id": r.evidence_id,
                "case_id": r.case_id,
                "evidence_type": r.evidence_type,
                "file_name": r.file_name,
                "sha256_hash": r.sha256_hash,
                "file_size_bytes": r.file_size_bytes,
                "classification": r.classification,
                "ingested_by": r.ingested_by,
                "ingested_at": r.ingested_at.isoformat(),
                "last_verified_at": r.last_verified_at.isoformat(),
                "integrity_status": r.integrity_status
            }
            for r in records
        ]
    }


@router.post("/evidence-vault/scan")
def scan_evidence_vault(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Performs live SHA-256 recalculation across all stored evidence files.
    """
    res = scan_all_evidence_integrity(db)

    log_security_event(
        db=db,
        officer_username=current_user.username,
        user_id=current_user.id,
        action="EVIDENCE_INTEGRITY_SCAN",
        details=f"Live scan: {res['verified']}/{res['total_files']} files verified (Score: {res['overall_integrity_percentage']}%)",
        status_str="SUCCESS" if res["overall_status"] == "SECURE" else "ALERT"
    )
    db.commit()

    return res


@router.post("/break-glass/request")
def request_break_glass_access(
    req: BreakGlassSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Submits emergency Break-Glass authorization request for restricted cases.
    Grants temporary scoped access with elevated audit logging and supervisor notification.
    """
    now = datetime.utcnow()
    expires = now + timedelta(minutes=req.duration_minutes)
    req_id = f"BG-{uuid.uuid4().hex[:10].upper()}"

    bg_record = BreakGlassRequest(
        request_id=req_id,
        officer_username=current_user.username,
        user_id=current_user.id,
        case_id=req.case_id.strip().upper(),
        reason_category=req.reason_category.upper(),
        justification=req.justification.strip(),
        duration_minutes=req.duration_minutes,
        granted_at=now,
        expires_at=expires,
        status="ACTIVE"
    )
    db.add(bg_record)

    # Immediately write critical block to audit ledger
    log_security_event(
        db=db,
        officer_username=current_user.username,
        user_id=current_user.id,
        action="BREAK_GLASS_ACCESS_GRANTED",
        target_entity=req.case_id.strip().upper(),
        case_id=req.case_id.strip().upper(),
        details=f"Emergency Access [{req.reason_category}]: {req.justification} (Duration: {req.duration_minutes}m, RequestID: {req_id})",
        status_str="ELEVATED_AUDIT"
    )
    db.commit()
    db.refresh(bg_record)

    return {
        "status": "APPROVED",
        "request_id": bg_record.request_id,
        "case_id": bg_record.case_id,
        "granted_to": bg_record.officer_username,
        "duration_minutes": bg_record.duration_minutes,
        "granted_at": bg_record.granted_at.isoformat(),
        "expires_at": bg_record.expires_at.isoformat(),
        "message": f"Break-Glass emergency access active for Case {bg_record.case_id} until {bg_record.expires_at.strftime('%H:%M:%S UTC')}."
    }


@router.get("/active-sessions")
def list_active_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Lists all active officer sessions across devices with IP and activity timestamps.
    """
    now = datetime.utcnow()
    sessions = (
        db.query(UserSession, User)
        .join(User, UserSession.user_id == User.id)
        .filter(UserSession.revoked_at.is_(None), UserSession.expires_at > now)
        .order_by(UserSession.last_used_at.desc())
        .all()
    )

    return [
        {
            "session_id": s.UserSession.id,
            "user_id": s.User.id,
            "username": s.User.username,
            "full_name": s.User.full_name,
            "role": s.User.role,
            "clearance_level": s.User.clearance_level,
            "department": s.User.department,
            "ip_address": s.UserSession.ip_address,
            "user_agent": s.UserSession.user_agent,
            "created_at": s.UserSession.created_at.isoformat(),
            "last_used_at": s.UserSession.last_used_at.isoformat(),
            "expires_at": s.UserSession.expires_at.isoformat()
        }
        for s in sessions
    ]
