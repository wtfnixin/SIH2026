"""
JWT & Cryptographic Token Utilities.
Handles token signing, claim verification, and SHA-256 token hashing.
"""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from jose import jwt, JWTError, ExpiredSignatureError
from app.config import settings


import time


def create_access_token(
    user_id: int,
    username: str,
    role: str,
    session_id: str,
    permissions: Optional[List[str]] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Creates a signed, short-lived JWT access token for an authenticated user.
    """
    now_ts = int(time.time())
    if expires_delta:
        expire_ts = now_ts + int(expires_delta.total_seconds())
    else:
        expire_ts = now_ts + (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "user_id": user_id,
        "username": username,
        "role": role,
        "session_id": session_id,
        "permissions": permissions or [],
        "jti": uuid.uuid4().hex,
        "iat": now_ts,
        "exp": expire_ts
    }

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and validates a JWT access token.
    Returns claims dict if valid, or None if expired/tampered with.
    """
    try:
        claims = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return claims
    except (JWTError, ExpiredSignatureError):
        return None


def generate_refresh_token() -> str:
    """
    Generates a cryptographically strong, high-entropy random refresh token.
    """
    return secrets.token_urlsafe(48)


def hash_refresh_token(raw_token: str) -> str:
    """
    Computes a SHA-256 hash of the raw refresh token for safe database persistence.
    The database never stores plaintext refresh tokens.
    """
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
