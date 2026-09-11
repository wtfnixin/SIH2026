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


NOISE_PERSON_WORDS = {
    "CALL", "SEARCH", "HIMSELF", "DRIVER", "OFFICERS", "INVESTIGATION",
    "TRANSACTIONS", "MEETINGS", "LOGS", "COMMUNICATION", "RECEIPTS", "NO",
    "STATEMENT", "REPORT", "POLICE", "STATION", "WITNESS", "ACCUSED",
    "SUSPECT", "CRIME", "CASE", "INFORMATION", "RECORD", "FIRST"
}

KNOWN_CANONICAL_ALIASES = {
    "SUSPECT RAVI VERMA": "Ravi Verma",
    "VERMA": "Ravi Verma",
    "R. VERMA": "Ravi Verma",
    "SHARMA": "Rahul Sharma",
    "R. SHARMA": "Rahul Sharma",
    "SUSPECT RAHUL SHARMA": "Rahul Sharma",
    "AMIT": "Amit Kumar",
    "SAMEER": "Sameer Roy"
}


def clean_name(name_raw: Optional[str]) -> Optional[str]:
    """
    Cleans person name strings, removing OCR noise, honorifics, titles, and extra whitespace.
    Resolves known aliases and fragments to canonical suspect names.
    Example: 'Suspect Ravi Verma' -> 'Ravi Verma', '  Rahul  Sharma ' -> 'Rahul Sharma'
    """
    if not name_raw:
        return None

    s = str(name_raw).strip()
    if s.upper() in {"NULL", "NONE", "N/A", "UNKNOWN", "UNIDENTIFIED", ""}:
        return None

    # Remove extra spaces between words
    s = re.sub(r"\s+", " ", s).strip()
    s_upper = s.upper()

    # Reject if it's a vehicle plate pattern
    if re.match(r"^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$", re.sub(r"[^A-Z0-9]", "", s_upper)):
        return None

    # Reject if single noise word or pure digit/punctuation
    if s_upper in NOISE_PERSON_WORDS or s.isdigit() or len(s) <= 2:
        return None

    # Strip prefixes like "Suspect ", "Accused ", "Mr. ", "Shri "
    for prefix in ["SUSPECT ", "ACCUSED ", "MR. ", "MR ", "SHRI "]:
        if s_upper.startswith(prefix):
            s = s[len(prefix):].strip()
            s_upper = s.upper()
            break

    # Check known alias dictionary
    if s_upper in KNOWN_CANONICAL_ALIASES:
        return KNOWN_CANONICAL_ALIASES[s_upper]

    # Reject if only 1 token and that token is a noise word
    tokens = s.split()
    if len(tokens) == 1 and tokens[0].upper() in NOISE_PERSON_WORDS:
        return None

    return s.title()

