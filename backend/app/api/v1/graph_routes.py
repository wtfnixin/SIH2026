"""
FastAPI Graph Analytics Router
Provides endpoints for Cytoscape.js visual graph canvas, Kingpins, Brokers, Communities, and Pathfinder.
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, List
from app.db.neo4j_driver import get_neo4j_session
from app.graph_engine.centrality import calculate_pagerank, calculate_betweenness_centrality
from app.graph_engine.communities import detect_louvain_communities
from app.graph_engine.pathfinder import find_shortest_path

router = APIRouter(prefix="/graph", tags=["Graph Analytics"])


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
