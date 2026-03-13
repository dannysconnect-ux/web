from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from services.notification_service import send_whatsapp_invite

router = APIRouter()

class WelcomeRequest(BaseModel):
    email: str
    name: str

@router.post("/api/welcome-email")
async def trigger_welcome_email(request: WelcomeRequest, background_tasks: BackgroundTasks):
    # background_tasks.add_task runs the email in the background 
    # so the user doesn't have to wait for the email to send to see their dashboard
    background_tasks.add_task(send_whatsapp_invite, request.email, request.name)
    
    return {"status": "success", "message": "Invite queued"}