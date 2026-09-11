"""
Pydantic Schemas for Authentication, Authorization & User Management.
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


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
    department: str = "Cyber Crime Division"
    jurisdiction: str = "Bengaluru City"
    clearance_level: str = "CONFIDENTIAL"
    assigned_cases: List[str] = []
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
    email: str = Field(..., description="Email address")
    password: str = Field(..., min_length=10, max_length=128)
    full_name: Optional[str] = Field(None, max_length=100)
    role: str = Field("INVESTIGATION_OFFICER", description="Police role")
    department: str = Field("Cyber Crime Division", max_length=100)
    jurisdiction: str = Field("Bengaluru City", max_length=100)
    clearance_level: str = Field("CONFIDENTIAL", description="INTERNAL, CONFIDENTIAL, RESTRICTED, HIGHLY_RESTRICTED")
    assigned_cases: List[str] = Field(default_factory=list)


class AdminUpdateUserRequest(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    jurisdiction: Optional[str] = None
    clearance_level: Optional[str] = None
    assigned_cases: Optional[List[str]] = None
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
