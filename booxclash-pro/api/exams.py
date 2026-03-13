import os
import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

# Import your custom modules
from services.llm_exams import generate_localized_exam
from services.file_manager import save_generated_exam
from services.syllabus_manager import load_syllabus 

# IMPORT YOUR CREDIT CHECKER HERE (Adjust the import path if you named the file differently)
from services.credit_manager import check_and_deduct_credit

# Initialize the router
router = APIRouter(prefix="/api/exams", tags=["Exams"])

# ==========================================
# PYDANTIC MODELS (Data Validation)
# ==========================================
class ExamBlueprint(BaseModel):
    mcq: int = 10
    true_false: int = 0
    matching: int = 0
    short_answer: int = 5
    computational: int = 0
    essay: int = 2
    case_study: int = 0

    model_config = ConfigDict(extra='ignore')

class GenerateExamRequest(BaseModel):
    uid: str
    school_id: Optional[str] = None
    school_name: Optional[str] = "Unknown School"
    school: Optional[str] = None # Added to safely catch frontend variations
    grade: str
    subject: str
    term: str
    topics: List[str]
    blueprint: ExamBlueprint

    model_config = ConfigDict(extra='ignore')

class DiagramRequest(BaseModel):
    prompt: str
    uid: str # Made mandatory to charge credits
    school_id: Optional[str] = None # Added to allow school credit deductions for images
    
    model_config = ConfigDict(extra='ignore')

# ==========================================
# 1. FETCH TOPICS ROUTE
# ==========================================
@router.get("/topics", response_model=List[str])
async def get_syllabus_topics(
    grade: str = Query(..., description="E.g., Grade 6"),
    subject: str = Query(..., description="E.g., Integrated Science")
):
    """
    Fetches the official syllabus topics for a given grade and subject.
    """
    try:
        # Load the syllabus using your existing syllabus_manager
        syllabus_data = load_syllabus(country="zambia", grade=grade, subject=subject)
        
        if not syllabus_data:
            return []

        topics_list = []
        
        # Safely extract topic names from the returned list of dictionaries
        for item in syllabus_data:
            topic_name = item.get("topic") or item.get("title") or item.get("topic_name") or item.get("name")
            if topic_name:
                topics_list.append(str(topic_name))
                
        return topics_list

    except Exception as e:
        print(f"❌ Error fetching topics: {e}")
        raise HTTPException(status_code=500, detail="Could not load syllabus topics")


# ==========================================
# 2. GENERATE EXAM ROUTE (COST: 1 CREDIT)
# ==========================================
@router.post("/generate")
async def create_exam(req: GenerateExamRequest):
    """
    Generates a localized exam using the LLM and saves it to Firestore.
    Costs 1 Credit.
    """
    # 0. 💰 DEDUCT CREDITS FIRST (Cost = 1)
    try:
        credit_info = check_and_deduct_credit(uid=req.uid, cost=1, school_id=req.school_id)
    except Exception as e:
        # 402 Payment Required is standard for insufficient funds/credits
        raise HTTPException(status_code=402, detail=str(e)) 

    try:
        # 1. Generate the Exam via the LLM Engine
        exam_data = await generate_localized_exam(
            grade=req.grade,
            subject=req.subject,
            topics=req.topics,
            blueprint=req.blueprint.model_dump()
        )

        if "error" in exam_data:
            raise HTTPException(status_code=500, detail="Failed to generate exam content")

        # 2. Save to Firestore using your dual-save manager
        save_success = save_generated_exam(
            uid=req.uid,
            subject=req.subject,
            grade=req.grade,
            term=req.term,
            school_name=req.school_name or req.school,
            exam_data=exam_data,
            school_id=req.school_id
        )

        if not save_success:
            print("⚠️ Warning: Exam generated but failed to save to Firestore.")

        # 3. Return to Frontend
        return {
            "status": "success",
            "message": "Exam generated successfully",
            "data": exam_data,
            "credits_remaining": credit_info.get("remaining_credits") # Optional: send back updated balance
        }

    except Exception as e:
        print(f"❌ Error in create_exam: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 3. GENERATE DIAGRAM ROUTE (COST: 5 CREDITS)
# ==========================================
@router.post("/generate-diagram")
async def create_diagram(req: DiagramRequest):
    """
    Generates a pixel image using Google's Imagen 3.0 model via REST API.
    Costs 5 Credits.
    """
    print(f"\n🎨 [Imagen Generator] Requesting image for: {req.prompt}")
    
    # 0. 💰 DEDUCT CREDITS FIRST (Cost = 5)
    try:
        credit_info = check_and_deduct_credit(uid=req.uid, cost=5, school_id=req.school_id)
    except Exception as e:
        raise HTTPException(status_code=402, detail=str(e))

    # Ensure you have your Gemini API key loaded in your environment variables
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY environment variable is missing.")
        raise HTTPException(status_code=500, detail="Server configuration error: Missing API Key")

    # API Endpoint for Imagen
    url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key={api_key}"
    
    # We heavily modify the prompt to ensure it looks like a school exam drawing
    enhanced_prompt = (
        f"A clean, simple, minimalist black-and-white line-art educational diagram of {req.prompt}. "
        "Solid white background, dark black outlines, no shading, 2d style, suitable for printing on a school exam paper."
    )

    payload = {
        "instances": [
            {"prompt": enhanced_prompt}
        ],
        "parameters": {
            "sampleCount": 1
        }
    }

    try:
        # Increase timeout slightly as image generation can take ~5-15 seconds
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=30.0)
            
            if resp.status_code != 200:
                print(f"⚠️ Imagen API Error: {resp.status_code} - {resp.text}")
                # Ideally refund the 5 credits here if API fails, but we'll raise an error for now
                raise HTTPException(status_code=500, detail="Failed to generate image from Google API")
                
            data = resp.json()

            # Extract the Base64 image string from the predictions array
            if "predictions" in data and len(data["predictions"]) > 0:
                base64_img = data["predictions"][0]["bytesBase64Encoded"]
                
                # Prepend the data URI scheme so it's ready to use in HTML
                img_data_url = f"data:image/png;base64,{base64_img}"

                return {
                    "status": "success",
                    "type": "base64",
                    "data": img_data_url,
                    "credits_remaining": credit_info.get("remaining_credits") # Optional UI helper
                }
            else:
                print("⚠️ Unexpected response format from Imagen:", data)
                raise HTTPException(status_code=500, detail="Unexpected response from image generator")

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating diagram with Imagen: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate diagram")