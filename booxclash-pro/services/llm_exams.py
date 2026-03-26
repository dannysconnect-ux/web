import json
import asyncio
from .new.teacher_shared import get_model, extract_json_string
from .image_service import generate_fast_image  # 🆕 Import your image service

async def generate_localized_exam(grade: str, subject: str, topics: list, blueprint: dict) -> dict:
    """
    Generates a syllabus-aligned exam and creates AI diagrams for required questions.
    """
    
    print(f"\n📝 [Exam Generator] Generating {grade} {subject} Test with Diagrams...")
    
    topics_str = ", ".join(topics) if topics else "General Review"
    
    # Safely extract blueprint counts
    mcq_count = int(blueprint.get('mcq', 0))
    tf_count = int(blueprint.get('true_false', 0))
    matching_count = int(blueprint.get('matching', 0))
    short_count = int(blueprint.get('short_answer', 0))
    comp_count = int(blueprint.get('computational', 0))
    essay_count = int(blueprint.get('essay', 0))
    case_count = int(blueprint.get('case_study', 0))
    
    prompt = f"""You are an expert Zambian curriculum developer. 
Your task is to generate a comprehensive test for {grade} students in {subject}.

STRICT RULES FOR LANGUAGE & CONTEXT:
1. Simplicity: Keep sentences under 15 words. Use a {grade} reading level.
2. Local Context: Use ONLY common Zambian names (e.g., Mutale, Chanda, Mwape). 
3. Local Settings: Use local scenarios (e.g., a minibus, a maize field, Kariba Dam).
4. Metrics: Always use Zambian Kwacha (ZMW) and metric system (km, kg, liters).
5. Alignment: Questions MUST strictly relate to these topics: {topics_str}.

STRICT VISUAL REQUIREMENT (MANDATORY):
This exam MUST contain AT LEAST 3 questions that require a diagram or visual aid.
- For these questions, set "needs_image": true.
- Start the question text with "Study the diagram below:" or "Look at the image:".
- Provide an "image_prompt" that describes a clear, simple educational illustration.

EXAM BLUEPRINT (CRITICAL INSTRUCTION):
You MUST generate EXACTLY the number of questions specified below. 
If a section says "0", you MUST return an empty array [] for that JSON key. DO NOT generate questions for sections with 0.

- multiple_choice: {mcq_count} questions
- true_false: {tf_count} questions
- matching: {matching_count} matching blocks
- short_answer: {short_count} questions
- computational: {comp_count} questions
- essay: {essay_count} questions
- case_study: {case_count} scenarios

OUTPUT JSON FORMAT:
{{
  "exam_title": "{grade} {subject} Test",
  "multiple_choice": [
    {{"question": "...", "options": [], "answer": "...", "needs_image": true, "image_prompt": "..."}}
  ],
  "true_false": [],
  "matching": [],
  "short_answer": [],
  "computational": [],
  "essay": [],
  "case_study": [
    {{"scenario": "...", "questions": [{{"question": "...", "answer": "...", "needs_image": false, "image_prompt": ""}}]}}
  ]
}}
"""

    response_text = ""
    try:
        model = get_model()
        response = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json", "temperature": 0.5}
        )
        
        response_text = response.text
        json_str = extract_json_string(response_text)
        exam_json = json.loads(json_str)

        # 🎨 --- IMAGE GENERATION LOGIC --- 🎨
        print("🎨 [Exam Generator] Processing diagrams...")
        
        sections_to_process = [
            "multiple_choice", "true_false", "matching", 
            "short_answer", "computational", "essay"
        ]

        # 1. Process standard sections
        for section in sections_to_process:
            if section in exam_json and isinstance(exam_json[section], list):
                for item in exam_json[section]:
                    if item.get("needs_image") and item.get("image_prompt"):
                        # Generate the image and store the base64 string
                        img_data = await generate_fast_image(item["image_prompt"])
                        item["image_url"] = img_data 
        
        # 2. Process nested Case Study questions
        if "case_study" in exam_json and isinstance(exam_json["case_study"], list):
            for study in exam_json["case_study"]:
                # Check if the scenario itself needs an image
                if study.get("needs_image") and study.get("image_prompt"):
                    study["image_url"] = await generate_fast_image(study["image_prompt"])
                
                # Check individual questions within the case study
                for q in study.get("questions", []):
                    if q.get("needs_image") and q.get("image_prompt"):
                        q["image_url"] = await generate_fast_image(q["image_prompt"])

        print(f"✅ [Exam Generator] Successfully generated exam with integrated diagrams.")
        return exam_json
        
    except Exception as e:
        print(f"❌ [Exam Generator] Error: {e}")
        return {"error": f"Failed to generate test: {str(e)}"}