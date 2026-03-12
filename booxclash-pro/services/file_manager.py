from services.firebase_setup import db
from google.cloud.firestore import Query
from datetime import datetime
from typing import Union, List, Dict, Any

# ==============================================================================
# 🛠️ HELPER: DUAL SAVE (Root + School Collection)
# ==============================================================================
def save_to_firestore_dual(collection_name: str, data: dict, school_id: str = None):
    """
    Saves data to the root collection AND the school's sub-collection if school_id is present.
    """
    try:
        # 1. Create a Reference in the Root Collection (e.g., 'generated_weekly_plans')
        doc_ref = db.collection(collection_name).document()
        
        # Add schoolId to the data payload if it exists
        if school_id:
            data["schoolId"] = school_id

        # Save to Root
        doc_ref.set(data)
        print(f"💾 Saved to Root: {collection_name}/{doc_ref.id}")

        # 2. If School ID exists, Save a Copy to School's Sub-Collection
        if school_id:
            # Structure: schools/{school_id}/{collection_name}/{doc_id}
            school_doc_ref = db.collection("schools").document(school_id)\
                               .collection(collection_name).document(doc_ref.id)
            school_doc_ref.set(data)
            print(f"🏫 Saved to School: schools/{school_id}/{collection_name}/{doc_ref.id}")

        return True
    except Exception as e:
        print(f"❌ Firestore Dual Save Error: {e}")
        return False

# ==========================================
# 1. SCHEMES OF WORK
# ==========================================
def save_generated_scheme(uid: str, subject: str, grade: str, term: str, school_name: str, data: Union[List, Dict], school_id: str = None):
    """
    Saves scheme to 'generated_schemes' AND 'schools/{id}/generated_schemes'.
    """
    # --- SAFETY CHECK ---
    if isinstance(data, int):
        print(f"❌ Save Error: 'data' is an integer ({data}). Likely an upstream generation error. Aborting save.")
        return False
        
    # Data Normalization
    final_scheme_list = []
    intro_info = {}

    if isinstance(data, list):
        final_scheme_list = data
    elif isinstance(data, dict):
        final_scheme_list = (
            data.get("rows") or 
            data.get("weeks") or 
            data.get("scheme_weeks") or 
            data.get("schemeData") or []
        )
        intro_info = data.get("intro") or data.get("intro_info") or {}

    payload = {
        "userId": uid,
        "schoolName": school_name, 
        "subject": subject,
        "grade": grade,
        "term": term,
        "schemeData": final_scheme_list,
        "introInfo": intro_info,
        "createdAt": datetime.now(),
        "type": "Scheme of Work",
        "source": "backend_auto_save"
    }

    return save_to_firestore_dual("generated_schemes", payload, school_id)

def load_generated_scheme(uid: str, subject: str, grade: str, term: str):
    try:
        docs = (db.collection("generated_schemes")
                .where("userId", "==", uid)
                .where("subject", "==", subject)
                .where("grade", "==", grade)
                .where("term", "==", term)
                .order_by("createdAt", direction=Query.DESCENDING)
                .limit(1).stream())
        
        for doc in docs:
            return doc.to_dict().get("schemeData", [])
        return []
    except Exception as e:
        print(f"❌ Read Error: {e}")
        return []

# ==========================================
# 2. WEEKLY PLANS
# ==========================================
def save_weekly_plan(uid: str, subject: str, grade: str, term: str, week: int, school_name: str, data: dict, school_id: str = None):
    """
    Saves plan to 'generated_weekly_plans' AND 'schools/{id}/generated_weekly_plans'.
    """
    # --- SAFETY CHECK ---
    if not isinstance(data, dict):
        print(f"❌ Save Weekly Plan Error: Expected dict, got {type(data)}. Aborting.")
        return False

    payload = {
        "userId": uid,
        "schoolName": school_name,
        "subject": subject,
        "grade": grade,
        "term": term,
        "weekNumber": int(week),
        "planData": data,
        "createdAt": datetime.now(),
        "type": "Weekly Forecast",
        "source": "backend_auto_save"
    }
    
    return save_to_firestore_dual("generated_weekly_plans", payload, school_id)

def load_weekly_plan(uid: str, subject: str, grade: str, term: str, week: int):
    try:
        docs = (db.collection("generated_weekly_plans")
                .where("userId", "==", uid)
                .where("subject", "==", subject)
                .where("grade", "==", grade)
                .where("term", "==", term)
                .where("weekNumber", "==", int(week))
                .order_by("createdAt", direction=Query.DESCENDING)
                .limit(1).stream())

        for doc in docs:
            return doc.to_dict().get("planData", {})
        return None
    except Exception:
        return None

# ==========================================
# 3. LESSON PLANS
# ==========================================
def save_lesson_plan(
    uid: str, subject: str, grade: str, school_name: str, data: dict, 
    term: str = "Term 1", week: int = 1, topic: str = "General Lesson",
    school_id: str = None
):
    """
    Saves lesson to 'generated_lesson_plans' AND 'schools/{id}/generated_lesson_plans'.
    """
    # --- SAFETY CHECK (Fixes AttributeError: 'int' object has no attribute 'get') ---
    if not isinstance(data, dict):
        print(f"❌ Save Lesson Plan Error: Invalid data format. Expected dict, got {type(data)} ({data}). Aborting save.")
        return False

    final_topic = topic or data.get("topic", "General Topic")
    final_subtopic = data.get("subtopic", final_topic)

    payload = {
        "userId": uid,
        "schoolName": school_name,
        "subject": subject,
        "grade": grade,
        "term": term,
        "weekNumber": int(week),
        "topic": final_topic,
        "subtopic": final_subtopic,
        "lessonData": data,
        "createdAt": datetime.now(),
        "type": "Lesson Plan",
        "source": "backend_auto_save"
    }

    return save_to_firestore_dual("generated_lesson_plans", payload, school_id)

def load_lesson_plan(uid: str, subject: str, grade: str, term: str, week: int, subtopic: str = None):
    try:
        query_ref = (db.collection("generated_lesson_plans")
                     .where("userId", "==", uid)
                     .where("subject", "==", subject)
                     .where("grade", "==", grade)
                     .where("term", "==", term)
                     .where("weekNumber", "==", int(week)))

        if subtopic:
            query_ref = query_ref.where("subtopic", "==", subtopic)

        docs = query_ref.order_by("createdAt", direction=Query.DESCENDING).limit(1).stream()

        for doc in docs:
            return doc.to_dict().get("lessonData", {})
        return None
    except Exception:
        return None

# ==========================================
# 4. RECORDS OF WORK (NEW)
# ==========================================
def save_record_of_work(
    uid: str, subject: str, grade: str, term: str, week: int, 
    school_name: str, topic: str, data: dict, school_id: str = None
):
    """
    Saves record to 'generated_records_of_work' AND 'schools/{id}/generated_records_of_work'.
    """
    # --- SAFETY CHECK ---
    if not isinstance(data, dict):
        print(f"❌ Save Record Error: Expected dict, got {type(data)}. Aborting.")
        return False

    payload = {
        "userId": uid,
        "schoolName": school_name,
        "subject": subject,
        "grade": grade,
        "term": term,
        "weekNumber": int(week),
        "topic": topic,
        "recordData": data, # Stores the JSON structure with blank evaluations
        "createdAt": datetime.now(),
        "type": "Record of Work",
        "source": "backend_auto_save"
    }
    
    return save_to_firestore_dual("generated_records_of_work", payload, school_id)

# ==========================================
# 5. RESOURCES (WORKSHEETS & NOTES)
# ==========================================
def save_resource(uid: str, resource_type: str, data: dict, meta: dict, school_id: str = None):
    """
    Saves worksheets/notes to root AND 'schools/{id}/generated_resources'.
    """
    col_name = "generated_worksheets" if resource_type == "worksheet" else "generated_notes"
    
    payload = {
        "userId": uid,
        "resourceType": resource_type,
        "data": data,
        "grade": meta.get("grade"),
        "subject": meta.get("subject"),
        "topic": meta.get("topic"),
        "meta": meta,
        "createdAt": datetime.now(),
        "type": resource_type.capitalize(),
        "source": "backend_auto_save"
    }

    return save_to_firestore_dual(col_name, payload, school_id)


    # ==========================================
# 6. EXAMS & ASSESSMENTS
# ==========================================
def save_generated_exam(
    uid: str, subject: str, grade: str, term: str, 
    school_name: str, exam_data: dict, school_id: str = None
):
    """
    Saves the generated exam and answer key to root AND 'schools/{id}/generated_exams'.
    """
    if not isinstance(exam_data, dict):
        print(f"❌ Save Exam Error: Expected dict, got {type(exam_data)}. Aborting.")
        return False

    payload = {
        "userId": uid,
        "schoolName": school_name,
        "subject": subject,
        "grade": grade,
        "term": term,
        "examData": exam_data, 
        "createdAt": datetime.now(),
        "type": "Exam/Assessment",
        "source": "backend_auto_save"
    }
    
    return save_to_firestore_dual("generated_exams", payload, school_id)


# ==========================================
# 7. CATCH-UP (TaRL) PLANS
# ==========================================
def save_catchup_plan(uid: str, school_id: str, plan_data: dict, meta: dict):
    """
    Saves the generated Catch-Up lesson plan to Firestore.
    """
    if not isinstance(plan_data, dict):
        print(f"❌ Save Error: Expected dict, got {type(plan_data)}. Aborting.")
        return False

    payload = {
        "userId": uid,
        "type": "catchup", # Critical for your recent docs feed to recognize it
        "planData": plan_data,
        "meta": meta,
        "createdAt": datetime.now(),
        "topic": plan_data.get("topic", "Catch-Up Lesson"),
        "subtopic": plan_data.get("subtopic", ""),
        "schoolId": school_id
    }

    # Saving it under "generated_catchup" (or change to your preferred collection name)
    return save_to_firestore_dual("generated_catchup", payload, school_id)