import json
from typing import List, Dict, Any, Optional

# IMPORTANT: Adjust these imports based on where your helper functions live in your backend
from .new.teacher_shared import get_model, extract_json_string 
# =====================================================
# CATCH-UP (TaRL) LESSON PLAN GENERATOR
# =====================================================
async def generate_catchup_lesson_plan(
    grade: str, 
    subject: str, 
    catchup_level: str, 
    activity_name: str, 
    objectives: List[str], 
    catchup_steps: List[str],
    materials: List[str],
    date: str, 
    time_start: str, 
    time_end: str, 
    attendance: Dict[str, int], 
    teacher_name: str = "Class Teacher", 
    school_name: str = "Primary School",
    school_logo: Optional[str] = None,
    locked_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    
    final_logo = school_logo
    print(f"\n✨ [Catch-Up Generator] Processing: {subject} - {catchup_level} | Activity: {activity_name}")
    
    boys = attendance.get('boys', 0)
    girls = attendance.get('girls', 0)
    total = boys + girls

    # Formatting lists into strings for the prompt
    objectives_str = "\n".join([f"- {obj}" for obj in objectives])
    steps_str = "\n".join([f"{i+1}. {step}" for i, step in enumerate(catchup_steps)])
    materials_str = ", ".join(materials) if materials else "Improvised local materials (stones, sticks, counters)"

    # Handle custom columns if the user locked a format
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
    
    prompt = f"""
    Act as an expert Zambian Remedial Teacher trained in the Teaching at the Right Level (TaRL) methodology. 
    Create a highly interactive Catch-Up Lesson Plan for {subject}.

    📋 LESSON DETAILS:
    - Target Group: {grade} (Catch-Up Level: {catchup_level})
    - Activity Focus: {activity_name}
    - Required Materials: {materials_str}
    
    🎯 EXPECTED OUTCOMES:
    {objectives_str}

    ⚙️ OFFICIAL METHODOLOGY STEPS (MUST USE IN DEVELOPMENT STAGE):
    {steps_str}

    STRICT RULES:
    1. The lesson must be highly learner-centered (incorporate play, groups, "Clap and Snap", etc., where applicable).
    2. Incorporate the exact "Official Methodology Steps" provided above into the "DEVELOPMENT" stage of your plan.
    3. CRITICAL REFERENCE INSTRUCTION: For the "references" field, you MUST use exactly this: "Catch-Up Teacher's Guide (Ministry of General Education, Zambia)". Do not invent other textbooks.

    OUTPUT JSON (Strict):
    {{
      "teacherName": "{teacher_name}",
      "schoolName": "{school_name}",
      "logo_url": "{final_logo}",
      "topic": "Catch-Up {subject}: {catchup_level}", 
      "subtopic": "{activity_name}",
      "time": "{time_start} - {time_end}", 
      "rationale": "Why this foundational skill is critical for learners lagging behind...", 
      "specific": "By the end of the lesson, learners should be able to...", 
      "standard": "Basic competency in {subject} at the {catchup_level} level.", 
      "prerequisite": "What the learners assessed at {catchup_level} already know.", 
      "materials": "{materials_str}", 
      "references": "Catch-Up Teacher's Guide (Ministry of General Education, Zambia)",
      "enrolment": {{ "boys": {boys}, "girls": {girls}, "total": {total} }},
      {steps_format}
    }}
    """
    
    try:
        # Call the Gemini model asynchronously 
        response = await model.generate_content_async(
            prompt, 
            generation_config={"response_mime_type": "application/json"}
        )
        
        # Parse the JSON string into a Python Dictionary
        data = json.loads(extract_json_string(response.text))
        
        # 🛡️ Force Fallbacks in case the AI hallucinates
        data["logo_url"] = final_logo
        data["schoolName"] = school_name
        data["topic"] = f"Catch-Up {subject}: {catchup_level}"
        data["subtopic"] = activity_name
        
        # 🛡️ Strictly enforce the Reference
        if "references" not in data or "Catch-Up Teacher's Guide" not in data.get("references", ""):
            data["references"] = "Catch-Up Teacher's Guide (Ministry of General Education, Zambia)"
            
        return data

    except Exception as e:
        print(f"❌ [Catch-Up Generator] Failed: {e}")
        return {
            "topic": f"Catch-Up {subject}: {catchup_level}", 
            "subtopic": activity_name, 
            "references": "Catch-Up Teacher's Guide (Ministry of General Education, Zambia)", 
            "logo_url": final_logo, 
            "steps": []
        }