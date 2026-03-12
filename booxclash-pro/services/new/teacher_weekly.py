import json
from typing import List, Dict, Any, Optional
# Ensure these imports point to the correct locations
from .teacher_shared import get_model, extract_json_string, find_structured_module_content
from .teacher_schemes import extract_scheme_details

# =====================================================
# WEEKLY PLAN GENERATOR (MERGED: MANUAL INPUTS + ROBUST REFERENCES + TEMPLATE LOCK)
# =====================================================
async def generate_weekly_plan_from_scheme(
    school: str, subject: str, grade: str, term: str, 
    week_number: int, days: int, start_date: str, 
    scheme_data: List[dict] = None,
    module_data: Optional[Dict[str, Any]] = None,
    school_logo: Optional[str] = None,
    manual_topic: Optional[str] = None,
    manual_subtopic: Optional[str] = None,
    locked_context: Optional[Dict[str, Any]] = None,
    objectives: Optional[List[str]] = None # 👈 ADDED OBJECTIVES HERE
) -> Dict[str, Any]:
    
    print(f"\n🗓️ [Weekly Generator] Request: Week {week_number}...")
    
    # 1. ALWAYS EXTRACT SCHEME DATA FIRST
    details = extract_scheme_details(scheme_data, week_number)

    # 2. APPLY MANUAL OVERRIDES (If provided)
    if manual_topic and manual_topic.strip():
        print(f"  🎯 [Override] Using Manually Selected Topic: {manual_topic}")
        details["topic"] = manual_topic
        details["found"] = True 

    if not details["found"]:
        print(f"   ⚠️ Week {week_number} not found in Scheme. Using generic fallback.")
        details["topic"] = f"General {subject} Concepts"
        details["refs"] = ["Standard Syllabus"]

    # 3. DETERMINE TARGET FOR MODULE SEARCH
    target_topic_for_module = manual_subtopic if manual_subtopic else details['topic']

    # 4. FETCH STRUCTURED MODULE CONTENT
    module_info = find_structured_module_content(module_data, target_topic_for_module)
    
    module_prompt_insert = ""
    
    # 5. CONSTRUCT REFERENCE LOGIC
    if module_info:
        # 🛡️ BULLETPROOF COMPLIANCE FIX: 
        # If activity_id is hidden/missing, fallback to the Topic Name so it never says "Unknown"
        ref_title = module_info.get('activity_id') or module_info.get('unit_id') or manual_subtopic or details['topic']
        page_nums = module_info.get('pages', 'N/A')
        
        print(f"  ↳ ✅ Module Found: {ref_title}, Pages: {page_nums}")
        
        module_prompt_insert = f"""
        🔥🔥 **OFFICIAL MODULE DATA FOUND** 🔥🔥
        1. **UNIT/TOPIC**: {ref_title}
        2. **PAGE NUMBERS**: {page_nums}
        3. **CONTENT SOURCE**: Use the specific activities below.
        
        --- MODULE CONTENT START ---
        {module_info.get('context_text', '')}
        --- MODULE CONTENT END ---
        
        **MANDATORY INSTRUCTION**: 
        In the 'reference' field of the JSON, you MUST write exactly: "Module: {ref_title}, Page {page_nums}".
        """
    else:
        print(f"  ↳ ⚠️ Module not found for '{target_topic_for_module}'. Falling back to Scheme References.")
        
        scheme_refs = details.get('refs', [])
        if isinstance(scheme_refs, list):
            valid_refs = [str(r) for r in scheme_refs if r]
            scheme_refs_str = ", ".join(valid_refs)
        else:
            scheme_refs_str = str(scheme_refs)

        if not scheme_refs_str or scheme_refs_str.lower() in ["none", ""]: 
            scheme_refs_str = "Approved Syllabus"

        module_prompt_insert = f"""
        ⚠️ **MODULE DATA NOT FOUND**
        
        **MANDATORY INSTRUCTION**:
        You MUST use the 'REFERENCES' from the Scheme: "{scheme_refs_str}".
        In the 'reference' field of the JSON output, write exactly: "{scheme_refs_str}".
        """

    # 🛑 INJECT OBJECTIVES TO STOP HALLUCINATION
    objectives_instruction = ""
    if objectives and len(objectives) > 0:
        obj_list = "\n    - ".join(objectives)
        objectives_instruction = f"\n    TARGET OBJECTIVES / OUTCOMES:\n    - {obj_list}\n    (Distribute these specific objectives logically across the {days} daily lessons. DO NOT hallucinate other topics.)"

    model = get_model() 
    
    # 6. ⚡️ DYNAMIC TEMPLATE INJECTION
    format_instruction = f"""
    OUTPUT JSON ONLY:
    {{
      "meta": {{ 
          "week_number": {week_number}, 
          "term": "{term}",
          "main_topic": "{details['topic']}"
      }},
      "days": [
        {{
          "day": "Monday", 
          "component": "{details.get('component', subject)}", 
          "topic": "{details['topic']}", 
          "subtopic": "Name of sub-lesson", 
          "specific_competence": "Learner should be able to...", 
          "scope_of_lesson": "Brief teacher content...",
          "learning_activity": "What learners do...", 
          "expected_standard": "Assessment goal...",
          "resources": {json.dumps(details.get('resources', ["Textbook"]))}, 
          "strategies": {json.dumps(details.get('methods', ["Inquiry"]))},
          "reference": "..." 
        }}
      ]
    }}
    """
    
    if locked_context and locked_context.get("customColumns"):
        custom_keys = [c["key"] for c in locked_context["customColumns"]]
        format_instruction = f"""
        🚨 CRITICAL TEMPLATE LOCK: The teacher uses a custom layout.
        Your output JSON MUST follow this structure exactly:
        {{
            "meta": {{ 
                "week_number": {week_number}, 
                "term": "{term}",
                "main_topic": "{details['topic']}"
            }},
            "days": [
                {{
                    // EXACT CUSTOM KEYS REQUIRED HERE FOR EACH DAY:
                    {', '.join([f'"{k}": "..."' for k in custom_keys])}
                }}
            ]
        }}
        Map your generated content logically to these provided keys.
        """

    # 7. PROMPT
    subtopic_instruction = f"Break the topic into {days} logical daily lessons."
    if manual_subtopic:
        subtopic_instruction = f"Focus heavily on the subtopic: '{manual_subtopic}' and break it into {days} detailed daily lessons."

    prompt = f"""
    Act as a Senior Teacher in Zambia. Create a Weekly Lesson Plan for {days} days.
    
    CONTEXT:
    - Subject: {subject}, Grade: {grade}, Term: {term}, Week: {week_number}
    - Main Topic: {details['topic']}
    - Competencies: {", ".join(details.get('specific_competences', []))}
    {objectives_instruction} 
    
    {module_prompt_insert}

    INSTRUCTIONS:
    - **Topic**: Use "{details['topic']}".
    - **Subtopic**: {subtopic_instruction}
    - **Scope of Lesson**: Clear teacher notes.
    - **Reference**: STRICTLY follow the 'MANDATORY INSTRUCTION' above. 

    {format_instruction}
    """
    
    try:
        response = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        plan_json = json.loads(extract_json_string(response.text))
        
        if "meta" in plan_json:
            plan_json["meta"]["main_topic"] = details['topic']
            
        return plan_json
    except Exception as e:
        print(f"❌ [Weekly Generator] Error: {e}")
        return {"days": [], "meta": {"week_number": week_number, "main_topic": details.get('topic', 'Unknown')}}