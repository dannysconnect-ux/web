import os
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel
from typing import Optional, List, Any, Dict

# Services
from services.file_manager import (
    load_generated_scheme, 
    save_weekly_plan, 
    load_weekly_plan, 
    save_lesson_plan 
)
from services.credit_manager import check_and_deduct_credit
from services.syllabus_manager import get_subjects_for_grade, load_syllabus, load_module
from services.firebase_setup import db 

# Import the NEW Engine Functions
from services.llm_teacher_engine_new import (
    generate_weekly_plan_from_scheme,
    generate_specific_lesson_plan,
    generate_lesson_notes # <--- Ensure this is imported
)

router = APIRouter()

# ⚡️ CONFIGURATION: STRICT MAPPING
GRADE_MAP = {
    "grade 8": "Form 1",
    "grade 9": "Form 2",
    "form 3": "Grade 10",
    "form 4": "Grade 11",
    "form 5": "Grade 12",
    "form 6": "Grade 13", 
}

# --- Request Models ---
class PlanQuery(BaseModel):
    grade: str
    subject: str
    term: str
    weekNumber: int

class SyllabusTopicsRequest(BaseModel):
    grade: str
    subject: str
    country: str = "Zambia"

class NotesRequest(BaseModel):
    grade: str
    subject: str
    topic: str
    subtopic: str
    uid: Optional[str] = None

# ==========================================
# 🚀 ENDPOINTS
# ==========================================

@router.post("/get-weekly-plan")
async def get_weekly_plan(
    query: PlanQuery, 
    x_user_id: str = Header(None, alias="X-User-ID")
):
    print(f"📂 Requesting Local Weekly Plan: {query.subject} Grade {query.grade} Week {query.weekNumber}")
    uid = x_user_id if x_user_id else "default_user"
    
    data = load_weekly_plan(uid=uid, subject=query.subject, grade=query.grade, term=query.term, week=query.weekNumber)

    if not data and uid != "default_user":
        data = load_weekly_plan(uid="default_user", subject=query.subject, grade=query.grade, term=query.term, week=query.weekNumber)

    if not data:
        raise HTTPException(status_code=404, detail="Weekly Plan file not found locally.")

    return data


@router.get("/get-subjects/{grade}")
async def get_subjects_endpoint(grade: str):
    """
    Handles fetching subjects with strict curriculum mapping.
    """
    normalized_key = grade.lower().strip()
    target_grade = grade 

    if normalized_key in GRADE_MAP:
        mapped_grade = GRADE_MAP[normalized_key]
        print(f"🔄 Mapping Request '{grade}' -> '{mapped_grade}' (File System Source)")
        target_grade = mapped_grade
    
    subjects = get_subjects_for_grade(target_grade)
    
    if not subjects:
        if target_grade != grade:
             print(f"⚠️ Target '{target_grade}' empty. Retrying original '{grade}'...")
             subjects = get_subjects_for_grade(grade)

    if not subjects:
        return {"subjects": [], "message": f"No syllabus files found for {grade} (checked {target_grade})"}
        
    return {"subjects": subjects}


@router.post("/get-syllabus-topics")
async def get_syllabus_topics(request: SyllabusTopicsRequest):
    """
    Returns a structured list of Topics and Subtopics from the JSON syllabus.
    Now aggregates duplicate topic titles into single entries.
    """
    try:
        normalized_key = request.grade.lower().strip()
        target_grade = GRADE_MAP.get(normalized_key, request.grade)

        syllabus_data = load_syllabus(request.country, target_grade, request.subject)
        
        if not syllabus_data:
            return {"topics": []}

        topics_list = []
        
        # Handle different root structures
        if isinstance(syllabus_data, list):
            topics_list = syllabus_data
        elif isinstance(syllabus_data, dict):
            topics_list = (
                syllabus_data.get("topics") or 
                syllabus_data.get("content") or 
                syllabus_data.get("units") or 
                syllabus_data.get("topic_title") or
                []
            )

        # ---------------------------------------------------------
        # 🔄 AGGREGATION LOGIC: Use a dictionary to merge duplicates
        # ---------------------------------------------------------
        topics_map = {}  # Key: Topic Title, Value: Topic Dict

        for item in topics_list:
            if not isinstance(item, dict): continue

            # 1. Extract Title
            title = (
                item.get("topic_title") or 
                item.get("title") or 
                item.get("theme") or 
                item.get("unit_title") or 
                item.get("name") or 
                item.get("unit") or 
                item.get("section") or
                item.get("main_topic") or
                item.get("subtopic_title")
            )
            
            if not title or not isinstance(title, str):
                title = "General Topic"
            
            title = title.strip() # Normalize title

            # 2. Extract Subtopics
            raw_subtopics = (
                item.get("subtopics") or 
                item.get("content") or 
                item.get("specific_outcomes") or 
                item.get("outcomes") or
                item.get("objectives") or 
                item.get("children") or
                item.get("lessons") or
                []
            )
            
            clean_subtopics = []
            if isinstance(raw_subtopics, list):
                for sub in raw_subtopics:
                    text = ""
                    if isinstance(sub, str):
                        text = sub
                    elif isinstance(sub, dict):
                        text = (
                            sub.get("content") or 
                            sub.get("topic") or 
                            sub.get("title") or 
                            sub.get("subtopic") or
                            sub.get("outcome") or
                            sub.get("subtopic_title") or
                            sub.get("description") # Added for specific_outcomes
                        )
                    
                    if text:
                        clean_subtopics.append(str(text))

            # 3. Merge or Create
            if title in topics_map:
                # If topic exists, extend subtopics (avoiding duplicates)
                current_subs = set(topics_map[title]["subtopics"])
                for s in clean_subtopics:
                    if s not in current_subs:
                        topics_map[title]["subtopics"].append(s)
                        current_subs.add(s)
            else:
                # If topic is new, create entry
                if title != "General Topic" or clean_subtopics:
                     topics_map[title] = {
                        "title": title,
                        "subtopics": clean_subtopics
                    }

        # Convert map back to list
        return {"topics": list(topics_map.values())}

    except Exception as e:
        print(f"❌ Error fetching syllabus topics: {e}")
        return {"topics": []}
# ✅ NEW ENDPOINT: GENERATE LESSON NOTES
@router.post("/new/generate-lesson-notes")
async def generate_lesson_notes_endpoint(request: NotesRequest):
    """
    Generates Blackboard Notes for a specific lesson topic/subtopic.
    """
    print(f"📝 Generating Notes for: {request.topic} -> {request.subtopic}")
    
    try:
        # 1. Load Module Data (if available)
        # Apply strict mapping for grade if needed
        normalized_key = request.grade.lower().strip()
        target_grade = GRADE_MAP.get(normalized_key, request.grade)
        
        module_data = load_module("Zambia", target_grade, request.subject)

        # 2. Call LLM Service
        notes_content = await generate_lesson_notes(
            grade=request.grade,
            subject=request.subject,
            topic=request.topic,
            subtopic=request.subtopic,
            module_data=module_data
        )
        
        return {"status": "success", "data": notes_content}

    except Exception as e:
        print(f"❌ Error generating notes: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# ==========================================
# 📈 ANALYTICS & DASHBOARD IMPORTS
# ==========================================
from collections import Counter, defaultdict
from datetime import timedelta, datetime

# --- Response Models for Analytics ---
class AnalyticsStat(BaseModel):
    title: str
    value: str | int
    trend: Optional[str] = None
    sub: Optional[str] = None

class ChartData(BaseModel):
    name: str
    value: int
    color: Optional[str] = None

class ActivityLog(BaseModel):
    id: str
    teacher: str
    type: str
    grade: str
    subject: str
    school: str
    date: str
    time: str

class DashboardResponse(BaseModel):
    stats: List[AnalyticsStat]
    chart_data: List[Dict[str, Any]]  # For Bar Chart (Daily Activity)
    type_distribution: List[ChartData] # For Pie Chart
    recent_activity: List[ActivityLog] # For Data Table

# ==========================================
# 📊 UPDATED ANALYTICS ENDPOINT (Multi-Collection)
# ==========================================
import asyncio 

@router.get("/analytics/dashboard", response_model=DashboardResponse)
async def get_analytics_dashboard(
    x_school_id: Optional[str] = Header(None, alias="X-School-ID"),
    time_range: str = "week"
):
    print(f"📊 Fetching Analytics for School: {x_school_id}")

    try:
        # 1. Setup Date Range
        now = datetime.now()
        if time_range == "week":
            start_date = now - timedelta(days=7)
        elif time_range == "month":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=365)

        # 2. Helper function to fetch from a specific collection
        async def fetch_collection(collection_name, doc_type_label):
            ref = db.collection(collection_name)
            query = ref.where('timestamp', '>=', start_date)
            
            # Filter by School ID if provided
            if x_school_id:
                query = query.where('schoolId', '==', x_school_id)
            
            # Execute Query
            # Note: In synchronous Python with Firebase Admin, .stream() is blocking.
            # We run it in a thread or just execute linearly for simplicity.
            docs = query.stream()
            
            results = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                data['type'] = doc_type_label # Manually tag the type based on collection
                
                # Fix Timestamp
                if isinstance(data.get('timestamp'), str):
                    try:
                        data['timestamp'] = datetime.fromisoformat(data['timestamp'].replace('Z', ''))
                    except:
                        continue
                elif not data.get('timestamp'):
                    continue # Skip if no timestamp
                
                results.append(data)
            return results

        # 3. Fetch Data from ALL 3 Collections
        # We assume your collections are named exactly as shown in your screenshot
        plans_task = fetch_collection('generated_lesson_plans', 'lesson')
        schemes_task = fetch_collection('generated_schemes', 'scheme')
        weekly_task = fetch_collection('generated_weekly_plans', 'weekly')

        # Run them (Linear execution is safer for Firebase Admin SDK threads)
        raw_logs = []
        raw_logs.extend(await plans_task)
        raw_logs.extend(await schemes_task)
        raw_logs.extend(await weekly_task)

        # 4. Fetch School Credits (New!)
        current_credits = "N/A"
        if x_school_id:
            school_doc = db.collection('schools').document(x_school_id).get()
            if school_doc.exists:
                current_credits = school_doc.to_dict().get('credits', 0)

        # --- AGGREGATION LOGIC (Same as before) ---
        
        # Sort combined logs by timestamp (descending)
        raw_logs.sort(key=lambda x: x['timestamp'], reverse=True)

        total_docs = len(raw_logs)
        unique_teachers = set(d.get('teacherName', 'Unknown') for d in raw_logs)
        
        # Calculate Top Subject
        subjects = [d.get('subject', 'General') for d in raw_logs]
        top_subject = Counter(subjects).most_common(1)
        top_subject_name = top_subject[0][0] if top_subject else "None"

        # Chart Data
        activity_map = defaultdict(int)
        for log in raw_logs:
            day_key = log['timestamp'].strftime("%a") 
            activity_map[day_key] += 1
        
        chart_data = []
        for i in range(6, -1, -1):
            d = now - timedelta(days=i)
            day_name = d.strftime("%a")
            chart_data.append({
                "name": day_name,
                "docs": activity_map.get(day_name, 0)
            })

        # Type Distribution
        doc_types = [d.get('type') for d in raw_logs]
        type_counts = Counter(doc_types)
        type_colors = {"lesson": "#3b82f6", "scheme": "#10b981", "weekly": "#a855f7"}
        
        pie_data = [
            {"name": k.title(), "value": v, "color": type_colors.get(k, "#94a3b8")} 
            for k, v in type_counts.items()
        ]

        # Recent Activity
        recent_activity = []
        for log in raw_logs[:20]: # Top 20
            recent_activity.append(ActivityLog(
                id=log['id'],
                teacher=log.get('teacherName', 'Unknown'),
                type=log.get('type'),
                grade=log.get('grade', 'N/A'),
                subject=log.get('subject', 'N/A'),
                school=log.get('schoolName', 'N/A'),
                date=log['timestamp'].strftime("%Y-%m-%d"),
                time=log['timestamp'].strftime("%I:%M %p")
            ))

        return DashboardResponse(
            stats=[
                AnalyticsStat(title="Total Documents", value=total_docs, trend="---"),
                AnalyticsStat(title="Active Teachers", value=len(unique_teachers), trend="---"),
                AnalyticsStat(title="Credits Remaining", value=current_credits, sub="Balance"),
                AnalyticsStat(title="Top Subject", value=top_subject_name, sub=f"{top_subject[0][1] if top_subject else 0} generated"),
            ],
            chart_data=chart_data,
            type_distribution=pie_data,
            recent_activity=recent_activity
        )

    except Exception as e:
        print(f"❌ Analytics Error: {e}")
        # Return empty data so frontend doesn't crash
        return DashboardResponse(stats=[], chart_data=[], type_distribution=[], recent_activity=[])