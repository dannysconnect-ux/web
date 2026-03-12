import json
import math
from typing import List, Dict, Any, Union, Optional
# Ensure teacher_shared is accessible. 
from .teacher_shared import get_model, extract_json_string, calculate_week_dates

# =====================================================
# 1. PROFESSIONAL SCHEME GENERATOR (ROBUST VERSION)
# =====================================================
async def generate_scheme_with_ai(
    syllabus_data: Union[List[dict], Dict[str, Any]], 
    subject: str,
    grade: str,
    term: str,
    num_weeks: int,
    start_date: str = "2026-01-13",
    locked_context: Optional[Dict[str, Any]] = None # 🆕 TEMPLATE LOCK SUPPORT
) -> Dict[str, Any]:
    
    print(f"\n📘 [Scheme Generator] Processing for {subject} Grade {grade}...")
    
    # 1. Extract Topics and Intro Data Safely
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
    
    # 2. TERM SPLITTING LOGIC
    total_units = len(topics_list)
    chunk_size = math.ceil(total_units / 3)
    term_lower = str(term).lower()
    
    start_idx = 0
    end_idx = chunk_size

    if "2" in term_lower:
        start_idx = chunk_size
        end_idx = chunk_size * 2
    elif "3" in term_lower:
        start_idx = chunk_size * 2
        end_idx = total_units

    term_syllabus_data = topics_list[start_idx : min(end_idx, total_units)] if total_units > 0 else []
    
    # Fallback if splitting resulted in empty list
    if not term_syllabus_data and total_units > 0:
        term_syllabus_data = topics_list

    # 3. PREPARE DATA SUMMARY (Extract Unit Numbers to guide the AI)
    syllabus_summary = []
    syllabus_book = f"{subject} Syllabus {grade}"

    for t in term_syllabus_data:
        if isinstance(t, dict):
            unit_code = t.get("unit") or t.get("unit_number") or t.get("number") or ""
            topic_title = t.get("topic_title") or t.get("topic") or ""
            
            # Smart Reference Handling
            syl_page = t.get("syllabus_page") or t.get("page_number") or t.get("page")
            strict_refs = []
            if syl_page:
                strict_refs.append(f"{syllabus_book} Pg {syl_page}")
            else:
                strict_refs.append(f"{syllabus_book}")

            # Append module refs if they exist
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

    # ⚡️ DYNAMIC TEMPLATE INJECTION
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
          "topic": "Unit 4.1: Sets", 
          "prescribed_competences": ["Critical Thinking", "Communication"],
          "specific_competences": ["4.1.1 Learners should be able to describe sets..."],
          "content": ["Grouping objects", "Set notation"],
          "learning_activities": ["Group work on sorting..."],
          "methods": ["Demonstration", "Inquiry"],
          "assessment": ["Written Quiz"],
          "resources": ["Chart", "Real objects"],
          "references": ["{syllabus_book} Pg 5"] 
        }}
      ]
    }}
    """

    if locked_context and locked_context.get("customColumns"):
        custom_keys = [c["key"] for c in locked_context["customColumns"]]
        format_instruction = f"""
        🚨 CRITICAL TEMPLATE LOCK: The teacher uses a custom spreadsheet. 
        Instead of the standard format, the objects inside the `scheme_weeks` array MUST use EXACTLY these keys:
        {json.dumps(custom_keys)}
        Map your generated content logically to these keys. Also ensure to output "intro_info" as standard.
        """

    # 4. PROMPT (The "Robust" Version)
    prompt = f"""
    Act as a Senior Head Teacher in Zambia. Create a professional Scheme of Work matching the Ministry Standard.

    DETAILS:
    - Subject: {subject}, Grade: {grade}, Term: {term}, Duration: {num_weeks} Weeks

    PROVIDED INTRO DATA:
    {json.dumps(provided_intro)}

    SYLLABUS DATA: 
    {json.dumps(syllabus_summary)}

    INSTRUCTIONS:
    1. **Structure**: Create exactly {num_weeks} weeks.
    2. **Content Mapping**: Map provided Topics to weeks sequentially.
    3. **NO Empty Arrays**: You MUST generate at least 2-3 items for methods, activities, resources, and assessment.
    
    4. **Formatting Rules**:
       - **TOPIC**: Prefix with Unit Number if available (e.g., "Unit 4.1: Sets"). 
       - **REFERENCES**: You MUST include the book name AND page number. Use the 'forced_references' provided in the data.
       - **COMPETENCES**: Differentiate between 'prescribed' (broad) and 'specific' (detailed).

    {format_instruction}
    """
    
    response_text = ""
    try:
        # ✅ FIX: Force JSON response type to avoid parsing errors
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

        # 5. POST-PROCESSING & CLEANUP
        for i, item in enumerate(raw_weeks):
            week_num = int(item.get("week_number", i + 1))
            if week_num > num_weeks: break 

            date_info = calculate_week_dates(start_date, week_num)
            
            # Map dynamic custom keys or fallbacks
            item['week_number'] = week_num
            item['date_start'] = date_info['start_iso']
            item['date_end'] = date_info['end_iso']
            if 'week' in item:
                 item['week'] = f"Week {week_num} ({date_info['month']}) ({date_info['range_display']})"
            else:
                 item['week_display'] = f"Week {week_num}" # For custom column mapping
            
            # ✅ ROBUST FALLBACKS: Ensure no empty arrays
            if not item.get("topic"): item["topic"] = "Topic To Be Announced"
            if not item.get("content"): item["content"] = ["As per syllabus"]
            if not item.get("prescribed_competences"): item["prescribed_competences"] = ["Critical Thinking", "Creativity"]
            if not item.get("specific_competences"): item["specific_competences"] = ["Learners should be able to demonstrate understanding."]
            if not item.get("learning_activities"): item["learning_activities"] = ["Discussion", "Group Work"]
            if not item.get("methods"): item["methods"] = ["Learner-Centered Approach"]
            if not item.get("assessment"): item["assessment"] = ["Class Exercise"]
            if not item.get("resources"): item["resources"] = ["Textbook", "Chalkboard"]
            
            # ✅ REFERENCE INJECTION (The logic you liked)
            # If AI returns empty refs, or if we have strict refs from syllabus, force them in.
            if i < len(syllabus_summary):
                source = syllabus_summary[i]
                strict_refs = source.get("forced_references", [])
                
                ai_refs = item.get("references")
                if not ai_refs or ai_refs == [""]:
                    item['references'] = strict_refs
                elif isinstance(ai_refs, list) and len(strict_refs) > 0:
                    # Avoid duplicates
                    if not any(strict_refs[0] in r for r in ai_refs):
                        item['references'] = strict_refs + ai_refs
            
            cleaned_weeks.append(item)
            
        return {
            "intro_info": data.get("intro_info", {
                "philosophy": f"The Grade {grade} {subject} curriculum is designed using a competence-based approach.",
                "competence_learning": "Focus on skills and practical application.",
                "goals": ["To apply concepts in real life."]
            }),
            "weeks": cleaned_weeks
        }

    except Exception as e:
        print(f"❌ [Scheme Generator] Failed: {e}")
        if response_text:
            print(f"❌ RAW AI RESPONSE (Partial): {response_text[:500]}...") 
        return {"intro_info": {}, "weeks": []}

# =====================================================
# 🛠️ HELPER: EXTRACT SCHEME DETAILS (Enhanced for CBC)
# =====================================================
def extract_scheme_details(scheme_data: List[dict], week_number: int) -> Dict[str, Any]:
    """
    Finds the week and returns ALL the rich CBC data found in the DB.
    """
    print(f"🔍 [Scheme Extractor] Looking for Week {week_number}...")
    
    if not scheme_data:
        return {"found": False, "topic": f"Week {week_number}", "content": [], "outcomes": [], "activities": [], "resources": [], "methods": [], "refs": []}

    week_key = str(week_number).strip()
    
    # 1. FIND THE WEEK
    found_week = next((
        item for item in scheme_data 
        if str(item.get("week_number", "")).strip() == week_key or 
           str(item.get("week", "")).lower().replace("week", "").strip().split()[0] == week_key
    ), None)

    if not found_week:
        print(f"❌ [Scheme Extractor] Week {week_number} not found.")
        return {"found": False}

    # 2. EXTRACT CORE IDENTIFIERS
    # We prioritize 'unit' -> 'topic' -> 'theme' to get the best "Component" title
    topic = found_week.get("topic") or "Topic Not Set"
    unit = found_week.get("unit") or "" 
    component_title = unit if unit else topic # Use Unit (e.g. Unit 2.1) as the main component title if available

    # 3. EXTRACT LISTS (Handle strings that need splitting or pre-existing lists)
    def ensure_list(val):
        if isinstance(val, list): return val
        if isinstance(val, str) and val: return [val]
        return []

    # CBC Specific Fields
    specific_competences = ensure_list(found_week.get("specific_competences") or found_week.get("outcomes"))
    prescribed_competences = ensure_list(found_week.get("prescribed_competences") or found_week.get("competences"))
    
    # Pedagogy Fields
    content = ensure_list(found_week.get("content"))
    learning_activities = ensure_list(found_week.get("learning_activities") or found_week.get("activities"))
    methods = ensure_list(found_week.get("methods") or found_week.get("strategies"))
    resources = ensure_list(found_week.get("resources"))
    assessment = ensure_list(found_week.get("assessment"))
    refs = ensure_list(found_week.get("references") or found_week.get("reference") or ["Syllabus"])

    print(f"✅ [Scheme Extractor] Found: {component_title} | {len(specific_competences)} competencies | {len(learning_activities)} activities")

    return {
        "found": True,
        "component": component_title, # e.g. "Unit 2.1: Sets"
        "topic": topic,               # e.g. "Sets"
        "subtopic": found_week.get("subtopic", ""),
        
        # Lists
        "prescribed_competences": prescribed_competences,
        "specific_competences": specific_competences,
        "content": content,
        "learning_activities": learning_activities,
        "methods": methods,
        "resources": resources,
        "assessment": assessment,
        "refs": refs
    }