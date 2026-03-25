import json
import math
from typing import List, Dict, Any, Union, Optional
# Ensure teacher_shared is accessible from the same directory
try:
    from .teacher_shared import get_model, extract_json_string, calculate_week_dates
except ImportError:
    # Fallback for different import structures
    from services.new.teacher_shared import get_model, extract_json_string, calculate_week_dates

# =====================================================
# 1. PROFESSIONAL SCHEME GENERATOR (NEW CURRICULUM FORMAT)
# =====================================================
async def generate_scheme_with_ai(
    syllabus_data: Union[List[dict], Dict[str, Any]], 
    subject: str,
    grade: str,
    term: str,
    num_weeks: int,
    start_date: str = "2026-01-13",
    locked_context: Optional[Dict[str, Any]] = None 
) -> Dict[str, Any]:
    
    print(f"\n📘 [Scheme Generator] Processing {subject} {grade} - Paced for End of Term...")
    
    # Extract Topics and Intro Data Safely
    topics_list = []
    provided_intro = {}

    if isinstance(syllabus_data, dict):
        topics_list = syllabus_data.get("topics", []) or syllabus_data.get("units", []) or []
        provided_intro = {
            "philosophy": syllabus_data.get("philosophy", ""),
            "competence_learning": syllabus_data.get("competence_learning", ""),
            "goals": syllabus_data.get("goals", [])
        }
    elif isinstance(syllabus_data, list):
        topics_list = syllabus_data
    
    # We use the topics_list exactly as provided by the route (No term splitting)
    term_syllabus_data = topics_list

    # Prepare Data Summary for LLM
    syllabus_summary = []
    syllabus_book = f"{subject} Syllabus {grade}"

    for t in term_syllabus_data:
        if isinstance(t, dict):
            unit_code = t.get("unit") or t.get("unit_number") or t.get("number") or ""
            topic_title = t.get("topic_title") or t.get("topic") or ""
            syl_page = t.get("syllabus_page") or t.get("page_number") or t.get("page")
            
            strict_refs = []
            if syl_page:
                strict_refs.append(f"{syllabus_book} Pg {syl_page}")
            else:
                strict_refs.append(f"{syllabus_book}")

            module_refs = t.get("references") or t.get("refs") or t.get("textbook_refs")
            if module_refs:
                if isinstance(module_refs, list): strict_refs.extend(module_refs)
                elif isinstance(module_refs, str): strict_refs.append(module_refs)

            syllabus_summary.append({
                "unit_prefix": unit_code,
                "topic": topic_title,
                "content": t.get("subtopics") or t.get("content") or [],
                "outcomes": t.get("learning_outcomes") or t.get("specific_outcomes") or "",
                "forced_references": strict_refs
            })
        elif isinstance(t, str):
            syllabus_summary.append({"unit_prefix": "", "topic": t, "forced_references": [syllabus_book]})

    model = get_model()

    # Handle Template Locking
    format_instruction = f"""
    OUTPUT JSON FORMAT (Strict):
    {{
      "intro_info": {{
        "philosophy": "Text...",
        "competence_learning": "Text...",
        "goals": ["Goal 1...", "Goal 2..."]
      }},
      "scheme_weeks": [
        {{
          "week_number": 1,
          "topic": "Unit Name", 
          "prescribed_competences": ["Broad skill"],
          "specific_competences": ["Detailed objective"],
          "content": ["Subtopic"],
          "learning_activities": ["Activities"],
          "methods": ["Pedagogy"],
          "assessment": ["Evaluation"],
          "resources": ["Materials"],
          "references": ["{syllabus_book}"] 
        }}
      ]
    }}
    """

    if locked_context and locked_context.get("customColumns"):
        custom_keys = [c["key"] for c in locked_context["customColumns"]]
        format_instruction = f"""
        🚨 CRITICAL TEMPLATE LOCK: Use EXACTLY these keys for objects inside `scheme_weeks`:
        {json.dumps(custom_keys)}
        Map content logically. Include "intro_info" as standard.
        """

    prompt = f"""
    Act as a Senior Head Teacher in Zambia. Create a professional Scheme of Work for {term}.
    Subject: {subject}, Grade: {grade}, Duration: {num_weeks} Weeks

    PROVIDED INTRO DATA: {json.dumps(provided_intro)}
    SYLLABUS DATA: {json.dumps(syllabus_summary)}

    STRICT CALENDAR RULES:
    1. **WEEK {num_weeks - 1}**: This MUST be strictly for "REVISIONS". Do not assign teaching topics here.
    2. **WEEK {num_weeks}**: This MUST be strictly for "END OF TERM TESTS".
    3. **TEACHING WEEKS**: Distribute the PROVIDED syllabus data evenly across Weeks 1 to {num_weeks - 2}.
    4. **COMPLETE COVERAGE**: Ensure all provided topics and subtopics are compressed into the teaching weeks.

    INSTRUCTIONS:
    1. Create exactly {num_weeks} weeks.
    2. Use a Zambian context (local names/examples).
    3. REFERENCES: Use 'forced_references' from the data.

    {format_instruction}
    """
    
    response_text = ""
    try:
        response = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        response_text = response.text
        json_str = extract_json_string(response_text)
        data = json.loads(json_str)

        if "scheme_weeks" not in data and isinstance(data, list):
            data = {"intro_info": {}, "scheme_weeks": data}
        
        cleaned_weeks = []
        raw_weeks = data.get("scheme_weeks", [])

        for i, item in enumerate(raw_weeks):
            week_num = i + 1
            if week_num > num_weeks: break 

            date_info = calculate_week_dates(start_date, week_num)
            item['week_number'] = week_num
            item['date_start'] = date_info['start_iso']
            item['date_end'] = date_info['end_iso']
            
            if 'week' in item:
                 item['week'] = f"Week {week_num} ({date_info['month']}) ({date_info['range_display']})"
            else:
                 item['week_display'] = f"Week {week_num}"
            
            # --- HARD OVERRIDES FOR THE LAST TWO WEEKS ---
            if week_num == num_weeks - 1:
                item['topic'] = "REVISIONS"
                item['content'] = ["General Revision of Termly Topics"]
                item['prescribed_competences'] = ["Consolidation of skills"]
                item['specific_competences'] = ["Learners should be able to recall and apply covered topics."]
                item['learning_activities'] = ["Past paper revision", "Group discussion"]
                item['methods'] = ["Question and Answer", "Group Work"]
                item['assessment'] = ["Mock tests", "Oral questioning"]
                item['resources'] = ["Past papers", "Study guides", "Chalkboard"]
                item['references'] = [f"{subject} Syllabus Grade {grade}"]
            elif week_num == num_weeks:
                item['topic'] = "END OF TERM TESTS"
                item['content'] = ["Summative Assessment"]
                item['prescribed_competences'] = ["Evaluation of learning"]
                item['specific_competences'] = ["Learners should be able to accurately answer test questions."]
                item['learning_activities'] = ["Writing exams"]
                item['methods'] = ["Written Examination"]
                item['assessment'] = ["End of Term Exam"]
                item['resources'] = ["Exam papers", "Answer sheets"]
                item['references'] = ["Assessment Framework"]
            else:
                # --- Normal Teaching Weeks Fallbacks ---
                fallbacks = {
                    "topic": "Topic Review",
                    "content": ["Consolidation of covered work"],
                    "prescribed_competences": ["Critical Thinking"],
                    "specific_competences": ["Learners should demonstrate understanding."],
                    "learning_activities": ["Discussion", "Group Work"],
                    "methods": ["Learner-Centered Approach"],
                    "assessment": ["Continuous Assessment"],
                    "resources": ["Textbook", "Chalkboard"]
                }
                for key, val in fallbacks.items():
                    if not item.get(key): item[key] = val
                
                # Strict references injection for normal teaching weeks
                if i < len(syllabus_summary):
                    strict_refs = syllabus_summary[i].get("forced_references", [])
                    ai_refs = item.get("references")
                    if not ai_refs or ai_refs == [""]:
                        item['references'] = strict_refs
                    elif isinstance(ai_refs, list) and strict_refs:
                        if not any(strict_refs[0] in r for r in ai_refs):
                            item['references'] = strict_refs + ai_refs
            
            cleaned_weeks.append(item)
            
        return {
            "intro_info": data.get("intro_info", {
                "philosophy": f"Grade {grade} {subject} competence-based curriculum.",
                "competence_learning": "Focus on skills.",
                "goals": ["Practical application."]
            }),
            "weeks": cleaned_weeks
        }
    except Exception as e:
        print(f"❌ [Scheme Generator] Failed: {e}")
        return {"intro_info": {}, "weeks": []}

# =====================================================
# 2. SCHEME DETAILS EXTRACTOR (THE MISSING FUNCTION)
# =====================================================
def extract_scheme_details(scheme_data: List[dict], week_number: int) -> Dict[str, Any]:
    """
    Finds the week and returns ALL the rich CBC data found in the DB.
    """
    print(f"🔍 [Scheme Extractor] Looking for Week {week_number}...")
    
    if not scheme_data:
        return {"found": False, "topic": f"Week {week_number}", "content": [], "outcomes": [], "activities": [], "resources": [], "methods": [], "refs": []}

    week_key = str(week_number).strip()
    
    found_week = next((
        item for item in scheme_data 
        if str(item.get("week_number", "")).strip() == week_key or 
           str(item.get("week", "")).lower().replace("week", "").strip().split()[0] == week_key
    ), None)

    if not found_week:
        print(f"❌ [Scheme Extractor] Week {week_number} not found.")
        return {"found": False}

    topic = found_week.get("topic") or "Topic Not Set"
    unit = found_week.get("unit") or "" 
    component_title = unit if unit else topic 

    def ensure_list(val):
        if isinstance(val, list): return val
        if isinstance(val, str) and val: return [val]
        return []

    return {
        "found": True,
        "component": component_title,
        "topic": topic,
        "subtopic": found_week.get("subtopic", ""),
        "prescribed_competences": ensure_list(found_week.get("prescribed_competences") or found_week.get("competences")),
        "specific_competences": ensure_list(found_week.get("specific_competences") or found_week.get("outcomes")),
        "content": ensure_list(found_week.get("content")),
        "learning_activities": ensure_list(found_week.get("learning_activities") or found_week.get("activities")),
        "methods": ensure_list(found_week.get("methods") or found_week.get("strategies")),
        "resources": ensure_list(found_week.get("resources")),
        "assessment": ensure_list(found_week.get("assessment")),
        "refs": ensure_list(found_week.get("references") or found_week.get("reference") or ["Syllabus"])
    }