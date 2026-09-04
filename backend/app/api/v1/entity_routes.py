"""
FastAPI Entity Resolution & Dossier Router
Provides endpoints for suspect search, detailed criminal profiles, and candidate alias pairs.
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, List
from app.db.neo4j_driver import get_neo4j_session
from app.entity_res.graph_merger import resolve_person_nodes_in_neo4j

router = APIRouter(prefix="/entities", tags=["Entities & Dossiers"])


@router.get("/search")
def search_entities(q: str = Query(...)) -> List[Dict[str, Any]]:
    """
    Searches suspect names, phone numbers, vehicle plates, or locations across the graph.
    """
    cypher = """
    MATCH (n)
    WHERE (n:Person AND toLower(n.name) CONTAINS toLower($q))
       OR (n:Phone AND n.phone_number CONTAINS $q)
       OR (n:Vehicle AND toLower(n.registration_number) CONTAINS toLower($q))
       OR (n:Location AND toLower(n.name) CONTAINS toLower($q))
    RETURN n, labels(n)[0] AS type
    LIMIT 20
    """
    try:
        with get_neo4j_session() as session:
            records = session.run(cypher, q=q).data()

        results = []
        for r in records:
            n = r["n"]
            entity_id = n.get("name") or n.get("phone_number") or n.get("registration_number")
            results.append({
                "entity_id": entity_id,
                "type": r["type"],
                "properties": dict(n)
            })

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dossier/{entity_id}")
def get_entity_dossier(entity_id: str) -> Dict[str, Any]:
    """
    Returns full criminal dossier profile for a specific suspect entity.
    """
    cypher = """
    MATCH (n)
    WHERE n.name = $id OR n.phone_number = $id OR n.registration_number = $id
    OPTIONAL MATCH (n)-[r]-(m)
    RETURN n, labels(n)[0] AS label, collect({rel: type(r), connected_entity: m, connected_label: labels(m)[0]}) AS connections
    """
    try:
        with get_neo4j_session() as session:
            record = session.run(cypher, id=entity_id).single()

        if not record or not record["n"]:
            raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")

        n = record["n"]
        label = record["label"]
        connections = record["connections"]

        formatted_connections = []
        for c in connections:
            m = c["connected_entity"]
            if m:
                m_id = m.get("name") or m.get("phone_number") or m.get("registration_number") or m.get("fir_no")
                formatted_connections.append({
                    "relationship": c["rel"],
                    "connected_entity": m_id,
                    "connected_type": c["connected_label"]
                })

        return {
            "entity_id": entity_id,
            "entity_type": label,
            "properties": dict(n),
            "total_connections": len(formatted_connections),
            "connected_evidence": formatted_connections
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/aliases")
def get_probable_aliases() -> Dict[str, Any]:
    """
    Runs entity resolution scan and returns flagged PROBABLE_ALIAS candidate pairs for officer review.
    """
    return resolve_person_nodes_in_neo4j()
