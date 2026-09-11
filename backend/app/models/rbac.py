"""
SQLAlchemy RBAC Models.
Defines roles, permissions, and role-permission associations for fine-grained authorization.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.postgres_driver import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)

    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)

    roles = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False)

    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="roles")

    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )


# System Default Permissions Matrix
ROLE_PERMISSIONS_MAP = {
    "SYSTEM_ADMINISTRATOR": [
        "investigation:read",
        "investigation:write",
        "intelligence:read",
        "intelligence:export",
        "system:admin",
        "system:ingest",
        "copilot:query",
        "audit:read",
        "geo:read",
        "security:manage"
    ],
    "ADMIN": [
        "investigation:read",
        "investigation:write",
        "intelligence:read",
        "intelligence:export",
        "system:admin",
        "system:ingest",
        "copilot:query",
        "audit:read",
        "geo:read",
        "security:manage"
    ],
    "CASE_SUPERVISOR": [
        "investigation:read",
        "investigation:write",
        "intelligence:read",
        "intelligence:export",
        "copilot:query",
        "audit:read",
        "geo:read",
        "cases:supervise"
    ],
    "SENIOR_INVESTIGATOR": [
        "investigation:read",
        "investigation:write",
        "intelligence:read",
        "intelligence:export",
        "copilot:query",
        "audit:read",
        "geo:read"
    ],
    "INVESTIGATION_OFFICER": [
        "investigation:read",
        "investigation:write",
        "intelligence:read",
        "intelligence:export",
        "copilot:query",
        "geo:read"
    ],
    "INVESTIGATOR": [
        "investigation:read",
        "investigation:write",
        "intelligence:read",
        "intelligence:export",
        "copilot:query",
        "geo:read"
    ],
    "INTELLIGENCE_ANALYST": [
        "investigation:read",
        "intelligence:read",
        "intelligence:export",
        "copilot:query",
        "geo:read"
    ],
    "ANALYST": [
        "investigation:read",
        "intelligence:read",
        "intelligence:export",
        "copilot:query",
        "geo:read"
    ],
    "FORENSIC_ANALYST": [
        "investigation:read",
        "investigation:write",
        "intelligence:read",
        "system:ingest",
        "geo:read"
    ],
    "AUDITOR": [
        "investigation:read",
        "intelligence:read",
        "audit:read",
        "geo:read"
    ],
    "VIEWER": [
        "investigation:read",
        "intelligence:read",
        "geo:read"
    ]
}
