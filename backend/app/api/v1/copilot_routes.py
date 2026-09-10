"""
FastAPI Copilot Routes
Provides AI Chatbot endpoint for natural language intelligence search and automated UI graph navigation.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.copilot_service import process_copilot_chat

router = APIRouter(prefix="/copilot", tags=["AI Copilot Assistant"])


class ChatRequest(BaseModel):
    message: str
    selected_target_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    multiple_matches: List[Dict[str, Any]] = []
    ui_action: Optional[Dict[str, Any]] = None


@router.post("/chat", response_model=ChatResponse)
def copilot_chat_endpoint(req: ChatRequest):
    """
    Processes chat prompt, returns intelligence summary, candidate cards (if multiple matches),
    and automated UI navigation signal.
    """
    try:
        res = process_copilot_chat(user_message=req.message, selected_target_id=req.selected_target_id)
        return ChatResponse(
            response=res["response"],
            multiple_matches=res.get("multiple_matches", []),
            ui_action=res.get("ui_action")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
