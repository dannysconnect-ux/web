from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional

from service.notification_service import send_whatsapp_invite


# Create router
router = APIRouter(
    prefix="/api",
    tags=["Welcome Emails"]
)


# Request model
class WelcomeRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None


# Route
@router.post("/welcome-email")
async def send_welcome_email(
    data: WelcomeRequest,
    background_tasks: BackgroundTasks
):
    """
    Sends welcome email with WhatsApp invite
    """

    if not data.email:
        raise HTTPException(
            status_code=400,
            detail="Email is required"
        )

    # Run in background (non-blocking)
    background_tasks.add_task(
        send_whatsapp_invite,
        data.email,
        data.name
    )

    return {
        "status": "success",
        "message": "Welcome email queued"
    }
