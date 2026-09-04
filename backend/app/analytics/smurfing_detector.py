"""
Smurfing & Financial Structuring Detector Module
Queries Neo4j bank transfers to flag accounts splitting large sums into micro-transfers under ₹10,000 threshold.
"""
import logging
from typing import List, Dict, Any
from app.db.neo4j_driver import get_neo4j_session

logger = logging.getLogger(__name__)


def detect_financial_structuring(max_amount_threshold: float = 10000.0, min_total_structuring: float = 25000.0) -> List[Dict[str, Any]]:
    """
    Identifies financial structuring rings where multiple transfers below max_amount_threshold
    accumulate to a total value exceeding min_total_structuring.
    """
    cypher = """
    MATCH (sender:Person)-[t:TRANSFERRED_FUNDS]->(receiver:Person)
    WHERE t.amount <= $max_amount_threshold
    WITH sender, receiver, count(t) AS tx_count, sum(t.amount) AS total_amount, collect(t.amount) AS amounts
    WHERE total_amount >= $min_total_structuring AND tx_count >= 3
    RETURN sender.name AS sender, receiver.name AS receiver, tx_count, total_amount, amounts
    ORDER BY total_amount DESC
    """
    
    with get_neo4j_session() as session:
        records = session.run(
            cypher,
            max_amount_threshold=max_amount_threshold,
            min_total_structuring=min_total_structuring
        ).data()

    alerts = []
    for rank, r in enumerate(records, 1):
        alerts.append({
            "alert_id": f"STRUCTURING_ALERT_{rank:03d}",
            "threat_level": "CRITICAL" if r["total_amount"] >= 50000 else "HIGH",
            "sender_suspect": r["sender"],
            "receiver_suspect": r["receiver"],
            "transfer_count": r["tx_count"],
            "total_structured_amount": round(r["total_amount"], 2),
            "sample_amounts": r["amounts"][:5],
            "rule_violated": f"Multiple transfers under ₹{max_amount_threshold:.0f} accumulating to ₹{r['total_amount']:.2f}"
        })

    return alerts
