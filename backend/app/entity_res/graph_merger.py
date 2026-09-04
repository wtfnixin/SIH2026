"""
Neo4j Graph Merger & Resolution Module
Executes Cypher queries to link duplicate nodes in Neo4j with SAME_AS and PROBABLE_ALIAS relationships.
"""
import logging
from typing import List, Dict, Any
from app.db.neo4j_driver import get_neo4j_session
from app.entity_res.matcher import calculate_name_similarity

logger = logging.getLogger(__name__)


def resolve_person_nodes_in_neo4j() -> Dict[str, Any]:
    """
    Scans all (:Person) nodes in Neo4j, calculates pairwise similarities,
    and creates [:SAME_AS] or [:PROBABLE_ALIAS] relationships between duplicates.
    """
    # 1. Fetch all Person names from Neo4j
    query_persons = "MATCH (p:Person) RETURN p.name AS name ORDER BY name"
    with get_neo4j_session() as session:
        records = session.run(query_persons).data()

    names = [r["name"] for r in records if r.get("name")]
    
    same_as_pairs = []
    probable_alias_pairs = []

    # 2. Pairwise Similarity Evaluation
    n = len(names)
    for i in range(n):
        for j in range(i + 1, n):
            name1 = names[i]
            name2 = names[j]

            # Fast length filter
            if abs(len(name1) - len(name2)) > 10:
                continue

            score = calculate_name_similarity(name1, name2)

            # Contextual Evidence Boosting via Neo4j Direct Shared Evidence (Phone, Vehicle, Location, FIR)
            if 0.75 <= score < 0.94 and name1 != name2:
                check_shared_neighbor_query = """
                MATCH (p1:Person {name: $name1})--(shared)--(p2:Person {name: $name2})
                WHERE (shared:Phone OR shared:Vehicle OR shared:Location OR shared:FIR)
                RETURN count(shared) AS shared_count
                """
                with get_neo4j_session() as session:
                    res = session.run(check_shared_neighbor_query, name1=name1, name2=name2).single()
                    shared_count = res["shared_count"] if res else 0

                if shared_count > 0:
                    # Shared direct evidence exists -> Boost to HIGH_CONFIDENCE auto-merge!
                    score = min(1.0, score + 0.15)

            if score >= 0.94 and name1 != name2:
                same_as_pairs.append({
                    "name1": name1,
                    "name2": name2,
                    "score": score
                })
            elif score >= 0.85 and name1 != name2:
                probable_alias_pairs.append({
                    "name1": name1,
                    "name2": name2,
                    "score": score
                })

    # 3. Write [:SAME_AS] Relationships to Neo4j
    if same_as_pairs:
        cypher_same_as = """
        UNWIND $batch AS row
        MATCH (p1:Person {name: row.name1})
        MATCH (p2:Person {name: row.name2})
        MERGE (p1)-[r:SAME_AS]-(p2)
        SET r.confidence_score = row.score,
            r.resolution_type = 'HIGH_CONFIDENCE_AUTO_MERGE'
        """
        with get_neo4j_session() as session:
            session.run(cypher_same_as, batch=same_as_pairs)

    # 4. Write [:PROBABLE_ALIAS] Relationships to Neo4j
    if probable_alias_pairs:
        cypher_alias = """
        UNWIND $batch AS row
        MATCH (p1:Person {name: row.name1})
        MATCH (p2:Person {name: row.name2})
        MERGE (p1)-[r:PROBABLE_ALIAS]-(p2)
        SET r.confidence_score = row.score,
            r.resolution_type = 'REQUIRES_HUMAN_REVIEW'
        """
        with get_neo4j_session() as session:
            session.run(cypher_alias, batch=probable_alias_pairs)

    return {
        "total_persons_scanned": n,
        "same_as_links_created": len(same_as_pairs),
        "probable_alias_links_created": len(probable_alias_pairs),
        "same_as_samples": same_as_pairs[:5],
        "probable_alias_samples": probable_alias_pairs[:5]
    }
