"""
FastAPI Graph Analytics Router
Provides endpoints for Cytoscape.js visual graph canvas, Kingpins, Brokers, Communities, and Pathfinder.
"""
from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Dict, Any, List
from app.db.neo4j_driver import get_neo4j_session
from app.graph_engine.centrality import calculate_pagerank, calculate_betweenness_centrality
from app.graph_engine.communities import detect_louvain_communities
from app.graph_engine.pathfinder import find_shortest_path
from app.auth.dependencies import require_permission

router = APIRouter(
    prefix="/graph",
    tags=["Graph Analytics"],
    dependencies=[Depends(require_permission("investigation:read"))]
)


@router.get("/network")
def get_visual_network(limit: int = 150) -> Dict[str, Any]:
    """
    Returns graph nodes and relationships formatted for Cytoscape.js visual rendering.
    """
    cypher = f"""
    MATCH (n)
    OPTIONAL MATCH (n)-[r]->(m)
    RETURN n, labels(n)[0] AS n_label, r, type(r) AS r_type, m, labels(m)[0] AS m_label
    LIMIT {limit}
    """
    try:
        with get_neo4j_session() as session:
            records = session.run(cypher).data()

        elements = []
        added_nodes = set()

        for rec in records:
            n = rec["n"]
            n_label = rec["n_label"]
            n_id = n.get("name") or n.get("phone_number") or n.get("registration_number") or n.get("fir_no")

            if n_id and n_id not in added_nodes:
                added_nodes.add(n_id)
                elements.append({
                    "data": {
                        "id": n_id,
                        "label": n_id,
                        "node_type": n_label
                    }
                })

            m = rec["m"]
            if m:
                m_label = rec["m_label"]
                m_id = m.get("name") or m.get("phone_number") or m.get("registration_number") or m.get("fir_no")
                if m_id and m_id not in added_nodes:
                    added_nodes.add(m_id)
                    elements.append({
                        "data": {
                            "id": m_id,
                            "label": m_id,
                            "node_type": m_label
                        }
                    })

                if n_id and m_id:
                    elements.append({
                        "data": {
                            "source": n_id,
                            "target": m_id,
                            "relationship": rec["r_type"]
                        }
                    })

        return {"total_elements": len(elements), "elements": elements}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kingpins")
def get_kingpins(top_n: int = 10) -> List[Dict[str, Any]]:
    """
    Returns top PageRank syndicate leaders.
    """
    return calculate_pagerank(top_n=top_n)


@router.get("/brokers")
def get_brokers(top_n: int = 10) -> List[Dict[str, Any]]:
    """
    Returns top Betweenness Centrality brokers and bottleneck nodes.
    """
    return calculate_betweenness_centrality(top_n=top_n)


@router.get("/communities")
def get_communities() -> Dict[str, Any]:
    """
    Returns Louvain operational cell clusters.
    """
    return detect_louvain_communities()


@router.get("/path")
def get_shortest_path(start: str = Query(...), target: str = Query(...)) -> Dict[str, Any]:
    """
    Finds the shortest path and degrees of separation between two target entities.
    """
    return find_shortest_path(start, target)


@router.get("/dossier-network/{entity_id}")
def get_suspect_dossier_network(entity_id: str) -> Dict[str, Any]:
    """
    Returns ego-network elements for a specific suspect entity, formatted for Cytoscape.js
    with categorized facets (FIRs, Vehicles, Transfers, Phones, Locations) and rich metadata.
    """
    cypher = """
    MATCH (n)
    WHERE n.name = $id OR n.phone_number = $id OR n.registration_number = $id OR n.fir_no = $id
    OPTIONAL MATCH (n)-[r]-(m)
    RETURN n, labels(n)[0] AS n_label, r, type(r) AS r_type, properties(r) AS r_props, m, labels(m)[0] AS m_label, (startNode(r) = n) AS is_out
    """
    try:
        with get_neo4j_session() as session:
            records = session.run(cypher, id=entity_id).data()

        if not records or not records[0]["n"]:
            raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")

        elements = []
        added_nodes = set()

        n = records[0]["n"]
        n_label = records[0]["n_label"]
        center_id = n.get("name") or n.get("phone_number") or n.get("registration_number") or entity_id
        added_nodes.add(center_id)

        elements.append({
            "data": {
                "id": center_id,
                "label": center_id,
                "node_type": n_label,
                "is_center": True,
                "category": "center",
                "properties": dict(n)
            }
        })

        breakdown = {
            "fir_count": 0,
            "vehicle_count": 0,
            "transfer_count": 0,
            "location_count": 0,
            "phone_count": 0,
            "total_connections": 0
        }

        for rec in records:
            r = rec["r"]
            m = rec["m"]
            if not r or not m:
                continue

            r_type = rec["r_type"]
            r_props = rec["r_props"] or {}
            m_label = rec["m_label"]
            m_id = m.get("name") or m.get("phone_number") or m.get("registration_number") or m.get("fir_no")

            if not m_id:
                continue

            category = "other"
            if m_label == "FIR":
                category = "fir"
                breakdown["fir_count"] += 1
            elif m_label == "Vehicle":
                category = "vehicle"
                breakdown["vehicle_count"] += 1
            elif m_label == "Location":
                category = "location"
                breakdown["location_count"] += 1
            elif m_label == "Phone":
                category = "phone"
                breakdown["phone_count"] += 1
            elif r_type == "TRANSFERRED_FUNDS":
                category = "finance"
                breakdown["transfer_count"] += 1

            breakdown["total_connections"] += 1

            if m_id not in added_nodes:
                added_nodes.add(m_id)
                elements.append({
                    "data": {
                        "id": m_id,
                        "label": m_id,
                        "node_type": m_label,
                        "category": category,
                        "is_center": False,
                        "properties": dict(m)
                    }
                })

            edge_label = r_type
            if r_type == "TRANSFERRED_FUNDS" and "amount" in r_props:
                amt = float(r_props.get("amount", 0))
                amt_str = f"₹{amt:,.0f}" if amt < 100000 else f"₹{amt/100000:.1f}L"
                edge_label = f"{amt_str} (STR)" if r_props.get("is_structured") else amt_str
            elif r_type == "OWNS_VEHICLE":
                edge_label = "OWNS"
            elif r_type == "MENTIONED_IN":
                edge_label = "FIR LINK"
            elif r_type == "OBSERVED_AT":
                edge_label = "SIGHTED"

            is_out = rec["is_out"]
            edge_id = f"{center_id}-{m_id}-{r_type}"
            elements.append({
                "data": {
                    "id": edge_id,
                    "source": center_id if is_out else m_id,
                    "target": m_id if is_out else center_id,
                    "relationship": r_type,
                    "label": edge_label,
                    "category": category,
                    "is_structured": r_props.get("is_structured", False),
                    "amount": r_props.get("amount"),
                    "details": r_props
                }
            })

        return {
            "center_id": center_id,
            "elements": elements,
            "breakdown": breakdown
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

