"""
Data Cleaning & Normalization Module
Standardizes dirty phone numbers, vehicle license plates, timestamps, and removes noise artifacts.
"""
import re
from datetime import datetime
from typing import Optional
from dateutil import parser as date_parser


def clean_phone_number(phone_raw: Optional[str]) -> Optional[str]:
    """
    Sanitizes raw phone inputs to standard 10-digit / E.164 (+91) format.
    Example: '09850785405', '+91 98507-85405', '9850785405' -> '+919850785405'
    Returns None for invalid numbers (e.g. '0000000000', 'NULL', 'N/A').
    """
    if not phone_raw:
        return None

    # Convert to string and strip surrounding whitespace
    s = str(phone_raw).strip()

    # Filter out common invalid placeholding strings
    if s.upper() in {"NULL", "NONE", "N/A", "UNKNOWN", "0", "0000000000"}:
        return None

    # Extract digits only
    digits = re.sub(r"\D", "", s)

    # Strip leading zero if 11 digits starting with 0
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    # Strip country code 91 if 12 digits starting with 91
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]

    # Valid Indian mobile numbers are exactly 10 digits
    if len(digits) == 10:
        return f"+91{digits}"

    return None


def clean_vehicle_plate(plate_raw: Optional[str]) -> Optional[str]:
    """
    Sanitizes raw vehicle registration numbers to standard RTO uppercase format.
    Example: 'ka-01-ab-1234', 'KA 01 AB 1234' -> 'KA01AB1234'
    Returns None if pattern does not represent a valid vehicle registration.
    """
    if not plate_raw:
        return None

    s = str(plate_raw).strip().upper()

    if s in {"NULL", "NONE", "N/A", "UNKNOWN"}:
        return None

    # Remove hyphens, spaces, and special punctuation
    cleaned = re.sub(r"[^A-Z0-9]", "", s)

    # Basic Indian Vehicle Plate Check (e.g. KA01AB1234, DL3CAB1234)
    # 2 letters state code + 2 digits district + letters + 4 digits
    if len(cleaned) >= 8 and len(cleaned) <= 11:
        if re.match(r"^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$", cleaned):
            return cleaned

    return None


def clean_timestamp(ts_raw: Optional[str]) -> Optional[str]:
    """
    Converts various date/timestamp strings into standard ISO 8601 UTC format (YYYY-MM-DDTHH:MM:SSZ).
    Example: '2026-08-03 15:00:00' -> '2026-08-03T15:00:00Z'
    """
    if not ts_raw:
        return None

    s = str(ts_raw).strip()
    if s.upper() in {"NULL", "NONE", "N/A", "UNKNOWN"}:
        return None

    try:
        dt = date_parser.parse(s)
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        return None


def clean_name(name_raw: Optional[str]) -> Optional[str]:
    """
    Cleans person name strings, removing OCR noise, titles, and extra whitespace.
    Example: '  Rahul  Sharma ' -> 'Rahul Sharma'
    """
    if not name_raw:
        return None

    s = str(name_raw).strip()
    if s.upper() in {"NULL", "NONE", "N/A", "UNKNOWN", "UNIDENTIFIED"}:
        return None

    # Remove extra spaces between words
    s = re.sub(r"\s+", " ", s)
    return s.title()
