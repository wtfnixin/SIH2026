"""
FastAPI Ingestion Router
Provides endpoints for evidence file uploads and pipeline status.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
import shutil
from pathlib import Path
from typing import Dict, Any, Optional
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


@router.post("/upload", dependencies=[Depends(require_permission("investigation:write"))])
async def upload_evidence_file(
    file: UploadFile = File(...),
    mode: Optional[str] = Form("new_case"),
    case_name: Optional[str] = Form(None),
    fir_number: Optional[str] = Form(None),
    person_name: Optional[str] = Form(None),
    officer: Optional[str] = Form(None),
    notes: Optional[str] = Form(None)
) -> Dict[str, Any]:
    """
    Uploads a raw evidence file (CSV, JSON, FIR TXT), attaches it to a new or existing case/person,
    and triggers immediate parsing & Neo4j graph ingestion.
    """
    try:
        dest_path = UPLOAD_DIR / file.filename
        with dest_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run ingestion pipeline over uploads directory
        stats = run_full_ingestion_pipeline(str(UPLOAD_DIR))

        # Perform graph linkage based on mode
        linked_details = {}
        with get_neo4j_session() as session:
            if mode == "existing_case" and person_name:
                fir_ref = fir_number or f"ADDL-{file.filename}"
                query = """
                MERGE (p:Person {name: $person_name})
                MERGE (f:FIR {fir_number: $fir_ref})
                ON CREATE SET f.title = coalesce($case_name, 'Appended Evidence File: ' + $filename),
                              f.status = 'UNDER_INVESTIGATION',
                              f.created_at = datetime()
                MERGE (p)-[:NAMED_IN_FIR]->(f)
                RETURN p.name AS person, f.fir_number AS fir
                """
                res = session.run(query, person_name=person_name, fir_ref=fir_ref, filename=file.filename, case_name=case_name).single()
                if res:
                    linked_details["linked_person"] = res["person"]
                    linked_details["linked_fir"] = res["fir"]

            elif mode == "new_case" and case_name:
                fir_ref = fir_number or f"CASE-{case_name.replace(' ', '_')[:20]}"
                query = """
                MERGE (f:FIR {fir_number: $fir_ref})
                ON CREATE SET f.title = $case_name,
                              f.notes = $notes,
                              f.investigating_officer = $officer,
                              f.status = 'ACTIVE',
                              f.created_at = datetime()
                RETURN f.fir_number AS fir, f.title AS title
                """
                res = session.run(query, fir_ref=fir_ref, case_name=case_name, notes=notes or "", officer=officer or "").single()
                if res:
                    linked_details["created_case"] = res["title"]
                    linked_details["fir_number"] = res["fir"]

        return {
            "status": "success",
            "message": f"Successfully ingested {file.filename}" + (f" and linked to {person_name}" if person_name else f" under case {case_name}" if case_name else ""),
            "filename": file.filename,
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


