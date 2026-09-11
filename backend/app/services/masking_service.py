"""
Data Classification & Dynamic Field-Level Redaction Service.
Implements least-privilege data masking for sensitive fields (phone numbers, bank accounts)
based on officer clearance and role.
"""
from typing import Dict, Any, List, Optional
from app.auth.abac import evaluate_clearance, DataClassification


def mask_phone_number(phone: Optional[str], officer_clearance: str = "CONFIDENTIAL") -> str:
    """
    Masks middle digits of phone number if officer clearance is below RESTRICTED.
    Example: '+91 98765 43210' -> '+91 XXXXX 43210'
    """
    if not phone:
        return ""
    phone_clean = str(phone).strip()
    if evaluate_clearance(officer_clearance, DataClassification.RESTRICTED.value):
        return phone_clean  # Fully authorized

    # Mask digits
    digits_only = "".join([c for c in phone_clean if c.isdigit()])
    if len(digits_only) >= 10:
        prefix = phone_clean[:3] if phone_clean.startswith("+") else ""
        last_four = digits_only[-4:]
        return f"{prefix} XXXXX {last_four}".strip()
    return phone_clean[:2] + "****" + phone_clean[-2:] if len(phone_clean) > 4 else "****"


def mask_bank_account(account_no: Optional[str], officer_clearance: str = "CONFIDENTIAL") -> str:
    """
    Masks bank account digits if officer clearance is below RESTRICTED.
    Example: 'ACC-9048123981' -> 'ACC-******3981'
    """
    if not account_no:
        return ""
    acc_clean = str(account_no).strip()
    if evaluate_clearance(officer_clearance, DataClassification.RESTRICTED.value):
        return acc_clean

    if len(acc_clean) > 6:
        return acc_clean[:4] + "******" + acc_clean[-4:]
    return "******"


def mask_dossier_data(dossier: Dict[str, Any], officer_clearance: str = "CONFIDENTIAL") -> Dict[str, Any]:
    """
    Recursively redacts sensitive fields in a suspect dossier if clearance is low.
    """
    if not isinstance(dossier, dict):
        return dossier

    masked = dict(dossier)
    if "phone" in masked:
        masked["phone"] = mask_phone_number(masked["phone"], officer_clearance)
    if "phone_number" in masked:
        masked["phone_number"] = mask_phone_number(masked["phone_number"], officer_clearance)
    if "bank_account" in masked:
        masked["bank_account"] = mask_bank_account(masked["bank_account"], officer_clearance)

    # Redact associated phone lists
    if "associated_phones" in masked and isinstance(masked["associated_phones"], list):
        masked["associated_phones"] = [
            mask_phone_number(p, officer_clearance) for p in masked["associated_phones"]
        ]

    # Redact bank accounts
    if "associated_accounts" in masked and isinstance(masked["associated_accounts"], list):
        masked["associated_accounts"] = [
            mask_bank_account(a, officer_clearance) for a in masked["associated_accounts"]
        ]

    return masked
