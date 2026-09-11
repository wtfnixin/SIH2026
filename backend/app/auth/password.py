"""
Argon2id & Bcrypt Password Security & Policy Module.
Handles cryptographic hashing and validation for investigator credentials.
"""
from typing import Tuple

try:
    from argon2 import PasswordHasher, Type
    from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
    _hasher = PasswordHasher(
        time_cost=3,
        memory_cost=65536,
        parallelism=4,
        hash_len=32,
        type=Type.ID
    )
    _USE_ARGON2 = True
except ImportError:
    from passlib.context import CryptContext
    _pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    _USE_ARGON2 = False

# Common insecure / predictable passwords to block
COMMON_WEAK_PASSWORDS = {
    "password123", "password1234", "admin12345", "police12345",
    "investigator", "investigation", "sih2026password", "qwertyuiop",
    "1234567890", "welcome1234", "changeme123", "letmein1234"
}

MIN_PASSWORD_LENGTH = 10
MAX_PASSWORD_LENGTH = 128


def hash_password(plain_password: str) -> str:
    """
    Hashes a plaintext password using Argon2id (or Bcrypt fallback).
    Passwords are never logged or stored in plaintext.
    """
    if not plain_password:
        raise ValueError("Password cannot be empty")
    if _USE_ARGON2:
        return _hasher.hash(plain_password)
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plaintext password against hash in constant-time.
    Returns True if valid, False otherwise. Never raises on invalid input.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        if _USE_ARGON2 and hashed_password.startswith("$argon2"):
            return _hasher.verify(hashed_password, plain_password)
        else:
            from passlib.context import CryptContext
            ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
            return ctx.verify(plain_password, hashed_password)
    except Exception:
        return False


def needs_rehash(hashed_password: str) -> bool:
    """
    Checks if the hash parameters need upgrading to newer security parameters.
    """
    try:
        if _USE_ARGON2 and hashed_password.startswith("$argon2"):
            return _hasher.check_needs_rehash(hashed_password)
        return False
    except Exception:
        return True


def validate_password_policy(password: str) -> Tuple[bool, str]:
    """
    Enforces a sensible password policy:
    - Minimum length 10 characters
    - Maximum length 128 characters
    - Rejects common weak/dictionary passwords
    - Requires at least one non-space character
    - Cannot be purely numeric
    """
    if not password:
        return False, "Password cannot be empty."

    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long."

    if len(password) > MAX_PASSWORD_LENGTH:
        return False, f"Password cannot exceed {MAX_PASSWORD_LENGTH} characters."

    if password.isspace():
        return False, "Password cannot consist solely of whitespace."

    if password.isdigit():
        return False, "Password cannot consist solely of numbers."

    normalized = password.strip().lower()
    if normalized in COMMON_WEAK_PASSWORDS:
        return False, "Password is too common and easily guessed. Please choose a stronger passphrase."

    return True, ""
