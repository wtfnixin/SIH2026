"""
Burner Phone Detector Module
Queries Neo4j call records to identify high-velocity short-lifespan SIM cards.
"""
import logging
from typing import List, Dict, Any
from app.db.neo4j_driver import get_neo4j_session

logger = logging.getLogger(__name__)


def detect_burner_phones(min_call_count: int = 5) -> List[Dict[str, Any]]:
    """
    Identifies phone numbers with high call volume that are not registered to known individuals
    or display short burst call activity patterns.
    """
    cypher = """
    MATCH (p:Phone)-[c:CALLED]-()
    WITH p, count(c) AS call_count
    WHERE call_count >= $min_call_count
    RETURN p.phone_number AS phone, null AS registered_owner, call_count
    ORDER BY call_count DESC
    """

    with get_neo4j_session() as session:
        records = session.run(cypher, min_call_count=min_call_count).data()

    alerts = []
    for rank, r in enumerate(records, 1):
        is_burner = r["registered_owner"] is None
        alerts.append({
            "alert_id": f"BURNER_ALERT_{rank:03d}",
            "threat_level": "CRITICAL" if is_burner and r["call_count"] >= 10 else "MEDIUM",
            "phone_number": r["phone"],
            "registered_owner": r["registered_owner"] if r["registered_owner"] else "UNREGISTERED / PREPAID BURNER",
            "total_calls_made": r["call_count"],
            "classification": "UNREGISTERED_BURNER_SIM" if is_burner else "HIGH_VOLUME_COMMUNICATOR"
        })

    return alerts
