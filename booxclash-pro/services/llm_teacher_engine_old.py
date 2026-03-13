import os
import json
import asyncio
import re
import math
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from dotenv import load_dotenv
import google.generativeai as genai
from .new.teacher_shared import find_structured_module_content

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# ✅ DEFAULT LOGO CONSTANT
DEFAULT_LOGO = "https://res.cloudinary.com/dchkrvf4b/image/upload/v1727734157/coat_of_arms_zambia.png"

def get_model():
    return genai.GenerativeModel("gemini-2.5-flash")

# =====================================================
# 🛠️ HELPER: DATE CALCULATOR
# =====================================================
def calculate_week_dates(start_date_str: str, week_num: int) -> Dict[str, str]:
    try:
        if not start_date_str:
             start_dt = datetime.now()
        else:
            clean_date = start_date_str.replace("/", "-").replace(".", "-")
            try:
                start_dt = datetime.strptime(clean_date, "%Y-%m-%d")
            except ValueError:
                try:
                    start_dt = datetime.strptime(clean_date, "%d-%m-%Y")
                except ValueError:
                    start_dt = datetime.now()

        week_start = start_dt + timedelta(days=(week_num - 1) * 7)
        week_end = week_start + timedelta(days=4) 
        
        return {
            "range_display": f"({week_start.strftime('%d.%m.%Y')} - {week_end.strftime('%d.%m.%Y')})",
            "start_iso": week_start.strftime("%Y-%m-%d"),
            "end_iso": week_end.strftime("%Y-%m-%d"),
            "month": week_start.strftime("%B") 
        }
    except Exception as e:
        print(f"⚠️ Date Calc Error: {e}")
        return {"range_display": "", "start_iso": "", "end_iso": "", "month": ""}

# =====================================================
# 🛠️ HELPER: JSON CLEANER
# =====================================================
def extract_json_string(text: str) -> str:
    try:
        clean_text = text.replace("```json", "").replace("```", "").strip()
        start_brace = clean_text.find("{")
        start_bracket = clean_text.find("[")
        
        if start_bracket != -1 and (start_brace == -1 or start_bracket < start_brace):
            end_idx = clean_text.rfind("]")
            if end_idx != -1:
                clean_text = clean_text[start_bracket : end_idx + 1]
        elif start_brace != -1:
            end_idx = clean_text.rfind("}")
            if end_idx != -1:
                clean_text = clean_text[start_brace : end_idx + 1]
        
        clean_text = re.sub(r'(?<!\\)\n', '\\n', clean_text)
        return clean_text
    except Exception:
        return text

# =====================================================
# 1. PROFESSIONAL SCHEME GENERATOR (PACED DISTRIBUTION)
# =====================================================
async def generate_scheme_with_ai(
    syllabus_data: Any,
    subject: str,
    grade: str,
    term: str,
    num_weeks: int,
    start_date: str = "2026-01-12",
    locked_context: Optional[Dict[str, Any]] = None
) -> List[dict]:
    
    print(f"\n📘 [Scheme Generator] Processing {subject} Grade {grade} for Term {term}...")
    
    full_topic_list = []
    if isinstance(syllabus_data, dict):
        full_topic_list = (syllabus_data.get("topics") or syllabus_data.get("content") or syllabus_data.get("units") or [])
    elif isinstance(syllabus_data, list):
        full_topic_list = syllabus_data
    
    if not full_topic_list:
        return []

    chunk_size = math.ceil(len(full_topic_list) / 3)
    term_int = 1
    if "2" in str(term): term_int = 2
    elif "3" in str(term): term_int = 3

    start_index = (term_int - 1) * chunk_size
    end_index = start_index + chunk_size
    term_syllabus_slice = full_topic_list[start_index:end_index]
    
    # Lookup dictionary
    syllabus_lookup = {}
    for item in term_syllabus_slice:
        title_key = str(item.get('topic_title', item.get('topic', ''))).strip().lower()
        if title_key: syllabus_lookup[title_key] = item
        
        unit_key = str(item.get('unit', '')).strip().lower()
        if unit_key and unit_key not in syllabus_lookup:
            syllabus_lookup[unit_key] = item

    format_instruction = """
    OUTPUT JSON:
    [
      {
        "week_number": 1,
        "unit": "7.1",
        "topic": "GOVERNANCE", 
        "content": ["7.1.1 Democratic Governance", "7.1.2 Organs of Government"], 
        "outcomes": ["Describe democracy", "Identify the organs of government"],
        "methods": ["Group Work", "Demonstration"], 
        "resources": ["Charts", "Realia"]
      }
    ]
    """
    
    if locked_context and locked_context.get("customColumns"):
        custom_keys = [c["key"] for c in locked_context["customColumns"]]
        format_instruction = f"""
        🚨 CRITICAL TEMPLATE LOCK: The teacher uses a custom spreadsheet. 
        Instead of the standard format, your JSON objects inside the array MUST use EXACTLY these keys:
        {json.dumps(custom_keys)}
        Map your generated content logically to these keys.
        """

    model = get_model()
    data_context = json.dumps(term_syllabus_slice)

    # ✅ PROMPT UPDATED TO FORCE PACING AND SPREAD
    prompt = f"""
    Act as a Senior Head Teacher. Create a Scheme of Work for **Term {term_int}**.
    
    DETAILS: 
    - Subject: {subject}, Grade: {grade}, Duration: {num_weeks} Weeks
    
    SOURCE DATA (Pay close attention to 'page_number'): 
    {data_context}

    INSTRUCTIONS:
    1. **PACING & SPREAD (CRITICAL)**: Distribute the `subtopics` logically across the {num_weeks} weeks. DO NOT cram all subtopics of a large unit into one week. Assign 1 or 2 subtopics per week.
    2. **OUTCOMES ALIGNMENT**: For each week, ONLY select the `learning_outcomes` from the Source Data that match the specific `subtopics` assigned to that week.
    3. **References**: You MUST create a `references` array for every week. The first item MUST be the syllabus reference using the exact `page_number` from the SOURCE DATA (e.g. "{subject} Syllabus Grade {grade} Pg 45").
    4. **Methods & Resources**: Recommend specific, practical pedagogical methods and learning resources.
    5. **COMPLIANCE**: Return the `topic`, `unit`, `content` (subtopics), and `outcomes` EXACTLY as they are phrased in the SOURCE DATA. Do not hallucinate or invent new ones.

    {format_instruction}
    """
    
    try:
        response = await model.generate_content_async(prompt)
        json_str = extract_json_string(response.text)
        data = json.loads(json_str)

        if not isinstance(data, list): return []

        cleaned_data = []
        for i, item in enumerate(data):
            week_num = item.get('week_number', item.get('week_num', i + 1))
            if int(week_num) > num_weeks: continue

            ai_topic_key = str(item.get('topic', '')).strip().lower()
            ai_unit_key = str(item.get('unit', '')).strip().lower()
            
            original_data = syllabus_lookup.get(ai_topic_key)
            if not original_data: original_data = syllabus_lookup.get(ai_unit_key)
            if not original_data and i < len(term_syllabus_slice):
                original_data = term_syllabus_slice[i]

            if original_data:
                # 1. Exact Topic Title
                source_topic = original_data.get('topic_title') or original_data.get('topic')
                if source_topic: item['topic'] = source_topic
                
                # ✅ FIX: DO NOT overwrite the AI's chunked subtopics and outcomes!
                # Only provide a fallback if the AI failed to generate them entirely.
                if not item.get('content') and not item.get('subtopics'):
                    item['content'] = original_data.get('subtopics') or original_data.get('content') or original_data.get('topics')

                if not item.get('outcomes'):
                    item['outcomes'] = original_data.get('learning_outcomes') or original_data.get('specific_outcomes') or original_data.get('outcomes')
                
                # 4. Strict Syllabus Reference Construction
                official_page = str(original_data.get('page_number', original_data.get('syllabus_page', '')))
                strict_ref = f"{subject} Syllabus Grade {grade}"
                if official_page and official_page.lower() not in ["", "nan", "none"]:
                    strict_ref += f" Pg {official_page}"
                
                item['references'] = [strict_ref]
            else:
                item['references'] = [f"{subject} Syllabus Grade {grade}"]

            if 'external_ref' in item: del item['external_ref']

            # Generate accurate dates
            date_info = calculate_week_dates(start_date, int(week_num))
            item['week'] = week_num
            item['date_range'] = date_info['range_display'] 
            item['month'] = date_info['month']
            
            cleaned_data.append(item)

        return cleaned_data

    except Exception as e:
        print(f"❌ Error: {e}")
        return []

# =====================================================
# 2. WEEKLY PLAN GENERATOR (OLD FORMAT)
# =====================================================
async def generate_weekly_plan_with_ai(
    grade: str, 
    subject: str, 
    term: str, 
    week_number: int, 
    school_name: str = "Unknown School", 
    start_date: Optional[str] = None, 
    days_count: int = 5,
    topic: Optional[str] = None,
    subtopic: Optional[str] = None,
    references: Optional[str] = None,
    school_logo: Optional[str] = None,
    locked_context: Optional[Dict[str, Any]] = None,
    objectives: Optional[List[str]] = None  # 👈 Added objectives parameter
) -> Dict[str, Any]:
    
    final_logo = school_logo if school_logo else DEFAULT_LOGO
    topic_context = topic if topic and len(topic) > 1 else f"Week {week_number} Syllabus Topic"
    ref_context = references if references and len(references) > 1 else f"{subject} Syllabus Grade {grade}"
    print(f"🎯 RECEIVED OBJECTIVES FROM FRONTEND: {objectives}")
    print(f"🧠 AI Generating Weekly Plan | Subject: {subject} | Week: {week_number}")
    
    subtopic_instruction = ""
    if subtopic and len(subtopic) > 1:
        subtopic_instruction = f"The teacher has specifically selected the sub-topic: '{subtopic}'. Ensure all {days_count} daily lessons are logical steps within this specific sub-topic."

    # 👇 Format the incoming objectives into a prompt-friendly string
    objectives_instruction = ""
    if objectives and len(objectives) > 0:
        obj_list = "\n    - ".join(objectives)
        objectives_instruction = f"\n    TARGET OBJECTIVES / OUTCOMES:\n    - {obj_list}\n    (Distribute these specific objectives logically across the {days_count} daily lessons.)"

    format_instruction = f"""
    STRICT JSON OUTPUT FORMAT:
    {{
      "meta": {{ 
        "school": "{school_name}", 
        "logo_url": "{final_logo}",
        "grade": "{grade}", 
        "subject": "{subject}", 
        "week": {week_number},
        "main_topic": "{topic_context}",
        "sub_topic": "{subtopic if subtopic else ''}"
      }},
      "days": [
        {{
          "day": "Monday",
          "subtopic": "Detailed sub-lesson title",
          "objectives": ["Learner should be able to..."],
          "activities": "Teacher and Learner activities...",
          "resources": "Specific materials used...",
          "references": "{ref_context}" 
        }}
      ]
    }}
    """
    
    if locked_context and locked_context.get("customColumns"):
        custom_keys = [c["key"] for c in locked_context["customColumns"]]
        format_instruction = f"""
        🚨 CRITICAL TEMPLATE LOCK: The teacher uses a custom layout.
        Your output JSON MUST follow this structure:
        {{
            "meta": {{ "school": "{school_name}", "logo_url": "{final_logo}", "grade": "{grade}", "subject": "{subject}", "week": {week_number} }},
            "days": [
                {{
                    // EXACT CUSTOM KEYS REQUIRED HERE FOR EACH DAY:
                    {', '.join([f'"{k}": "..."' for k in custom_keys])}
                }}
            ]
        }}
        """

    model = get_model()

    prompt = f"""
    Act as a Senior Teacher in Zambia. Create a Weekly Lesson Forecast (Old Curriculum style).
    
    DETAILS: 
    - Grade: {grade} | Subject: {subject} | Term: {term} | Week: {week_number}
    - MAIN TOPIC: "{topic_context}" 
    {"- FOCUS SUB-TOPIC: " + subtopic if subtopic else ""}
    {objectives_instruction}  # 👈 Injected into the prompt!
    
    CRITICAL INSTRUCTIONS:
    1. **Content Priority**: {subtopic_instruction if subtopic_instruction else "Break the main topic into logical daily lessons."}
    2. **Adhere to Topic**: You MUST generate exactly {days_count} daily entries focused strictly on the topic context.
    3. **Resources**: Vary them (e.g., "Soil samples", "Clock face", "Charts").
    
    {format_instruction}
    """
    
    try:
        response = await model.generate_content_async(prompt, generation_config={"response_mime_type": "application/json"})
        data = json.loads(extract_json_string(response.text))

        if "days" in data and isinstance(data["days"], list):
            for day in data["days"]:
                if "references" in day: day["references"] = ref_context
        
        if "meta" not in data: data["meta"] = {}
        data["meta"]["logo_url"] = final_logo
        data["meta"]["school"] = school_name
        data["meta"]["main_topic"] = topic_context
        if subtopic: data["meta"]["sub_topic"] = subtopic

        return data

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ Weekly Plan Error: {e}")
        return {"meta": {"error": True, "logo_url": final_logo, "main_topic": topic_context}, "days": []}

# =====================================================
# 3. LESSON PLAN GENERATOR (OLD FORMAT)
# =====================================================
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
    teacher_name: str = "Class Teacher", 
    school_name: str = "Primary School",
    module_data: Optional[Dict[str, Any]] = None,
    scheme_references: str = "Standard Zambian Syllabus",
    blooms_level: str = "",
    school_logo: Optional[str] = None,
    locked_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    
    final_logo = school_logo if school_logo else DEFAULT_LOGO
    print(f"\n📝 [Old Curr Lesson] Processing: {theme} - {subtopic} | Bloom's: {blooms_level}")
    
    module_info = find_structured_module_content(module_data, subtopic)
    if not module_info: module_info = find_structured_module_content(module_data, theme)

    boys, girls = attendance.get('boys', 0), attendance.get('girls', 0)
    total = boys + girls

    module_prompt_insert = ""
    strict_ref_override = False
    final_reference = scheme_references

    if module_info:
        unit_id = module_info.get("topic_id", module_info.get("unit_id", "N/A"))
        pages = module_info.get("pages", "N/A")
        module_text = module_info.get("context_text", "")

        if pages and pages != "N/A":
            final_reference = f"Official Module Unit {unit_id}, Page {pages}"
            strict_ref_override = True
        
        module_prompt_insert = f"""
        🔥 **SOURCE MATERIAL: OFFICIAL GOVERNMENT MODULE** 🔥
        **STRICT RULES**:
        1. **TEACHER ACTIVITY**: Derive steps EXACTLY from the text below.
        2. **CITATIONS**: Cite "Activity {unit_id}.X" inside the lesson steps.
        **MODULE TEXT**: {module_text}
        """
    else:
        module_prompt_insert = f"""
        🔥 **SOURCE MATERIAL: EXTERNAL RESEARCH REQUIRED** 🔥
        **STRICT RULES**: You MUST use reputable External Journals or Standard Textbooks.
        """

    blooms_instruction = ""
    if blooms_level:
        blooms_instruction = f"""
        🧠 **PEDAGOGICAL FOCUS**: 
        This lesson MUST differ from a standard lesson by focusing on the **{blooms_level}** level of Bloom's Taxonomy.
        """

    steps_format = """
      "steps": [
        { "stage": "INTRODUCTION", "time": "5 min", "teacherActivity": "...", "learnerActivity": "...", "method": "..." },
        { "stage": "DEVELOPMENT", "time": "30 min", "teacherActivity": "...", "learnerActivity": "...", "method": "..." },
        { "stage": "CONCLUSION", "time": "5 min", "teacherActivity": "...", "learnerActivity": "...", "method": "..." }
      ]
    """
    
    if locked_context and locked_context.get("customColumns"):
        custom_keys = [c["key"] for c in locked_context["customColumns"]]
        steps_format = f"""
      "steps": [
        {{
            // 🚨 CRITICAL LOCK: YOU MUST USE THESE EXACT KEYS FOR EACH LESSON STEP:
            {', '.join([f'"{k}": "..."' for k in custom_keys])}
        }}
      ]
        """

    model = get_model()
    
    # ✅ PROMPT UPDATED: Explicitly request textbook (no page) and website links.
    prompt = f"""
    Act as a Zambian Teacher. Create a **Learner-Centered Lesson Plan** (Old Curriculum).
    Topic: {theme}, Subtopic: {subtopic}
    Objectives: {json.dumps(objectives)}
    
    {blooms_instruction}
    {module_prompt_insert}

    CRITICAL INSTRUCTION FOR REFERENCES:
    For the "references" field, you MUST generate a realistic citation for the "{grade} {subject} Textbook" (do NOT include a specific page number) AND provide 1 or 2 relevant educational website links (e.g., BBC Bitesize, Wikipedia, or an official educational site related to {subtopic}). 
    {f"EXCEPTION: Because this is a strict module lesson, you must ALSO append this exact reference to your generated links: '{final_reference}'" if strict_ref_override else ""}

    OUTPUT JSON (Strict):
    {{
      "teacherName": "{teacher_name}",
      "schoolName": "{school_name}",
      "logo_url": "{final_logo}",
      "topic": "{theme}", 
      "subtopic": "{subtopic}",
      "time": "{time_start} - {time_end}", 
      "rationale": "Why this lesson is important...", 
      "specific": "Learners should be able to...", 
      "standard": "Clear statement of the expected standard.", 
      "prerequisite": "What learners already know.", 
      "materials": "List specific aids (Module, Realia, or External).", 
      "references": "Generated Textbook citation and relevant website links here...",
      "enrolment": {{ "boys": {boys}, "girls": {girls}, "total": {total} }},
      {steps_format}
    }}
    """
    
    try:
        response = await model.generate_content_async(prompt, generation_config={"response_mime_type": "application/json"})
        data = json.loads(extract_json_string(response.text))
        
        # ✅ FIX: Only override the references if the AI completely failed to generate them.
        # This protects the AI's generated website links from being overwritten by the Python script!
        placeholder = "Generated Textbook citation and relevant website links here..."
        if "references" not in data or not data["references"] or data["references"] == placeholder:
            data["references"] = final_reference
            
        data["logo_url"] = final_logo
        data["schoolName"] = school_name
            
        return data

    except Exception as e:
        print(f"❌ [Old Curr Generator] Failed: {e}")
        return {
            "topic": theme, "subtopic": subtopic, "references": final_reference, "logo_url": final_logo, "steps": []
        }

# =====================================================
# 4. RECORD OF WORK GENERATOR (OLD FORMAT)
# =====================================================
async def generate_record_of_work(
    teacher_name: str,
    school_name: str,
    grade: str,
    subject: str,
    term: str,
    year: str,
    start_date: str,
    scheme_data: List[Dict],
    school_logo: Optional[str] = None,
    locked_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:

    final_logo = school_logo if school_logo else DEFAULT_LOGO
    scheme_text = json.dumps(scheme_data[:5]) 

    print(f"📋 Generating Record of Work | Teacher: {teacher_name}")

    format_instruction = """
      "records": [
         { 
            "date": "YYYY-MM-DD", 
            "week": 1,
            "work_covered": "Brief summary...", 
            "remarks": "Achieved objectives..." 
         }
      ]
    """
    if locked_context and locked_context.get("customColumns"):
        custom_keys = [c["key"] for c in locked_context["customColumns"]]
        format_instruction = f"""
      "records": [
         {{ 
            // YOU MUST USE THESE EXACT KEYS FOR RECORD STEPS:
            {', '.join([f'"{k}": "..."' for k in custom_keys])}
         }}
      ]
        """

    model = get_model()
    prompt = f"""
    Act as a Zambian Teacher. Generate a Record of Work (Log Book) entry.
    School: {school_name} | Teacher: {teacher_name} | Term: {term} | Year: {year}
    
    Scheme Context: {scheme_text}
    
    OUTPUT JSON:
    {{
      "header": {{
         "school_name": "{school_name}", "logo_url": "{final_logo}",
         "teacher": "{teacher_name}", "term": "{term}", "year": "{year}"
      }},
      {format_instruction}
    }}
    """
    
    try:
        response = await model.generate_content_async(prompt, generation_config={"response_mime_type": "application/json"})
        data = json.loads(extract_json_string(response.text))
        
        if "header" not in data: data["header"] = {}
        data["header"]["logo_url"] = final_logo
        data["header"]["school_name"] = school_name
        return data

    except Exception as e:
        print(f"❌ ROW Error: {e}")
        return {"header": {"logo_url": final_logo, "school_name": school_name}, "records": []}

# =====================================================
# 5. LESSON NOTES GENERATOR 
# =====================================================
async def generate_lesson_notes(
    grade: str, 
    subject: str, 
    topic: str, 
    subtopic: str
) -> Dict[str, Any]:
    print(f"📝 Generating Blackboard Notes | {subject} - {topic} / {subtopic}")
    
    model = get_model()
    prompt = f"""
    Act as an expert Zambian teacher. Create detailed, highly structured Blackboard/Whiteboard Lesson Notes.
    Grade: {grade}, Subject: {subject}, Topic: {topic}, Subtopic: {subtopic}
    
    OUTPUT JSON EXACTLY FORMATTED AS:
    {{
        "topic_heading": "...",
        "key_definitions": [{{"term": "...", "definition": "..."}}],
        "explanation_points": ["Point 1", "Point 2"],
        "worked_examples": [{{"question": "...", "solution": "..."}}],
        "class_exercise": ["Question 1", "Question 2"],
        "homework_question": ["Question 1", "Question 2"]
    }}
    """
    
    try:
        response = await model.generate_content_async(prompt, generation_config={"response_mime_type": "application/json"})
        return json.loads(extract_json_string(response.text))
    except Exception as e:
        print(f"❌ Notes Error: {e}")
        return {}