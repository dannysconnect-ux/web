import os  # 👈 Import OS to read env variables
import traceback
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Header, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from firebase_admin import firestore

# --- 1. CONFIGURATION ---
# Safely load credentials from environment variables
cloudinary.config( 
  cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"), 
  api_key    = os.getenv("CLOUDINARY_API_KEY"), 
  api_secret = os.getenv("CLOUDINARY_API_SECRET"),
  secure = True
)

router = APIRouter()
db = firestore.client()

# --- 2. UPLOAD ENDPOINT (With Auto-Resizing) ---
@router.post("/upload")
async def upload_to_cloudinary(file: UploadFile = File(...)):
    """
    Receives a file, sends it to Cloudinary with auto-resizing, and returns the public URL.
    """
    try:
        # Validate that config loaded correctly
        if not os.getenv("CLOUDINARY_CLOUD_NAME"):
            print("❌ Error: Cloudinary credentials missing from .env")
            raise HTTPException(status_code=500, detail="Server misconfiguration: Missing Cloudinary keys")

        # Upload the file directly from the request stream
        # 'transformation' resizes the image to fit within 400x400px without cropping/cutting parts off
        result = cloudinary.uploader.upload(
            file.file, 
            folder="school_assets",
            transformation=[
                {"width": 400, "height": 400, "crop": "limit", "quality": "auto"}
            ]
        )
        
        return {"url": result.get("secure_url")}
        
    except Exception as e:
        print(f"Upload Error: {e}")
        traceback.print_exc() # Print full error to console for debugging
        raise HTTPException(status_code=500, detail="Image upload failed")

# --- 3. DATA MODELS ---
class BrandingConfig(BaseModel):
    logo_url: Optional[str] = None
    motto: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    primary_color: Optional[str] = "#4f46e5"

class TemplateConfig(BaseModel):
    scheme_url: Optional[str] = None
    lesson_plan_url: Optional[str] = None
    weekly_plan_url: Optional[str] = None
    custom_instructions: Optional[str] = ""

class SchoolSettingsRequest(BaseModel):
    school_id: str
    school_name: str
    branding: BrandingConfig
    templates: Optional[TemplateConfig] = None

# --- 4. UPDATE SETTINGS ENDPOINT ---
@router.post("/school/update-settings")
async def update_school_settings(
    settings: SchoolSettingsRequest,
    x_user_id: str = Header(None, alias="X-User-ID")
):
    print(f"⚙️ SAVING | School: {settings.school_id}")

    try:
        school_ref = db.collection("schools").document(settings.school_id)
        
        # Merge=True updates only the fields we send, keeping others safe
        school_ref.set({
            "schoolName": settings.school_name,
            "branding": settings.branding.dict(),
            "customTemplates": settings.templates.dict() if settings.templates else {},
            "updatedAt": firestore.SERVER_TIMESTAMP,
            "lastEditedBy": x_user_id
        }, merge=True)

        return {"status": "success", "message": "Settings saved successfully"}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))