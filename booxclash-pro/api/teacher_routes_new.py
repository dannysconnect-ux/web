import re
import traceback
from datetime import datetime, timedelta
from fastapi import APIRouter, Header, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from firebase_admin import firestore 

# Models
from models.schemas import SchemeRequest, SchemeRow, SchemeResponse

# Services (Refactored Structure)
from services.llm_teacher_engine_new import (
    generate_scheme_with_ai, 
    generate_weekly_plan_from_scheme, 
    generate_specific_lesson_plan,
    generate_lesson_notes,
    generate_record_of_work,
    generate_chalkboard_diagram,  # 🆕 NEW
    evaluate_lesson_feedback      # 🆕 NEW
)

# Services: Content Loading
from services.syllabus_manager import load_syllabus, load_module

# Services: Database
from services.file_manager import (
    save_generated_scheme, 
    load_generated_scheme, 
    save_weekly_plan, 
    save_lesson_plan,
    save_record_of_work 
)
from services.credit_manager import check_and_deduct_credit

router = APIRouter()
db = firestore.client()

# ==========================================
# 📌 REQUEST MODELS
# ==========================================
class LessonNotesRequest(BaseModel):
    uid: Optional[str] = None
    grade: str
    subject: str
    topic: str
    subtopic: str
    schoolId: Optional[str] = None

class WeeklyPlanRequest(BaseModel):
    uid: Optional[str] = None
    grade: str
    unit_id: Optional[str] = None
    subject: str
    term: str
    school: str
    weekNumber: int
    days: int = 5
    startDate: str = "2026-01-12"
    schoolId: Optional[str] = None
    lessonTitle: Optional[str] = None 
    topic: Optional[str] = None         
    references: Optional[str] = None
    schoolLogo: Optional[str] = None  

class LessonPlanRequest(BaseModel):
    uid: Optional[str] = None
    grade: str
    subject: str
    term: str
    school: str
    teacherName: str
    topic: str
    subtopic: str
    weekNumber: int
    date: str
    timeStart: str = "08:00"
    timeEnd: str = "08:40"
    boys: int = 0
    girls: int = 0
    objectives: List[str] = []
    schoolId: Optional[str] = None
    schoolLogo: Optional[str] = None 
    bloomsLevel: Optional[str] = "" 
    # 🆕 REMEDIAL SUPPORT FIELDS
    is_remedial: bool = False
    teacher_feedback: Optional[str] = None

class RecordOfWorkRequest(BaseModel): 
    uid: Optional[str] = None
    grade: str
    subject: str
    term: str
    school: str
    teacherName: str
    year: str
    weekNumber: int
    days: int
    startDate: str
    topic: str
    references: Optional[str] = None
    schoolId: Optional[str] = None
    schoolLogo: Optional[str] = None 

class TeacherEditRequest(BaseModel):
    uid: str
    planType: str  
    grade: str
    subject: str
    term: str
    weekNumber: int
    schoolId: Optional[str] = None
    finalEditedData: Dict[str, Any]

# 🆕 NEW: SVG DIAGRAM REQUEST
class ChalkboardDiagramRequest(BaseModel):
    uid: Optional[str] = None
    prompt: str 
    lesson_id: Optional[str] = None
    schoolId: Optional[str] = None # Added for school credit support

# 🆕 NEW: EVALUATION REQUEST
class LessonEvaluationRequest(BaseModel):
    uid: Optional[str] = None
    lesson_id: Optional[str] = None
    grade: str
    subject: str
    topic: str
    subtopic: str
    feedback: str
    schoolId: Optional[str] = None # Added for school credit support


# ==========================================
# 🛠️ HELPERS
# ==========================================

def get_week_metadata(start_date_str: str | None, week_index: int):
    try:
        if not start_date_str:
            base_date = datetime.now()
        else:
            base_date = datetime.strptime(start_date_str, "%Y-%m-%d")

        monday = base_date + timedelta(weeks=week_index)
        friday = monday + timedelta(days=4)

        month_name = monday.strftime("%B")
        date_range = f"({monday.strftime('%d.%m.%Y')} - {friday.strftime('%d.%m.%Y')})"
        
        return month_name, date_range, f"Week {week_index + 1} ({month_name}) {date_range}"
    except Exception as e:
        print(f"Error calculating dates: {e}")
        return "", "", f"Week {week_index + 1}"

def resolve_user_id(x_user_id: str | None, payload_uid: str | None) -> str:
    return x_user_id or payload_uid or "default_user"

def get_best_available_scheme(user_id: str, subject: str, grade: str, term: str):
    user_scheme = load_generated_scheme(user_id, subject, grade, term)
    if user_scheme: return user_scheme
    
    try:
        docs = db.collection("generated_schemes")\
            .where("userId", "==", user_id)\
            .where("subject", "==", subject)\
            .where("grade", "==", grade)\
            .where("term", "==", term)\
            .order_by("createdAt", direction=firestore.Query.DESCENDING)\
            .limit(1)\
            .stream()
            
        for doc in docs: 
            return doc.to_dict()
    except Exception as e: 
        print(f"⚠️ Warning: Could not fetch scheme context: {e}")
    return None

def get_locked_template_context(uid: str, plan_type: str, grade: str, subject: str) -> Optional[Dict[str, Any]]:
    try:
        flywheel_ref = db.collection("ai_training_flywheel")
        query = (flywheel_ref
                 .where("uid", "==", uid)
                 .where("plan_type", "==", plan_type)
                 .where("grade", "==", grade)
                 .where("subject", "==", subject))
        
        docs = query.stream()
        
        for doc in docs:
            data = doc.to_dict()
            human_data = data.get("final_human_data", {})
            
            if human_data.get("isLocked") is True:
                print(f"🔒 FOUND LOCKED TEMPLATE for {uid} -> {plan_type} ({subject})")
                return {
                    "customColumns": human_data.get("columns", []),
                    "templateRows": human_data.get("rows", human_data.get("days", human_data.get("steps", [])))
                }
                
        return None
    except Exception as e:
        print(f"⚠️ Error fetching locked template: {e}")
        return None


# ==========================================
# 🚀 ROUTES
# ==========================================

@router.post("/generate-scheme")
async def generate_scheme(
    request: SchemeRequest,
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_school_id: str = Header(None, alias="X-School-ID") 
):
    user_id = resolve_user_id(x_user_id, request.uid)
    school_id = x_school_id or getattr(request, "schoolId", None)

    print(f"📅 GENERATING SCHEME | User: {user_id} | School: {school_id} | Subject: {request.subject}")
    
    try:
        credit_status = check_and_deduct_credit(user_id, cost=1, school_id=school_id)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

    real_syllabus_data = load_syllabus(country="Zambia", grade=request.grade, subject=request.subject)
    locked_context = get_locked_template_context(user_id, "scheme_of_work", request.grade, request.subject)

    try:
        ai_result = await generate_scheme_with_ai(
            syllabus_data=real_syllabus_data,
            subject=request.subject,
            grade=request.grade,
            term=request.term,
            num_weeks=request.weeks,
            start_date=request.startDate or "2026-01-13",
            locked_context=locked_context
        )

        intro_data = ai_result.get("intro_info", {})
        scheme_weeks = ai_result.get("weeks", [])
        structured_rows: List[SchemeRow] = []
        
        for i in range(request.weeks):
            fallback_month, fallback_range, fallback_week_str = get_week_metadata(request.startDate, i)
            is_last_week = (i == request.weeks - 1)
            item = scheme_weeks[i] if i < len(scheme_weeks) else {}
            
            month_name = item.get("month", fallback_month)
            week_display = item.get("week", fallback_week_str)

            refs = item.get("references", [])
            if not refs:
                refs = [f"Syllabus Grade {request.grade}", f"Pupil's Book Grade {request.grade}"]
            
            unit_val = item.get("unit", "N/A")
            topic_text = item.get("topic", "")

            if unit_val == "N/A" or not unit_val:
                match = re.search(r"\b(\d+\.\d+)\b", topic_text)
                if match: unit_val = match.group(1)
            
            row_data = {
                "month": month_name,
                "week": week_display,
                "week_number": item.get("week_number", i+1), 
                "unit": unit_val,  
                "topic": topic_text if not is_last_week else "End of Term",
                "prescribed_competences": item.get("prescribed_competences", []),
                "specific_competences": item.get("specific_competences", item.get("outcomes", [])), 
                "content": item.get("content", []) if not is_last_week else ["Examinations"],
                "learning_activities": item.get("learning_activities", []),
                "methods": item.get("methods", []),
                "assessment": item.get("assessment", []),
                "resources": item.get("resources", []),
                "references": refs,
                "isSpecialRow": item.get("isSpecialRow", is_last_week)
            }

            for key, val in item.items():
                if key.startswith("custom_") and key not in row_data:
                    row_data[key] = val

            row = SchemeRow(**row_data)
            structured_rows.append(row)

        final_response = SchemeResponse(intro=intro_data, rows=structured_rows)

        save_generated_scheme(
            uid=user_id, 
            subject=request.subject, 
            grade=request.grade,
            term=request.term, 
            school_name=request.schoolName if hasattr(request, 'schoolName') else "School",
            data=final_response.dict(),
            school_id=school_id 
        )

        response_dict = final_response.dict()
        response_dict["credits_remaining"] = credit_status.get("remaining_credits")
        response_dict["expires_at"] = credit_status.get("expires_at")
        
        return response_dict

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/generate-weekly-plan")
async def generate_weekly(
    request: WeeklyPlanRequest,
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_school_id: str = Header(None, alias="X-School-ID") 
):
    user_id = resolve_user_id(x_user_id, request.uid)
    school_id = x_school_id or request.schoolId 

    print(f"📅 WEEKLY PLAN | User: {user_id} | Week {request.weekNumber} | Topic: {request.topic}")

    scheme_context = get_best_available_scheme(user_id, request.subject, request.grade, request.term)
    
    scheme_rows = []
    if scheme_context:
        if isinstance(scheme_context, list):
            scheme_rows = scheme_context
        elif isinstance(scheme_context, dict):
            scheme_rows = scheme_context.get("schemeData", {}).get("rows", []) or \
                          scheme_context.get("rows", []) or \
                          scheme_context.get("weeks", [])

    module_data = load_module(country="Zambia", grade=request.grade, subject=request.subject)
    locked_context = get_locked_template_context(user_id, "weekly_forecast", request.grade, request.subject)

    try:
        credit_status = check_and_deduct_credit(user_id, cost=1, school_id=school_id)
        
        plan = await generate_weekly_plan_from_scheme(
            school=request.school,
            subject=request.subject,
            grade=request.grade,
            term=request.term,
            week_number=request.weekNumber,
            days=request.days,
            start_date=request.startDate,
            scheme_data=scheme_rows,
            module_data=module_data,
            school_logo=request.schoolLogo,
            manual_topic=request.topic, 
            manual_subtopic=request.lessonTitle,
            locked_context=locked_context 
        )

        if request.topic:
            plan["meta"] = plan.get("meta", {})
            plan["meta"]["main_topic"] = request.topic 
        if request.lessonTitle:
            plan["meta"]["sub_topic"] = request.lessonTitle
        
        save_weekly_plan(
            uid=user_id, 
            subject=request.subject, 
            grade=request.grade, 
            term=request.term, 
            week=request.weekNumber, 
            school_name=request.school, 
            data=plan,
            school_id=school_id 
        )
        
        return {
            "data": plan,
            "credits_remaining": credit_status.get("remaining_credits"),
            "expires_at": credit_status.get("expires_at")
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-lesson-plan")
async def generate_lesson(
    request: LessonPlanRequest,
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_school_id: str = Header(None, alias="X-School-ID") 
):
    user_id = resolve_user_id(x_user_id, request.uid)
    school_id = x_school_id or request.schoolId

    mode_label = "REMEDIAL" if request.is_remedial else "STANDARD"
    print(f"📝 LESSON PLAN [{mode_label}] | User: {user_id} | Topic: {request.topic} | Bloom's: {request.bloomsLevel}")
    
    locked_context = get_locked_template_context(user_id, "lesson_plan", request.grade, request.subject)

    try:
        # Standard AND Remedial lesson plans cost 1 credit
        credit_status = check_and_deduct_credit(user_id, cost=1, school_id=school_id)
        
        attendance = {"boys": request.boys, "girls": request.girls}
        module_data = load_module(country="Zambia", grade=request.grade, subject=request.subject)

        lesson = await generate_specific_lesson_plan(
            grade=request.grade, subject=request.subject, theme=request.topic,
            subtopic=request.subtopic, objectives=request.objectives,
            date=request.date, time_start=request.timeStart, time_end=request.timeEnd,
            attendance=attendance, teacher_name=request.teacherName, school_name=request.school,
            module_data=module_data,
            blooms_level=request.bloomsLevel,
            school_logo=request.schoolLogo,
            locked_context=locked_context,
            is_remedial=request.is_remedial,            
            teacher_feedback=request.teacher_feedback   
        )

        if isinstance(lesson, dict):
            if "header" in lesson and isinstance(lesson["header"], dict):
                lesson.update(lesson.pop("header"))
            if "meta" in lesson and isinstance(lesson["meta"], dict):
                lesson.update(lesson.pop("meta"))
            if "steps" in lesson and "lesson_steps" not in lesson:
                lesson["lesson_steps"] = lesson["steps"]

        generated_topic = lesson.get("topic") or request.topic or "General Topic"
        
        save_lesson_plan(
            uid=user_id, 
            subject=request.subject, 
            grade=request.grade, 
            term=request.term, 
            week=request.weekNumber, 
            school_name=request.school, 
            data=lesson,
            school_id=school_id,
            topic=generated_topic 
        )
        
        return {
            "data": lesson,
            "credits_remaining": credit_status.get("remaining_credits"),
            "expires_at": credit_status.get("expires_at")
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-record-of-work")
async def generate_record_route(
    request: RecordOfWorkRequest,
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_school_id: str = Header(None, alias="X-School-ID")
):
    user_id = resolve_user_id(x_user_id, request.uid)
    school_id = x_school_id or request.schoolId

    print(f"🔔 [API] Generating Record of Work for Week {request.weekNumber}")
    
    locked_context = get_locked_template_context(user_id, "record_of_work", request.grade, request.subject)

    try:
        scheme_context = get_best_available_scheme(user_id, request.subject, request.grade, request.term)
        scheme_rows = []
        
        if scheme_context:
            if isinstance(scheme_context, list):
                scheme_rows = scheme_context
            elif isinstance(scheme_context, dict):
                scheme_rows = scheme_context.get("schemeData", {}).get("rows", []) or \
                              scheme_context.get("rows", []) or \
                              scheme_context.get("weeks", [])

        filtered_scheme_data = []
        target_week = request.weekNumber
        
        for row in scheme_rows:
            w_num = row.get("week_number")
            if not w_num and row.get("week"):
                 try:
                     w_num = int(str(row["week"]).lower().replace("week", "").strip().split()[0])
                 except: pass
            
            if w_num == target_week:
                filtered_scheme_data.append(row)
                break 
        
        if not filtered_scheme_data:
            filtered_scheme_data = [{
                "week_number": target_week,
                "topic": request.topic,
                "content": ["As per syllabus"],
                "references": [request.references] if request.references else ["Syllabus"],
                "methods": ["Discussion, Teacher Exposition"],
                "resources": ["Chalkboard"]
            }]

        credit_status = check_and_deduct_credit(user_id, cost=1, school_id=school_id)

        record_data = await generate_record_of_work(
            teacher_name=request.teacherName,
            school_name=request.school,
            grade=request.grade,
            subject=request.subject,
            term=request.term,
            year=request.year,
            start_date=request.startDate,
            scheme_data=filtered_scheme_data,
            school_logo=request.schoolLogo,
            locked_context=locked_context 
        )

        save_record_of_work(
            uid=user_id,
            subject=request.subject,
            grade=request.grade,
            term=request.term,
            week=request.weekNumber,
            school_name=request.school,
            topic=request.topic,
            data=record_data,
            school_id=school_id
        )
        
        return {
            "status": "success", 
            "data": record_data,
            "credits_remaining": credit_status.get("remaining_credits"),
            "expires_at": credit_status.get("expires_at")
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-lesson-notes")
async def generate_notes(
    request: LessonNotesRequest, 
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_school_id: str = Header(None, alias="X-School-ID")
):
    user_id = resolve_user_id(x_user_id, request.uid)
    school_id = x_school_id or request.schoolId
    print(f"📝 GENERATING NOTES | Subject: {request.subject} | Topic: {request.topic}")
    
    try:
        # Added a 1-credit deduction here so users can't generate notes endlessly for free
        credit_status = check_and_deduct_credit(user_id, cost=1, school_id=school_id)

        notes_data = await generate_lesson_notes(
            grade=request.grade,
            subject=request.subject,
            topic=request.topic,
            subtopic=request.subtopic
        )
        return {
            "status": "success", 
            "data": notes_data,
            "credits_remaining": credit_status.get("remaining_credits"),
            "expires_at": credit_status.get("expires_at")
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 🆕 CHALKBOARD DIAGRAM GENERATOR
# ==========================================
@router.post("/generate-diagram")
async def generate_diagram_route(
    request: ChalkboardDiagramRequest,
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_school_id: str = Header(None, alias="X-School-ID")
):
    user_id = resolve_user_id(x_user_id, request.uid)
    school_id = x_school_id or request.schoolId
    print(f"🎨 DIAGRAM REQUEST | User: {user_id} | Prompt: {request.prompt}")
    
    try:
        # 💰 Premium feature: Costs 3 credits
        credit_status = check_and_deduct_credit(user_id, cost=3, school_id=school_id)

        result = await generate_chalkboard_diagram(request.prompt)
        
        # Ensure we return the credit status alongside the diagram
        if isinstance(result, dict):
            result["credits_remaining"] = credit_status.get("remaining_credits")
            result["expires_at"] = credit_status.get("expires_at")
            return result
        else:
            return {
                "data": result,
                "credits_remaining": credit_status.get("remaining_credits"),
                "expires_at": credit_status.get("expires_at")
            }
            
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=403 if "credits" in str(e).lower() else 500, detail=str(e))


# ==========================================
# 🆕 LESSON EVALUATION & TROUBLESHOOTER
# ==========================================
@router.post("/evaluate-lesson")
async def evaluate_lesson_route(
    request: LessonEvaluationRequest,
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_school_id: str = Header(None, alias="X-School-ID")
):
    user_id = resolve_user_id(x_user_id, request.uid)
    school_id = x_school_id or request.schoolId
    print(f"🧠 EVALUATING LESSON | User: {user_id} | Topic: {request.topic}")
    
    try:
        # 💰 Standard feature: Costs 1 credit
        credit_status = check_and_deduct_credit(user_id, cost=1, school_id=school_id)

        result = await evaluate_lesson_feedback(
            topic=request.topic,
            subtopic=request.subtopic,
            grade=request.grade,
            teacher_feedback=request.feedback
        )
        return {
            "status": "success", 
            "data": result,
            "credits_remaining": credit_status.get("remaining_credits"),
            "expires_at": credit_status.get("expires_at")
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=403 if "credits" in str(e).lower() else 500, detail=str(e))


@router.post("/capture-teacher-edits")
async def capture_teacher_edits(
    request: TeacherEditRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_school_id: Optional[str] = Header(None, alias="X-School-ID")
):
    """
    🛡️ THE MOAT BUILDER 🛡️
    Captures the final, human-edited version of a plan.
    We save this alongside the raw AI version to build a fine-tuning dataset.
    """
    uid = resolve_user_id(x_user_id, request.uid)
    school_id = x_school_id or request.schoolId

    print(f"🛡️ Moat Capture: {uid} edited a {request.planType} for {request.subject}")

    try:
        training_record = {
            "uid": uid,
            "school_id": school_id,
            "plan_type": request.planType,
            "grade": request.grade,
            "subject": request.subject,
            "term": request.term,
            "week": request.weekNumber,
            "final_human_data": request.finalEditedData,
            "captured_at": firestore.SERVER_TIMESTAMP,
            "is_human_verified": True
        }
        
        db.collection("ai_training_flywheel").add(training_record)

        return {"status": "success", "message": "Edits captured for fine-tuning"}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))