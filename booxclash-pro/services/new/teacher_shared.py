import os
import re
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

from dotenv import load_dotenv
import google.generativeai as genai
from fuzzywuzzy import fuzz


# ======================================
# 🔧 BASE CONFIG
# ======================================
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


def get_model():
    return genai.GenerativeModel("gemini-2.5-flash")


# ======================================
# 🧠 TEXT & FUZZY MATCHING UTILITIES
# ======================================
def normalize(text: str) -> str:
    if not text:
        return ""
    return re.sub(r"[^a-z0-9]", "", text.lower())


def extract_id(text: str) -> Optional[str]:
    match = re.search(r"\b(\d+(\.\d+)+)\b", str(text))
    return match.group(1) if match else None


def get_parent_ids(full_id: str) -> List[str]:
    if not full_id or "." not in full_id:
        return []

    parts = full_id.split(".")
    return [".".join(parts[:i]) for i in range(len(parts) - 1, 0, -1)]


def fuzzy_ratio(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return fuzz.ratio(a, b) / 100.0


# ======================================
# 🧽 SAFE JSON EXTRACTION
# ======================================
def extract_json_string(text: str) -> str:
    try:
        cleaned = text.replace("```json", "").replace("```", "").strip()
        start = min(
            [i for i in (cleaned.find("{"), cleaned.find("[")) if i != -1],
            default=-1
        )
        if start == -1:
            return cleaned

        end = cleaned.rfind("}") if cleaned[start] == "{" else cleaned.rfind("]")
        return cleaned[start:end + 1] if end != -1 else cleaned
    except Exception:
        return text


# ======================================
# 📘 MASTER MODULE SEARCH ENGINE
# ======================================
def find_structured_module_content(
    module: Dict[str, Any],
    query: str
) -> Optional[Dict[str, Any]]:
    """
    Matches a syllabus subtopic to a module subtopic and
    RETURNS THE FULL SUBTOPIC BLOCK for LLM prompting.
    """
    if not module or "topics" not in module:
        print("❌ [Module Search] Invalid or empty module structure")
        return None

    q_id = extract_id(query)
    q_norm = normalize(query)
    parent_ids = get_parent_ids(q_id) if q_id else []

    best_match = None
    best_score = 0.0

    # --------------------------------------
    # 🔍 SEARCH
    # --------------------------------------
    for topic in module.get("topics", []):
        for sub in topic.get("sub_topics", []):
            sub_id = str(sub.get("subtopic_id", ""))
            sub_title = sub.get("subtopic_title", "")
            sub_norm = normalize(sub_title)

            id_match = False
            if q_id:
                if q_id == sub_id or sub_id in parent_ids:
                    id_match = True

            text_score = fuzzy_ratio(q_norm, sub_norm)
            score = 1.0 if id_match else text_score

            if score > best_score:
                best_score = score
                best_match = (topic, sub)

    if not best_match or best_score < 0.45:
        print("⚠️ [Module Search] No suitable match found")
        return None

    topic, sub = best_match

    # --------------------------------------
    # 🧱 EXTRACT *FULL SUBTOPIC BLOCK*
    # --------------------------------------
    instructional_blocks = sub.get("instructional_blocks", [])

    context_chunks = []
    for block in instructional_blocks:
        context_chunks.append({
            "activity_id": block.get("activity_number") or block.get("block_id"),
            "page": block.get("page") or block.get("page_number"),
            "hook": block.get("hook"),
            "teacher_steps": block.get("teacher_steps", []),
            "learner_tasks": block.get("learner_tasks", []),
            "examples": block.get("examples", []),
            "short_notes": block.get("short_notes", "")
        })

    context_text = json.dumps(context_chunks, indent=2, ensure_ascii=False)

    print("✅ [Module Search] FULL SUBTOPIC BLOCK EXTRACTED")
    print(f"   ↳ Topic: {topic.get('topic_title')}")
    print(f"   ↳ Subtopic: {sub.get('subtopic_title')} ({sub.get('subtopic_id')})")
    print(f"   ↳ Activities Extracted: {len(context_chunks)}")
    print("📦 [Module Search] Context sent to AI ↓↓↓")
    print(context_text[:1200] + ("..." if len(context_text) > 1200 else ""))

    return {
        "found": True,
        "match_score": round(best_score, 3),

        "topic_title": topic.get("topic_title", ""),
        "topic_id": topic.get("topic_id", ""),

        "subtopic_title": sub.get("subtopic_title", ""),
        "subtopic_id": sub.get("subtopic_id", ""),
        "pages": (
            sub.get("page")
            or sub.get("page_number")
            or topic.get("page_number")
            or "N/A"
        ),

        # 🔥 THIS IS WHAT YOUR LLM EXPECTS
        "context_text": context_text
    }


# ======================================
# 📅 WEEK DATE UTILITY
# ======================================
def calculate_week_dates(start_date_str: str, week_num: int) -> Dict[str, str]:
    try:
        clean = start_date_str.replace("/", "-").replace(".", "-")

        try:
            start = datetime.strptime(clean, "%Y-%m-%d")
        except ValueError:
            try:
                start = datetime.strptime(clean, "%d-%m-%Y")
            except ValueError:
                start = datetime.now()

        week_start = start + timedelta(days=(week_num - 1) * 7)
        week_end = week_start + timedelta(days=4)

        return {
            "range_display": f"{week_start:%d.%m} - {week_end:%d.%m.%Y}",
            "start_iso": week_start.strftime("%Y-%m-%d"),
            "end_iso": week_end.strftime("%Y-%m-%d"),
            "month": week_start.strftime("%B"),
        }

    except Exception:
        return {
            "range_display": "",
            "start_iso": "",
            "end_iso": "",
            "month": "",
        }
