"""
Community Detection Module
Uses Louvain algorithm to partition the criminal network into isolated operational cells.
"""
import logging
from typing import List, Dict, Any
import networkx as nx
from app.graph_engine.centrality import build_networkx_graph_from_neo4j

logger = logging.getLogger(__name__)


def detect_louvain_communities() -> Dict[str, Any]:
    """
    Detects operational communities using Louvain modularity optimization.
    """
    G = build_networkx_graph_from_neo4j()
    if len(G) == 0:
        return {"total_communities": 0, "communities": []}

    # Run Louvain modularity community detection
    communities = list(nx.community.louvain_communities(G))

    community_data = []
    for comm_id, node_set in enumerate(communities, 1):
        members = []
        for node_id in node_set:
            node_attr = G.nodes[node_id]
            members.append({
                "entity_id": node_id,
                "entity_type": node_attr.get("label", "Unknown")
            })

        community_data.append({
            "community_id": comm_id,
            "size": len(members),
            "members": members[:10]  # Sample first 10 members
        })

    # Sort communities by size descending
    community_data.sort(key=lambda x: x["size"], reverse=True)

    return {
        "total_nodes": len(G),
        "total_communities": len(community_data),
        "top_communities": community_data[:5]
    }
