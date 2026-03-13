import logging
import os
import glob
import sys
import cloudinary
import cloudinary.uploader
from pathlib import Path
from fastapi import FastAPI, Request, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from api.catch_up import router as catchup_router
# 1. Load Environment Variables
load_dotenv()

# --- CLOUDINARY CONFIGURATION ---
cloudinary.config( 
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"), 
    api_key = os.getenv("CLOUDINARY_API_KEY"), 
    api_secret = os.getenv("CLOUDINARY_API_SECRET"),
    secure = True
)

# --- IMPORTS ---
# Ensure we can import from the services folder by adding root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.routes import router as api_router
from api.teacher_routes_new import router as teacher_router_new
from api.teacher_routes_old import router as teacher_router_old
from api.admin_routes import router as admin_router
from api.schemes import router as schemes_router 
from api.school_settings import router as settings_router 
from api.relay_routes import router as relay_router 
from api.exams import router as exams_router
from api.school_routes import router as school_engine_router
from api.sba import router as sba_router # 👈 ADDED THIS: IMPORT SBA ROUTER
from services.notification_service import send_whatsapp_invite # 👈 IMPORT SERVICE

# 2. Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("uvicorn")

# 3. Initialize App
app = FastAPI(title="BooxClash Tutor API")

# 4. CORS
origins = [
    "http://localhost:5173", 
    "http://localhost:3000",
    "https://booxclash-pro.onrender.com", 
    "https://www.booxclash.com",
    "https://booxclash.com",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === 📊 HELPER: COUNT RESOURCES ===
def count_available_resources():
    """Scans directories to count available JSON files."""
    base_dir = Path(__file__).resolve().parent

    syllabi_dir = base_dir / "syllabi"
    modules_dir = base_dir / "modules"
    
    if not syllabi_dir.exists(): syllabi_dir = base_dir.parent / "syllabi"
    if not modules_dir.exists(): modules_dir = base_dir.parent / "modules"

    syllabus_count = len(list(syllabi_dir.rglob("*.json"))) if syllabi_dir.exists() else 0
    module_count = len(list(modules_dir.rglob("*.json"))) if modules_dir.exists() else 0

    return syllabus_count, module_count

# === 🔎 REQUEST LOGGER ===
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"🔔 INCOMING REQUEST: {request.method} {request.url}")
    try:
        response = await call_next(request)
        logger.info(f"✅ RESPONSE SENT: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"❌ REQUEST FAILED: {str(e)}")
        raise e

# === 📂 HELPER: SCAN SYLLABUS FOLDERS ===
def get_subjects_for_grade(grade_input: str):
    logger.info(f"🔍 [Subject Scanner] Scanning for grade: '{grade_input}'")
    found_subjects = set()
    clean_grade = grade_input.lower().replace("grade", "").strip()
    logger.info(f"   🎯 Parsed clean grade number: '{clean_grade}'")

    base_paths = [
        os.path.join("syllabi", "new"),
        os.path.join("syllabi", "old")
    ]

    for folder in base_paths:
        if not os.path.exists(folder):
            folder = os.path.join("..", folder)
            if not os.path.exists(folder): 
                logger.warning(f"   ⚠️ Folder not found: {folder}")
                continue
            
        logger.info(f"   📂 Scanning folder: {folder}")
        files = glob.glob(os.path.join(folder, "*.json"))
        
        for file_path in files:
            filename = os.path.basename(file_path).lower()
            parts = filename.replace(".json", "").split("_")
            
            if clean_grade in parts:
                clean_parts = [p for p in parts if p not in ["zambia", "syllabus", "new", "old", clean_grade]]
                subject_name = " ".join(clean_parts).title()
                
                if subject_name:
                    logger.info(f"      ✅ Match found in file '{filename}' -> Subject: '{subject_name}'")
                    found_subjects.add(subject_name)

    final_list = list(sorted(found_subjects))
    logger.info(f"🚀 [Subject Scanner] Final Subject List for {grade_input}: {final_list}")
    return final_list

# === 📝 DATA MODELS ===
class WelcomeRequest(BaseModel):
    email: str
    name: str

# === ☁️ ENDPOINT: CLOUDINARY UPLOAD ===
@app.post("/api/upload")
async def upload_to_cloudinary(file: UploadFile = File(...)):
    try:
        logger.info(f"Uploading file: {file.filename}...")
        result = cloudinary.uploader.upload(
            file.file, 
            folder="booxclash/uploads", 
            resource_type="raw"
        )
        secure_url = result.get("secure_url")
        logger.info(f"Upload success: {secure_url}")
        return {"url": secure_url}

    except Exception as e:
        logger.error(f"Cloudinary Error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# === 🚀 ENDPOINT: GET SUBJECTS ===
@app.get("/get-subjects/{grade}")
async def get_subjects_endpoint(grade: str):
    logger.info(f"⚡ API HIT: /get-subjects/{grade}")
    subjects = get_subjects_for_grade(grade)
    
    if not subjects:
        logger.warning(f"⚠️ API RETURN: No syllabus files found for {grade}")
        return {"subjects": [], "message": f"No syllabus files found for {grade}"}
        
    logger.info(f"✅ API RETURN: Returning {len(subjects)} subjects for {grade}")
    return {"subjects": subjects}

# 6. Register Routes
app.include_router(api_router, prefix="/api/v1")
app.include_router(teacher_router_new, prefix="/api/v1/new", tags=["Teacher (New Curriculum)"]) 
app.include_router(teacher_router_old, prefix="/api/v1/old", tags=["Teacher (Old Curriculum)"])
app.include_router(schemes_router, prefix="/api/v1", tags=["Schemes"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"]) 
app.include_router(school_engine_router, prefix="/api/school", tags=["School Engine"])
app.include_router(settings_router, prefix="/api/school", tags=["School Settings"]) 
app.include_router(relay_router, prefix="/api/relay", tags=["Smart Dispatcher"]) 
app.include_router(sba_router, prefix="/api/sba", tags=["School-Based Assessment"]) # 👈 ADDED THIS: REGISTER SBA ROUTER
app.include_router(exams_router)
app.include_router(catchup_router)
# 7. Startup Event & Health Check
@app.on_event("startup")
async def startup_event():
    s_count, m_count = count_available_resources()
    logger.info("🚀 SYSTEM STARTUP COMPLETE")
    logger.info(f"📚 Syllabi Loaded: {s_count}")
    logger.info(f"📦 Modules Loaded: {m_count}")

@app.get("/")
def health_check():
    s_count, m_count = count_available_resources()
    logger.info("Health check endpoint hit!")
    return {
        "status": "running", 
        "service": "BooxClash Backend",
        "resources": {
            "syllabi_files": s_count,
            "module_files": m_count
        },
        "registered_routes": [
            "/api/v1/teacher/new", 
            "/api/school/update-settings", 
            "/api/relay/dispatch/generate",
            "/api/welcome-email" 
        ] 
    }

# 8. Local Development Entry Point
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000)) 
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)