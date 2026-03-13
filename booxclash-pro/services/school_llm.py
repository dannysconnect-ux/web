import os
import json
import asyncio
import re
import tempfile
import urllib.request
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv
import google.generativeai as genai

# ==========================================
# ⚙️ CONFIGURATION & AGENT SETUP
# ==========================================

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

AUTHOR_MODEL = "gemini-2.5-flash"

def get_model():
    return genai.GenerativeModel(AUTHOR_MODEL)

# ==========================================
# 🛠️ HELPERS
# ==========================================

def extract_json_string(text: str) -> str:
    """
    Extract JSON safely and LOG everything.
    """
    print("\n🧪 [JSON EXTRACTOR] RAW MODEL OUTPUT ↓↓↓")
    print(text[:2000])
    print("🧪 [JSON EXTRACTOR] END RAW OUTPUT ↑↑↑\n")

    if not text:
        raise ValueError("Model returned empty text")

    # Remove code fences
    cleaned = text.strip().replace("```json", "").replace("```", "").strip()

    # Fast path
    if cleaned.startswith("{") and cleaned.endswith("}"):
        print("✅ [JSON EXTRACTOR] Clean JSON detected")
        return cleaned

    # Regex fallback
    match = re.search(r'\{[\s\S]*\}', cleaned)
    if not match:
        raise ValueError("❌ No JSON object found in model output")

    extracted = match.group(0)

    print("🧪 [JSON EXTRACTOR] EXTRACTED JSON ↓↓↓")
    print(extracted[:2000])
    print("🧪 [JSON EXTRACTOR] END EXTRACTED JSON ↑↑↑\n")

    return extracted


def calculate_week_dates(start_date_str: str, week_num: int) -> Dict[str, str]:
    try:
        if not start_date_str:
            start_dt = datetime.now()
        else:
            clean = start_date_str.replace("/", "-").replace(".", "-")
            try:
                start_dt = datetime.strptime(clean, "%Y-%m-%d")
            except ValueError:
                start_dt = datetime.strptime(clean, "%d-%m-%Y")

        week_start = start_dt + timedelta(days=(week_num - 1) * 7)
        week_end = week_start + timedelta(days=4)

        return {
            "range_display": f"{week_start:%d.%m} - {week_end:%d.%m.%Y}",
            "start_iso": week_start.strftime("%Y-%m-%d"),
            "end_iso": week_end.strftime("%Y-%m-%d"),
            "month": week_start.strftime("%B")
        }
    except Exception as e:
        print(f"⚠️ Date calc failed: {e}")
        return {"range_display": "", "start_iso": "", "end_iso": "", "month": ""}

# ==========================================
# 🧠 CORE AGENT (WITH FULL LOGGING)
# ==========================================

async def _agent_author_core(
    role_instruction: str,
    context_data: str,
    json_schema: Dict[str, Any]
) -> Dict[str, Any]:

    print("\n" + "=" * 80)
    print(f"🤖 [AUTHOR AGENT] {role_instruction}")
    print("=" * 80)

    model = get_model()

    prompt = f"""
You are a JSON generator.
Return ONLY valid JSON.
No markdown.
No explanations.

TASK:
{role_instruction}

CONTEXT:
{context_data}

JSON TEMPLATE:
{json.dumps(json_schema, indent=2)}
"""

    print("📤 [PROMPT SENT TO GEMINI]")
    print(prompt[:2000])
    print("📤 [END PROMPT]\n")

    try:
        response = await model.generate_content_async(
            prompt,
            generation_config={"temperature": 0.4}
        )

        raw_text = getattr(response, "text", "")
        print("📥 [RAW RESPONSE RECEIVED]")

        extracted_json = extract_json_string(raw_text)
        parsed = json.loads(extracted_json)

        print("✅ [JSON PARSED SUCCESSFULLY]")
        print(f"🔑 Keys returned: {list(parsed.keys())}")

        return parsed

    except Exception as e:
        print("\n❌❌❌ AUTHOR AGENT FAILURE ❌❌❌")
        print(str(e))
        print("⚠️ FALLING BACK TO EMPTY SCHEMA")
        print("=" * 80 + "\n")
        return json_schema

# ==========================================
# 🖼️ TEMPLATE AGENT (PDF → HTML)
# ==========================================

def _download_file_to_temp(url: str) -> Optional[str]:
    try:
        suffix = ".pdf" if ".pdf" in url.lower() else ".docx"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            urllib.request.urlretrieve(url, tmp.name)
            print(f"⬇️ File downloaded to {tmp.name}")
            return tmp.name
    except Exception as e:
        print(f"❌ Download failed: {e}")
        return None


async def convert_pdf_to_template(file_url: str, doc_type: str) -> str:
    print(f"📄 [TEMPLATE AGENT] Converting {doc_type}")
    local_path = _download_file_to_temp(file_url)
    if not local_path:
        return ""

    try:
        uploaded_file = genai.upload_file(local_path, mime_type="application/pdf")
        await asyncio.sleep(2)

        model = get_model()
        response = await model.generate_content_async([
            uploaded_file,
            f"Convert this {doc_type} template into HTML using Tailwind. Output raw HTML only."
        ])

        html = response.text.replace("```html", "").replace("```", "").strip()
        print("🧩 [HTML GENERATED LENGTH]:", len(html))
        return html

    except Exception as e:
        print(f"❌ Template conversion failed: {e}")
        return ""

    finally:
        if os.path.exists(local_path):
            os.remove(local_path)

# ==========================================
# SERVICES (UNCHANGED LOGIC, LOGGING IN COR
# ==========================================

async def generate_scheme_with_ai(
    syllabus_data: Any,
    subject: str,
    grade: str,
    term: str,
    num_weeks: int,
    start_date: str = ""
) -> List[dict]:

    print(f"🚀 [SERVICE] SCHEME → {subject} | {grade}")

    topics = syllabus_data.get("topics", []) if isinstance(syllabus_data, dict) else syllabus_data or []
    if not topics:
        print("⚠️ No syllabus topics")
        return []

    tasks = []
    for i in range(num_weeks):
        tasks.append(_agent_author_core(
            f"Write scheme for week {i+1}",
            f"Topic: {topics[min(i, len(topics)-1)]}",
            {"week": "", "topic": "", "content": [], "outcomes": [], "references": []}
        ))

    return await asyncio.gather(*tasks)


async def generate_weekly_plan_with_ai(
    grade: str,
    subject: str,
    term: str,
    week_number: int,
    school_name: str = "",
    start_date: Optional[str] = None,
    days_count: int = 5,
    topic: Optional[str] = None
) -> Dict[str, Any]:

    print(f"🚀 [SERVICE] WEEKLY → Week {week_number}")

    days = [{"day": d, "subtopic": "", "objectives": [], "activities": "", "resources": ""}
            for d in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][:days_count]]

    return await _agent_author_core(
        "Generate a weekly lesson forecast",
        f"{subject} | {grade} | {topic}",
        {"meta": {"week": week_number}, "days": days}
    )


async def generate_specific_lesson_plan(
    grade: str,
    subject: str,
    theme: str,
    subtopic: str,
    objectives: List[str],
    date: str,
    time_start: str,
    time_end: str,
    attendance: Dict[str, int],
    teacher_name: str,
    school_name: str
) -> Dict[str, Any]:

    print(f"🚀 [SERVICE] LESSON → {subtopic}")

    schema = {
        "teacherName": teacher_name,
        "schoolName": school_name,
        "grade": grade,
        "subject": subject,
        "topic": theme,
        "subtopic": subtopic,
        "time": f"{time_start}-{time_end}",
        "steps": []
    }

    return await _agent_author_core(
        "Generate a detailed lesson plan",
        f"Objectives: {objectives}",
        schema
    )


async def generate_structured_worksheet(grade: str, subject: str, topic: str):
    print(f"🚀 [SERVICE] WORKSHEET → {topic}")
    return await _agent_author_core(
        "Generate a worksheet",
        f"{grade} | {subject}",
        {"title": topic, "blocks": []}
    )


async def generate_dynamic_lesson(
    request_data: Dict[str, Any],
    html_template: str,
    school_data: Dict[str, Any],
    syllabus_data: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:

    print("🎨 [DYNAMIC GENERATOR] START")

    keys = list(set(re.findall(r'\{\{\s*(\w+)\s*\}\}', html_template)))
    print(f"🔑 Template keys detected: {keys}")

    schema = {k: "" for k in keys}
    schema.setdefault("rows", [])
    schema.setdefault("days", [])
    schema.setdefault("steps", [])

    return await _agent_author_core(
        "Generate data for custom template",
        json.dumps({
            "request": request_data,
            "school": school_data,
            "syllabus": syllabus_data
        }, default=str),
        schema
    )
