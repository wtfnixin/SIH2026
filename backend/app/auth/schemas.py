"""
Pydantic Schemas for Authentication, Authorization & User Management.
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50, description="Investigator username")
    password: str = Field(..., min_length=1, description="Account password")


class UserProfileResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    permissions: List[str] = []
    is_active: bool
    is_locked: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserProfileResponse


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=10, max_length=128)
    confirm_password: str = Field(..., min_length=10, max_length=128)


class AdminCreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=10, max_length=128)
    full_name: Optional[str] = Field(None, max_length=100)
    role: str = Field("INVESTIGATOR", description="ADMIN, INVESTIGATOR, ANALYST, VIEWER")


class AdminUpdateUserRequest(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_locked: Optional[bool] = None


class UserSessionResponse(BaseModel):
    id: str
    user_id: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    last_used_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    message: str
    status: str = "success"
