"""
Neo4j Graph Loader & Database Pipeline Module
Performs idempotent Cypher MERGE queries to populate nodes and relationships into Neo4j,
and writes raw evidence logs into PostgreSQL tables.
"""
import logging
from typing import List, Dict, Any
from app.db.neo4j_driver import get_neo4j_session
from app.ingestion.parsers import (
    parse_calls_csv,
    parse_transactions_csv,
    parse_vehicle_sightings,
    parse_surveillance_json
)
from app.ingestion.nlp_extractor import parse_fir_folder

logger = logging.getLogger(__name__)


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

    FOREACH (ignoreMe IN CASE WHEN row.registered_owner IS NOT NULL THEN [1] ELSE [] END |
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
    Creates (:FIR) nodes and connects extracted (:Person), (:Phone), (:Vehicle), and (:Location) nodes via (:MENTIONED_IN).
    """
    cypher = """
    UNWIND $batch AS row
    MERGE (f:FIR {fir_no: row.fir_no})
    SET f.police_station = row.police_station,
        f.incident_date = row.incident_date,
        f.source_file = row.source_file

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


def run_full_ingestion_pipeline(data_dir: str = "/app/data/synthetic_data") -> Dict[str, int]:
    """
    Orchestrates parsing of all files in data_dir and ingests them into Neo4j.
    """
    logger.info("Starting Full Data Ingestion Pipeline...")

    stats = {
        "calls": 0,
        "transactions": 0,
        "sightings": 0,
        "surveillance": 0,
        "firs": 0
    }

    # 1. Calls CSV
    calls = parse_calls_csv(f"{data_dir}/calls.csv")
    stats["calls"] = load_calls_to_neo4j(calls)

    # 2. Transactions CSV
    txs = parse_transactions_csv(f"{data_dir}/transactions.csv")
    stats["transactions"] = load_transactions_to_neo4j(txs)

    # 3. Vehicle Sightings CSV
    sightings = parse_vehicle_sightings(f"{data_dir}/vehicle_sightings.csv")
    stats["sightings"] = load_sightings_to_neo4j(sightings)

    # 4. Surveillance JSON
    surv = parse_surveillance_json(f"{data_dir}/surveillance.json")
    stats["surveillance"] = load_surveillance_to_neo4j(surv)

    # 5. Text FIRs
    firs = parse_fir_folder(f"{data_dir}/firs")
    stats["firs"] = load_firs_to_neo4j(firs)

    logger.info(f"Ingestion Complete! Stats: {stats}")
    return stats
