import traceback
from datetime import datetime, timedelta
from fastapi import APIRouter, Header, HTTPException
from typing import List

from models.schemas import SchemeRequest, SchemeRow


from services.llm_teacher_engine_old import generate_scheme_with_ai
from services.syllabus_manager import load_syllabus
from services.file_manager import save_generated_scheme
from services.credit_manager import check_and_deduct_credit

router = APIRouter()

# -----------------------------------
# HELPER
# -----------------------------------

def get_week_metadata(start_date_str: str | None, week_index: int):
    try:
        # If startDate is None or empty string, default to today
        if not start_date_str:
            base_date = datetime.now()
        else:
            base_date = datetime.strptime(start_date_str, "%Y-%m-%d")

        # Calculate the Monday of the target week
        monday = base_date + timedelta(weeks=week_index)
        # Calculate the Friday of the target week
        friday = monday + timedelta(days=4)

        month_name = monday.strftime("%B")
        date_range = f"Week {week_index + 1} ({monday.strftime('%d.%m.%Y')} - {friday.strftime('%d.%m.%Y')})"
        
        return month_name, date_range
    except Exception as e:
        print(f"Error calculating dates: {e}")
        return "", f"Week {week_index + 1}"

def resolve_user_id(x_user_id: str | None, payload_uid: str | None) -> str:
    return x_user_id or payload_uid or "default_user"

# -----------------------------------
# ROUTE
# -----------------------------------
@router.post("/generate-scheme", response_model=List[SchemeRow])
async def generate_scheme(
    request: SchemeRequest,
    x_user_id: str = Header(None, alias="X-User-ID")
):
    user_id = resolve_user_id(x_user_id, request.uid)
    print(f"📅 GENERATING SCHEME | User: {user_id} | Subject: {request.subject}")

    # 1. CREDIT CHECK
    try:
        check_and_deduct_credit(user_id)
    except Exception as e:
        print(f"⛔ Credit Check Failed: {e}")
        raise HTTPException(status_code=403, detail=str(e))

    # 2. LOAD SYLLABUS DATA (Now contains page_numbers inside)
    real_syllabus_data = load_syllabus(
        country="Zambia",
        grade=request.grade,
        subject=request.subject
    )
    # --- ADD THIS DEBUG BLOCK ---
    if real_syllabus_data and len(real_syllabus_data) > 0:
        print(f"🔍 DEBUG DATA CHECK: {real_syllabus_data[0]}")
        # Check if 'page_number' exists in the first item
        if 'page_number' not in real_syllabus_data[0]:
            print("⚠️ WARNING: 'page_number' key is MISSING in syllabus data! AI cannot generate references.")
    # 3. AI GENERATION (No manual page_number passed)
    try:
        ai_scheme = await generate_scheme_with_ai(
            syllabus_data=real_syllabus_data,
            subject=request.subject,
            grade=request.grade,
            term=request.term,
            num_weeks=request.weeks,
            start_date=request.startDate or "2026-01-13"
        )

        # Normalize AI output
        if isinstance(ai_scheme, dict) and "scheme" in ai_scheme:
            ai_scheme = ai_scheme["scheme"]

        if not isinstance(ai_scheme, list) or len(ai_scheme) == 0:
            raise HTTPException(status_code=500, detail="AI failed to generate scheme.")

        # 4. STRUCTURE DATA
        structured_rows: List[SchemeRow] = []
        
        for i in range(request.weeks):
            month_name, week_label = get_week_metadata(request.startDate, i)
            is_last_week = (i == request.weeks - 1)
            
            if i < len(ai_scheme):
                item = ai_scheme[i]
            else:
                item = {}

            # ✅ INTELLIGENT REFERENCES FALLBACK
            # If AI didn't return references (rare), we try to find a page number in the syllabus data for this specific topic
            # But usually, the AI will have done this for us based on the prompt.
            refs = item.get("references", [])
            if not refs:
                refs = ["Approved Syllabus", "Teacher's Guide"]

            row = SchemeRow(
                month=month_name,
                week=week_label,
                topic=item.get("topic", "Revision") if not is_last_week else "Revision and Exams",
                content=item.get("content", ["Revision"]) if not is_last_week else ["End of Term Exams"],
                outcomes=item.get("outcomes", []) if not is_last_week else ["Evaluate progress"],
                references=refs, # 👈 Uses the AI-generated refs (which include Page X)
                isSpecialRow=item.get("isSpecialRow", is_last_week)
            )
            structured_rows.append(row)

        # 5. SAVE HISTORY
        save_generated_scheme(
            uid=user_id,
            subject=request.subject,
            grade=request.grade,
            term=request.term,
            data=[row.dict() for row in structured_rows]
        )

        return structured_rows

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
