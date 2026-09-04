"""
FastAPI Ingestion Router
Provides endpoints for evidence file uploads and pipeline status.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
from pathlib import Path
from typing import Dict, Any
from app.ingestion.graph_loader import run_full_ingestion_pipeline
from app.db.neo4j_driver import get_neo4j_session

router = APIRouter(prefix="/ingest", tags=["Data Ingestion"])

UPLOAD_DIR = Path("/app/data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_evidence_file(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Uploads a raw evidence file (CSV, JSON, FIR TXT) and triggers immediate parsing & Neo4j ingestion.
    """
    try:
        dest_path = UPLOAD_DIR / file.filename
        with dest_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run ingestion pipeline over uploads directory
        stats = run_full_ingestion_pipeline(str(UPLOAD_DIR))

        return {
            "status": "success",
            "message": f"Successfully uploaded and ingested {file.filename}",
            "filename": file.filename,
            "ingestion_stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
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
