import json
from .new.teacher_shared import get_model, extract_json_string

async def generate_localized_exam(grade: str, subject: str, topics: list, blueprint: dict) -> dict:
    """
    Generates a syllabus-aligned exam using simple Zambian English context.
    blueprint example: {"mcq": 10, "one_word": 5, "essay": 2}
    """
    
    print(f"\n📝 [Exam Generator] Generating {grade} {subject} Test...")
    
    topics_str = ", ".join(topics) if topics else "General Review"
    
    prompt = f"""You are an expert Zambian curriculum developer. 
Your task is to generate a comprehensive test for {grade} students in {subject}.

STRICT RULES FOR LANGUAGE & CONTEXT:
1. Simplicity: Keep sentences under 15 words. Use a {grade} reading level.
2. Local Context: Use ONLY common Zambian names (e.g., Mutale, Chanda). 
3. Local Settings: Use local scenarios (e.g., a minibus, a maize field, Victoria Falls).
4. Metrics: Always use Zambian Kwacha (ZMW) and metric system (km, kg, liters).
5. Alignment: Questions MUST strictly relate to these topics: {topics_str}.

EXAM BLUEPRINT:
Please generate EXACTLY:
- {blueprint.get('mcq', 0)} Multiple Choice Questions
- {blueprint.get('true_false', 0)} True/False Questions
- {blueprint.get('matching', 0)} Matching Blocks (Each block must have exactly 5 pairs to match)
- {blueprint.get('short_answer', 0)} Short Answer / Fill-in-the-Blank Questions
- {blueprint.get('computational', 0)} Computational / Problem-Solving Questions (Show working)
- {blueprint.get('essay', 0)} Essay/Explanation Questions
- {blueprint.get('case_study', 0)} Case Study Scenarios (A short story followed by 2-3 questions)

IMPORTANT - IMAGES & DIAGRAMS:
If a question requires a visual diagram (e.g., a map, a plant cell, a circuit, a solid shape), you MUST do two things:
1. Start the "question" text with phrases like "Look at the diagram below:", "Based on the picture:", or "Study the image:".
2. Provide a highly descriptive, visual 3-5 word "image_prompt" describing EXACTLY what to draw (e.g., "A solid wooden block" or "A simple electrical circuit"). DO NOT just repeat the question as the image prompt!

OUTPUT JSON FORMAT:
{{
  "exam_title": "{grade} {subject} Test",
  "multiple_choice": [
    {{"question": "Look at the diagram below. What state of matter is this?", "options": ["A. Solid", "B. Liquid", "C. Gas", "D. Plasma"], "answer": "A. Solid", "needs_image": true, "image_prompt": "A solid wooden block"}}
  ],
  "true_false": [
    {{"question": "...", "answer": "True", "needs_image": false, "image_prompt": ""}}
  ],
  "matching": [
    {{"instruction": "Match the items in Column A with Column B.", "pairs": [{{"stem": "Term A", "match": "Definition A"}}, {{"stem": "Term B", "match": "Definition B"}}], "needs_image": false, "image_prompt": ""}}
  ],
  "short_answer": [
    {{"question": "...", "answer": "...", "needs_image": false, "image_prompt": ""}}
  ],
  "computational": [
    {{"question": "Calculate...", "solution_steps": "1. ...\\n2. ...", "final_answer": "...", "needs_image": false, "image_prompt": ""}}
  ],
  "essay": [
    {{"question": "...", "points_allocated": 5, "grading_rubric": "...", "needs_image": false, "image_prompt": ""}}
  ],
  "case_study": [
    {{"scenario": "A short story about a farmer...", "questions": [{{"question": "...", "answer": "..."}}], "needs_image": false, "image_prompt": ""}}
  ]
}}
"""

    response_text = ""
    try:
        model = get_model()
        
        response = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        response_text = response.text
        json_str = extract_json_string(response_text)
        exam_json = json.loads(json_str)
        
        print(f"✅ [Exam Generator] Successfully generated: {exam_json.get('exam_title')}")
        return exam_json
        
    except Exception as e:
        print(f"❌ [Exam Generator] LLM Generation Error: {e}")
        if response_text:
            print(f"❌ RAW AI RESPONSE: {response_text[:500]}...") 
        return {"error": "Failed to generate test."}