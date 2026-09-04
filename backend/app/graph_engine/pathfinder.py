"""
Pathfinder Module
Finds shortest paths and connecting subgraphs between arbitrary suspects in the graph network.
"""
import logging
from typing import List, Dict, Any
import networkx as nx
from app.graph_engine.centrality import build_networkx_graph_from_neo4j

logger = logging.getLogger(__name__)


def find_shortest_path(start_entity: str, target_entity: str) -> Dict[str, Any]:
    """
    Finds the shortest path and degrees of separation between two entities.
    """
    G = build_networkx_graph_from_neo4j()
    
    if start_entity not in G or target_entity not in G:
        return {
            "found": False,
            "error": f"One or both entities not found in network: {start_entity}, {target_entity}"
        }

    try:
        path = nx.shortest_path(G, source=start_entity, target=target_entity)
        path_edges = []
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            edge_data = G.get_edge_data(u, v)
            path_edges.append({
                "source": u,
                "target": v,
                "type": edge_data.get("type", "CONNECTED_TO") if edge_data else "CONNECTED_TO"
            })

        return {
            "found": True,
            "degrees_of_separation": len(path) - 1,
            "path_nodes": path,
            "path_edges": path_edges
        }
    except nx.NetworkXNoPath:
        return {
            "found": False,
            "error": f"No connecting path exists between {start_entity} and {target_entity}"
        }
