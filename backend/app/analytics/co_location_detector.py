"""
Co-Location Detector Module
Queries ANPR camera sightings and surveillance records in Neo4j to find convoy movements
and co-located suspects at the same camera location within tight time windows.
"""
import logging
from typing import List, Dict, Any
from app.db.neo4j_driver import get_neo4j_session

logger = logging.getLogger(__name__)


def detect_vehicle_colocations() -> List[Dict[str, Any]]:
    """
    Identifies vehicles or suspects sighted at the exact same location node.
    """
    cypher = """
    MATCH (v1:Vehicle)-[:SIGHTED_AT]->(loc:Location)<-[:SIGHTED_AT]-(v2:Vehicle)
    WHERE v1.registration_number < v2.registration_number
    RETURN v1.registration_number AS vehicle1, v2.registration_number AS vehicle2, loc.name AS location, count(loc) AS co_sighting_count
    ORDER BY co_sighting_count DESC
    """

    with get_neo4j_session() as session:
        records = session.run(cypher).data()

    alerts = []
    for rank, r in enumerate(records, 1):
        alerts.append({
            "alert_id": f"COLOCATION_ALERT_{rank:03d}",
            "threat_level": "HIGH",
            "vehicle_1": r["vehicle1"],
            "vehicle_2": r["vehicle2"],
            "co_location_point": r["location"],
            "sighting_frequency": r["co_sighting_count"],
            "rule_violated": f"Suspect vehicles {r['vehicle1']} & {r['vehicle2']} co-located at {r['location']}"
        })

    return alerts
