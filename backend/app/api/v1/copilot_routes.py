"""
FastAPI Copilot Routes
Provides AI Chatbot endpoint for natural language intelligence search and automated UI graph navigation.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.db.postgres_driver import get_db
from app.models.audit import User
from app.services.copilot_service import process_copilot_chat
from app.auth.dependencies import require_permission
from app.auth.service import log_security_event

router = APIRouter(prefix="/copilot", tags=["AI Copilot Assistant"])


class ChatRequest(BaseModel):
    message: str
    selected_target_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    multiple_matches: List[Dict[str, Any]] = []
    ui_action: Optional[Dict[str, Any]] = None


@router.post("/chat", response_model=ChatResponse)
def copilot_chat_endpoint(
    req: ChatRequest,
    current_user: User = Depends(require_permission("copilot:query")),
    db: Session = Depends(get_db)
):
    """
    Processes chat prompt, returns intelligence summary, candidate cards (if multiple matches),
    and automated UI navigation signal. Audited to authenticated officer account.
    """
    try:
        res = process_copilot_chat(user_message=req.message, selected_target_id=req.selected_target_id)

        # Audit Copilot search activity
        log_security_event(
            db=db,
            officer_username=current_user.username,
            user_id=current_user.id,
            action="COPILOT_QUERY",
            target_entity=req.selected_target_id,
            details=f"Prompt: {req.message[:200]}",
            status_str="SUCCESS"
        )
        db.commit()

        return ChatResponse(
            response=res["response"],
            multiple_matches=res.get("multiple_matches", []),
            ui_action=res.get("ui_action")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
