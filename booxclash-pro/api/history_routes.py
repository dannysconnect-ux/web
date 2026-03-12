from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.models.history import HistoryCreate
from app.services.history_service import save_session, get_user_history, get_all_history

router = APIRouter(prefix="/history", tags=["User History"])

@router.post("/save", status_code=201)
async def save_history_entry(entry: HistoryCreate):
    """
    Universal endpoint to save:
    - Teacher Plans
    - Exam Results
    - Study/Tutor Sessions
    """
    try:
        entry_id = await save_session(entry)
        return {"message": "Session saved", "id": entry_id, "mode": entry.mode}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_name}")
async def get_history(
    user_name: str, 
    mode: Optional[str] = Query(None, description="Filter by 'teacher', 'exam', or 'tutor'")
):
    """
    Retrieve past sessions for a specific user (Student or Teacher).
    """
    try:
        history = await get_user_history(user_name, mode)
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/global")
async def get_global_activity():
    """
    (Optional) Admin route to see what people are generating.
    """
    try:
        data = await get_all_history()
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))