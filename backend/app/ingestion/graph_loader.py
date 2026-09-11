"""
Neo4j Graph & PostgreSQL Database Loader Module
Performs clean, deduplicated ingestion of criminal intelligence evidence into
both PostgreSQL relational tables and Neo4j graph nodes and relationships.
Cleans noise nodes and runs entity resolution.
"""
import json
import logging
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import pandas as pd

from app.db.neo4j_driver import get_neo4j_session
from app.db.postgres_driver import SessionLocal, init_db
from app.models.evidence import (
    CallRecord,
    TransactionRecord,
    VehicleSightingRecord,
    SurveillanceRecord,
    FirRecord
)
from app.ingestion.data_cleaner_pipeline import run_data_cleaning_and_deduplication
from app.ingestion.cleaner import clean_name, clean_vehicle_plate, NOISE_PERSON_WORDS
from app.entity_res.graph_merger import resolve_person_nodes_in_neo4j

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# POSTGRESQL BULK INGESTION
# ─────────────────────────────────────────────────────────────

def load_all_to_postgres(
    calls: List[Dict[str, Any]],
    txs: List[Dict[str, Any]],
    sightings: List[Dict[str, Any]],
    surveillance: List[Dict[str, Any]],
    firs: List[Dict[str, Any]]
) -> Dict[str, int]:
    """
    Initializes PostgreSQL tables and bulk-loads all cleaned evidence records.
    """
    init_db()
    db = SessionLocal()
    counts = {"calls": 0, "transactions": 0, "vehicles": 0, "surveillance": 0, "firs": 0}

    try:
        # Clear existing evidence tables for clean state
        db.query(CallRecord).delete()
        db.query(TransactionRecord).delete()
        db.query(VehicleSightingRecord).delete()
        db.query(SurveillanceRecord).delete()
        db.query(FirRecord).delete()
        db.commit()

        # 1. Calls
        call_objs = []
        for c in calls:
            try:
                ts = datetime.fromisoformat(c["timestamp"].replace("Z", "+00:00"))
            except Exception:
                ts = datetime.utcnow()
            call_objs.append(CallRecord(
                caller_number=c["caller_number"],
                receiver_number=c["receiver_number"],
                timestamp=ts,
                duration_seconds=c.get("duration_seconds", 0),
                source_file=c.get("source_file", "calls.csv")
            ))
        if call_objs:
            db.bulk_save_objects(call_objs)
            db.commit()
            counts["calls"] = len(call_objs)

        # 2. Transactions
        tx_objs = []
        for t in txs:
            try:
                ts = datetime.fromisoformat(t["timestamp"].replace("Z", "+00:00"))
            except Exception:
                ts = datetime.utcnow()
            tx_objs.append(TransactionRecord(
                transaction_id=t["transaction_id"],
                sender=t["sender"],
                receiver=t["receiver"],
                amount=float(t["amount"]),
                timestamp=ts,
                mode=t.get("mode", "UPI"),
                is_structured=bool(t.get("is_structured", False)),
                source_file=t.get("source_file", "transactions.csv")
            ))
        if tx_objs:
            db.bulk_save_objects(tx_objs)
            db.commit()
            counts["transactions"] = len(tx_objs)

        # 3. Vehicles
        v_objs = []
        for v in sightings:
            try:
                ts = datetime.fromisoformat(v["timestamp"].replace("Z", "+00:00"))
            except Exception:
                ts = datetime.utcnow()
            v_objs.append(VehicleSightingRecord(
                registration_number=v["registration_number"],
                registered_owner=v.get("registered_owner"),
                location=v["location"],
                timestamp=ts,
                camera_id=v.get("camera_id"),
                source_file=v.get("source_file", "vehicle_sightings.csv")
            ))
        if v_objs:
            db.bulk_save_objects(v_objs)
            db.commit()
            counts["vehicles"] = len(v_objs)

        # 4. Surveillance
        s_objs = []
        for s in surveillance:
            try:
                ts = datetime.fromisoformat(s["timestamp"].replace("Z", "+00:00"))
            except Exception:
                ts = datetime.utcnow()
            s_objs.append(SurveillanceRecord(
                report_id=s["report_id"],
                entity_type=s["entity_type"],
                entity_value=s["entity_value"],
                location=s["location"],
                timestamp=ts,
                observed_by=s.get("observed_by", "Field Unit"),
                source_file=s.get("source_file", "surveillance.json")
            ))
        if s_objs:
            db.bulk_save_objects(s_objs)
            db.commit()
            counts["surveillance"] = len(s_objs)

        # 5. FIRs
        f_objs = []
        for f in firs:
            try:
                inc_date_raw = f.get("incident_date")
                inc_date = datetime.fromisoformat(inc_date_raw.replace("Z", "+00:00")) if inc_date_raw else None
            except Exception:
                inc_date = None
            f_objs.append(FirRecord(
                fir_no=f["fir_no"],
                police_station=f.get("police_station", "Central PS"),
                incident_date=inc_date,
                crime_category=f.get("crime_category", "GENERAL CRIME"),
                status=f.get("status", "ACTIVE INVESTIGATION"),
                sections=f.get("sections", []),
                suspects=f.get("persons", []),
                vehicles=f.get("vehicles", []),
                locations=f.get("locations", []),
                narrative=f.get("narrative", ""),
                source_file=f.get("source_file", "")
            ))
        if f_objs:
            db.bulk_save_objects(f_objs)
            db.commit()
            counts["firs"] = len(f_objs)

        # 6. Extract Timeline Events & Sync to Neo4j
        try:
            from app.services.timeline_service import (
                extract_events_from_fir,
                extract_events_from_cdr,
                extract_events_from_transactions
            )
            for f in firs:
                extract_events_from_fir(db, f)
            extract_events_from_cdr(db, calls)
            extract_events_from_transactions(db, txs)
            logger.info("Timeline events successfully extracted and synced.")
        except Exception as te:
            logger.warning(f"Timeline event extraction note: {te}")

    except Exception as e:
        db.rollback()
        logger.error(f"Error bulk-loading to PostgreSQL: {e}")
        raise
    finally:
        db.close()

    logger.info(f"PostgreSQL Ingestion Complete: {counts}")
    return counts



# ─────────────────────────────────────────────────────────────
# NEO4J GRAPH INGESTION
# ─────────────────────────────────────────────────────────────

def cleanup_dirty_nodes_in_neo4j():
    """
    Cleans up noise Person nodes (e.g. 'Call', 'Driver', 'Himself', 'Investigation', vehicle plates).
    """
    with get_neo4j_session() as session:
        # 1. Delete person nodes matching noise keywords
        cypher_noise = """
        MATCH (p:Person)
        WHERE toUpper(p.name) IN $noise_words 
           OR size(p.name) <= 2
           OR p.name =~ '^[A-Za-z]{2}[0-9]{1,2}[A-Za-z]{1,3}[0-9]{1,4}$'
        DETACH DELETE p
        """
        session.run(cypher_noise, noise_words=list(NOISE_PERSON_WORDS))

        # 2. Canonicalize known alias Person nodes
        cypher_merge_verma = """
        MATCH (p1:Person) WHERE toUpper(p1.name) IN ['SUSPECT RAVI VERMA', 'VERMA']
        MERGE (target:Person {name: 'Ravi Verma'})
        WITH p1, target
        OPTIONAL MATCH (p1)-[r]->(m)
        FOREACH (ignore IN CASE WHEN r IS NOT NULL THEN [1] ELSE [] END |
            MERGE (target)-[:INTERACTED_WITH {evidence: 'Merged Alias'}]->(m)
        )
        WITH p1
        DETACH DELETE p1
        """
        cypher_merge_sharma = """
        MATCH (p1:Person) WHERE toUpper(p1.name) IN ['SHARMA', 'SUSPECT RAHUL SHARMA']
        MERGE (target:Person {name: 'Rahul Sharma'})
        WITH p1, target
        OPTIONAL MATCH (p1)-[r]->(m)
        FOREACH (ignore IN CASE WHEN r IS NOT NULL THEN [1] ELSE [] END |
            MERGE (target)-[:INTERACTED_WITH {evidence: 'Merged Alias'}]->(m)
        )
        WITH p1
        DETACH DELETE p1
        """
        try:
            session.run(cypher_merge_verma)
            session.run(cypher_merge_sharma)
        except Exception as e:
            logger.warning(f"Alias cleanup notice: {e}")



def load_calls_to_neo4j(calls: List[Dict[str, Any]]) -> int:
    """
    Creates (:Phone) nodes and (:CALLED) relationships in Neo4j.
    """
    cypher = """
    UNWIND $batch AS row
    MERGE (p1:Phone {phone_number: row.caller_number})
    MERGE (p2:Phone {phone_number: row.receiver_number})
    MERGE (p1)-[r:CALLED {timestamp: row.timestamp}]->(p2)
    SET r.duration_seconds = row.duration_seconds,
        r.source_file = row.source_file
    """
    with get_neo4j_session() as session:
        session.run(cypher, batch=calls)
    return len(calls)


def load_transactions_to_neo4j(txs: List[Dict[str, Any]]) -> int:
    """
    Creates (:Person) nodes and (:TRANSFERRED_FUNDS) relationships in Neo4j.
    """
    cypher = """
    UNWIND $batch AS row
    MERGE (p1:Person {name: row.sender})
    MERGE (p2:Person {name: row.receiver})
    MERGE (p1)-[r:TRANSFERRED_FUNDS {transaction_id: row.transaction_id}]->(p2)
    SET r.amount = row.amount,
        r.timestamp = row.timestamp,
        r.mode = row.mode,
        r.is_structured = row.is_structured,
        r.source_file = row.source_file
    """
    with get_neo4j_session() as session:
        session.run(cypher, batch=txs)
    return len(txs)


def load_sightings_to_neo4j(sightings: List[Dict[str, Any]]) -> int:
    """
    Creates (:Vehicle), (:Location), and (:Person) nodes with (:SIGHTED_AT) and (:OWNS_VEHICLE) relationships.
    """
    cypher = """
    UNWIND $batch AS row
    MERGE (v:Vehicle {registration_number: row.registration_number})
    MERGE (l:Location {name: row.location})
    MERGE (v)-[r:SIGHTED_AT {timestamp: row.timestamp}]->(l)
    SET r.camera_id = row.camera_id,
        r.source_file = row.source_file

    FOREACH (ignoreMe IN CASE WHEN row.registered_owner IS NOT NULL AND row.registered_owner <> 'Unknown Owner' THEN [1] ELSE [] END |
        MERGE (p:Person {name: row.registered_owner})
        MERGE (p)-[:OWNS_VEHICLE]->(v)
    )
    """
    with get_neo4j_session() as session:
        session.run(cypher, batch=sightings)
    return len(sightings)


def load_surveillance_to_neo4j(reports: List[Dict[str, Any]]) -> int:
    """
    Creates (:Location) and entity nodes (:Person, :Vehicle, :Phone) with (:OBSERVED_AT) relationships.
    """
    cypher = """
    UNWIND $batch AS row
    MERGE (l:Location {name: row.location})

    FOREACH (ignoreMe IN CASE WHEN row.entity_type = 'Person' THEN [1] ELSE [] END |
        MERGE (p:Person {name: row.entity_value})
        MERGE (p)-[r1:OBSERVED_AT {timestamp: row.timestamp}]->(l)
        SET r1.report_id = row.report_id, r1.observed_by = row.observed_by
    )

    FOREACH (ignoreMe IN CASE WHEN row.entity_type = 'Vehicle' THEN [1] ELSE [] END |
        MERGE (v:Vehicle {registration_number: row.entity_value})
        MERGE (v)-[r2:OBSERVED_AT {timestamp: row.timestamp}]->(l)
        SET r2.report_id = row.report_id, r2.observed_by = row.observed_by
    )

    FOREACH (ignoreMe IN CASE WHEN row.entity_type = 'Phone' THEN [1] ELSE [] END |
        MERGE (ph:Phone {phone_number: row.entity_value})
        MERGE (ph)-[r3:OBSERVED_AT {timestamp: row.timestamp}]->(l)
        SET r3.report_id = row.report_id, r3.observed_by = row.observed_by
    )
    """
    with get_neo4j_session() as session:
        session.run(cypher, batch=reports)
    return len(reports)


def load_firs_to_neo4j(firs: List[Dict[str, Any]]) -> int:
    """
    Creates (:FIR) nodes and connects extracted (:Person), (:Phone), (:Vehicle), and (:Location) nodes.
    """
    cypher = """
    UNWIND $batch AS row
    MERGE (f:FIR {fir_no: row.fir_no})
    SET f.police_station = row.police_station,
        f.incident_date = row.incident_date,
        f.source_file = row.source_file,
        f.crime_category = row.crime_category,
        f.status = row.status

    FOREACH (p_name IN row.persons |
        MERGE (p:Person {name: p_name})
        MERGE (p)-[:MENTIONED_IN]->(f)
    )

    FOREACH (ph_num IN row.phones |
        MERGE (ph:Phone {phone_number: ph_num})
        MERGE (ph)-[:MENTIONED_IN]->(f)
    )

    FOREACH (v_plate IN row.vehicles |
        MERGE (v:Vehicle {registration_number: v_plate})
        MERGE (v)-[:MENTIONED_IN]->(f)
    )

    FOREACH (loc_name IN row.locations |
        MERGE (l:Location {name: loc_name})
        MERGE (f)-[:OCCURRED_AT]->(l)
    )
    """
    with get_neo4j_session() as session:
        session.run(cypher, batch=firs)
    return len(firs)


# ─────────────────────────────────────────────────────────────
# FULL END-TO-END PIPELINE ORCHESTRATOR
# ─────────────────────────────────────────────────────────────

def run_full_ingestion_pipeline(
    data_dir: str = "/app/data/synthetic_data",
    cleaned_dir: str = "/app/data/cleaned_datasets"
) -> Dict[str, Any]:
    """
    Orchestrates full data cleaning, deduplication, and database ingestion into both
    PostgreSQL and Neo4j, followed by automated entity resolution.
    """
    logger.info("Starting Full Clean Data Ingestion Pipeline...")

    # 1. Run Data Cleaning and Deduplication
    cleaning_res = run_data_cleaning_and_deduplication(source_dir=data_dir, output_dir=cleaned_dir)

    # 2. Read Cleaned Datasets
    clean_path = Path(cleaned_dir)
    df_calls = pd.read_csv(clean_path / "calls_cleaned.csv")
    calls = df_calls.to_dict(orient="records")

    df_tx = pd.read_csv(clean_path / "transactions_cleaned.csv")
    txs = df_tx.to_dict(orient="records")

    df_veh = pd.read_csv(clean_path / "vehicles_cleaned.csv")
    sightings = df_veh.to_dict(orient="records")

    with open(clean_path / "surveillance_cleaned.json", "r", encoding="utf-8") as f:
        surveillance = json.load(f)

    with open(clean_path / "firs_cleaned.json", "r", encoding="utf-8") as f:
        firs = json.load(f)

    # 3. Ingest into PostgreSQL
    postgres_stats = load_all_to_postgres(calls, txs, sightings, surveillance, firs)

    # 4. Clean Dirty Noise Nodes in Neo4j
    cleanup_dirty_nodes_in_neo4j()

    # 5. Ingest Clean Records into Neo4j
    neo4j_stats = {
        "calls": load_calls_to_neo4j(calls),
        "transactions": load_transactions_to_neo4j(txs),
        "sightings": load_sightings_to_neo4j(sightings),
        "surveillance": load_surveillance_to_neo4j(surveillance),
        "firs": load_firs_to_neo4j(firs)
    }

    # 6. Run Entity Resolution Scan
    resolution_stats = resolve_person_nodes_in_neo4j()

    logger.info("Ingestion & Resolution Complete!")
    return {
        "status": "success",
        "cleaning_summary": cleaning_res["summary"],
        "postgres_ingestion": postgres_stats,
        "neo4j_ingestion": neo4j_stats,
        "entity_resolution": resolution_stats
    }
