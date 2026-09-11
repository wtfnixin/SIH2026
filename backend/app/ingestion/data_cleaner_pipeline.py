"""
Data Cleaning & Deduplication Pipeline
Generates standardized, deduplicated canonical datasets from raw evidence feeds.
Cleans calls, transactions, vehicle sightings, surveillance logs, and police FIRs,
saving the clean datasets to data/cleaned_datasets/.
"""
import os
import re
import json
import glob
import logging
from pathlib import Path
from typing import Dict, Any, List
import pandas as pd

from app.ingestion.cleaner import (
    clean_phone_number,
    clean_vehicle_plate,
    clean_timestamp,
    clean_name
)
from app.ingestion.nlp_extractor import extract_entities_from_text

logger = logging.getLogger(__name__)


def run_data_cleaning_and_deduplication(
    source_dir: str = "/app/data/synthetic_data",
    output_dir: str = "/app/data/cleaned_datasets"
) -> Dict[str, Any]:
    """
    Executes end-to-end cleaning and deduplication over raw data feeds.
    Produces high-fidelity, deduplicated datasets ready for PostgreSQL & Neo4j ingestion.
    """
    src_path = Path(source_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    summary = {
        "calls": {"raw": 0, "cleaned": 0, "duplicates_removed": 0},
        "transactions": {"raw": 0, "cleaned": 0, "duplicates_removed": 0},
        "vehicles": {"raw": 0, "cleaned": 0, "duplicates_removed": 0},
        "surveillance": {"raw": 0, "cleaned": 0, "duplicates_removed": 0},
        "firs": {"raw": 0, "cleaned": 0}
    }

    # ─────────────────────────────────────────────────────────────
    # 1. Clean & Deduplicate Calls
    # ─────────────────────────────────────────────────────────────
    calls_file = src_path / "calls.csv"
    if calls_file.exists():
        df_calls = pd.read_csv(calls_file)
        summary["calls"]["raw"] = len(df_calls)

        cleaned_calls = []
        for _, row in df_calls.iterrows():
            caller = clean_phone_number(str(row.get("caller_number", "")))
            receiver = clean_phone_number(str(row.get("receiver_number", "")))
            ts = clean_timestamp(str(row.get("timestamp", "")))
            dur = int(row.get("duration_seconds", 0))

            if caller and receiver and ts:
                cleaned_calls.append({
                    "caller_number": caller,
                    "receiver_number": receiver,
                    "timestamp": ts,
                    "duration_seconds": dur,
                    "source_file": calls_file.name
                })

        df_cleaned_calls = pd.DataFrame(cleaned_calls)
        # Deduplicate on (caller_number, receiver_number, timestamp)
        before_dedup = len(df_cleaned_calls)
        df_cleaned_calls = df_cleaned_calls.drop_duplicates(
            subset=["caller_number", "receiver_number", "timestamp"],
            keep="first"
        )
        summary["calls"]["duplicates_removed"] = before_dedup - len(df_cleaned_calls)
        summary["calls"]["cleaned"] = len(df_cleaned_calls)

        df_cleaned_calls.to_csv(out_path / "calls_cleaned.csv", index=False)
        logger.info(f"Cleaned Calls: {len(df_cleaned_calls)} records saved.")

    # ─────────────────────────────────────────────────────────────
    # 2. Clean & Deduplicate Transactions
    # ─────────────────────────────────────────────────────────────
    tx_file = src_path / "transactions.csv"
    if tx_file.exists():
        df_tx = pd.read_csv(tx_file)
        summary["transactions"]["raw"] = len(df_tx)

        cleaned_tx = []
        for _, row in df_tx.iterrows():
            tx_id = str(row.get("transaction_id", "")).strip()
            sender = clean_name(str(row.get("sender", "")))
            receiver = clean_name(str(row.get("receiver", "")))
            amt = float(row.get("amount", 0.0))
            ts = clean_timestamp(str(row.get("timestamp", "")))
            mode = str(row.get("mode", "UPI")).strip().upper()
            is_struct = (8000.0 <= amt < 10000.0)

            if tx_id and sender and receiver and ts:
                cleaned_tx.append({
                    "transaction_id": tx_id,
                    "sender": sender,
                    "receiver": receiver,
                    "amount": amt,
                    "timestamp": ts,
                    "mode": mode,
                    "is_structured": is_struct,
                    "source_file": tx_file.name
                })

        df_cleaned_tx = pd.DataFrame(cleaned_tx)
        before_dedup = len(df_cleaned_tx)
        df_cleaned_tx = df_cleaned_tx.drop_duplicates(subset=["transaction_id"], keep="first")
        summary["transactions"]["duplicates_removed"] = before_dedup - len(df_cleaned_tx)
        summary["transactions"]["cleaned"] = len(df_cleaned_tx)

        df_cleaned_tx.to_csv(out_path / "transactions_cleaned.csv", index=False)
        logger.info(f"Cleaned Transactions: {len(df_cleaned_tx)} records saved.")

    # ─────────────────────────────────────────────────────────────
    # 3. Clean & Deduplicate Vehicle Sightings
    # ─────────────────────────────────────────────────────────────
    veh_file = src_path / "vehicle_sightings.csv"
    if veh_file.exists():
        df_veh = pd.read_csv(veh_file)
        summary["vehicles"]["raw"] = len(df_veh)

        cleaned_veh = []
        for _, row in df_veh.iterrows():
            plate = clean_vehicle_plate(str(row.get("vehicle_number", row.get("registration_number", ""))))
            owner = clean_name(str(row.get("registered_owner", "")))
            loc = str(row.get("location", "")).strip()
            ts = clean_timestamp(str(row.get("timestamp", "")))
            cam = str(row.get("camera_id", "ANPR_CAM")).strip()

            if plate and loc and ts:
                cleaned_veh.append({
                    "registration_number": plate,
                    "registered_owner": owner or "Unknown Owner",
                    "location": loc,
                    "timestamp": ts,
                    "camera_id": cam,
                    "source_file": veh_file.name
                })

        df_cleaned_veh = pd.DataFrame(cleaned_veh)
        before_dedup = len(df_cleaned_veh)
        df_cleaned_veh = df_cleaned_veh.drop_duplicates(
            subset=["registration_number", "location", "timestamp"],
            keep="first"
        )
        summary["vehicles"]["duplicates_removed"] = before_dedup - len(df_cleaned_veh)
        summary["vehicles"]["cleaned"] = len(df_cleaned_veh)

        df_cleaned_veh.to_csv(out_path / "vehicles_cleaned.csv", index=False)
        logger.info(f"Cleaned Vehicles: {len(df_cleaned_veh)} records saved.")

    # ─────────────────────────────────────────────────────────────
    # 4. Clean & Deduplicate Surveillance Logs (All JSON reports)
    # ─────────────────────────────────────────────────────────────
    surv_files = sorted(glob.glob(str(src_path / "surveillance*.json")))
    combined_surv = []
    for sf in surv_files:
        try:
            with open(sf, "r", encoding="utf-8") as f:
                items = json.load(f)
                summary["surveillance"]["raw"] += len(items)
                for item in items:
                    rep_id = str(item.get("report_id", "")).strip()
                    etype = str(item.get("entity_type", "")).strip()
                    eval_raw = str(item.get("entity_value", "")).strip()
                    loc = str(item.get("location", "")).strip()
                    ts = clean_timestamp(str(item.get("timestamp", "")))
                    obs = str(item.get("observed_by", "Field Unit")).strip()

                    # Entity-specific cleaning
                    if etype == "Vehicle":
                        eval_clean = clean_vehicle_plate(eval_raw)
                    elif etype == "Person":
                        eval_clean = clean_name(eval_raw)
                    elif etype == "Phone":
                        eval_clean = clean_phone_number(eval_raw)
                    else:
                        eval_clean = eval_raw

                    if rep_id and eval_clean and ts:
                        combined_surv.append({
                            "report_id": rep_id,
                            "entity_type": etype,
                            "entity_value": eval_clean,
                            "location": loc,
                            "timestamp": ts,
                            "observed_by": obs,
                            "source_file": Path(sf).name
                        })
        except Exception as e:
            logger.warning(f"Error reading surveillance file {sf}: {e}")

    df_surv = pd.DataFrame(combined_surv)
    if not df_surv.empty:
        before_dedup = len(df_surv)
        # Deduplicate across files by report_id and entity details
        df_surv = df_surv.drop_duplicates(
            subset=["report_id", "entity_type", "entity_value", "timestamp"],
            keep="first"
        )
        summary["surveillance"]["duplicates_removed"] = before_dedup - len(df_surv)
        summary["surveillance"]["cleaned"] = len(df_surv)

        with open(out_path / "surveillance_cleaned.json", "w", encoding="utf-8") as f:
            json.dump(df_surv.to_dict(orient="records"), f, indent=2)
        logger.info(f"Cleaned Surveillance: {len(df_surv)} items saved.")

    # ─────────────────────────────────────────────────────────────
    # 5. Clean & Standardize FIRs
    # ─────────────────────────────────────────────────────────────
    firs_dir = src_path / "firs"
    cleaned_firs = []
    if firs_dir.exists():
        for fpath in sorted(firs_dir.glob("*.txt")):
            summary["firs"]["raw"] += 1
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    content = f.read()

                record = extract_entities_from_text(content, fir_id=fpath.stem.upper())
                record["source_file"] = fpath.name

                # Canonicalize suspect names and deduplicate
                canon_suspects = []
                for p in record.get("persons", []):
                    c_p = clean_name(p)
                    if c_p and c_p not in canon_suspects:
                        canon_suspects.append(c_p)
                record["persons"] = canon_suspects

                # Infer categories and law sections
                content_lower = content.lower()
                if "robbery" in content_lower or "armed" in content_lower:
                    record["crime_category"] = "ARMED ROBBERY / EXTORTION"
                    record["sections"] = ["IPC 392", "IPC 397", "IPC 120B"]
                    record["status"] = "ACTIVE INVESTIGATION"
                elif "receipts" in content_lower or "cash" in content_lower or "hawala" in content_lower or "smurfing" in content_lower:
                    record["crime_category"] = "ILLICIT CASH & HAWALA COURIER"
                    record["sections"] = ["IPC 420", "IPC 468", "PMLA SEC 3", "IPC 120B"]
                    record["status"] = "CHARGE SHEET FILED"
                elif "cyber" in content_lower or "fraud" in content_lower or "sim" in content_lower:
                    record["crime_category"] = "ORGANIZED CYBER CRIME & SIM FRAUD"
                    record["sections"] = ["IT ACT 66D", "IPC 419", "IPC 420", "IPC 120B"]
                    record["status"] = "ACTIVE INVESTIGATION"
                else:
                    record["crime_category"] = "GENERAL CRIME INVESTIGATION"
                    record["sections"] = ["IPC 120B", "IPC 34"]
                    record["status"] = "ACTIVE INVESTIGATION"

                record["narrative"] = content.strip()
                cleaned_firs.append(record)
            except Exception as e:
                logger.warning(f"Error parsing FIR {fpath}: {e}")

    summary["firs"]["cleaned"] = len(cleaned_firs)
    with open(out_path / "firs_cleaned.json", "w", encoding="utf-8") as f:
        json.dump(cleaned_firs, f, indent=2)
    logger.info(f"Cleaned FIRs: {len(cleaned_firs)} records saved.")

    return {
        "status": "success",
        "output_directory": str(out_path),
        "summary": summary
    }
