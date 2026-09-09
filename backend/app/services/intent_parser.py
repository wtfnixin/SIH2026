"""
Fast Intent & Entity Resolution Engine for AI Intelligence Copilot.
Performs regex pattern matching and Neo4j graph entity lookups in <2ms.
"""
import re
from typing import List, Dict, Any
from app.db.neo4j_driver import get_neo4j_session

PHONE_REGEX = re.compile(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}')
VEHICLE_REGEX = re.compile(r'[A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}', re.IGNORECASE)
FIR_REGEX = re.compile(r'FIR\s*#?\s*\d+(/\d+)?', re.IGNORECASE)


def parse_intent_and_extract_entities(user_query: str) -> Dict[str, Any]:
    """
    Extracts potential target entities (person names, phone numbers, vehicle plates, FIRs)
    from user query and queries Neo4j for candidates.
    """
    cleaned_query = user_query.strip()
    
    # 1. Check for Phone Number pattern
    phone_matches = PHONE_REGEX.findall(cleaned_query)
    if phone_matches:
        raw_phone = phone_matches[0]
        # Query Neo4j for phone node
        return search_neo4j_entities("Phone", cleaned_query)
        
    # 2. Check for Vehicle Plate pattern
    vehicle_matches = VEHICLE_REGEX.findall(cleaned_query)
    if vehicle_matches:
        return search_neo4j_entities("Vehicle", cleaned_query)

    # 3. Default: Perform entity search across Person, Phone, Vehicle, FIR, Location
    return search_neo4j_entities("ALL", cleaned_query)


def search_neo4j_entities(entity_type: str, query_text: str) -> Dict[str, Any]:
    """
    Executes Cypher search in Neo4j for entities matching the query.
    """
    results = []
    cypher = """
    MATCH (n)
    WHERE (n:Person AND toLower(n.name) CONTAINS toLower($q))
       OR (n:Phone AND n.phone_number CONTAINS $q)
       OR (n:Vehicle AND toLower(n.registration_number) CONTAINS toLower($q))
       OR (n:FIR AND toLower(n.fir_no) CONTAINS toLower($q))
       OR (n:Location AND toLower(n.name) CONTAINS toLower($q))
    OPTIONAL MATCH (n)-[r]-()
    RETURN labels(n)[0] AS type,
           COALESCE(n.name, n.phone_number, n.registration_number, n.fir_no) AS identifier,
           n AS properties,
           count(r) AS degree
    ORDER BY degree DESC
    LIMIT 10
    """
    
    # Extract search term (remove words like 'search', 'for', 'find', 'show', 'graph', 'details')
    stop_words = {'search', 'find', 'show', 'me', 'the', 'for', 'details', 'graph', 'of', 'suspect', 'person', 'who', 'is'}
    words = [w for w in query_text.split() if w.lower() not in stop_words and len(w) >= 2]
    search_term = " ".join(words) if words else query_text

    try:
        with get_neo4j_session() as session:
            records = session.run(cypher, q=search_term).data()
            for rec in records:
                results.append({
                    "entity_id": rec["identifier"],
                    "entity_type": rec["type"],
                    "degree": rec["degree"],
                    "properties": rec["properties"]
                })
    except Exception as e:
        print(f"Error querying Neo4j in intent_parser: {e}")

    return {
        "search_term": search_term,
        "match_count": len(results),
        "candidates": results
    }
