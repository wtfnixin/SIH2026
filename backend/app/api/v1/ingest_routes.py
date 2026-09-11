"""
FastAPI Ingestion Router
Provides endpoints for evidence file uploads and pipeline status.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
import pandas as pd
import json
from app.ingestion.graph_loader import run_full_ingestion_pipeline
from app.db.neo4j_driver import get_neo4j_session
from app.auth.dependencies import require_permission

router = APIRouter(prefix="/ingest", tags=["Data Ingestion"])

import os

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/data/uploads" if os.path.exists("/app") else str(Path(__file__).resolve().parent.parent.parent.parent / "data" / "uploads")))
try:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass


def parse_and_link_evidence_file(file_path: Path, fir_ref: str, session):
    """
    Parses an uploaded evidence file (CSV, JSON, TXT) and creates Neo4j nodes & relationships
    linked directly to the specified FIR case (fir_ref).
    """
    fname = file_path.name.lower()
    
    try:
        if file_path.suffix.lower() in ['.csv', '.txt']:
            try:
                df = pd.read_csv(file_path)
            except Exception:
                return

            cols = [c.lower().strip() for c in df.columns]
            df.columns = cols

            # 1. TELECOM CALL LOGS (CDR)
            is_calls = any(k in fname for k in ['call', 'cdr', 'phone', 'telecom']) or any(c in cols for c in ['caller', 'receiver', 'phone_a', 'phone_b', 'caller_number', 'receiver_number'])
            if is_calls:
                caller_col = next((c for c in cols if 'caller' in c or 'phone_a' in c or 'from' in c or 'source' in c), cols[0] if len(cols)>0 else None)
                receiver_col = next((c for c in cols if 'receiver' in c or 'phone_b' in c or 'to' in c or 'target' in c), cols[1] if len(cols)>1 else None)
                time_col = next((c for c in cols if 'time' in c or 'date' in c), None)
                dur_col = next((c for c in cols if 'dur' in c), None)

                if caller_col and receiver_col:
                    cypher_call = """
                    UNWIND $batch AS row
                    MERGE (f:FIR {fir_number: $fir_ref})
                    MERGE (p1:Person {name: row.caller})
                    MERGE (ph1:Phone {phone_number: row.caller})
                    MERGE (p1)-[:USES_PHONE]->(ph1)
                    
                    MERGE (p2:Person {name: row.receiver})
                    MERGE (ph2:Phone {phone_number: row.receiver})
                    MERGE (p2)-[:USES_PHONE]->(ph2)
                    
                    MERGE (ph1)-[r1:CALLED {timestamp: row.timestamp, duration_seconds: row.duration}]->(ph2)
                    MERGE (p1)-[r2:CALLED {timestamp: row.timestamp, duration_seconds: row.duration}]->(p2)
                    
                    MERGE (p1)-[:MENTIONED_IN]->(f)
                    MERGE (p2)-[:MENTIONED_IN]->(f)
                    MERGE (ph1)-[:MENTIONED_IN]->(f)
                    MERGE (ph2)-[:MENTIONED_IN]->(f)
                    """
                    batch = []
                    for idx, row in df.iterrows():
                        c_val = str(row[caller_col]).strip()
                        r_val = str(row[receiver_col]).strip()
                        ts_val = str(row[time_col]) if time_col and pd.notna(row[time_col]) else f"2026-08-15T{(10+(idx%12)):02d}:30:00Z"
                        dur_val = int(row[dur_col]) if dur_col and pd.notna(row[dur_col]) and str(row[dur_col]).isdigit() else 120
                        if c_val and r_val and c_val != 'nan' and r_val != 'nan':
                            batch.append({"caller": c_val, "receiver": r_val, "timestamp": ts_val, "duration": dur_val})
                    if batch:
                        session.run(cypher_call, batch=batch, fir_ref=fir_ref)

            # 2. FINANCIAL TRANSACTIONS / HAWALA LEDGERS
            is_tx = any(k in fname for k in ['tx', 'trans', 'hawala', 'bank', 'ledger', 'money', 'payment']) or any(c in cols for c in ['amount', 'money', 'sender', 'receiver', 'from_account', 'to_account'])
            if is_tx and not is_calls:
                sender_col = next((c for c in cols if 'send' in c or 'from' in c or 'source' in c or 'payer' in c), cols[0] if len(cols)>0 else None)
                receiver_col = next((c for c in cols if 'receiv' in c or 'to' in c or 'target' in c or 'payee' in c), cols[1] if len(cols)>1 else None)
                amt_col = next((c for c in cols if 'amount' in c or 'money' in c or 'val' in c or 'rs' in c or 'inr' in c), None)
                time_col = next((c for c in cols if 'time' in c or 'date' in c), None)
                mode_col = next((c for c in cols if 'mode' in c or 'type' in c or 'channel' in c), None)

                if sender_col and receiver_col:
                    cypher_tx = """
                    UNWIND $batch AS row
                    MERGE (f:FIR {fir_number: $fir_ref})
                    MERGE (p1:Person {name: row.sender})
                    MERGE (p2:Person {name: row.receiver})
                    
                    CREATE (p1)-[r:TRANSFERRED_FUNDS {amount: row.amount, mode: row.mode, timestamp: row.timestamp}]->(p2)
                    
                    MERGE (p1)-[:MENTIONED_IN]->(f)
                    MERGE (p2)-[:MENTIONED_IN]->(f)
                    """
                    batch = []
                    for idx, row in df.iterrows():
                        s_val = str(row[sender_col]).strip()
                        r_val = str(row[receiver_col]).strip()
                        amt_val = 50000
                        if amt_col and pd.notna(row[amt_col]):
                            try:
                                amt_val = int(float(str(row[amt_col]).replace(',', '').replace('₹', '').replace('Rs', '').strip()))
                            except Exception:
                                pass
                        ts_val = str(row[time_col]) if time_col and pd.notna(row[time_col]) else f"2026-08-15T{(11+(idx%10)):02d}:15:00Z"
                        m_val = str(row[mode_col]) if mode_col and pd.notna(row[mode_col]) else "HAWALA / BANK"
                        if s_val and r_val and s_val != 'nan' and r_val != 'nan':
                            batch.append({"sender": s_val, "receiver": r_val, "amount": amt_val, "mode": m_val, "timestamp": ts_val})
                    if batch:
                        session.run(cypher_tx, batch=batch, fir_ref=fir_ref)

            # 3. VEHICLE TOLLS / ANPR SIGHTINGS
            is_veh = any(k in fname for k in ['toll', 'convoy', 'vehicle', 'anpr']) or any(c in cols for c in ['plate', 'vehicle', 'gantry', 'location'])
            if is_veh and not is_calls and not is_tx:
                plate_col = next((c for c in cols if 'plate' in c or 'reg' in c or 'veh' in c), cols[0] if len(cols)>0 else None)
                loc_col = next((c for c in cols if 'loc' in c or 'gantry' in c or 'toll' in c or 'cam' in c), cols[1] if len(cols)>1 else None)
                time_col = next((c for c in cols if 'time' in c or 'date' in c), None)

                if plate_col and loc_col:
                    cypher_veh = """
                    UNWIND $batch AS row
                    MERGE (f:FIR {fir_number: $fir_ref})
                    MERGE (v:Vehicle {registration_number: row.plate})
                    MERGE (l:Location {name: row.location, city: 'Bengaluru'})
                    
                    CREATE (v)-[r:SIGHTED_AT {timestamp: row.timestamp}]->(l)
                    
                    MERGE (v)-[:INVOLVES_VEHICLE]->(f)
                    MERGE (l)-[:LOCATED_AT]->(f)
                    """
                    batch = []
                    for idx, row in df.iterrows():
                        p_val = str(row[plate_col]).strip().upper()
                        l_val = str(row[loc_col]).strip()
                        ts_val = str(row[time_col]) if time_col and pd.notna(row[time_col]) else f"2026-08-15T{(9+(idx%10)):02d}:45:00Z"
                        if p_val and l_val and p_val != 'NAN' and l_val != 'nan':
                            batch.append({"plate": p_val, "location": l_val, "timestamp": ts_val})
                    if batch:
                        session.run(cypher_veh, batch=batch, fir_ref=fir_ref)

    except Exception as e:
        print(f"Error parsing evidence file {fname} for {fir_ref}: {e}")


@router.post("/upload", dependencies=[Depends(require_permission("investigation:write"))])
async def upload_evidence_file(
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    mode: Optional[str] = Form("new_case"),
    case_name: Optional[str] = Form(None),
    fir_number: Optional[str] = Form(None),
    person_name: Optional[str] = Form(None),
    officer: Optional[str] = Form(None),
    notes: Optional[str] = Form(None)
) -> Dict[str, Any]:
    """
    Uploads raw evidence files (CSV, JSON, FIR TXT), attaches them to a new or existing case/person,
    and triggers immediate parsing & Neo4j graph ingestion linked directly to the FIR case.
    """
    try:
        file_list = []
        if files:
            file_list.extend(files)
        if file and file not in file_list:
            file_list.append(file)

        if not file_list:
            raise HTTPException(status_code=400, detail="No evidence files uploaded.")

        saved_paths = []
        for f in file_list:
            dest_path = UPLOAD_DIR / f.filename
            with dest_path.open("wb") as buffer:
                shutil.copyfileobj(f.file, buffer)
            saved_paths.append(dest_path)

        # Determine target FIR reference
        if mode == "existing_case" and person_name:
            fir_ref = fir_number or f"ADDL-{file_list[0].filename}"
        else:
            c_title = case_name or file_list[0].filename
            fir_ref = fir_number or f"FIR-2026-CASE-{(hash(c_title) % 900 + 100)}"

        # Perform graph linkage and evidence parsing
        linked_details = {}
        with get_neo4j_session() as session:
            if mode == "existing_case" and person_name:
                query = """
                MERGE (p:Person {name: $person_name})
                MERGE (f:FIR {fir_number: $fir_ref})
                ON CREATE SET f.title = coalesce($case_name, 'Appended Evidence Case'),
                              f.status = 'UNDER_INVESTIGATION',
                              f.created_at = datetime()
                MERGE (p)-[:NAMED_IN_FIR]->(f)
                RETURN p.name AS person, f.fir_number AS fir
                """
                res = session.run(query, person_name=person_name, fir_ref=fir_ref, case_name=case_name).single()
                if res:
                    linked_details["linked_person"] = res["person"]
                    linked_details["linked_fir"] = res["fir"]

            elif mode == "new_case" and case_name:
                query = """
                MERGE (f:FIR {fir_number: $fir_ref})
                SET f.fir_no = $fir_ref,
                    f.fir_number = $fir_ref,
                    f.title = $case_name,
                    f.narrative = case when $notes <> '' then $notes else 'New evidence dossier ingested for investigation: ' + $case_name end,
                    f.notes = $notes,
                    f.investigating_officer = case when $officer <> '' then $officer else 'Special Investigation Division' end,
                    f.police_station = case when $officer <> '' then $officer else 'Central Jurisdiction PS' end,
                    f.status = 'ACTIVE',
                    f.created_at = datetime()
                RETURN f.fir_number AS fir, f.title AS title
                """
                res = session.run(query, fir_ref=fir_ref, case_name=case_name, notes=notes or "", officer=officer or "").single()
                if res:
                    linked_details["created_case"] = res["title"]
                    linked_details["fir_number"] = res["fir"]

            # Parse each evidence file and link nodes/relationships directly to fir_ref
            for sp in saved_paths:
                parse_and_link_evidence_file(sp, fir_ref, session)

        # Run pipeline refresh over uploads directory
        stats = run_full_ingestion_pipeline(str(UPLOAD_DIR))

        filenames_str = ", ".join([f.filename for f in file_list])
        return {
            "status": "success",
            "message": f"Successfully ingested {len(file_list)} file(s) [{filenames_str}] under case {fir_ref}",
            "filenames": [f.filename for f in file_list],
            "mode": mode,
            "case_name": case_name,
            "person_name": person_name,
            "linked_details": linked_details,
            "ingestion_stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", dependencies=[Depends(require_permission("investigation:read"))])
def get_pipeline_status() -> Dict[str, Any]:
    """
    Returns current node and relationship counts in the Neo4j database.
    """
    try:
        with get_neo4j_session() as session:
            node_counts = session.run("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count").data()
            rel_counts = session.run("MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count").data()

        total_nodes = sum(r["count"] for r in node_counts)
        total_rels = sum(r["count"] for r in rel_counts)

        return {
            "pipeline_status": "ACTIVE",
            "total_nodes": total_nodes,
            "total_relationships": total_rels,
            "node_breakdown": {r["label"]: r["count"] for r in node_counts},
            "relationship_breakdown": {r["type"]: r["count"] for r in rel_counts}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clean-and-reload", dependencies=[Depends(require_permission("system:admin"))])
def trigger_clean_and_reload() -> Dict[str, Any]:
    """
    Executes end-to-end data cleaning, deduplication, canonical dataset generation,
    and bulk ingestion into both PostgreSQL and Neo4j databases.
    Requires ADMIN privileges.
    """
    try:
        results = run_full_ingestion_pipeline(
            data_dir="/app/data/synthetic_data",
            cleaned_dir="/app/data/cleaned_datasets"
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



