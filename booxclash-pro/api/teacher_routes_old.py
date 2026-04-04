import os
import re
import json
import copy
import traceback
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter 

import google.generativeai as genai
from dotenv import load_dotenv

# ✅ LOAD ENVIRONMENT VARIABLES
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# 1. Import Shared Models
from models.schemas import SchemeRequest, SchemeRow, WorksheetResponse, LessonEvaluationRequest, WorksheetRequest

# 2. Import Services
from services.llm_teacher_engine_old import (
    generate_scheme_with_ai,
    generate_weekly_plan_with_ai,
    generate_specific_lesson_plan,
)
from services.llm_teacher_engine_new import generate_lesson_notes, evaluate_lesson_feedback 
from services.syllabus_manager import load_syllabus, load_module 
from services.file_manager import (
    save_generated_scheme,
    load_generated_scheme,
    save_weekly_plan,
    save_lesson_plan,
    save_resource,
)
from services.credit_manager import check_and_deduct_credit

router = APIRouter()
db = firestore.client()

# ==================================================================
# 📌 LOCAL SCHEMAS & MODELS
# ==================================================================
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


# ==================================================================
# 🛠️ HELPERS
# ==================================================================
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
                 .where(filter=FieldFilter("uid", "==", uid))
                 .where(filter=FieldFilter("plan_type", "==", plan_type))
                 .where(filter=FieldFilter("grade", "==", grade))
                 .where(filter=FieldFilter("subject", "==", subject)))
        
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


# ==================================================================
# 🚀 CACHING & TOKEN SAVING ENGINE 
# ==================================================================

def find_cached_document(collection_name: str, grade: str, subject: str, term: str = None, topic: str = None, subtopic: str = None, doc_type: str = "lesson", requested_topics: List[str] = None, requested_subtopics: List[str] = None):
    collections_to_check = ["ai_training_flywheel", collection_name]
    
    print(f"\n🔍 [CACHE ENGINE] Searching for {doc_type.upper()}...")
    print(f"   | Grade: {grade} | Subject: {subject} | Term: {term}")

    for col in collections_to_check:
        print(f"   | Checking collection: {col}...")
        try:
            query = db.collection(col).where(filter=FieldFilter("grade", "==", grade)).where(filter=FieldFilter("subject", "==", subject))
            if term: 
                query = query.where(filter=FieldFilter("term", "==", term))
            
            docs = query.limit(20).stream()
            
            for doc in docs:
                data = doc.to_dict()
                
                # Check Flywheel Document Type
                if col == "ai_training_flywheel":
                    ptype = data.get("plan_type", data.get("type", "")).lower()
                    if doc_type not in ptype: continue
                
                # 🎯 SMART RAG MATCHING FOR SCHEMES
                if doc_type == "scheme":
                    cached_topics = data.get("topics", [])
                    cached_subtopics = data.get("subtopics", [])
                    
                    req_top_norm = set([t.lower().strip() for t in (requested_topics or []) if t])
                    cache_top_norm = set([t.lower().strip() for t in cached_topics if isinstance(t, str) and t])
                    
                    if req_top_norm:
                        # Filter out AI padding/generic topics to compare the "Core" syllabus topics
                        ignore_words = ["revision", "test", "assessment", "review", "consolidation", "general"]
                        core_cache_topics = {t for t in cache_top_norm if not any(w in t for w in ignore_words)}
                        
                        # 1. Ensure all requested topics are present in the cached document (Subset Check)
                        if not req_top_norm.issubset(cache_top_norm):
                            print(f"   ⏭️ Skipping Doc {doc.id}: Missing requested topics.")
                            continue
                            
                        # 2. Prevent serving a 10-topic scheme to someone who only wanted 1 topic
                        if len(core_cache_topics) > 0 and len(req_top_norm) < (len(core_cache_topics) - 2):
                            print(f"   ⏭️ Skipping Doc {doc.id}: Cache has too many extra core topics.")
                            continue

                # TOPIC/SUBTOPIC MATCHING FOR LESSONS & WEEKLY PLANS
                if doc_type != "scheme":
                    req_topic = str(topic).strip().lower() if topic else ""
                    if req_topic:
                        db_topic = str(data.get("topic", "")).strip().lower()
                        if req_topic not in db_topic and db_topic not in req_topic: continue
                            
                    req_sub = str(subtopic).strip().lower() if subtopic else ""
                    if req_sub:
                        db_sub = str(data.get("subtopic", data.get("sub_topic", data.get("lessonTitle", "")))).strip().lower()
                        if req_sub not in db_sub and db_sub not in req_sub: continue
                
                print(f"♻️  [CACHE HIT] Found matching {doc_type} in {col} (Doc ID: {doc.id})!")
                
                if "final_human_data" in data and data["final_human_data"]: return data["final_human_data"]
                if doc_type == "scheme": return data.get("schemeData", data.get("data", data))
                if doc_type == "lesson": return data.get("planData", data.get("lessonData", data.get("data", data)))
                if doc_type == "weekly": return data.get("planData", data.get("weeklyData", data.get("data", data)))
                
                return data.get("data", data)
        except Exception as e:
            print(f"❌ [CACHE ERROR] Failed while checking {col}: {e}")
            
    print(f"❌ [CACHE MISS] No cached {doc_type} found. Proceeding to AI generation...")
    return None

def swap_context_locally(data, new_context: dict):
    key_mapping = {
        "Teacher Name": ["teacher", "teachername", "teacher_name", "name of teacher"],
        "School Name": ["school", "schoolname", "school_name", "name of school"],
        "Term": ["term"],
        "Week": ["week", "weeknumber", "week_number"],
        "Date": ["date", "startdate", "start_date"],
        "Start Date": ["date", "startdate", "start_date"],
        "Boys": ["boys", "num_boys"],
        "Girls": ["girls", "num_girls"]
    }
    if isinstance(data, dict):
        new_data = {}
        for k, v in data.items():
            k_norm = k.lower().replace("_", "").replace(" ", "")
            replaced = False
            for ctx_key, ctx_val in new_context.items():
                possible_keys = key_mapping.get(ctx_key, [ctx_key.lower().replace(" ", "")])
                if k_norm in possible_keys:
                    new_data[k] = ctx_val
                    replaced = True
                    break
            if not replaced:
                new_data[k] = swap_context_locally(v, new_context)
        return new_data
    elif isinstance(data, list):
        return [swap_context_locally(item, new_context) for item in data]
    else:
        return data

def flatten_scheme_rows(data: Any) -> List[dict]:
    raw_list = []
    if isinstance(data, dict):
        raw_list = data.get("schemeData", data.get("scheme", data.get("weeks", data.get("data", data.get("rows", [])))))
    elif isinstance(data, list):
        raw_list = data
    
    flat = []
    if not isinstance(raw_list, list): return flat
    
    for w_idx, item in enumerate(raw_list):
        if not isinstance(item, dict): continue
        lessons = item.get("lessons")
        if lessons and isinstance(lessons, list):
            week_num = item.get("week", w_idx + 1)
            week_topic = item.get("topic", "")
            for l_idx, lesson_obj in enumerate(lessons):
                if not isinstance(lesson_obj, dict): continue
                row = copy.deepcopy(lesson_obj)
                row["week"] = week_num
                row["lesson"] = l_idx + 1
                if "topic" not in row or not row["topic"]: row["topic"] = week_topic
                flat.append(row)
        else:
            flat.append(item)
    return flat


# ==================================================================
# 🗓️ SCHEMES OF WORK
# ==================================================================
@router.post("/generate-scheme")
async def generate_scheme(
    request: SchemeRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_school_id: Optional[str] = Header(None, alias="X-School-ID")
):
    print("\n================= 🚀 INCOMING SCHEME REQUEST =================")
    print("📦 HEADERS UID:", x_user_id)
    print("=============================================================\n")

    uid = resolve_user_id(x_user_id, request.uid)
    school_id = x_school_id or getattr(request, "schoolId", None)

    credit_status = {}
    cached = load_generated_scheme(uid, request.subject, request.grade, request.term)
    if cached:
        try:
            user_doc = db.collection("users").document(uid).get()
            if user_doc.exists:
                ud = user_doc.to_dict()
                credit_status = {"remaining_credits": ud.get("credits", 0), "expires_at": ud.get("expires_at")}
        except: pass
    else:
        try:
            credit_status = check_and_deduct_credit(uid, cost=1, school_id=school_id)
        except Exception as e:
            raise HTTPException(status_code=402, detail=str(e)) 

    # 3️⃣ Fetch Locked Template context
    locked_context = get_locked_template_context(uid, "scheme_old_format", request.grade, request.subject)
    
    # 4️⃣ Load syllabus
    syllabus_data = load_syllabus("Zambia", request.grade, request.subject)

    selected_topics = getattr(request, "topics", [])
    selected_subtopics = getattr(request, "subtopics", []) 

    if not selected_topics or len(selected_topics) == 0:
        single_topic = getattr(request, "topic", "")
        if single_topic: selected_topics = [single_topic]

    normalized_topics = [str(t).strip().lower() for t in selected_topics if t]
    normalized_subtopics = [str(s).strip().lower() for s in selected_subtopics if s]

    if normalized_topics and syllabus_data:
        def is_match(item):
            title = item.get("topic_title") or item.get("topic") or item.get("title", "")
            if not title: return False
            title_clean = title.strip().lower()
            return any(t in title_clean for t in normalized_topics)

        filtered_items = []
        items_to_process = []
        key_used = None

        if isinstance(syllabus_data, dict):
            key_used = "topics" if "topics" in syllabus_data else "units" if "units" in syllabus_data else None
            if key_used: items_to_process = syllabus_data.get(key_used, [])
        elif isinstance(syllabus_data, list):
            items_to_process = syllabus_data

        for item in items_to_process:
            if is_match(item):
                item_copy = copy.deepcopy(item)
                if normalized_subtopics:
                    for sub_key in ["subtopics", "sub_topics", "content"]:
                        if sub_key in item_copy and isinstance(item_copy[sub_key], list):
                            filtered_subs = []
                            for sub in item_copy[sub_key]:
                                sub_name = sub if isinstance(sub, str) else sub.get("name", sub.get("title", ""))
                                if sub_name and str(sub_name).strip().lower() in normalized_subtopics:
                                    filtered_subs.append(sub)
                            if filtered_subs:
                                item_copy[sub_key] = filtered_subs
                filtered_items.append(item_copy)

        if isinstance(syllabus_data, dict) and key_used and filtered_items:
            syllabus_data[key_used] = filtered_items
        elif isinstance(syllabus_data, list) and filtered_items:
            syllabus_data = filtered_items

    # ♻️ CHECK CACHE
    db_cached_plan = find_cached_document(
        "generated_schemes", request.grade, request.subject, term=request.term, 
        doc_type="scheme", requested_topics=normalized_topics, requested_subtopics=normalized_subtopics
    )
    
    final_scheme_rows = []

    if db_cached_plan:
        print("✅ [SMART CACHE] Perfect Match found! Swapping context locally...")
        swapped_data = swap_context_locally(db_cached_plan, {
            "School Name": getattr(request, "school", "Unknown School"),
            "Term": request.term,
            "Teacher Name": getattr(request, "teacherName", "Teacher")
        })
        final_scheme_rows = flatten_scheme_rows(swapped_data)
    else:
        print("🤖 [AI GEN] Generating Scheme from AI...")
        try:
            provided_start_date = getattr(request, "startDate", "2026-01-12")
            ai_scheme = await generate_scheme_with_ai(
                syllabus_data=syllabus_data,
                subject=request.subject,
                grade=request.grade,
                term=request.term,
                num_weeks=request.weeks,
                start_date=provided_start_date,    
                locked_context=locked_context,
                topics=selected_topics,
                subtopics=selected_subtopics
            )
            final_scheme_rows = flatten_scheme_rows(ai_scheme)
        except Exception as e:
            traceback.print_exc()
            return {"data": [], "error": str(e)}

    # 💾 Save generated data
    if final_scheme_rows:
        school_name_val = getattr(request, "school", getattr(request, "schoolName", "Unknown School"))
        data_to_save = {
            "weeks": final_scheme_rows, 
            "topics": normalized_topics,
            "subtopics": normalized_subtopics
        }
        save_generated_scheme(
            uid=uid, subject=request.subject, grade=request.grade,
            term=request.term, school_name=school_name_val, data=data_to_save
        )

    # =========================
    # 📤 FORMAT RESPONSE (FIXES BLANK COLUMNS)
    # =========================
    rows: List[SchemeRow] = []
    
    def ensure_list(val: Any) -> List[str]:
        if isinstance(val, list): return [str(v) for v in val]
        if isinstance(val, str):
            if "," in val: return [v.strip() for v in val.split(",") if v.strip()]
            return [val]
        return []

    for item in final_scheme_rows or []:
        week_num = extract_week_number(item.get("week_number") or item.get("week"))
        
        raw_refs = item.get("references", "")
        final_refs = ensure_list(raw_refs)
        if not final_refs:
            final_refs = ["Syllabus Ref"]

        # Fix Blank "Outcomes" if AI used "objectives" instead
        raw_outcomes = item.get("outcomes") or item.get("objectives", [])
        final_outcomes = ensure_list(raw_outcomes)

        # Fix Blank "Topic / Content" if AI separated them
        t_content = item.get("topic_content")
        if not t_content:
            raw_topic = item.get("topic", "")
            raw_content = item.get("content", [])
            c_str = "\n- ".join(ensure_list(raw_content)) if raw_content else ""
            t_content = f"**{raw_topic}**\n- {c_str}" if c_str else f"**{raw_topic}**"

        row_data = {
            "week": str(item.get("week", week_num)),
            "date_range": item.get("date_range", ""),
            "topic_content": t_content, 
            "methods": ensure_list(item.get("methods", "Discussion")),
            "resources": ensure_list(item.get("resources", "Textbook")),
            "outcomes": final_outcomes,
            "references": final_refs,
            "isSpecialRow": item.get("isSpecialRow", False),
            "month": item.get("month") or get_month_name(week_num),
            "topic": item.get("topic", ""),
            "subtopic": item.get("subtopic", ""), 
            "content": ensure_list(item.get("content", []))
        }

        # Preserve custom Flywheel columns
        for key, val in item.items():
            if key.startswith("custom_") and key not in row_data:
                row_data[key] = val
            elif key not in row_data:
                row_data[key] = val

        rows.append(SchemeRow(**row_data))

    return {
        "data": rows,
        "credits_remaining": credit_status.get("remaining_credits"),
        "expires_at": credit_status.get("expires_at")
    }


# ==================================================================
# 📅 WEEKLY PLANS 
# ==================================================================
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
        raise HTTPException(status_code=400, detail="Topic is required.")
    
    raw_refs = getattr(request, "references", "")
    clean_refs = "\n".join([str(r) for r in raw_refs]) if isinstance(raw_refs, list) else str(raw_refs)

    try:
        credit_status = check_and_deduct_credit(uid, cost=1, school_id=school_id)
    except Exception as e:
        raise HTTPException(status_code=402, detail=str(e))

    locked_context = get_locked_template_context(uid, "weekly_forecast", request.grade, request.subject)

    db_cached_plan = find_cached_document("generated_weekly_plans", request.grade, request.subject, topic=clean_topic, doc_type="weekly")

    if db_cached_plan:
        print("🔄 [CONTEXT SWAP] Applying new names instantly via Python...")
        plan_data = swap_context_locally(db_cached_plan, {
            "Teacher Name": getattr(request, "teacherName", "Teacher"),
            "School Name": getattr(request, "school", "Unknown School"),
            "Week": request.weekNumber,
            "Start Date": getattr(request, "startDate", "")
        })
    else:
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
            if not plan_data: raise HTTPException(status_code=500, detail="AI failed to generate weekly plan")
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

    plan_data["meta"] = plan_data.get("meta", {})
    plan_data["meta"]["main_topic"] = clean_topic
    if clean_subtopic: plan_data["meta"]["sub_topic"] = clean_subtopic

    save_weekly_plan(
        uid=uid, subject=request.subject, grade=request.grade,
        school_name=request.school, term=request.term, week=request.weekNumber,
        data=plan_data, school_id=school_id 
    )

    return {
        "status": "success", 
        "data": plan_data,
        "credits_remaining": credit_status.get("remaining_credits"),
        "expires_at": credit_status.get("expires_at")
    }


# ==================================================================
# 📖 LESSON PLANS 
# ==================================================================
@router.post("/generate-lesson-plan")
async def generate_lesson_plan(
    request: LessonPlanRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_school_id: Optional[str] = Header(None, alias="X-School-ID")
):
    uid = resolve_user_id(x_user_id, request.uid)
    school_id = x_school_id or request.schoolId

    try:
        credit_status = check_and_deduct_credit(uid, cost=1, school_id=school_id)
    except Exception as e:
        raise HTTPException(status_code=402, detail=str(e))

    locked_context = get_locked_template_context(uid, "lesson_plan", request.grade, request.subject)
    module_data = load_module(country="Zambia", grade=request.grade, subject=request.subject)

    db_cached_plan = find_cached_document(
        "generated_lesson_plans", request.grade, request.subject, 
        topic=request.topic, subtopic=request.subtopic, doc_type="lesson"
    )

    if db_cached_plan:
        print("🔄 [CONTEXT SWAP] Applying new names instantly via Python...")
        plan_data = swap_context_locally(db_cached_plan, {
            "Teacher Name": getattr(request, "teacherName", "Teacher"),
            "School Name": getattr(request, "school", "Unknown School"),
            "Date": getattr(request, "date", datetime.now().strftime("%Y-%m-%d")),
            "Week": request.weekNumber,
            "Boys": getattr(request, "boys", 0),
            "Girls": getattr(request, "girls", 0)
        })
    else:
        try:
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
            if not plan_data: raise HTTPException(status_code=500, detail="AI failed to generate lesson plan")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    try:
        save_lesson_plan(
            uid=uid, subject=request.subject, grade=request.grade,
            data=plan_data, term=request.term, school_name=request.school,
            week=request.weekNumber, topic=request.topic
        )
    except Exception as save_error:
        print(f"⚠️ Could not save lesson plan to DB: {save_error}")

    return {
        "status": "success", 
        "data": plan_data,
        "credits_remaining": credit_status.get("remaining_credits"),
        "expires_at": credit_status.get("expires_at")
    }


# ==================================================================
# 📝 LESSON NOTES
# ==================================================================
@router.post("/generate-lesson-notes")
async def generate_notes(
    request: LessonNotesRequest, 
    x_user_id: str = Header(None, alias="X-User-ID")
):
    user_id = resolve_user_id(x_user_id, request.uid)
    try:
        notes_data = await generate_lesson_notes(
            grade=request.grade,
            subject=request.subject,
            topic=request.topic,
            subtopic=request.subtopic
        )
        return {"status": "success", "data": notes_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================================
# 🛡️ CAPTURE TEACHER EDITS & EVALUATIONS
# ==================================================================
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
        
        # 🎯 FIX: Safely extract rows whether it's a List or a Dictionary
        if "scheme" in request.planType.lower():
            raw_data = request.finalEditedData
            rows_to_extract = []
            
            if isinstance(raw_data, list):
                rows_to_extract = raw_data
            elif isinstance(raw_data, dict):
                # Unpack the 'rows' from the frontend's grid object
                rows_to_extract = raw_data.get("rows", raw_data.get("schemeData", []))
                
            if isinstance(rows_to_extract, list):
                topics_set = set([str(r.get("topic", "")).strip() for r in rows_to_extract if isinstance(r, dict) and r.get("topic")])
                subs_set = set([str(r.get("subtopic", "")).strip() for r in rows_to_extract if isinstance(r, dict) and r.get("subtopic")])
                
                training_record["topics"] = list(topics_set)
                training_record["subtopics"] = list(subs_set)
                print(f"✅ Extracted Topics for Flywheel: {training_record['topics']}")

        db.collection("ai_training_flywheel").add(training_record)
        return {"status": "success", "message": "Edits captured for fine-tuning"}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate-lesson")
async def evaluate_lesson_route(
    request: LessonEvaluationRequest,
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_school_id: str = Header(None, alias="X-School-ID")
):
    user_id = resolve_user_id(x_user_id, request.uid)
    school_id = x_school_id or request.schoolId
    
    try:
        is_successful = "5" in request.feedback or "success" in request.feedback.lower() or "good" in request.feedback.lower()
        new_status = "completed" if is_successful else "needs_remedial"

        if request.lesson_id:
            lesson_ref = db.collection("generated_lesson_plans").document(request.lesson_id)
            lesson_ref.update({
                "evaluation_status": new_status,
                "teacher_feedback": request.feedback,
                "evaluated_at": firestore.SERVER_TIMESTAMP
            })

        if new_status == "needs_remedial":
            db.collection("remedial_action_queue").add({
                "uid": user_id,
                "school_id": school_id,
                "original_lesson_id": request.lesson_id,
                "grade": request.grade,
                "subject": request.subject,
                "topic": request.topic,
                "subtopic": request.subtopic,
                "teacher_feedback": request.feedback,
                "status": "pending_ai_generation", 
                "created_at": firestore.SERVER_TIMESTAMP
            })

        result = await evaluate_lesson_feedback(
            topic=request.topic,
            subtopic=request.subtopic,
            grade=request.grade,
            teacher_feedback=request.feedback
        )
        
        return {
            "status": "success", 
            "data": result,
            "action_taken": "queued_for_remedial" if new_status == "needs_remedial" else "topic_completed"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))