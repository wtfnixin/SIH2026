"""
Admin User Management & Audit Inspection Router.
Enforces admin-only provisioning of investigator accounts and session oversight.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.postgres_driver import get_db
from app.models.audit import User, AuditLog
from app.models.session import UserSession
from app.auth.schemas import (
    AdminCreateUserRequest,
    AdminUpdateUserRequest,
    UserProfileResponse,
    MessageResponse
)
from app.auth.password import hash_password, validate_password_policy
from app.auth.service import log_security_event, get_user_permissions
from app.auth.dependencies import require_permission, get_current_user

router = APIRouter(prefix="/admin", tags=["Admin Management"])


@router.post("/users", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: AdminCreateUserRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_permission("system:admin"))
):
    """
    Admin-only user provisioning. Public registration is strictly prohibited.
    """
    # 1. Check if username or email already exists
    existing_user = db.query(User).filter(
        (User.username == data.username.strip()) | (User.email == data.email.strip().lower())
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is already registered."
        )

    # 2. Validate password policy
    valid, err_msg = validate_password_policy(data.password)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )

    # 3. Create user
    now = datetime.utcnow()
    new_user = User(
        username=data.username.strip(),
        email=data.email.strip().lower(),
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        role=data.role.upper(),
        is_active=True,
        is_locked=False,
        failed_login_attempts=0,
        created_at=now,
        updated_at=now,
        password_changed_at=now
    )
    db.add(new_user)
    db.flush()

    log_security_event(
        db=db,
        officer_username=admin_user.username,
        user_id=admin_user.id,
        action="USER_CREATED",
        target_entity=new_user.username,
        details=f"Admin created officer account (Role: {new_user.role})",
        status_str="SUCCESS"
    )
    db.commit()
    db.refresh(new_user)

    return UserProfileResponse(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        permissions=get_user_permissions(new_user),
        is_active=new_user.is_active,
        is_locked=new_user.is_locked,
        last_login_at=new_user.last_login_at,
        created_at=new_user.created_at
    )


@router.get("/users", response_model=List[UserProfileResponse])
def list_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_permission("system:admin"))
):
    """
    Lists all provisioned system users.
    """
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        UserProfileResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            permissions=get_user_permissions(u),
            is_active=u.is_active,
            is_locked=u.is_locked,
            last_login_at=u.last_login_at,
            created_at=u.created_at
        )
        for u in users
    ]


@router.patch("/users/{user_id}", response_model=UserProfileResponse)
def update_user(
    user_id: int,
    data: AdminUpdateUserRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_permission("system:admin"))
):
    """
    Updates an officer's account status, role, or lockout state.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.email:
        user.email = data.email.strip().lower()
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role:
        user.role = data.role.upper()
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.is_locked is not None:
        user.is_locked = data.is_locked
        if not data.is_locked:
            user.locked_until = None
            user.failed_login_attempts = 0

    user.updated_at = datetime.utcnow()

    log_security_event(
        db=db,
        officer_username=admin_user.username,
        user_id=admin_user.id,
        action="USER_UPDATED",
        target_entity=user.username,
        details=f"Admin updated account {user.username}",
        status_str="SUCCESS"
    )
    db.commit()
    db.refresh(user)

    return UserProfileResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        permissions=get_user_permissions(user),
        is_active=user.is_active,
        is_locked=user.is_locked,
        last_login_at=user.last_login_at,
        created_at=user.created_at
    )


@router.post("/users/{user_id}/revoke-sessions", response_model=MessageResponse)
def revoke_user_sessions(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_permission("system:admin"))
):
    """
    Immediately revokes all active sessions for an officer account.
    """
    now = datetime.utcnow()
    sessions = db.query(UserSession).filter(
        UserSession.user_id == user_id,
        UserSession.revoked_at.is_(None)
    ).all()

    for s in sessions:
        s.revoked_at = now

    log_security_event(
        db=db,
        officer_username=admin_user.username,
        user_id=admin_user.id,
        action="SESSIONS_REVOKED",
        target_entity=str(user_id),
        details=f"Revoked {len(sessions)} active sessions for user ID {user_id}",
        status_str="SUCCESS"
    )
    db.commit()
    return MessageResponse(message=f"Revoked {len(sessions)} sessions for user {user_id}")


@router.get("/audit-logs")
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_permission("audit:read"))
):
    """
    Reads live security and access audit logs directly from PostgreSQL.
    """
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()

    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "officer_username": log.officer_username,
            "action": log.action,
            "target_entity": log.target_entity,
            "details": log.details,
            "session_id": log.session_id,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "status": log.status,
            "timestamp": log.timestamp.isoformat()
        }
        for log in logs
    ]
