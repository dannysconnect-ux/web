import base64
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from firebase_admin import storage
from services.llm_service import grade_numeracy_vision

router = APIRouter()

class BatchImageRequest(BaseModel):
    images: List[str]

@router.post("/v1/assess/numeracy/batch")
async def process_numeracy_batch(request: BatchImageRequest):
    if not request.images:
        raise HTTPException(status_code=400, detail="No images provided")

    results = []
    
    # Check if Firebase is available
    try:
        bucket = storage.bucket()
    except Exception:
        bucket = None

    for base64_image in request.images:
        try:
            base64_data = base64_image.split(",")[1] if "," in base64_image else base64_image
            image_bytes = base64.b64decode(base64_data)
            image_url = None

            # Upload to Firebase for Audit Trail
            if bucket:
                file_id = str(uuid.uuid4())
                blob = bucket.blob(f"assessments/numeracy/{file_id}.jpg")
                blob.upload_from_string(image_bytes, content_type="image/jpeg")
                blob.make_public()
                image_url = blob.public_url

            # Grade via Gemini
            ai_data = grade_numeracy_vision(image_bytes, tool_id="Basic Numeracy Assessment Tool-1")
            
            if image_url:
                ai_data["audit_image_url"] = image_url
            ai_data["status"] = "success" if "error" not in ai_data else "failed"
            results.append(ai_data)

        except Exception as e:
            print(f"Error processing image: {e}")
            results.append({"status": "failed", "error": str(e)})

    return {"message": f"Successfully graded {len(results)} assessments.", "data": results}