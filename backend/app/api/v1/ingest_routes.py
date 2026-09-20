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
from app.db.postgres_driver import get_db
from app.db.neo4j_driver import get_neo4j_session
from sqlalchemy.orm import Session
from app.models.audit import User
from app.auth.dependencies import get_current_user, require_permission
from app.services.integrity_service import register_evidence_file

router = APIRouter(prefix="/ingest", tags=["Data Ingestion"])

import os

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/data/uploads" if os.path.exists("/app") else str(Path(__file__).resolve().parent.parent.parent.parent / "data" / "uploads")))
try:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass

ALLOWED_EXTENSIONS = {".csv", ".json", ".txt", ".pdf"}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB limit per file


def parse_and_link_evidence_file(file_path: Path, fir_ref: str, session):
    """
    Parses an uploaded evidence file (CSV, JSON, TXT) and creates Neo4j nodes & relationships
    linked directly to the specified FIR case (fir_ref).
    """
    fname = file_path.name.lower()
    ext = file_path.suffix.lower()
    
    try:
        # 1. JSON FILE INGESTION (FIR documents, Suspect lists, Transactions, Logs)
        if ext == '.json':
            try:
                with open(file_path, 'r', encoding='utf-8') as jf:
                    data = json.load(jf)
            except Exception as je:
                print(f"Failed to parse JSON file {fname}: {je}")
                return

            records = data if isinstance(data, list) else [data]
            for item in records:
                if not isinstance(item, dict):
                    continue

                # FIR Case Details
                fir_id = item.get("fir_no") or item.get("fir_number") or item.get("fir_id") or fir_ref
                title = item.get("title") or item.get("case_name") or item.get("incident_type")
                station = item.get("police_station") or item.get("station")
                incident_date = item.get("incident_date") or item.get("date")
                narrative = item.get("narrative") or item.get("description") or item.get("details") or item.get("statement") or item.get("notes")
                sections = item.get("sections") or item.get("ipc_sections")
                sections_str = ", ".join(str(s) for s in sections) if isinstance(sections, list) else (str(sections) if sections else None)

                session.run("""
                    MERGE (f:FIR {fir_number: $fir_id})
                    ON CREATE SET f.fir_no = $fir_id, f.status = 'ACTIVE INVESTIGATION', f.created_at = datetime()
                    SET f.fir_no = coalesce(f.fir_no, $fir_id),
                        f.title = coalesce($title, f.title),
                        f.police_station = coalesce($station, f.police_station),
                        f.incident_date = coalesce($incident_date, f.incident_date),
                        f.narrative = coalesce($narrative, f.narrative),
                        f.ipc_sections = coalesce($sections_str, f.ipc_sections)
                """, fir_id=fir_id, title=title, station=station, incident_date=incident_date, narrative=narrative, sections_str=sections_str)

                # Suspects / Accused / Persons Mentioned
                suspects_raw = item.get("suspects") or item.get("accused") or item.get("persons") or item.get("suspect_list") or []
                if isinstance(suspects_raw, str):
                    suspects_raw = [s.strip() for s in suspects_raw.split(",") if s.strip()]
                elif isinstance(suspects_raw, dict):
                    suspects_raw = [suspects_raw]

                for p_entry in suspects_raw:
                    if isinstance(p_entry, str):
                        p_name = p_entry.strip()
                        p_props = {}
                    elif isinstance(p_entry, dict):
                        p_name = p_entry.get("name") or p_entry.get("suspect_name") or p_entry.get("person_name")
                        p_props = p_entry
                    else:
                        continue

                    if p_name and p_name.lower() not in ['nan', 'null', 'none', '']:
                        session.run("""
                            MERGE (p:Person {name: $name})
                            SET p.age = coalesce($age, p.age),
                                p.phone_number = coalesce($phone, p.phone_number),
                                p.occupation = coalesce($occupation, p.occupation),
                                p.location = coalesce($location, p.location),
                                p.aliases = coalesce($aliases, p.aliases),
                                p.crime_category = coalesce($crime_category, p.crime_category),
                                p.status = coalesce(p.status, 'IDENTIFIED')
                            MERGE (f:FIR {fir_number: $fir_id})
                            MERGE (p)-[:NAMED_IN_FIR]->(f)
                        """,
                        name=p_name,
                        age=p_props.get("age"),
                        phone=p_props.get("phone") or p_props.get("phone_number"),
                        occupation=p_props.get("occupation"),
                        location=p_props.get("location") or p_props.get("city"),
                        aliases=p_props.get("aliases") or p_props.get("alias"),
                        crime_category=p_props.get("crime_category") or p_props.get("crime"),
                        fir_id=fir_id
                        )

                        if p_props.get("phone") or p_props.get("phone_number"):
                            ph_val = str(p_props.get("phone") or p_props.get("phone_number")).strip()
                            session.run("""
                                MERGE (p:Person {name: $name})
                                MERGE (ph:Phone {phone_number: $ph_val})
                                MERGE (p)-[:USES_PHONE]->(ph)
                                MERGE (f:FIR {fir_number: $fir_id})
                                MERGE (ph)-[:MENTIONED_IN]->(f)
                            """, name=p_name, ph_val=ph_val, fir_id=fir_id)

                        p_vehs = p_props.get("vehicles") or []
                        if isinstance(p_vehs, str):
                            p_vehs = [v.strip() for v in p_vehs.split(",") if v.strip()]
                        for pv in p_vehs:
                            pv_plate = (pv.get("registration_number") or pv.get("plate") if isinstance(pv, dict) else str(pv)).strip().upper()
                            if pv_plate and pv_plate not in ['NAN', 'NULL', 'NONE']:
                                session.run("""
                                    MERGE (p:Person {name: $name})
                                    MERGE (v:Vehicle {registration_number: $plate})
                                    MERGE (p)-[:DRIVES]->(v)
                                    MERGE (f:FIR {fir_number: $fir_id})
                                    MERGE (v)-[:INVOLVES_VEHICLE]->(f)
                                """, name=p_name, plate=pv_plate, fir_id=fir_id)

                # Vehicles
                veh_raw = item.get("vehicles") or item.get("cars") or []
                if isinstance(veh_raw, str):
                    veh_raw = [v.strip() for v in veh_raw.split(",") if v.strip()]
                for v_entry in veh_raw:
                    plate = (v_entry.get("registration_number") or v_entry.get("plate") if isinstance(v_entry, dict) else str(v_entry)).strip().upper()
                    if plate and plate not in ['NAN', 'NULL', 'NONE']:
                        session.run("""
                            MERGE (v:Vehicle {registration_number: $plate})
                            MERGE (f:FIR {fir_number: $fir_id})
                            MERGE (v)-[:INVOLVES_VEHICLE]->(f)
                        """, plate=plate, fir_id=fir_id)

                # Phones
                phone_raw = item.get("phones") or item.get("phone_numbers") or []
                if isinstance(phone_raw, str):
                    phone_raw = [ph.strip() for ph in phone_raw.split(",") if ph.strip()]
                for ph_entry in phone_raw:
                    ph_num = (ph_entry.get("phone_number") or ph_entry.get("number") if isinstance(ph_entry, dict) else str(ph_entry)).strip()
                    if ph_num and ph_num not in ['nan', 'null', 'none']:
                        session.run("""
                            MERGE (ph:Phone {phone_number: $ph_num})
                            MERGE (f:FIR {fir_number: $fir_id})
                            MERGE (ph)-[:MENTIONED_IN]->(f)
                        """, ph_num=ph_num, fir_id=fir_id)

                # Locations
                loc_raw = item.get("locations") or []
                if isinstance(loc_raw, str):
                    loc_raw = [l.strip() for l in loc_raw.split(",") if l.strip()]
                for l_entry in loc_raw:
                    l_name = (l_entry.get("name") or l_entry.get("location") if isinstance(l_entry, dict) else str(l_entry)).strip()
                    if l_name and l_name not in ['nan', 'null', 'none']:
                        session.run("""
                            MERGE (l:Location {name: $l_name})
                            MERGE (f:FIR {fir_number: $fir_id})
                            MERGE (l)-[:LOCATED_AT]->(f)
                        """, l_name=l_name, fir_id=fir_id)

                # Financial Transactions
                tx_raw = item.get("transactions") or item.get("financial_records") or []
                for t_entry in tx_raw:
                    if isinstance(t_entry, dict):
                        snd = t_entry.get("sender") or t_entry.get("from")
                        rcv = t_entry.get("receiver") or t_entry.get("to")
                        amt = t_entry.get("amount") or 0
                        mode = t_entry.get("mode") or "TRANSFER"
                        ts = t_entry.get("timestamp") or "2026-08-15T12:00:00Z"
                        if snd and rcv:
                            session.run("""
                                MERGE (p1:Person {name: $snd})
                                MERGE (p2:Person {name: $rcv})
                                MERGE (f:FIR {fir_number: $fir_id})
                                CREATE (p1)-[:TRANSFERRED_FUNDS {amount: $amt, mode: $mode, timestamp: $ts}]->(p2)
                                MERGE (p1)-[:MENTIONED_IN]->(f)
                                MERGE (p2)-[:MENTIONED_IN]->(f)
                            """, snd=snd, rcv=rcv, amt=amt, mode=mode, ts=ts, fir_id=fir_id)

                # Call logs
                call_raw = item.get("calls") or item.get("call_logs") or []
                for c_entry in call_raw:
                    if isinstance(c_entry, dict):
                        caller = c_entry.get("caller") or c_entry.get("from")
                        receiver = c_entry.get("receiver") or c_entry.get("to")
                        dur = c_entry.get("duration") or 60
                        ts = c_entry.get("timestamp") or "2026-08-15T10:00:00Z"
                        if caller and receiver:
                            session.run("""
                                MERGE (p1:Person {name: $caller})
                                MERGE (ph1:Phone {phone_number: $caller})
                                MERGE (p1)-[:USES_PHONE]->(ph1)
                                MERGE (p2:Person {name: $receiver})
                                MERGE (ph2:Phone {phone_number: $receiver})
                                MERGE (p2)-[:USES_PHONE]->(ph2)
                                MERGE (f:FIR {fir_number: $fir_id})
                                MERGE (ph1)-[:CALLED {duration_seconds: $dur, timestamp: $ts}]->(ph2)
                                MERGE (p1)-[:CALLED {duration_seconds: $dur, timestamp: $ts}]->(p2)
                                MERGE (p1)-[:MENTIONED_IN]->(f)
                                MERGE (p2)-[:MENTIONED_IN]->(f)
                            """, caller=caller, receiver=receiver, dur=dur, ts=ts, fir_id=fir_id)

        # 2. CSV / TXT TABULAR FILES
        elif ext in ['.csv', '.txt']:
            try:
                df = pd.read_csv(file_path)
            except Exception:
                return

            cols = [c.lower().strip() for c in df.columns]
            df.columns = cols

            # TELECOM CALL LOGS (CDR)
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
                    ON CREATE SET f.fir_no = $fir_ref, f.status = 'ACTIVE INVESTIGATION'
                    SET f.fir_no = coalesce(f.fir_no, $fir_ref)
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

            # FINANCIAL TRANSACTIONS / HAWALA LEDGERS
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

            # VEHICLE TOLLS / ANPR SIGHTINGS
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


@router.post("/upload")
async def upload_evidence_file(
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    mode: Optional[str] = Form("new_case"),
    case_name: Optional[str] = Form(None),
    fir_number: Optional[str] = Form(None),
    person_name: Optional[str] = Form(None),
    officer: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    classification: Optional[str] = Form("CONFIDENTIAL"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Uploads raw evidence files (CSV, JSON, FIR TXT), attaches them to a new or existing case/person,
    computes immutable SHA-256 cryptographic signatures into Evidence Vault, and triggers Neo4j graph ingestion.
    """
    try:
        file_list = []
        if files:
            file_list.extend(files)
        if file and file not in file_list:
            file_list.append(file)

        if not file_list:
            raise HTTPException(status_code=400, detail="No evidence files uploaded.")

        # Determine target FIR reference
        if mode == "existing_case" and person_name:
            fir_ref = fir_number or f"ADDL-{file_list[0].filename}"
        else:
            c_title = case_name or file_list[0].filename
            fir_ref = fir_number or f"FIR-2026-CASE-{(hash(c_title) % 900 + 100)}"

        saved_paths = []
        evidence_records = []
        for f in file_list:
            ext = Path(f.filename).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
                )

            dest_path = UPLOAD_DIR / f.filename
            with dest_path.open("wb") as buffer:
                shutil.copyfileobj(f.file, buffer)
            saved_paths.append(dest_path)

            # Detect evidence category
            fname_lower = f.filename.lower()
            ev_type = "CDR"
            if any(k in fname_lower for k in ["trans", "bank", "upi", "financial"]):
                ev_type = "BANK_TRANSACTION"
            elif any(k in fname_lower for k in ["vehicle", "anpr", "toll", "traffic"]):
                ev_type = "ANPR_LOG"
            elif any(k in fname_lower for k in ["surv", "cctv", "intel", "field"]):
                ev_type = "SURVEILLANCE"
            elif any(k in fname_lower for k in ["fir", "complaint", "report"]):
                ev_type = "FIR_DOCUMENT"

            # Register with SHA-256 Cryptographic Signature in Evidence Vault
            ev_rec = register_evidence_file(
                db=db,
                file_path=dest_path,
                case_id=fir_ref,
                evidence_type=ev_type,
                ingested_by=current_user.username,
                classification=classification or "CONFIDENTIAL"
            )
            evidence_records.append({
                "evidence_id": ev_rec.evidence_id,
                "file_name": ev_rec.file_name,
                "sha256": ev_rec.sha256_hash,
                "type": ev_rec.evidence_type,
                "integrity_status": ev_rec.integrity_status
            })

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

        filenames_str = ", ".join([f.filename for f in file_list])
        return {
            "status": "success",
            "message": f"Successfully ingested and cryptographically signed {len(file_list)} file(s) [{filenames_str}] under case {fir_ref}",
            "filenames": [f.filename for f in file_list],
            "mode": mode,
            "case_name": case_name,
            "person_name": person_name,
            "linked_details": linked_details,
            "evidence_vault_records": evidence_records,
            "fir_number": fir_ref
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



