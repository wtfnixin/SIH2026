"""
Multi-Source Data Parsers Module
Parses CDR call logs, bank transactions, vehicle sightings, and surveillance JSON files,
applying cleaner functions to produce unified Python dictionary records.
"""
import json
import pandas as pd
from pathlib import Path
from typing import List, Dict, Any
from app.ingestion.cleaner import (
    clean_phone_number,
    clean_vehicle_plate,
    clean_timestamp,
    clean_name
)


def parse_calls_csv(file_path: str) -> List[Dict[str, Any]]:
    """
    Parses CDR calls CSV file (caller_number, receiver_number, timestamp, duration_seconds).
    Returns list of cleaned call record dicts.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Call log file not found at: {file_path}")

    df = pd.read_csv(path)
    parsed_calls = []

    for _, row in df.iterrows():
        caller = clean_phone_number(str(row.get("caller_number", "")))
        receiver = clean_phone_number(str(row.get("receiver_number", "")))
        timestamp = clean_timestamp(str(row.get("timestamp", "")))
        duration = int(row.get("duration_seconds", 0))

        if caller and receiver and timestamp:
            parsed_calls.append({
                "caller_number": caller,
                "receiver_number": receiver,
                "timestamp": timestamp,
                "duration_seconds": duration,
                "source_file": path.name
            })

    return parsed_calls


def parse_transactions_csv(file_path: str) -> List[Dict[str, Any]]:
    """
    Parses transactions CSV (transaction_id, sender, receiver, amount, timestamp, mode).
    Flags transactions split under ₹10,000 as potential structuring anomalies.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Transactions file not found at: {file_path}")

    df = pd.read_csv(path)
    parsed_txs = []

    for _, row in df.iterrows():
        tx_id = str(row.get("transaction_id", "")).strip()
        sender = clean_name(str(row.get("sender", "")))
        receiver = clean_name(str(row.get("receiver", "")))
        amount = float(row.get("amount", 0.0))
        timestamp = clean_timestamp(str(row.get("timestamp", "")))
        mode = str(row.get("mode", "UPI")).strip()

        # Flag potential structuring anomaly (amount between 8,000 and 10,000)
        is_structured = 8000.0 <= amount < 10000.0

        if tx_id and sender and receiver and timestamp:
            parsed_txs.append({
                "transaction_id": tx_id,
                "sender": sender,
                "receiver": receiver,
                "amount": amount,
                "timestamp": timestamp,
                "mode": mode,
                "is_structured": is_structured,
                "source_file": path.name
            })

    return parsed_txs


def parse_vehicle_sightings(file_path: str) -> List[Dict[str, Any]]:
    """
    Parses ANPR vehicle sightings CSV (vehicle_number, registered_owner, location, timestamp, camera_id).
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Vehicle sightings file not found at: {file_path}")

    df = pd.read_csv(path)
    parsed_sightings = []

    for _, row in df.iterrows():
        plate = clean_vehicle_plate(str(row.get("vehicle_number", row.get("registration_number", ""))))
        owner = clean_name(str(row.get("registered_owner", "")))
        location = str(row.get("location", "")).strip()
        timestamp = clean_timestamp(str(row.get("timestamp", "")))
        camera_id = str(row.get("camera_id", "ANPR_CAM")).strip()

        if plate and location and timestamp:
            parsed_sightings.append({
                "registration_number": plate,
                "registered_owner": owner,
                "location": location,
                "timestamp": timestamp,
                "camera_id": camera_id,
                "source_file": path.name
            })

    return parsed_sightings


def parse_surveillance_json(file_path: str) -> List[Dict[str, Any]]:
    """
    Parses surveillance JSON feeds (report_id, entity_type, entity_value, location, timestamp, observed_by).
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Surveillance JSON file not found at: {file_path}")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    parsed_reports = []

    for item in data:
        report_id = str(item.get("report_id", "")).strip()
        entity_type = str(item.get("entity_type", "")).strip()
        entity_val_raw = str(item.get("entity_value", "")).strip()
        location = str(item.get("location", "")).strip()
        timestamp = clean_timestamp(str(item.get("timestamp", "")))
        observed_by = str(item.get("observed_by", "Unit Alpha")).strip()

        # Clean value depending on entity_type
        if entity_type == "Vehicle":
            entity_val = clean_vehicle_plate(entity_val_raw)
        elif entity_type == "Person":
            entity_val = clean_name(entity_val_raw)
        elif entity_type == "Phone":
            entity_val = clean_phone_number(entity_val_raw)
        else:
            entity_val = entity_val_raw

        if report_id and entity_val and timestamp:
            parsed_reports.append({
                "report_id": report_id,
                "entity_type": entity_type,
                "entity_value": entity_val,
                "location": location,
                "timestamp": timestamp,
                "observed_by": observed_by,
                "source_file": path.name
            })

    return parsed_reports
