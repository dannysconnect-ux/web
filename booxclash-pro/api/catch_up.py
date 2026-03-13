import os
import json
from fastapi import APIRouter, HTTPException, Path, Request
from fastapi.responses import JSONResponse

# 🆕 Import the LLM generation function and file manager
from services.catchup_llm import generate_catchup_lesson_plan
from services.file_manager import save_catchup_plan

# IMPORT YOUR CREDIT CHECKER HERE
from services.credit_manager import check_and_deduct_credit

# Initialize the router
router = APIRouter(
    prefix="/api/v1/catchup",
    tags=["Catch-Up Assistant"]
)

# Get the absolute path to the syllabi directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYLLABI_DIR = os.path.join(BASE_DIR, "syllabi")

# ==========================================================
# 1. GET ROUTE: FETCH JSON SYLLABUS DATA
# ==========================================================
@router.get("/{subject}", description="Fetch Catch-Up (TaRL) levels and activities for a specific subject")
async def get_catchup_activities(
    subject: str = Path(..., description="Subject name, e.g., 'literacy' or 'numeracy'")
):
    """
    Fetches the Catch-Up levels and activities from the local JSON files.
    """
    # Sanitize the input to prevent basic path traversal and ensure lowercase
    safe_subject = subject.lower().strip()
    
    # Restrict to allowed subjects
    if safe_subject not in ["literacy", "numeracy"]:
        raise HTTPException(
            status_code=400, 
            detail="Invalid subject. Please select either 'literacy' or 'numeracy'."
        )

    # Construct the path to the JSON file
    file_path = os.path.join(SYLLABI_DIR, f"{safe_subject}.json")

    # Check if the file exists
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404, 
            detail=f"The syllabus file for {safe_subject} could not be found."
        )

    # Read and return the JSON data
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An error occurred while reading the file: {str(e)}"
        )

# ==========================================================
# 2. POST ROUTE: GENERATE LESSON PLAN VIA LLM (COST: 1 CREDIT)
# ==========================================================
@router.post("/generate-catchup-plan", description="Generate a Catch-Up Lesson Plan using AI")
async def create_catchup_plan(request: Request):
    try:
        data = await request.json()
        
        uid = data.get("uid")
        school_id = data.get("schoolId")
        
        if not uid:
             raise HTTPException(status_code=400, detail="User ID (uid) is required to generate a plan.")

        # 0. 💰 DEDUCT CREDITS FIRST (Cost = 1)
        try:
            credit_info = check_and_deduct_credit(uid=uid, cost=1, school_id=school_id)
        except Exception as e:
            # 402 Payment Required for insufficient credits/expired sub
            raise HTTPException(status_code=402, detail=str(e))

        # Extract Catch-Up specific logic
        subject_name = data.get("subject", "Catch-Up")
        catchup_level = data.get("catchupLevel", "Beginner")
        
        # 1. Generate the plan (Bypassing standard grades)
        plan = await generate_catchup_lesson_plan(
            grade="Catch-Up Programme", # Hardcode grade so the AI prompt flows perfectly
            subject=subject_name,
            catchup_level=catchup_level,
            activity_name=data.get("activityName", ""),
            objectives=data.get("objectives", []),
            catchup_steps=data.get("steps", []),
            materials=data.get("materials", []),
            date=data.get("date", ""),
            time_start=data.get("timeStart", "08:00"),
            time_end=data.get("timeEnd", "08:40"),
            attendance={"boys": data.get("boys", 0), "girls": data.get("girls", 0)},
            teacher_name=data.get("teacherName", "Class Teacher"),
            school_name=data.get("school_name", data.get("school", "Primary School")),
            school_logo=data.get("schoolLogo", None)
        )
        
        # 2. SAVE TO FIRESTORE 🔥
        if uid:
            # 💡 TRICK: We save `catchup_level` inside the `grade` property here.
            # This guarantees that the UI dashboard "Recent Documents" cards 
            # display the correct Level Badge instead of an empty grade!
            meta_data = {
                "grade": catchup_level, 
                "subject": subject_name,
                "date": data.get("date", "")
            }
            save_catchup_plan(uid, school_id, plan, meta_data)
        
        # 3. Return to frontend
        return {
            "status": "success", 
            "data": plan,
            "credits_remaining": credit_info.get("remaining_credits") # Optional UI update helper
        }
        
    except HTTPException:
        # Re-raise HTTPExceptions so they aren't caught by the general Exception block below
        raise
    except Exception as e:
        print(f"❌ Route Error Generating Catch-Up Plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))