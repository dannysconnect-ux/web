import traceback
import re
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, BackgroundTasks, Header, Request
from firebase_admin import firestore
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from jinja2 import Environment, BaseLoader

# ==========================================
# 1. IMPORTS & SERVICES
# ==========================================
import services.school_llm as school_llm

# ✅ NEW ENGINE IMPORTS (Aliased as 'new_')
from services.llm_teacher_engine_new import (
    generate_scheme_with_ai as generate_new_scheme, 
    generate_weekly_plan_from_scheme as generate_new_weekly, 
    generate_specific_lesson_plan as generate_new_lesson
)

# ✅ OLD ENGINE IMPORTS (Aliased as 'old_', imported directly as requested)
from services.llm_teacher_engine_old import (
    generate_scheme_with_ai as generate_old_scheme,
    generate_weekly_plan_with_ai as generate_old_weekly,
    generate_specific_lesson_plan as generate_old_lesson
)

# Services: Content & Database
from services.syllabus_manager import load_syllabus, load_module
from services.file_manager import (
    save_generated_scheme, 
    load_generated_scheme,
    save_weekly_plan, 
    save_lesson_plan
)
from services.credit_manager import check_and_deduct_credit

router = APIRouter()
db = firestore.client()

# ==========================================
# 📦 MODELS (Unchanged)
# ==========================================
class Branding(BaseModel):
    logo_url: Optional[str] = None
    motto: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    primary_color: str = "#4f46e5"

class Templates(BaseModel):
    scheme_url: Optional[str] = None
    lesson_plan_url: Optional[str] = None
    weekly_plan_url: Optional[str] = None
    custom_instructions: Optional[str] = ""

class SchoolSettingsUpdate(BaseModel):
    school_id: str
    school_name: str
    branding: Branding
    templates: Templates

class GenerationRequest(BaseModel):
    type: Optional[str] = "lesson" 
    toolType: Optional[str] = None 
    uid: Optional[str] = "default_user"
    school_id: Optional[str] = None
    grade: Optional[str] = "Grade 9"
    subject: Optional[str] = "Mathematics"
    topic: Optional[str] = ""
    subtopic: Optional[str] = "" 
    term: Optional[str] = "Term 1" 
    weekNumber: Optional[int] = 1
    weeks: Optional[int] = 13
    days: Optional[int] = 5
    startDate: Optional[str] = None
    date: Optional[str] = None
    timeStart: Optional[str] = "08:00"
    timeEnd: Optional[str] = "09:00"
    objectives: Optional[List[str]] = []
    teacherName: Optional[str] = "Teacher"
    boys: Optional[int] = 0
    girls: Optional[int] = 0
    class Config: extra = "ignore" 

# ==========================================
# 🛠️ HELPERS
# ==========================================
def format_datetime(value, format="%d %b %Y"):
    if value == "now": return datetime.now().strftime(format)
    if value is None: return ""
    if isinstance(value, datetime): return value.strftime(format)
    try: return datetime.strptime(str(value), "%Y-%m-%d").strftime(format)
    except: return str(value)

def get_curriculum_type(grade: str) -> str:
    if not grade: return 'new'
    g = str(grade).strip().lower().replace("grade", "").strip()
    return 'old' if g in ["10", "11", "12", "gce"] else 'new'

def get_best_available_scheme(user_id: str, subject: str, grade: str, term: str):
    user_scheme = load_generated_scheme(user_id, subject, grade, term)
    if user_scheme: return user_scheme
    try:
        docs = db.collection("generated_schemes")\
            .where("subject", "==", subject)\
            .where("grade", "==", grade)\
            .where("term", "==", term)\
            .limit(1).stream()
        for doc in docs: return doc.to_dict()
    except: pass
    return None

# ==========================================
# 🏗️ BACKGROUND TASKS
# ==========================================
async def process_new_templates(school_id: str, templates: Templates):
    # ... (Keep existing implementation) ...
    pass 

# ==========================================
# 🚀 ROUTE: GENERATE
# ==========================================
@router.post("/generate")
async def generate_for_school(request: Any, school_id: Optional[str] = None):
    
    # --- 1. DATA EXTRACTION ---
    if isinstance(request, dict): req_data = request
    else: req_data = request.__dict__

    req_tool_type = req_data.get("toolType")
    req_type = req_data.get("type")
    raw_type = str(req_tool_type or req_type or "lesson").lower().strip()
    
    if "weekly" in raw_type or "forecast" in raw_type: doc_type = "weekly"
    elif "scheme" in raw_type or "sow" in raw_type: doc_type = "scheme"
    else: doc_type = "lesson"

    req_school_id = school_id if school_id else req_data.get("school_id")
    req_uid = req_data.get("uid", "default_user")
    req_term = req_data.get("term", "Term 1") or "Term 1"
    req_week = int(req_data.get("weekNumber", 1) or 1)
    req_weeks_total = int(req_data.get("weeks", 13) or 13)
    req_grade = req_data.get("grade", "Grade 9")
    req_subject = req_data.get("subject", "Mathematics")
    req_topic = req_data.get("topic", "") or "General Topic"
    raw_subtopic = req_data.get("subtopic", "")
    req_subtopic = str(raw_subtopic) if raw_subtopic else req_topic
    req_objectives = req_data.get("objectives", [])
    req_teacher = req_data.get("teacherName", "Teacher")
    req_days = int(req_data.get("days", 5) or 5)
    req_start_date = req_data.get("startDate")
    req_date = req_data.get("date")
    req_time_start = req_data.get("timeStart", "08:00")
    req_time_end = req_data.get("timeEnd", "09:00")
    req_boys = req_data.get("boys", 0)
    req_girls = req_data.get("girls", 0)

    print(f"🚀 SCHOOL ROUTE: Processing '{doc_type.upper()}' | Grade: {req_grade} | School: {req_school_id}")

    # Fetch School Data
    school_name = "School"
    school_data = {}
    if req_school_id:
        doc = db.collection("schools").document(req_school_id).get()
        if doc.exists:
            school_data = doc.to_dict()
            school_name = school_data.get("schoolName", "School")
    
    try:
        check_and_deduct_credit(req_uid, cost=1, school_id=req_school_id)
    except Exception: pass

    # =========================================================
    # 🅰️ PATH A: CUSTOM TEMPLATE (HTML)
    # =========================================================
    template_map = {"lesson": "lesson_plan_html", "scheme": "scheme_html", "weekly": "weekly_plan_html"}
    html_key = template_map.get(doc_type, "lesson_plan_html")
    templates = school_data.get("customTemplates", {})
    html_template = templates.get(html_key)

    if html_template:
        print(f"🎨 Using Custom HTML Template for {doc_type}...")
        try:
            clean_request_data = {
                "grade": req_grade, "subject": req_subject, "topic": req_topic,
                "subtopic": req_subtopic, "objectives": req_objectives,
                "term": req_term, "weekNumber": req_week, "weeks": req_weeks_total,
                "teacherName": req_teacher, "timeStart": req_time_start, "timeEnd": req_time_end,
                "date": req_date, "startDate": req_start_date
            }
            content_data = await school_llm.generate_dynamic_lesson(clean_request_data, html_template, school_data)
            
            env = Environment(loader=BaseLoader())
            env.filters['date'] = format_datetime
            
            jinja_template = env.from_string(html_template)
            context = {
                **content_data, 
                "doc_type": doc_type.upper(),
                "school_name": school_name, "teacher_name": req_teacher,
                "term": req_term, "week": req_week, "grade": req_grade, "subject": req_subject,
                "logo_url": school_data.get("branding", {}).get("logo_url"),
            }
            final_html = jinja_template.render(**context)
            save_payload = {**content_data, "custom_html": final_html}
            
            if doc_type == "scheme":
                save_generated_scheme(req_uid, req_subject, req_grade, req_term, school_name, save_payload, req_school_id)
            elif doc_type == "weekly":
                save_weekly_plan(req_uid, req_subject, req_grade, req_term, req_week, school_name, save_payload, req_school_id)
            else: 
                save_lesson_plan(req_uid, req_subject, req_grade, req_term, req_week, school_name, save_payload, req_school_id)

            return { "type": "custom_html", "school_name": school_name, "html": final_html }
        except Exception as e:
            print(f"⚠️ Custom Template Error: {e}. Falling back to standard JSON.")
            traceback.print_exc()

    # =========================================================
    # 🅱️ PATH B: STANDARD ENGINE
    # =========================================================
    print(f"⚙️ Routing to Standard Engine: {doc_type.upper()}")
    curr_type = get_curriculum_type(req_grade)
    result_data = {}

    try:
        # -------------------- SCHEME --------------------
        if doc_type == "scheme":
            syllabus_data = load_syllabus("Zambia", req_grade, req_subject) if curr_type == 'new' else []
            
            if curr_type == 'new':
                result_data = await generate_new_scheme(
                    syllabus_data=syllabus_data, subject=req_subject, grade=req_grade,
                    term=req_term, num_weeks=req_weeks_total, start_date=req_start_date or ""
                )
            else:
                result_data = await generate_old_scheme(
                    syllabus_data=syllabus_data, subject=req_subject, grade=req_grade,
                    term=req_term, num_weeks=req_weeks_total, start_date=req_start_date or ""
                )

            if isinstance(result_data, dict):
                if "rows" not in result_data and "weeks" in result_data: result_data["rows"] = result_data["weeks"]
                save_generated_scheme(req_uid, req_subject, req_grade, req_term, school_name, result_data, req_school_id)

        # -------------------- WEEKLY --------------------
        elif doc_type == "weekly":
            if curr_type == 'new':
                scheme_context = get_best_available_scheme(req_uid, req_subject, req_grade, req_term)
                scheme_rows = scheme_context.get("rows") or scheme_context.get("schemeData") or [] if isinstance(scheme_context, dict) else []
                module_data = load_module("Zambia", req_grade, req_subject)
                
                result_data = await generate_new_weekly(
                    school=school_name, subject=req_subject, grade=req_grade,
                    term=req_term, week_number=req_week, days=req_days,
                    start_date=req_start_date or "", scheme_data=scheme_rows, module_data=module_data
                )
            else:
                result_data = await generate_old_weekly(
                    grade=req_grade, subject=req_subject, term=req_term, 
                    week_number=req_week, school_name=school_name, 
                    start_date=req_start_date, days_count=req_days, topic=req_topic
                )
            
            if isinstance(result_data, dict):
                save_weekly_plan(req_uid, req_subject, req_grade, req_term, req_week, school_name, result_data, req_school_id)

        # -------------------- LESSON --------------------
        else: 
            if curr_type == 'new':
                module = load_module("Zambia", req_grade, req_subject)
                result_data = await generate_new_lesson(
                    grade=req_grade, subject=req_subject, theme=req_topic,
                    subtopic=req_subtopic, objectives=req_objectives, date=req_date or "2026-01-01",
                    time_start=req_time_start, time_end=req_time_end,
                    attendance={"boys": req_boys, "girls": req_girls}, teacher_name=req_teacher,
                    school_name=school_name, module_data=module
                )
            else:
                result_data = await generate_old_lesson(
                    grade=req_grade, subject=req_subject, theme=req_topic,
                    subtopic=req_subtopic, objectives=req_objectives, date=req_date or "2026-01-01",
                    time_start=req_time_start, time_end=req_time_end,
                    attendance={"boys": req_boys, "girls": req_girls}, teacher_name=req_teacher,
                    school_name=school_name
                )
            
            if not isinstance(result_data, dict):
                raise HTTPException(status_code=422, detail="Unable to generate content. Please check the Topic/Subtopic.")
            save_lesson_plan(req_uid, req_subject, req_grade, req_term, req_week, school_name, result_data, req_school_id)

        # ✅ FIX: RETURN FLATTENED DATA FOR FRONTEND
        # If the result is a dict, return it directly so frontend sees { "header": ..., "steps": ... }
        # Instead of { "type": "standard_json", "data": { ... } }
        if isinstance(result_data, dict):
             return result_data
        
        return { "data": result_data }

    except HTTPException as http_ex: raise http_ex 
    except Exception as e:
        print(f"❌ Routing Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"System Error: {str(e)}")

@router.post("/update-settings")
async def update_school_settings(payload: SchoolSettingsUpdate, background_tasks: BackgroundTasks):
    db.collection("schools").document(payload.school_id).set({
        "schoolName": payload.school_name, 
        "branding": payload.branding.dict(), 
        "templates": payload.templates.dict()
    }, merge=True)
    background_tasks.add_task(process_new_templates, payload.school_id, payload.templates)
    return {"status": "success"}

@router.get("/get-settings/{school_id}")
async def get_school_settings(school_id: str):
    doc = db.collection("schools").document(school_id).get()
    return doc.to_dict() if doc.exists else {}