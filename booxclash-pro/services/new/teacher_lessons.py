import os
import httpx
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
# Ensure you are importing from the correct shared location
from .teacher_shared import get_model, extract_json_string, find_structured_module_content

# ==============================================================================
# 1. GENERATE SPECIFIC LESSON PLAN (Supports Standard & Remedial Loops)
# ==============================================================================
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
    school_logo: Optional[str] = None,
    module_data: Optional[Dict[str, Any]] = None,
    scheme_references: str = "Standard Zambian Syllabus",
    blooms_level: str = "",
    locked_context: Optional[Dict[str, Any]] = None,
    # 🆕 REMEDIAL LOOP SUPPORT
    is_remedial: bool = False,
    teacher_feedback: Optional[str] = None
) -> Dict[str, Any]:
    
    mode_label = "REMEDIAL" if is_remedial else "STANDARD"
    print(f"\n🔍 [Lesson Generator - {mode_label}] Processing: {theme} - {subtopic}")

    # 1. SMART MODULE SEARCH
    module_info = find_structured_module_content(module_data, subtopic)
    if not module_info:
        module_info = find_structured_module_content(module_data, theme)

    boys = attendance.get('boys', 0)
    girls = attendance.get('girls', 0)
    total_students = boys + girls

    # 2. SOURCE MATERIAL & REFERENCES
    module_prompt_insert = ""
    strict_ref_override = False 
    final_reference_string = scheme_references

    if module_info:
        unit_id = module_info.get("topic_id", module_info.get("unit_id", "N/A"))
        pages = module_info.get("pages", "N/A")
        module_text = module_info.get("context_text", "")

        if pages and pages != "N/A":
            final_reference_string = f"Official Module Unit {unit_id}, Page {pages}"
            strict_ref_override = True
        
        module_prompt_insert = f"""
        🔥🔥 **SOURCE MATERIAL: OFFICIAL GOVERNMENT MODULE** 🔥🔥
        **STRICT RULES**:
        1. **TEACHER ACTIVITY**: Derive steps EXACTLY from the text below.
        2. **INTERNAL CITATIONS**: Cite specific Activity Numbers if present.
        3. **REFERENCE FIELD**: MUST be exactly: "{final_reference_string}".

        **MODULE CONTENT START** {module_text}  
        **MODULE CONTENT END**
        """
    else:
        strict_ref_override = False
        module_prompt_insert = f"""
        🔥🔥 **SOURCE MATERIAL: EXTERNAL RESEARCH REQUIRED** 🔥🔥
        **STRICT RULES**:
        1. Incorporate content from reputable educational websites and textbooks.
        2. Explicitly reference these materials inside the steps.
        """

    model = get_model()
    ref_placeholder = final_reference_string if strict_ref_override else "List specific external sources used..."

    # 3. 🆕 INJECT REMEDIAL PEDAGOGY IF NEEDED
    remedial_instruction = ""
    if is_remedial and teacher_feedback:
        remedial_instruction = f"""
        🚨 **CRITICAL: THIS IS A REMEDIAL LESSON PLAN** 🚨
        The teacher taught this recently, but the students failed to understand it.
        **TEACHER'S FEEDBACK FROM LAST LESSON**: "{teacher_feedback}"
        
        **YOUR TASK**:
        - DO NOT teach this the exact same way as a standard lesson.
        - You MUST use alternative, highly simplified teaching methods (e.g., analogies, visual aids, or games) to address the specific struggle mentioned in the feedback.
        - Set the "expected_standard" to focus on overcoming this specific gap.
        """

    # 4. BLOOM'S TAXONOMY INSTRUCTION
    blooms_instruction = ""
    if blooms_level and not is_remedial:
        blooms_instruction = f"""
        🧠 **PEDAGOGICAL FOCUS**: 
        Focus on the **{blooms_level}** level of Bloom's Taxonomy.
        """

    # 5. DYNAMIC TEMPLATE INJECTION
    steps_format = """
      "steps": [
        {
            "stage": "INTRODUCTION",
            "time": "5 min",
            "teacherActivity": "...",
            "learnerActivity": "...",
            "assessment_criteria": "..."
        },
        {
            "stage": "DEVELOPMENT",
            "time": "30 min",
            "teacherActivity": "...",
            "learnerActivity": "...",
            "assessment_criteria": "..."
        },
        {
            "stage": "CONCLUSION",
            "time": "5 min",
            "teacherActivity": "...",
            "learnerActivity": "...",
            "assessment_criteria": "..."
        }
      ]
    """
    
    if locked_context and locked_context.get("customColumns"):
        custom_keys = [c["key"] for c in locked_context["customColumns"]]
        steps_format = f"""
      "steps": [
        {{
            // 🚨 CRITICAL LOCK: YOU MUST USE THESE EXACT KEYS:
            {', '.join([f'"{k}": "..."' for k in custom_keys])}
        }}
      ]
        """

    # 6. ASSEMBLE PROMPT
    prompt = f"""
    Act as a professional teacher in Zambia. Create a **Competence Based Curriculum (CBC)** Lesson Plan.

    CONTEXT:
    - School: "{school_name}"
    - Teacher: "{teacher_name}"
    - Grade: {grade}, Subject: {subject}
    - Topic: "{theme}"
    - Subtopic: "{subtopic}"
    - Objectives: {json.dumps(objectives)}
    
    {remedial_instruction}
    {blooms_instruction}
    {module_prompt_insert}

    OUTPUT JSON (Strict Structure):
    {{
      "teacherName": "{teacher_name}",
      "schoolName": "{school_name}",
      "date": "{date}",
      "grade": "{grade}",
      "subject": "{subject}",
      "topic": "{theme}",
      "subtopic": "{subtopic}",
      "time": "{time_start} - {time_end}",
      "duration": "40 minutes",
      "enrolment": {{ "boys": {boys}, "girls": {girls}, "total": {total_students} }},

      "expected_standard": "Learners should be able to...",
      "rationale": "Why this lesson is important...",
      "learning_environment": {{
          "natural": "Classroom",
          "technological": "N/A",
          "artificial": "Desks/Chalkboard"
      }},

      "materials": "List specific aids...",
      "references": "{ref_placeholder}",

      {steps_format},

      "homework_content": "A short task."
    }}
    """

    # 7. EXECUTE
    try:
        response = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        data = json.loads(extract_json_string(response.text))

        if strict_ref_override:
            data["references"] = final_reference_string
        if school_logo:
            data["schoolLogo"] = school_logo

        data["evaluation_footer"] = "LESSON EVALUATION:\n" + ("." * 200)

        # Flag it for the frontend
        data["is_remedial_plan"] = is_remedial 

        return data

    except Exception as e:
        print(f"❌ Error: {e}")
        return {"error": "Failed to generate lesson plan."}


# ==============================================================================
# 2. GENERATE LESSON NOTES
# ==============================================================================
async def generate_lesson_notes(grade: str, subject: str, topic: str, subtopic: str, module_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    print(f"\n📝 [Notes Generator] Generating for: {topic} - {subtopic}")
    
    # 1. Find Module Context
    module_info = find_structured_module_content(module_data, subtopic)
    if not module_info: 
        module_info = find_structured_module_content(module_data, topic)

    reference_str = f"Zambian Syllabus: {subject} {grade}"
    module_context_str = f"⚠️ No module data found. Search for standard definitions and examples from reputable educational sources."

    if module_info:
        unit_id = module_info.get("topic_id", module_info.get("unit_id", "N/A"))
        pages = module_info.get("pages", "N/A")
        
        if pages and pages != "N/A":
            reference_str = f"Official Module Unit {unit_id}, Page {pages}"
            print(f"   ↳ ✅ Module Context Found for Notes")
            
            module_context_str = f"""
            🔥🔥 **OFFICIAL CONTENT SOURCE** 🔥🔥
            **Use ONLY the following text to extract definitions and examples:**
            {module_info.get('context_text', '')}
            """

    # 2. Build Prompt
    model = get_model()
    
    prompt = f"""
    Act as a Teacher in Zambia preparing **Blackboard Notes** for a {grade} class.
    
    **CONTEXT:**
    - Subject: {subject}
    - Topic: {topic}
    - Subtopic: {subtopic}
    
    {module_context_str}

    **INSTRUCTIONS:**
    1. **Format**: Use clear **bullet points** for explanations.
    2. **Diagrams**: If a concept requires a diagram, include a text description: "[DIAGRAM: Description of diagram if needed]"
    3. **Content**: If Module is present, summarize it. If not, use standard syllabus definitions.
    4. **Activities**: Include a class exercise.
    5. **Reference**: You MUST set the reference to: "{reference_str}".

    **OUTPUT JSON:**
    {{
      "topic_heading": "{subtopic}",
      "reference": "{reference_str}",
      "explanation_points": [
        "Definition: ...",
        "Key Point 1...",
        "[DIAGRAM: Description of diagram if needed]" 
      ],
      "examples": ["Example A", "Example B"],
      "class_exercise": ["Q1", "Q2", "Q3"],
      "homework_question": ["Q1 (Homework)"]
    }}
    """

    # 3. Execute
    try:
        response = await model.generate_content_async(
            prompt, 
            generation_config={"response_mime_type": "application/json"}
        )
        data = json.loads(extract_json_string(response.text))
        
        # Notes usually need strict references, but you can relax this if needed
        data["reference"] = reference_str 
        
        return data

    except Exception as e:
        print(f"❌ [Notes Generator] Error: {e}")
        return {
            "topic_heading": subtopic, 
            "reference": reference_str, 
            "explanation_points": ["Error generating notes."], 
            "class_exercise": []
        }


# ==============================================================================
# 3. 🆕 CHALKBOARD DIAGRAM GENERATOR (IMAGEN 4.0)
# ==============================================================================
async def generate_chalkboard_diagram(prompt_text: str) -> Dict[str, str]:
    """
    Uses Google's Imagen 4.0 model via REST API to generate a line-art diagram.
    Returns a Base64 data URL ready to be displayed on the frontend.
    """
    print(f"\n🎨 [Diagram Generator] Requesting Imagen 4.0 for: {prompt_text}")
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY environment variable is missing.")
        return {"status": "error", "message": "Server configuration error: Missing API Key"}

    # API Endpoint for Imagen 4.0
    url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key={api_key}"
    
    # Enhanced prompt for educational chalkboard/line-art style
    enhanced_prompt = (
        f"A clean, simple, minimalist black-and-white line-art educational diagram of {prompt_text}. "
        "Solid white background, dark black outlines, no shading, 2d style, suitable for drawing on a chalkboard or printing on paper."
    )

    payload = {
        "instances": [
            {"prompt": enhanced_prompt}
        ],
        "parameters": {
            "sampleCount": 1
        }
    }

    try:
        # Generate image (timeout adjusted to 30s as image generation takes time)
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=30.0)
            
            if resp.status_code != 200:
                print(f"⚠️ Imagen API Error: {resp.status_code} - {resp.text}")
                return {"status": "error", "message": "Failed to generate image from Google API"}
                
            data = resp.json()

            # Extract the Base64 image string from the predictions array
            if "predictions" in data and len(data["predictions"]) > 0:
                base64_img = data["predictions"][0]["bytesBase64Encoded"]
                img_data_url = f"data:image/png;base64,{base64_img}"

                return {
                    "status": "success",
                    "diagram_type": "base64",
                    "content": img_data_url
                }
            else:
                print("⚠️ Unexpected response format from Imagen:", data)
                return {"status": "error", "message": "Unexpected response from image generator"}

    except Exception as e:
        print(f"❌ Error generating diagram with Imagen: {e}")
        return {"status": "error", "message": str(e)}


# ==============================================================================
# 4. 🆕 LESSON EVALUATION & TROUBLESHOOTER
# ==============================================================================
async def evaluate_lesson_feedback(topic: str, subtopic: str, grade: str, teacher_feedback: str) -> Dict[str, Any]:
    """
    Analyzes post-lesson feedback and suggests quick pedagogical fixes.
    """
    print(f"\n🧠 [Lesson Evaluator] Analyzing feedback for {topic}")
    model = get_model()

    prompt = f"""
    Act as a Master Teacher Trainer. 
    A teacher just taught a {grade} lesson on "{topic} - {subtopic}".
    
    The teacher submitted this post-lesson evaluation/struggle:
    "{teacher_feedback}"

    Your task:
    1. Provide a short, empathetic response.
    2. Suggest 2 quick, highly practical, low-resource teaching strategies or analogies to fix this specific misunderstanding tomorrow.
    3. Decide if this gap is severe enough to warrant a full Remedial Lesson Plan.

    OUTPUT JSON:
    {{
        "empathy_statement": "...",
        "quick_fixes": [
            "Method 1: ...",
            "Method 2: ..."
        ],
        "suggest_remedial": true/false
    }}
    """
    
    try:
        response = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(extract_json_string(response.text))
    except Exception as e:
        print(f"❌ Evaluation Error: {e}")
        return {
            "empathy_statement": "I understand that was a challenging lesson.",
            "quick_fixes": ["Try breaking the concept down into smaller, visual steps."],
            "suggest_remedial": True
        }