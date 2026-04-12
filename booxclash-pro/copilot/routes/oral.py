import os
import json
import random   
import base64
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from firebase_admin import storage

from services.llm_service import grade_oral_audio
from services import data_service  # <-- 1. IMPORT YOUR DATA SERVICE

router = APIRouter()

# 2. UPDATE THE REQUEST MODEL
# No more hardcoded expected_numbers. We just need to know what test they took.
class AudioBase64Request(BaseModel):
    audio_base64: str
    mime_type: str = "audio/webm"
    tool_id: str          # e.g., "TOOL - 1" or "Basic Numeracy Assessment Tool-1"
    assessment_type: str  # e.g., "literacy" or "numeracy"
# 1. NEW ROUTE: Fetch a random assessment for the frontend Kiosk
@router.get("/api/assessments/{assessment_type}/random")
async def get_random_assessment(assessment_type: str):
    try:
        # Determine which file to open based on what the frontend asked for
        # ⚠️ IMPORTANT: Update the 'data/' folder path if your JSON files are saved somewhere else!
        if assessment_type == "literacy":
            file_path = "data/literacy_chitonga.json" 
        elif assessment_type == "numeracy":
            file_path = "data/numeracy.json"
        else:
            raise HTTPException(status_code=400, detail="Invalid assessment type requested.")

        # Check if the file actually exists
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Could not find the file at {file_path}")

        # Open and load the JSON data
        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)

        # Your JSON files are lists (arrays) of tools. Pick a random one!
        if isinstance(data, list) and len(data) > 0:
            random_assessment = random.choice(data)
            return random_assessment
        else:
            # If it's not a list, just return the whole object
            return data

    except Exception as e:
        print(f"Error fetching {assessment_type} assessment:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/v1/assess/oral/base64")
async def process_oral_base64(request: AudioBase64Request):
    try:
        # --- 3. FETCH DYNAMIC ASSESSMENT DATA ---
        # Get the exact test the student was looking at from your JSON files
        instrument_data = data_service.get_assessment_by_id(
            tool_id=request.tool_id, 
            assessment_type=request.assessment_type
        )
        
        if not instrument_data:
            raise HTTPException(status_code=404, detail=f"Tool {request.tool_id} not found.")

        # Clean base64 string
        base64_data = request.audio_base64.split(",")[1] if "," in request.audio_base64 else request.audio_base64
        audio_bytes = base64.b64decode(base64_data)

        # Firebase Audit Trail
        audio_url = None
        try:
            bucket = storage.bucket()
            file_id = str(uuid.uuid4())
            blob = bucket.blob(f"assessments/oral/{file_id}.webm")
            blob.upload_from_string(audio_bytes, content_type=request.mime_type)
            blob.make_public()
            audio_url = blob.public_url
        except Exception as e:
            print("Firebase upload skipped (bucket not ready):", e)

        # --- 4. PASS DYNAMIC DATA TO GEMINI ---
        ai_data = grade_oral_audio(
            audio_bytes=audio_bytes, 
            mime_type=request.mime_type,
            instrument_data=instrument_data # Pass the fetched JSON object here!
        )
        
        if audio_url:
            ai_data["audit_audio_url"] = audio_url
        ai_data["status"] = "success" if "error" not in ai_data else "failed"
        
        return ai_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))