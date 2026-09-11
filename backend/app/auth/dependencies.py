"""
FastAPI Security & RBAC Dependencies.
Injects authenticated user context and enforces role/permission requirements on endpoints.
"""
from typing import Optional, List, Callable
from datetime import datetime
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.postgres_driver import get_db
from app.models.audit import User
from app.models.session import UserSession
from app.auth.security import decode_access_token
from app.auth.service import get_user_permissions

# HTTP Bearer token extractor (auto-error disabled so we can handle custom error payloads)
security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Validates JWT access token, verifies that the backing session is not revoked,
    and returns the authenticated User instance.
    """
    token: Optional[str] = None
    if credentials:
        token = credentials.credentials
    else:
        # Check query parameters as fallback (useful for WebSocket handshakes)
        token = request.query_params.get("token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    claims = decode_access_token(token)
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id = claims.get("user_id")
    session_id = claims.get("session_id")
    if not user_id or not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token claims.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Validate backing session in PostgreSQL for immediate revocation
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.revoked_at.is_(None)
    ).first()

    if not session or session.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or expired.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or no longer exists.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if user.is_locked:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="User account is currently locked.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Attach current session ID to request state for downstream handlers/audit
    request.state.user = user
    request.state.session_id = session_id

    return user


def require_permission(permission: str) -> Callable:
    """
    Dependency factory to enforce fine-grained permissions on endpoints.
    """
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_perms = get_user_permissions(current_user)
        # Admins or users possessing the specific permission are authorized
        if permission not in user_perms and "system:admin" not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Missing required permission '{permission}'."
            )
        return current_user
    return permission_checker


def require_role(allowed_roles: List[str]) -> Callable:
    """
    Dependency factory to restrict endpoints to specific roles.
    """
    allowed_roles_norm = [r.upper() for r in allowed_roles]

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.upper() not in allowed_roles_norm and "ADMIN" not in allowed_roles_norm and "SYSTEM_ADMINISTRATOR" not in allowed_roles_norm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Role '{current_user.role}' is not authorized for this operation."
            )
        return current_user
    return role_checker


def require_clearance(min_classification: str = "CONFIDENTIAL") -> Callable:
    """
    ABAC Dependency: Verifies officer's clearance meets or exceeds required data classification.
    """
    from app.auth.abac import evaluate_clearance

    def clearance_checker(current_user: User = Depends(get_current_user)) -> User:
        user_clearance = getattr(current_user, "clearance_level", "CONFIDENTIAL")
        if not evaluate_clearance(user_clearance, min_classification):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Data classification '{min_classification}' exceeds officer clearance '{user_clearance}'."
            )
        return current_user
    return clearance_checker


def require_case_access() -> Callable:
    """
    ABAC Dependency: Evaluates case-level isolation and IDOR protection from request path/query params.
    """
    from app.auth.abac import evaluate_case_access

    def case_checker(
        request: Request,
        current_user: User = Depends(get_current_user)
    ) -> User:
        # Extract case identifier from path params or query params (e.g. fir_no, case_id)
        case_id = (
            request.path_params.get("fir_no") or
            request.path_params.get("case_id") or
            request.path_params.get("fir_number") or
            request.query_params.get("fir_no") or
            request.query_params.get("case_id")
        )
        if case_id:
            allowed, reason = evaluate_case_access(current_user, case_id)
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Case Isolation Violation: {reason}"
                )
        return current_user
    return case_checker


async def authenticate_websocket(
    websocket: "WebSocket",
    db: Session,
    required_permission: Optional[str] = None
) -> User:
    """
    Authenticates incoming WebSocket connection during handshake.
    Extracts token from query params (?token=...) or cookie.
    Rejects with policy violation code 1008 if unauthorized.
    """
    from fastapi import WebSocket, WebSocketException

    token = websocket.query_params.get("token")
    if not token:
        token = websocket.cookies.get("sih_access_token")

    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication token required")
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication token required")

    claims = decode_access_token(token)
    if not claims:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired access token")
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired access token")

    user_id = claims.get("user_id")
    session_id = claims.get("session_id")
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.revoked_at.is_(None)
    ).first()

    if not session or session.expires_at < datetime.utcnow():
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Session has been revoked or expired")
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Session revoked or expired")

    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True), User.is_locked.is_(False)).first()
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized or locked user account")
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized user account")

    if required_permission:
        user_perms = get_user_permissions(user)
        if required_permission not in user_perms and "system:admin" not in user_perms:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=f"Missing permission: {required_permission}")
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason=f"Missing permission: {required_permission}")

    return user
