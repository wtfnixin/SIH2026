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


def clean_neo4j_props(props: Any) -> Any:
    """Recursively converts Neo4j DateTime/Date/Point objects to JSON serializable types."""
    if isinstance(props, dict):
        return {k: clean_neo4j_props(v) for k, v in props.items()}
    elif isinstance(props, list):
        return [clean_neo4j_props(v) for v in props]
    elif hasattr(props, "isoformat"):
        return props.isoformat()
    elif hasattr(props, "__str__") and "DateTime" in type(props).__name__:
        return str(props)
    return props


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
            n_id = n.get("name") or n.get("phone_number") or n.get("registration_number") or n.get("fir_no") or n.get("fir_number") or n.get("title")

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
                m_id = m.get("name") or m.get("phone_number") or m.get("registration_number") or m.get("fir_no") or m.get("fir_number") or m.get("title")
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
    Returns 1-hop and 2-hop graph elements for a target FIR or Person entity formatted for Cytoscape.js.
    """
    import re
    id_clean = entity_id.strip()
    id_candidates = [id_clean, id_clean.upper(), id_clean.lower(), id_clean.replace(" ", "-"), id_clean.replace("-", " ")]
    num_match = re.search(r"(\d+)", id_clean)
    if num_match:
        num_str = num_match.group(1)
        id_candidates.extend([
            f"FIR-2026-{num_str.zfill(3)}",
            f"FIR-2026-{num_str}",
            f"FIR-2026-TEST-{num_str.zfill(3)}",
            f"FIR-{num_str.zfill(3)}",
            f"FIR-{num_str}"
        ])

    id_candidates_upper = [c.upper() for c in id_candidates]

    cypher = """
    MATCH (n)
    WHERE toUpper(coalesce(toString(n.name), '')) IN $candidates_upper
       OR toUpper(coalesce(toString(n.phone_number), '')) IN $candidates_upper
       OR toUpper(replace(coalesce(toString(n.phone_number), ''), '-', '')) IN $candidates_upper
       OR toUpper(coalesce(toString(n.registration_number), '')) IN $candidates_upper
       OR toUpper(replace(coalesce(toString(n.registration_number), ''), '-', '')) IN $candidates_upper
       OR toUpper(coalesce(toString(n.fir_no), '')) IN $candidates_upper
       OR toUpper(coalesce(toString(n.fir_number), '')) IN $candidates_upper
       OR toUpper(replace(coalesce(toString(n.fir_no), ''), '-', '')) IN $candidates_upper
       OR (n:FIR AND any(cand IN $candidates_upper WHERE toUpper(coalesce(toString(n.fir_no), '')) ENDS WITH cand OR toUpper(coalesce(toString(n.fir_number), '')) ENDS WITH cand OR replace(toUpper(coalesce(toString(n.fir_no), '')), 'FIR-2026-', '') = cand))
    WITH n LIMIT 1
    OPTIONAL MATCH (n)-[r1]-(m1)
    OPTIONAL MATCH (m1)-[r2]-(m2)
    WHERE m2 <> n AND NOT m2:FIR
    RETURN n, labels(n)[0] AS n_label, 
           r1, type(r1) AS r1_type, properties(r1) AS r1_props, m1, labels(m1)[0] AS m1_label, (startNode(r1) = n) AS r1_is_out,
           r2, type(r2) AS r2_type, properties(r2) AS r2_props, m2, labels(m2)[0] AS m2_label, (startNode(r2) = m1) AS r2_is_out
    """
    try:
        with get_neo4j_session() as session:
            records = session.run(cypher, candidates_upper=id_candidates_upper).data()

        if not records or not records[0]["n"]:
            raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")

        elements = []
        added_nodes = set()
        added_edges = set()

        n = records[0]["n"]
        n_label = records[0]["n_label"]
        raw_center = n.get("name") or n.get("phone_number") or n.get("registration_number") or n.get("fir_no") or n.get("fir_number") or entity_id
        center_id = str(raw_center)
        added_nodes.add(center_id)

        elements.append({
            "data": {
                "id": center_id,
                "label": center_id,
                "node_type": n_label,
                "is_center": True,
                "category": "center",
                "properties": clean_neo4j_props(dict(n))
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

        def process_node(node_obj, node_label):
            raw_id = node_obj.get("name") or node_obj.get("phone_number") or node_obj.get("registration_number") or node_obj.get("fir_no") or node_obj.get("fir_number")
            if not raw_id:
                return None
            node_id = str(raw_id)
            if node_id not in added_nodes:
                added_nodes.add(node_id)
                cat = "other"
                if node_label == "FIR":
                    cat = "fir"
                    breakdown["fir_count"] += 1
                elif node_label == "Vehicle":
                    cat = "vehicle"
                    breakdown["vehicle_count"] += 1
                elif node_label == "Location":
                    cat = "location"
                    breakdown["location_count"] += 1
                elif node_label == "Phone":
                    cat = "phone"
                    breakdown["phone_count"] += 1
                elements.append({
                    "data": {
                        "id": node_id,
                        "label": node_id,
                        "node_type": node_label,
                        "category": cat,
                        "is_center": False,
                        "properties": clean_neo4j_props(dict(node_obj))
                    }
                })
            return node_id

        def process_edge(src_id, tgt_id, rel_type, rel_props, is_out):
            if not src_id or not tgt_id or not rel_type:
                return
            edge_key = f"{src_id}||{tgt_id}||{rel_type}"
            if edge_key in added_edges:
                return
            added_edges.add(edge_key)

            if rel_type == "TRANSFERRED_FUNDS":
                breakdown["transfer_count"] += 1
            breakdown["total_connections"] += 1

            rel_props = clean_neo4j_props(rel_props or {})
            edge_label = rel_type
            if rel_type == "TRANSFERRED_FUNDS" and "amount" in rel_props:
                amt = float(rel_props.get("amount", 0))
                amt_str = f"₹{amt:,.0f}" if amt < 100000 else f"₹{amt/100000:.1f}L"
                edge_label = f"Sent {amt_str}"
            elif rel_type == "CALLED":
                dur = rel_props.get("duration_seconds") or rel_props.get("duration")
                ts = rel_props.get("timestamp", "")
                if ts and dur:
                    edge_label = f"Called ({dur}s)"
                else:
                    edge_label = "CALLED"
            elif rel_type == "OWNS_VEHICLE":
                edge_label = "OWNS VEHICLE"
            elif rel_type == "SIGHTED_AT":
                edge_label = "SIGHTED AT"
            elif rel_type == "OBSERVED_AT":
                edge_label = "OBSERVED AT"

            s_id = src_id if is_out else tgt_id
            t_id = tgt_id if is_out else src_id

            elements.append({
                "data": {
                    "id": f"e-{s_id}-{t_id}-{rel_type}",
                    "source": s_id,
                    "target": t_id,
                    "relationship": rel_type,
                    "label": edge_label,
                    "amount": rel_props.get("amount"),
                    "details": rel_props
                }
            })

        for rec in records:
            m1 = rec.get("m1")
            r1 = rec.get("r1")
            if m1 and r1:
                m1_id = process_node(m1, rec["m1_label"])
                if m1_id:
                    process_edge(center_id, m1_id, rec["r1_type"], rec["r1_props"], rec["r1_is_out"])

            m2 = rec.get("m2")
            r2 = rec.get("r2")
            if m1 and m2 and r2:
                m1_id = m1.get("name") or m1.get("phone_number") or m1.get("registration_number") or m1.get("fir_no")
                m2_id = process_node(m2, rec["m2_label"])
                if m1_id and m2_id:
                    process_edge(m1_id, m2_id, rec["r2_type"], rec["r2_props"], rec["r2_is_out"])

        return {
            "center_id": center_id,
            "elements": elements,
            "breakdown": breakdown
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

