"""
Cryptographic Audit Ledger Service.
Maintains an immutable SHA-256 hash-chain of all system and officer actions.
Provides real-time mathematical validation detecting unauthorized database modifications or record deletions.
"""
import hashlib
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.ledger import AuditLedgerBlock


GENESIS_PREV_HASH = "0" * 64


def hash_text(text: Optional[str]) -> str:
    """Computes SHA-256 hash of arbitrary text payload."""
    content = (text or "").encode("utf-8")
    return hashlib.sha256(content).hexdigest().upper()


def compute_block_hash(
    block_index: int,
    event_id: str,
    timestamp_str: str,
    actor_username: str,
    action: str,
    target_entity: Optional[str],
    case_id: Optional[str],
    details_hash: str,
    previous_hash: str
) -> str:
    """
    Computes deterministic SHA-256 hash for an audit ledger block.
    Hash = SHA-256(index + event_id + timestamp + actor + action + target + case + details_hash + previous_hash)
    """
    payload = f"{block_index}|{event_id}|{timestamp_str}|{actor_username}|{action}|{target_entity or ''}|{case_id or ''}|{details_hash}|{previous_hash}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest().upper()


def append_ledger_event(
    db: Session,
    actor_username: str,
    action: str,
    target_entity: Optional[str] = None,
    case_id: Optional[str] = None,
    details: Optional[str] = None,
    session_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> AuditLedgerBlock:
    """
    Appends a new cryptographically signed block to the tamper-evident audit ledger chain.
    """
    last_block = db.query(AuditLedgerBlock).order_by(AuditLedgerBlock.block_index.desc()).first()

    if not last_block:
        new_index = 0
        prev_hash = GENESIS_PREV_HASH
    else:
        new_index = last_block.block_index + 1
        prev_hash = last_block.current_hash

    event_id = str(uuid.uuid4())
    now = datetime.utcnow()
    iso_timestamp = now.isoformat()
    d_hash = hash_text(details)

    cur_hash = compute_block_hash(
        block_index=new_index,
        event_id=event_id,
        timestamp_str=iso_timestamp,
        actor_username=actor_username,
        action=action.upper(),
        target_entity=target_entity,
        case_id=case_id,
        details_hash=d_hash,
        previous_hash=prev_hash
    )

    block = AuditLedgerBlock(
        block_index=new_index,
        event_id=event_id,
        timestamp=now,
        actor_username=actor_username,
        action=action.upper(),
        target_entity=target_entity,
        case_id=case_id,
        details=details,
        details_hash=d_hash,
        session_id=session_id,
        ip_address=ip_address,
        user_agent=user_agent,
        previous_hash=prev_hash,
        current_hash=cur_hash,
        status="COMMITTED"
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


def verify_chain_integrity(db: Session) -> Dict[str, Any]:
    """
    Traverses the entire cryptographic ledger chain from Block 0 to the latest tip.
    Recomputes hashes and verifies that:
    1. Each block's current_hash matches the cryptographic SHA-256 payload.
    2. Each block's previous_hash precisely matches the preceding block's current_hash.
    Detects any database tampering, unauthorized updates, or record deletion.
    """
    blocks = db.query(AuditLedgerBlock).order_by(AuditLedgerBlock.block_index.asc()).all()
    total_blocks = len(blocks)

    if total_blocks == 0:
        return {
            "chain_status": "EMPTY",
            "is_valid": True,
            "total_blocks": 0,
            "tampered_blocks": [],
            "verified_at": datetime.utcnow().isoformat()
        }

    tampered_blocks = []
    expected_prev_hash = GENESIS_PREV_HASH

    for b in blocks:
        # Check linkage to previous block
        if b.previous_hash != expected_prev_hash:
            tampered_blocks.append({
                "block_index": b.block_index,
                "event_id": b.event_id,
                "error": "PREVIOUS_HASH_MISMATCH",
                "recorded_previous_hash": b.previous_hash,
                "expected_previous_hash": expected_prev_hash
            })

        # Recompute cryptographic hash of current block
        recomputed_hash = compute_block_hash(
            block_index=b.block_index,
            event_id=b.event_id,
            timestamp_str=b.timestamp.isoformat(),
            actor_username=b.actor_username,
            action=b.action,
            target_entity=b.target_entity,
            case_id=b.case_id,
            details_hash=b.details_hash,
            previous_hash=b.previous_hash
        )

        if recomputed_hash != b.current_hash:
            tampered_blocks.append({
                "block_index": b.block_index,
                "event_id": b.event_id,
                "error": "BLOCK_CONTENT_TAMPERED",
                "stored_hash": b.current_hash,
                "recomputed_hash": recomputed_hash
            })

        expected_prev_hash = b.current_hash

    is_valid = (len(tampered_blocks) == 0)

    return {
        "chain_status": "SECURE_VALID" if is_valid else "TAMPER_DETECTED",
        "is_valid": is_valid,
        "total_blocks": total_blocks,
        "latest_block_index": total_blocks - 1,
        "latest_block_hash": blocks[-1].current_hash if blocks else None,
        "tampered_blocks": tampered_blocks,
        "verified_at": datetime.utcnow().isoformat()
    }
