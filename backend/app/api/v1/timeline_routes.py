"""
Investigation Timeline & Temporal Analytics API Router.
Provides endpoints for timeline reconstruction, multi-entity overlap analysis,
temporal analytics (correlation/bursts/gaps), explainability engine, and briefing generation.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.db.postgres_driver import get_db
from app.models.audit import User
from app.auth.dependencies import get_current_user, require_permission
from app.services import timeline_service

router = APIRouter(prefix="/timeline", tags=["Investigation Timeline & Analytics"])


@router.get("")
def get_timeline(
    case_id: Optional[str] = Query("CASE-2026-101"),
    entity_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query("ALL"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("graph:read"))
):
    """
    Returns time-ordered investigation events with filter capabilities.
    """
    s_dt = datetime.fromisoformat(start_date) if start_date else None
    e_dt = datetime.fromisoformat(end_date) if end_date else None

    events = timeline_service.get_timeline_events(
        db=db,
        case_id=case_id,
        entity_id=entity_id,
        event_type=event_type,
        start_date=s_dt,
        end_date=e_dt
    )
    return {"events": events, "count": len(events)}


@router.get("/multi-entity")
def get_multi_entity_timeline(
    entities: List[str] = Query(..., description="List of entity IDs or names to analyze in parallel"),
    case_id: Optional[str] = Query("CASE-2026-101"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("graph:read"))
):
    """
    Reconstructs side-by-side timeline for multi-entity temporal convergence analysis.
    """
    events = timeline_service.get_timeline_events(
        db=db,
        case_id=case_id,
        multi_entities=entities
    )
    analytics = timeline_service.compute_temporal_analytics(db=db, entity_ids=entities)

    return {
        "entities": entities,
        "events": events,
        "total_events": len(events),
        "analytics": analytics
    }


@router.get("/analytics")
def get_temporal_analytics(
    entity_id: Optional[str] = Query(None),
    entities: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("analytics:read"))
):
    """
    Computes Temporal Correlation Score, Activity Bursts, and Investigation Activity Gaps.
    """
    target_ids = entities if entities else ([entity_id] if entity_id else [])
    return timeline_service.compute_temporal_analytics(db=db, entity_ids=target_ids)


@router.get("/explain/{entity_id}")
def get_explainability_report(
    entity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("graph:read"))
):
    """
    Surfaces evidence-backed reasoning explaining why an entity/pattern was flagged.
    """
    return timeline_service.generate_explainability_report(db=db, entity_id=entity_id)


@router.get("/brief")
def get_investigation_brief(
    case_id: Optional[str] = Query("CASE-2026-101"),
    entity_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("graph:read"))
):
    """
    Generates an official, tamper-traceable Investigation Brief report.
    """
    return timeline_service.generate_investigation_brief(db=db, case_id=case_id, entity_id=entity_id)
