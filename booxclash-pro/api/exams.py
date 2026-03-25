import os
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

# Import your custom modules
from services.llm_exams import generate_localized_exam
from services.file_manager import save_generated_exam
from services.syllabus_manager import load_syllabus 

# 🆕 Import the image service we just fixed
from services.image_service import generate_fast_image 

# Import your credit manager
from services.credit_manager import check_and_deduct_credit

# Initialize the router
router = APIRouter(prefix="/api/exams", tags=["Exams"])

# ==========================================
# PYDANTIC MODELS
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
    school: Optional[str] = None 
    grade: str
    subject: str
    term: str
    topics: List[str]
    blueprint: ExamBlueprint
    model_config = ConfigDict(extra='ignore')

class DiagramRequest(BaseModel):
    prompt: str
    uid: str 
    school_id: Optional[str] = None 
    model_config = ConfigDict(extra='ignore')

# ==========================================
# 1. FETCH TOPICS ROUTE
# ==========================================
@router.get("/topics", response_model=List[str])
async def get_syllabus_topics(
    grade: str = Query(..., description="E.g., Grade 6"),
    subject: str = Query(..., description="E.g., Integrated Science")
):
    try:
        syllabus_data = load_syllabus(country="zambia", grade=grade, subject=subject)
        if not syllabus_data: return []

        topics_list = []
        for item in syllabus_data:
            topic_name = item.get("topic") or item.get("title") or item.get("topic_name")
            if topic_name: topics_list.append(str(topic_name))
        return topics_list

    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not load syllabus topics")

# ==========================================
# 2. GENERATE EXAM ROUTE (Internal images handled by llm_exams.py)
# ==========================================
@router.post("/generate")
async def create_exam(req: GenerateExamRequest):
    # 💰 Deduct 1 Credit
    try:
        credit_info = check_and_deduct_credit(uid=req.uid, cost=1, school_id=req.school_id)
    except Exception as e:
        raise HTTPException(status_code=402, detail=str(e)) 

    try:
        # This function now generates its own images internally using image_service.py
        exam_data = await generate_localized_exam(
            grade=req.grade,
            subject=req.subject,
            topics=req.topics,
            blueprint=req.blueprint.model_dump()
        )

        if "error" in exam_data:
            raise HTTPException(status_code=500, detail="Failed to generate exam content")

        save_generated_exam(
            uid=req.uid,
            subject=req.subject,
            grade=req.grade,
            term=req.term,
            school_name=req.school_name or req.school,
            exam_data=exam_data,
            school_id=req.school_id
        )

        return {
            "status": "success",
            "data": exam_data,
            "credits_remaining": credit_info.get("remaining_credits")
        }

    except Exception as e:
        print(f"❌ Error in create_exam: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 3. GENERATE SINGLE DIAGRAM (On-demand)
# ==========================================
@router.post("/generate-diagram")
async def create_diagram(req: DiagramRequest):
    """
    Generates a single diagram on demand. 
    Uses the logic from image_service.py to ensure correct API calls.
    """
    # 💰 Deduct 5 Credits
    try:
        credit_info = check_and_deduct_credit(uid=req.uid, cost=5, school_id=req.school_id)
    except Exception as e:
        raise HTTPException(status_code=402, detail=str(e))

    try:
        # Enhance the prompt for educational line art
        enhanced_prompt = (
            f"A clean, simple, minimalist black-and-white line-art educational diagram of {req.prompt}. "
            "Solid white background, dark black outlines, no shading, 2d style, for a school exam."
        )

        # 🎨 Call the service we created earlier
        img_data_url = await generate_fast_image(enhanced_prompt)

        if "placehold.co" in img_data_url:
            raise HTTPException(status_code=500, detail="Image generation service failed")

        return {
            "status": "success",
            "type": "base64",
            "data": img_data_url,
            "credits_remaining": credit_info.get("remaining_credits")
        }

    except Exception as e:
        print(f"❌ Error in create_diagram: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate diagram")