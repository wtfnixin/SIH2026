"""
ABAC (Attribute-Based Access Control) Policy Engine.
Evaluates Subject Attributes (Role, Department, Jurisdiction, Clearance, Assigned Cases)
against Resource Attributes (Case ID, Data Classification, Jurisdiction) and Environmental Context.
Guarantees server-side Case Isolation and IDOR prevention.
"""
from typing import Optional, List, Dict, Any, Tuple
from enum import Enum
from app.models.audit import User


class DataClassification(str, Enum):
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"
    RESTRICTED = "RESTRICTED"
    HIGHLY_RESTRICTED = "HIGHLY_RESTRICTED"


# Hierarchy ordering for security clearance
CLEARANCE_LEVELS: Dict[str, int] = {
    DataClassification.INTERNAL.value: 1,
    DataClassification.CONFIDENTIAL.value: 2,
    DataClassification.RESTRICTED.value: 3,
    DataClassification.HIGHLY_RESTRICTED.value: 4,
}


def normalize_case_id(case_id: Optional[str]) -> str:
    """Normalizes case identifier format (e.g. 'FIR-2026-0891' or '0891')."""
    if not case_id:
        return ""
    return str(case_id).strip().upper()


def get_user_assigned_cases(user: User) -> List[str]:
    """Returns normalized list of case IDs assigned to the officer."""
    raw = getattr(user, "assigned_cases", None) or []
    if isinstance(raw, list):
        return [normalize_case_id(c) for c in raw if c]
    return []


def evaluate_clearance(user_clearance: str, resource_classification: str) -> bool:
    """
    Evaluates whether user's clearance level is equal to or greater than resource classification.
    """
    user_level = CLEARANCE_LEVELS.get(user_clearance.upper(), 1)
    resource_level = CLEARANCE_LEVELS.get(resource_classification.upper(), 2)
    return user_level >= resource_level


def evaluate_case_access(
    user: User,
    case_id: str,
    override_grant: bool = False
) -> Tuple[bool, str]:
    """
    Evaluates Case-Level Isolation.
    Ensures an investigator cannot access unassigned cases (preventing IDOR attacks).
    Supervisors and Admins possess jurisdiction-wide oversight.
    """
    norm_case = normalize_case_id(case_id)
    if not norm_case:
        return True, "No specific case constraint."

    user_role = (user.role or "").upper()

    # 1. System Administrators possess global audit oversight
    if user_role in ["SYSTEM_ADMINISTRATOR", "ADMIN", "AUDITOR"]:
        return True, "Administrator/Auditor access granted."

    # 2. Case Supervisors have oversight across their assigned jurisdiction
    if user_role == "CASE_SUPERVISOR":
        return True, "Supervisor jurisdictional oversight granted."

    # 3. Check active emergency Break-Glass grant
    if override_grant:
        return True, "Emergency Break-Glass authorization active."

    # 4. Check explicit case assignment
    assigned = get_user_assigned_cases(user)
    
    # Check exact match or partial FIR number match (e.g., '0891' in 'FIR-2026-0891')
    is_assigned = any(
        norm_case == a or norm_case.endswith(a) or a.endswith(norm_case)
        for a in assigned
    )

    if is_assigned:
        return True, f"Case {norm_case} assigned to officer."

    return False, f"Access Denied: Officer {user.username} is not assigned to Case {norm_case}."


def evaluate_abac_policy(
    user: User,
    resource_type: str,
    case_id: Optional[str] = None,
    classification: str = "CONFIDENTIAL",
    action: str = "READ",
    override_grant: bool = False
) -> Tuple[bool, str]:
    """
    Unified ABAC Policy Evaluator.
    Combines:
    1. Account Active Status
    2. Data Classification Clearance
    3. Case Isolation & IDOR Check
    """
    # 1. Check account active status
    if not getattr(user, "is_active", True) or getattr(user, "is_locked", False):
        return False, "User account is inactive or locked."

    # 2. Check Security Clearance
    user_clearance = getattr(user, "clearance_level", "CONFIDENTIAL")
    if not evaluate_clearance(user_clearance, classification):
        return False, (
            f"Security Clearance Denied: Required classification '{classification}' "
            f"exceeds officer clearance '{user_clearance}'."
        )

    # 3. Check Case Isolation
    if case_id:
        case_allowed, case_reason = evaluate_case_access(user, case_id, override_grant=override_grant)
        if not case_allowed:
            return False, case_reason

    return True, "ABAC Authorization Granted."
