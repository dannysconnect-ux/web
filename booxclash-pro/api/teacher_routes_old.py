import re
import traceback
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from firebase_admin import firestore

# 1. Import Shared Models
from models.schemas import SchemeRequest, SchemeRow, WorksheetResponse, WorksheetRequest

# 2. Import Services
from services.llm_teacher_engine_old import (
    generate_scheme_with_ai,
    generate_weekly_plan_with_ai,
    generate_specific_lesson_plan,
)
from services.llm_teacher_engine_new import generate_lesson_notes # Import notes engine
from services.syllabus_manager import load_syllabus, load_module 
from services.file_manager import (
    save_generated_scheme,
    load_generated_scheme,
    save_weekly_plan,
    save_lesson_plan,
    save_resource
)
from services.credit_manager import check_and_deduct_credit

router = APIRouter()
db = firestore.client()

# ------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------
class LessonNotesRequest(BaseModel):
    uid: Optional[str] = None
    grade: str
    subject: str
    topic: str
    subtopic: str
    schoolId: Optional[str] = None

class WeeklyPlanRequest(BaseModel):
    uid: str
    grade: str
    subject: str
    term: str
    school: Optional[str] = "Unknown School"
    weekNumber: int
    days: Optional[int] = 5
    startDate: Optional[str] = None
    lessonTitle: Optional[str] = None
    references: Optional[str] = None
    topic: Optional[str] = None 
    theme: Optional[str] = None
    schoolId: Optional[str] = None
    schoolLogo: Optional[str] = None  
    objectives: Optional[List[str]] = []

class LessonPlanRequest(BaseModel):
    uid: str
    grade: str
    subject: str
    term: str
    school: Optional[str] = "Unknown School"
    teacherName: Optional[str] = "Class Teacher"
    topic: str
    subtopic: str
    weekNumber: int
    date: str
    timeStart: str = "08:00"
    timeEnd: str = "08:40"
    boys: Optional[int] = 0
    girls: Optional[int] = 0
    objectives: List[str] = []
    references: Optional[str] = None
    schoolId: Optional[str] = None
    schoolLogo: Optional[str] = None 
    bloomsLevel: Optional[str] = "" 

class TeacherEditRequest(BaseModel):
    uid: str
    planType: str  
    grade: str
    subject: str
    term: str
    weekNumber: int
    schoolId: Optional[str] = None
    finalEditedData: Dict[str, Any]

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
def get_month_name(week_num: int) -> str:
    if week_num <= 4: return "January"
    if week_num <= 8: return "February"
    return "March"

def extract_week_number(week_value) -> int:
    if isinstance(week_value, int):
        return week_value
    match = re.search(r"\d+", str(week_value))
    return int(match.group()) if match else 1

def resolve_user_id(x_user_id: Optional[str], payload_uid: Optional[str]) -> str:
    return x_user_id or payload_uid or "default_user"

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

# ------------------------------------------------------------------
# 1. Generate Scheme of Work (DEBUG VERSION)
# ------------------------------------------------------------------
@router.post("/generate-scheme")
async def generate_scheme(
    request: SchemeRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_school_id: Optional[str] = Header(None, alias="X-School-ID")
):
    # =========================
    # 🚀 FULL REQUEST DEBUG
    # =========================
    print("\n================= 🚀 INCOMING SCHEME REQUEST =================")
    print("📦 RAW REQUEST OBJECT:", request)
    print("📦 REQUEST DICT:", request.dict())
    print("📦 HEADERS UID:", x_user_id)
    print("📦 HEADERS SCHOOL:", x_school_id)
    print("=============================================================\n")

    uid = resolve_user_id(x_user_id, request.uid)
    school_id = x_school_id or getattr(request, "schoolId", None)

    print(f"📅 Generating Scheme: {request.subject} | Grade {request.grade} | School: {school_id}")

    credit_status = {}

    # 1️⃣ Check Cache 
    cached = load_generated_scheme(uid, request.subject, request.grade, request.term)
    if cached:
        print("✅ Using cached scheme (No credit deduction)")
        ai_scheme_list = cached
        
        try:
            user_doc = db.collection("users").document(uid).get()
            if user_doc.exists:
                ud = user_doc.to_dict()
                credit_status["remaining_credits"] = ud.get("credits", 0)
                exp = ud.get("expires_at")
                credit_status["expires_at"] = exp.isoformat() if exp else None
        except Exception:
            pass
            
    else:
        # 2️⃣ Deduct Credit
        try:
            credit_status = check_and_deduct_credit(uid, cost=1, school_id=school_id)
        except Exception as e:
            raise HTTPException(status_code=402, detail=str(e)) 

        # 3️⃣ Fetch Locked Template context
        locked_context = get_locked_template_context(uid, "scheme_old_format", request.grade, request.subject)
        
        # 4️⃣ Load syllabus
        syllabus_data = load_syllabus("Zambia", request.grade, request.subject)

        print("\n📚 SYLLABUS DEBUG")
        print("📚 TYPE:", type(syllabus_data))
        if isinstance(syllabus_data, dict):
            print("📚 KEYS:", syllabus_data.keys())
        elif isinstance(syllabus_data, list):
            print("📚 LENGTH:", len(syllabus_data))

        # =========================
        # 🎯 TOPICS DEBUG
        # =========================
        selected_topics = getattr(request, "topics", None)

        print("\n📥 TOPICS DEBUG")
        print("request.topics:", request.topics if hasattr(request, "topics") else "❌ NOT IN SCHEMA")
        print("getattr topics:", selected_topics)
        print("fallback topic:", getattr(request, "topic", None))

        if not selected_topics or len(selected_topics) == 0:
            print("⚠️ topics is EMPTY or NOT RECEIVED")
            single_topic = getattr(request, "topic", "")
            if single_topic:
                print("🔁 Falling back to single topic:", single_topic)
                selected_topics = [single_topic]

        # Normalize
        normalized_topics = [str(t).strip().lower() for t in selected_topics if t]
        print("🧠 NORMALIZED TOPICS:", normalized_topics)

        # =========================
        # 🎯 FILTERING
        # =========================
        if normalized_topics and syllabus_data:
            print(f"\n🎯 Filtering syllabus for topics: {normalized_topics}")

            def is_match(item):
                title = item.get("topic_title") or item.get("topic") or item.get("title", "")
                
                print("🔍 Checking item:", title)

                if not title:
                    return False
                
                title_clean = title.strip().lower()

                # 🔥 FLEXIBLE MATCH (VERY IMPORTANT)
                match = any(t in title_clean for t in normalized_topics)

                if match:
                    print("✅ MATCH FOUND:", title)

                return match

            filtered_items = []

            if isinstance(syllabus_data, dict):
                key = "topics" if "topics" in syllabus_data else "units" if "units" in syllabus_data else None
                if key:
                    filtered_items = [item for item in syllabus_data.get(key, []) if is_match(item)]
                    print("📊 FILTERED COUNT:", len(filtered_items))

                    if filtered_items:
                        syllabus_data[key] = filtered_items
                    else:
                        print(f"❌ NO MATCH FOUND for topics: {normalized_topics}")

            elif isinstance(syllabus_data, list):
                filtered_items = [item for item in syllabus_data if is_match(item)]
                print("📊 FILTERED COUNT:", len(filtered_items))

                if filtered_items:
                    syllabus_data = filtered_items
                else:
                    print(f"❌ NO MATCH FOUND for topics: {normalized_topics}")

        else:
            print("⚠️ No topics provided OR syllabus missing")

        # =========================
        # 🤖 GENERATE
        # =========================
        try:
            ai_scheme = await generate_scheme_with_ai(
                syllabus_data=syllabus_data,
                subject=request.subject,
                grade=request.grade,
                term=request.term,
                num_weeks=request.weeks,
                locked_context=locked_context 
            )

            if isinstance(ai_scheme, dict):
                ai_scheme_list = ai_scheme.get("scheme", ai_scheme.get("weeks", []))
                data_to_save = ai_scheme
            else:
                ai_scheme_list = ai_scheme
                data_to_save = {"weeks": ai_scheme_list}

            if ai_scheme_list:
                school_name_val = getattr(request, "school", getattr(request, "schoolName", "Unknown School"))
                save_generated_scheme(
                    uid=uid,
                    subject=request.subject,
                    grade=request.grade,
                    term=request.term,
                    school_name=school_name_val,
                    data=data_to_save, 
                )

        except Exception as e:
            traceback.print_exc()
            print(f"❌ Scheme generation failed: {e}")
            return []

    # =========================
    # 📤 FORMAT RESPONSE
    # =========================
    rows: List[SchemeRow] = []
    
    def ensure_list(val: Any) -> List[str]:
        if isinstance(val, list):
            return [str(v) for v in val]
        if isinstance(val, str):
            if "," in val:
                return [v.strip() for v in val.split(",") if v.strip()]
            return [val]
        return []

    for item in ai_scheme_list or []:
        week_num = extract_week_number(item.get("week_number") or item.get("week"))
        
        raw_refs = item.get("references", "")
        final_refs = ensure_list(raw_refs)
        if not final_refs:
            final_refs = ["Syllabus Ref"]

        t_content = item.get("topic_content")
        if not t_content:
            raw_topic = item.get("topic", "")
            raw_content = item.get("content", [])
            c_str = "\n- ".join(raw_content) if isinstance(raw_content, list) else str(raw_content)
            t_content = f"**{raw_topic}**\n- {c_str}"

        row_data = {
            "week": str(item.get("week", week_num)),
            "date_range": item.get("date_range", ""),
            "topic_content": t_content, 
            "methods": ensure_list(item.get("methods", "Discussion")),
            "resources": ensure_list(item.get("resources", "Textbook")),
            "outcomes": ensure_list(item.get("outcomes", [])),
            "references": final_refs,
            "isSpecialRow": item.get("isSpecialRow", False),
            "month": item.get("month") or get_month_name(week_num),
            "topic": item.get("topic", ""),
            "content": ensure_list(item.get("content", []))
        }

        for key, val in item.items():
            if key.startswith("custom_") and key not in row_data:
                row_data[key] = val

        rows.append(SchemeRow(**row_data))

    return {
        "data": rows,
        "credits_remaining": credit_status.get("remaining_credits"),
        "expires_at": credit_status.get("expires_at")
    }

# ------------------------------------------------------------------
# 2. Generate Weekly Plan 
# ------------------------------------------------------------------
@router.post("/generate-weekly-plan")
async def generate_weekly_plan(
    request: WeeklyPlanRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_school_id: Optional[str] = Header(None, alias="X-School-ID")
):
    uid = resolve_user_id(x_user_id, request.uid)
    school_id = x_school_id or request.schoolId

    clean_topic = request.topic or request.theme
    clean_subtopic = request.lessonTitle 
    
    if not clean_topic or clean_topic.strip() == "":
        raise HTTPException(
            status_code=400, 
            detail="Topic is required. Please select a topic from your scheme or enter one manually."
        )
    
    raw_refs = getattr(request, "references", "")
    if isinstance(raw_refs, list):
        clean_refs = "\n".join([str(r) for r in raw_refs])
    else:
        clean_refs = str(raw_refs) if raw_refs else None

    print(f"📅 Generating Weekly Plan: {request.subject} | Week {request.weekNumber}")

    try:
        # 💰 Capture credit status here
        credit_status = check_and_deduct_credit(uid, cost=1, school_id=school_id)
    except Exception as e:
        raise HTTPException(status_code=402, detail=str(e))

    locked_context = get_locked_template_context(uid, "weekly_forecast", request.grade, request.subject)

    try:
        plan_data = await generate_weekly_plan_with_ai(
            grade=request.grade,
            subject=request.subject,
            term=request.term,
            week_number=request.weekNumber,
            school_name=request.school,
            start_date=request.startDate,
            days_count=request.days,
            topic=clean_topic,        
            subtopic=clean_subtopic, 
            references=clean_refs,
            school_logo=request.schoolLogo,
            locked_context=locked_context,
            objectives=request.objectives 
        )

        if not plan_data:
            raise HTTPException(status_code=500, detail="AI failed to generate weekly plan")

        plan_data["meta"] = plan_data.get("meta", {})
        plan_data["meta"]["main_topic"] = clean_topic
        if clean_subtopic:
            plan_data["meta"]["sub_topic"] = clean_subtopic

        save_weekly_plan(
            uid=uid,
            subject=request.subject,
            grade=request.grade,
            school_name=request.school,
            term=request.term,
            week=request.weekNumber,
            data=plan_data,
            school_id=school_id 
        )

        # 📥 Return data along with updated credit and expiry details
        return {
            "status": "success", 
            "data": plan_data,
            "credits_remaining": credit_status.get("remaining_credits"),
            "expires_at": credit_status.get("expires_at")
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------
# 3. Generate Lesson Plan 
# ------------------------------------------------------------------
@router.post("/generate-lesson-plan")
async def generate_lesson_plan(
    request: LessonPlanRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_school_id: Optional[str] = Header(None, alias="X-School-ID")
):
    uid = resolve_user_id(x_user_id, request.uid)
    school_id = x_school_id or request.schoolId

    print(f"📝 Generating Lesson Plan (Old): {request.subject} | {request.topic} | Bloom's: {request.bloomsLevel}")

    try:
        # 💰 Capture credit status here
        credit_status = check_and_deduct_credit(uid, cost=1, school_id=school_id)
    except Exception as e:
        raise HTTPException(status_code=402, detail=str(e))

    locked_context = get_locked_template_context(uid, "lesson_plan", request.grade, request.subject)

    try:
        module_data = load_module(country="Zambia", grade=request.grade, subject=request.subject)

        plan_data = await generate_specific_lesson_plan(
            grade=request.grade,
            subject=request.subject,
            theme=request.topic,
            subtopic=request.subtopic,
            objectives=request.objectives,
            date=request.date,
            time_start=request.timeStart,
            time_end=request.timeEnd,
            attendance={"boys": request.boys, "girls": request.girls},
            teacher_name=request.teacherName,
            school_name=request.school,
            module_data=module_data,
            blooms_level=request.bloomsLevel,
            scheme_references=request.references or "Standard Syllabus",
            school_logo=request.schoolLogo, 
            locked_context=locked_context 
        )

        if not plan_data:
             raise HTTPException(status_code=500, detail="AI failed to generate lesson plan")

        try:
            save_lesson_plan(
                uid=uid,
                subject=request.subject,
                grade=request.grade,
                data=plan_data,
                term=request.term,
                school_name=request.school,
                week=request.weekNumber,
                topic=request.topic
            )
        except Exception as save_error:
            print(f"⚠️ Could not save lesson plan to DB: {save_error}")

        # 📥 Return data along with updated credit and expiry details
        return {
            "status": "success", 
            "data": plan_data,
            "credits_remaining": credit_status.get("remaining_credits"),
            "expires_at": credit_status.get("expires_at")
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Lesson plan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------
# 4. Generate Lesson Notes
# ------------------------------------------------------------------
@router.post("/generate-lesson-notes")
async def generate_notes(
    request: LessonNotesRequest, 
    x_user_id: str = Header(None, alias="X-User-ID")
):
    user_id = resolve_user_id(x_user_id, request.uid)
    print(f"📝 GENERATING NOTES | Subject: {request.subject} | Topic: {request.topic}")
    
    try:
        notes_data = await generate_lesson_notes(
            grade=request.grade,
            subject=request.subject,
            topic=request.topic,
            subtopic=request.subtopic
        )
        return {"status": "success", "data": notes_data}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------
# 5. Capture Edits
# ------------------------------------------------------------------
@router.post("/capture-teacher-edits")
async def capture_teacher_edits(
    request: TeacherEditRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_school_id: Optional[str] = Header(None, alias="X-School-ID")
):
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