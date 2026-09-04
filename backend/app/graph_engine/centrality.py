"""
Graph Centrality Analytics Module
Computes PageRank (Kingpin Identification), Betweenness Centrality (Broker Identification),
and Degree Centrality across the Neo4j criminal knowledge graph.
"""
import logging
from typing import List, Dict, Any
import networkx as nx
from app.db.neo4j_driver import get_neo4j_session

logger = logging.getLogger(__name__)


def build_networkx_graph_from_neo4j() -> nx.Graph:
    """
    Fetches all nodes and relationships from Neo4j into an in-memory NetworkX graph.
    """
    G = nx.Graph()
    cypher = """
    MATCH (n)
    OPTIONAL MATCH (n)-[r]->(m)
    RETURN n, labels(n)[0] AS n_label, r, type(r) AS r_type, m, labels(m)[0] AS m_label
    """
    with get_neo4j_session() as session:
        records = session.run(cypher).data()

    for rec in records:
        n = rec["n"]
        n_label = rec["n_label"]
        n_id = n.get("name") or n.get("phone_number") or n.get("registration_number") or n.get("fir_no")

        if n_id:
            G.add_node(n_id, label=n_label, properties=dict(n))

        m = rec["m"]
        if m:
            m_label = rec["m_label"]
            m_id = m.get("name") or m.get("phone_number") or m.get("registration_number") or m.get("fir_no")
            if m_id:
                G.add_node(m_id, label=m_label, properties=dict(m))
                G.add_edge(n_id, m_id, type=rec["r_type"])

    return G


def calculate_pagerank(top_n: int = 10) -> List[Dict[str, Any]]:
    """
    Calculates PageRank score to identify Kingpins / High-Influence Bosses in the network.
    """
    G = build_networkx_graph_from_neo4j()
    if len(G) == 0:
        return []

    pagerank_scores = nx.pagerank(G, alpha=0.85)

    sorted_ranks = sorted(pagerank_scores.items(), key=lambda x: x[1], reverse=True)[:top_n]

    results = []
    for rank, (node_id, score) in enumerate(sorted_ranks, 1):
        node_attr = G.nodes[node_id]
        results.append({
            "rank": rank,
            "entity_id": node_id,
            "entity_type": node_attr.get("label", "Unknown"),
            "pagerank_score": round(score, 6),
            "degree": G.degree(node_id)
        })

    return results


def calculate_betweenness_centrality(top_n: int = 10) -> List[Dict[str, Any]]:
    """
    Calculates Betweenness Centrality to identify Brokers and Mules bridging separate operational cells.
    """
    G = build_networkx_graph_from_neo4j()
    if len(G) == 0:
        return []

    betweenness_scores = nx.betweenness_centrality(G)

    sorted_scores = sorted(betweenness_scores.items(), key=lambda x: x[1], reverse=True)[:top_n]

    results = []
    for rank, (node_id, score) in enumerate(sorted_scores, 1):
        node_attr = G.nodes[node_id]
        results.append({
            "rank": rank,
            "entity_id": node_id,
            "entity_type": node_attr.get("label", "Unknown"),
            "betweenness_score": round(score, 6),
            "degree": G.degree(node_id)
        })

    return results
