"""
Authentication Endpoints Router.
Provides login, refresh, logout, current user profile, and password update routes.
Strictly admin-provisioned: NO PUBLIC SIGNUP OR REGISTRATION ENDPOINTS.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie
from sqlalchemy.orm import Session

from app.config import settings
from app.db.postgres_driver import get_db
from app.models.audit import User
from app.auth.schemas import (
    LoginRequest,
    TokenResponse,
    UserProfileResponse,
    ChangePasswordRequest,
    MessageResponse
)
from app.auth.service import (
    authenticate_user,
    refresh_user_session,
    terminate_session,
    change_user_password,
    get_user_permissions
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

REFRESH_COOKIE_NAME = "sih_refresh_token"
REFRESH_COOKIE_PATH = f"{settings.API_V1_STR}/auth"


def set_refresh_cookie(response: Response, raw_token: str) -> None:
    """Sets a secure, HttpOnly refresh cookie."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=REFRESH_COOKIE_PATH
    )


def clear_refresh_cookie(response: Response) -> None:
    """Clears the refresh cookie on logout."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH
    )


def build_user_profile(user: User) -> UserProfileResponse:
    return UserProfileResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        permissions=get_user_permissions(user),
        department=getattr(user, "department", "Cyber Crime Division") or "Cyber Crime Division",
        jurisdiction=getattr(user, "jurisdiction", "Bengaluru City") or "Bengaluru City",
        clearance_level=getattr(user, "clearance_level", "CONFIDENTIAL") or "CONFIDENTIAL",
        assigned_cases=getattr(user, "assigned_cases", []) or [],
        is_active=user.is_active,
        is_locked=user.is_locked,
        last_login_at=user.last_login_at,
        created_at=user.created_at
    )


@router.post("/login", response_model=TokenResponse, summary="Officer Login")
def login(
    credentials: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticates investigator credentials using Argon2id.
    Issues a short-lived access JWT and sets a secure HttpOnly refresh cookie.
    Enforces automatic account lockout upon consecutive failed attempts.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    user, session, access_token, raw_refresh_token = authenticate_user(
        db=db,
        username=credentials.username,
        password=credentials.password,
        ip_address=client_ip,
        user_agent=user_agent
    )

    set_refresh_cookie(response, raw_refresh_token)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=build_user_profile(user)
    )


@router.post("/refresh", response_model=TokenResponse, summary="Rotate Session & Refresh Access Token")
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    sih_refresh_token: Optional[str] = Cookie(None, alias=REFRESH_COOKIE_NAME)
):
    """
    Rotates the refresh token and issues a new access token.
    Invalidates the old refresh token to prevent replay attacks.
    """
    # Accept token from cookie or from X-Refresh-Token header as fallback
    token = sih_refresh_token or request.headers.get("X-Refresh-Token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required in cookie or header"
        )

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    user, new_session, access_token, new_raw_token = refresh_user_session(
        db=db,
        raw_refresh_token=token,
        ip_address=client_ip,
        user_agent=user_agent
    )

    set_refresh_cookie(response, new_raw_token)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=build_user_profile(user)
    )


@router.post("/logout", response_model=MessageResponse, summary="Officer Logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Terminates active session in PostgreSQL and clears the refresh cookie.
    """
    session_id = getattr(request.state, "session_id", None)
    if session_id:
        terminate_session(
            db=db,
            session_id=session_id,
            officer_username=current_user.username,
            user_id=current_user.id
        )

    clear_refresh_cookie(response)
    return MessageResponse(message="Successfully logged out and session revoked.")


@router.get("/me", response_model=UserProfileResponse, summary="Get Current Officer Profile")
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the authenticated user's profile and active permissions.
    """
    return build_user_profile(current_user)


@router.post("/change-password", response_model=MessageResponse, summary="Change Password")
def change_password(
    data: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates the current user's password with Argon2id and revokes other sessions.
    """
    session_id = getattr(request.state, "session_id", None)
    change_user_password(
        db=db,
        user=current_user,
        current_password=data.current_password,
        new_password=data.new_password,
        confirm_password=data.confirm_password,
        current_session_id=session_id
    )
    return MessageResponse(message="Password successfully changed. Other active sessions revoked.")
