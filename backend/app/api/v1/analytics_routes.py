"""
FastAPI Analytics & Threat Alerts Router
Provides endpoints for real-time Financial Structuring, Burner SIM, and ANPR Co-location alerts.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from app.analytics.smurfing_detector import detect_financial_structuring
from app.analytics.burner_detector import detect_burner_phones
from app.analytics.co_location_detector import detect_vehicle_colocations

router = APIRouter(prefix="/analytics", tags=["Threat Analytics"])


@router.get("/alerts")
def get_consolidated_threat_alerts() -> Dict[str, Any]:
    """
    Returns consolidated list of Financial Structuring, Burner SIM, and ANPR Co-location threat alerts.
    """
    try:
        structuring = detect_financial_structuring()
        burners = detect_burner_phones()
        colocations = detect_vehicle_colocations()

        return {
            "total_alerts": len(structuring) + len(burners) + len(colocations),
            "breakdown": {
                "financial_structuring_count": len(structuring),
                "burner_phone_count": len(burners),
                "anpr_colocation_count": len(colocations)
            },
            "alerts": {
                "financial_structuring": structuring[:10],
                "burner_phones": burners[:10],
                "anpr_colocations": colocations[:10]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
