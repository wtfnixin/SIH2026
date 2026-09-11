"""
Core Authentication Service.
Implements login, session rotation, account lockout, and server-side audit logging.
"""
from datetime import datetime, timedelta
from typing import Optional, Tuple, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models.audit import User, AuditLog
from app.models.session import UserSession
from app.models.rbac import ROLE_PERMISSIONS_MAP
from app.auth.password import hash_password, verify_password, needs_rehash, validate_password_policy
from app.auth.security import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token
)


def log_security_event(
    db: Session,
    officer_username: str,
    action: str,
    details: Optional[str] = None,
    user_id: Optional[int] = None,
    session_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    status_str: str = "SUCCESS",
    target_entity: Optional[str] = None,
    case_id: Optional[str] = None
) -> AuditLog:
    """
    Records an immutable security/audit log in PostgreSQL and commits a cryptographically
    signed, hash-chained block to the tamper-evident audit ledger.
    """
    from app.services.ledger_service import append_ledger_event

    log_entry = AuditLog(
        user_id=user_id,
        officer_username=officer_username,
        action=action,
        target_entity=target_entity,
        details=details,
        session_id=session_id,
        ip_address=ip_address,
        user_agent=user_agent[:255] if user_agent else None,
        status=status_str,
        timestamp=datetime.utcnow()
    )
    db.add(log_entry)

    # Append to cryptographic tamper-evident hash-chain ledger
    try:
        append_ledger_event(
            db=db,
            actor_username=officer_username,
            action=action,
            target_entity=target_entity,
            case_id=case_id,
            details=f"[{status_str}] {details or ''}",
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        print(f"Warning: Ledger append error: {e}")

    return log_entry


def get_user_permissions(user: User) -> List[str]:
    """
    Resolves effective permissions for a given user role.
    """
    return ROLE_PERMISSIONS_MAP.get(user.role.upper(), ROLE_PERMISSIONS_MAP["VIEWER"])


def authenticate_user(
    db: Session,
    username: str,
    password: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Tuple[User, UserSession, str, str]:
    """
    Authenticates user credentials, enforces brute-force lockout, creates
    a server-side session, and logs audit trails.
    Returns: (User, UserSession, access_token, raw_refresh_token)
    """
    user = db.query(User).filter(User.username == username.strip()).first()
    now = datetime.utcnow()

    # 1. Reject unknown user
    if not user:
        log_security_event(
            db=db,
            officer_username=username,
            action="LOGIN_FAILURE",
            details="Authentication failed: user does not exist",
            ip_address=ip_address,
            user_agent=user_agent,
            status_str="FAILURE"
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    # 2. Check if account is active
    if not user.is_active:
        log_security_event(
            db=db,
            officer_username=user.username,
            user_id=user.id,
            action="LOGIN_BLOCKED",
            details="Authentication rejected: account deactivated",
            ip_address=ip_address,
            user_agent=user_agent,
            status_str="DENIED"
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact an administrator."
        )

    # 3. Check account lockout status
    if user.is_locked:
        if user.locked_until and user.locked_until > now:
            remaining_mins = int((user.locked_until - now).total_seconds() // 60) + 1
            log_security_event(
                db=db,
                officer_username=user.username,
                user_id=user.id,
                action="LOGIN_LOCKED",
                details=f"Login attempt on locked account ({remaining_mins} mins remaining)",
                ip_address=ip_address,
                user_agent=user_agent,
                status_str="DENIED"
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account is temporarily locked due to excessive failed attempts. Please wait {remaining_mins} minutes."
            )
        else:
            # Lockout period expired - automatic reset
            user.is_locked = False
            user.locked_until = None
            user.failed_login_attempts = 0

    # 4. Verify Argon2id password
    if not user.password_hash or not verify_password(password, user.password_hash):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        user.last_failed_login = now

        if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            user.is_locked = True
            user.locked_until = now + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
            log_security_event(
                db=db,
                officer_username=user.username,
                user_id=user.id,
                action="ACCOUNT_LOCKED",
                details=f"Account locked after {user.failed_login_attempts} consecutive failed attempts",
                ip_address=ip_address,
                user_agent=user_agent,
                status_str="SECURITY_ALERT"
            )
        else:
            log_security_event(
                db=db,
                officer_username=user.username,
                user_id=user.id,
                action="LOGIN_FAILURE",
                details=f"Invalid password attempt ({user.failed_login_attempts}/{settings.MAX_LOGIN_ATTEMPTS})",
                ip_address=ip_address,
                user_agent=user_agent,
                status_str="FAILURE"
            )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    # 5. Success! Reset failure counters
    user.failed_login_attempts = 0
    user.is_locked = False
    user.locked_until = None
    user.last_login_at = now

    # Upgrade hash if cost parameters have changed
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)

    # 6. Create session and rotated refresh token
    raw_refresh_token = generate_refresh_token()
    token_hash = hash_refresh_token(raw_refresh_token)
    session_expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    session = UserSession(
        user_id=user.id,
        refresh_token_hash=token_hash,
        ip_address=ip_address,
        user_agent=user_agent[:255] if user_agent else None,
        created_at=now,
        last_used_at=now,
        expires_at=session_expires
    )
    db.add(session)
    db.flush()  # assign session.id

    # 7. Generate JWT access token
    permissions = get_user_permissions(user)
    access_token = create_access_token(
        user_id=user.id,
        username=user.username,
        role=user.role,
        session_id=session.id,
        permissions=permissions
    )

    # 8. Record audit log
    log_security_event(
        db=db,
        officer_username=user.username,
        user_id=user.id,
        session_id=session.id,
        action="LOGIN_SUCCESS",
        details=f"Investigator logged in successfully (Role: {user.role})",
        ip_address=ip_address,
        user_agent=user_agent,
        status_str="SUCCESS"
    )

    db.commit()
    db.refresh(user)
    db.refresh(session)
    return user, session, access_token, raw_refresh_token


def refresh_user_session(
    db: Session,
    raw_refresh_token: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Tuple[User, UserSession, str, str]:
    """
    Rotates a refresh token: invalidates the old session and creates a fresh one.
    Enforces strict single-use refresh token rotation.
    """
    now = datetime.utcnow()
    token_hash = hash_refresh_token(raw_refresh_token)

    session = db.query(UserSession).filter(
        UserSession.refresh_token_hash == token_hash,
        UserSession.revoked_at.is_(None)
    ).first()

    if not session or session.expires_at < now:
        if session:
            session.revoked_at = now
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid. Please log in again."
        )

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user or not user.is_active or user.is_locked:
        session.revoked_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive or locked."
        )

    # Rotate refresh token: revoke current session
    session.revoked_at = now

    # Create new session
    new_raw_token = generate_refresh_token()
    new_token_hash = hash_refresh_token(new_raw_token)
    new_session_expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    new_session = UserSession(
        user_id=user.id,
        refresh_token_hash=new_token_hash,
        ip_address=ip_address,
        user_agent=user_agent[:255] if user_agent else None,
        created_at=now,
        last_used_at=now,
        expires_at=new_session_expires
    )
    db.add(new_session)
    db.flush()

    permissions = get_user_permissions(user)
    access_token = create_access_token(
        user_id=user.id,
        username=user.username,
        role=user.role,
        session_id=new_session.id,
        permissions=permissions
    )

    log_security_event(
        db=db,
        officer_username=user.username,
        user_id=user.id,
        session_id=new_session.id,
        action="TOKEN_REFRESH",
        details="Access token refreshed via rotated refresh token",
        ip_address=ip_address,
        user_agent=user_agent,
        status_str="SUCCESS"
    )

    db.commit()
    db.refresh(user)
    db.refresh(new_session)
    return user, new_session, access_token, new_raw_token


def terminate_session(
    db: Session,
    session_id: str,
    officer_username: str,
    user_id: Optional[int] = None
) -> bool:
    """
    Terminates/revokes an active session immediately on logout.
    """
    now = datetime.utcnow()
    session = db.query(UserSession).filter(UserSession.id == session_id).first()
    if session and not session.revoked_at:
        session.revoked_at = now

    log_security_event(
        db=db,
        officer_username=officer_username,
        user_id=user_id,
        session_id=session_id,
        action="LOGOUT",
        details="Session terminated by user logout",
        status_str="SUCCESS"
    )
    db.commit()
    return True


def change_user_password(
    db: Session,
    user: User,
    current_password: str,
    new_password: str,
    confirm_password: str,
    current_session_id: Optional[str] = None
) -> None:
    """
    Changes user password after policy checks, and revokes other sessions.
    """
    if new_password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation do not match."
        )

    if not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    valid, error_msg = validate_password_policy(new_password)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    now = datetime.utcnow()
    user.password_hash = hash_password(new_password)
    user.password_changed_at = now
    user.updated_at = now

    # Revoke other active sessions for security
    other_sessions = db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.revoked_at.is_(None)
    ).all()
    for s in other_sessions:
        if s.id != current_session_id:
            s.revoked_at = now

    log_security_event(
        db=db,
        officer_username=user.username,
        user_id=user.id,
        session_id=current_session_id,
        action="PASSWORD_CHANGED",
        details="User updated password; other active sessions revoked",
        status_str="SUCCESS"
    )
    db.commit()
