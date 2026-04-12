import json
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from services.data_service import get_numeracy_tool, get_official_record_categories

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY is missing! Check your .env file.")

client = genai.Client(api_key=api_key)

def grade_numeracy_vision(image_bytes: bytes, tool_id: str = "Basic Numeracy Assessment Tool-1") -> dict:
    """Grades written math assessments using Gemini Vision."""
    tool_data = get_numeracy_tool(tool_id)
    if not tool_data:
        operations_data = {"instructions": "Check basic addition and subtraction.", "sections": []}
    else:
        operations_data = next((part for part in tool_data.get("parts", []) if "Operations" in part.get("name", "")), {"sections": [], "instructions": "Default"})
    
    official_levels = get_official_record_categories("Operations")

    system_prompt = f"""
    You are the Booxclash VVOB Assessment Marker Engine. 
    Analyze this Zambian Catch-up Numeracy assessment sheet.
    
    GROUND TRUTH RUBRIC: {json.dumps(operations_data.get("sections", []), indent=2)}
    INSTRUCTIONS: {json.dumps(operations_data.get("instructions", ""), indent=2)}

    COMPLIANCE OUTPUT (Return ONLY JSON):
    {{
      "student_name": "extracted name or Unknown",
      "addition_correct": 0,
      "subtraction_correct": 0,
      "operations_level_id": "exact_id_from_compliance_list",
      "recommended_intervention": "Brief teacher instruction"
    }}
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg'), system_prompt],
            config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.0)
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"❌ Gemini Vision Error: {e}")
        return {"error": "Failed to grade document", "details": str(e)}

def grade_oral_audio(audio_bytes: bytes, mime_type: str, instrument_data: dict) -> dict:
    """Grades spoken audio against the provided JSON instrument data."""
    
    system_prompt = f"""
    You are the Booxclash VVOB Expert Assessor for Zambian primary schools.
    Listen to the student's audio and grade them against this specific instrument:
    
    EXPECTED INSTRUMENT DATA: 
    {json.dumps(instrument_data, indent=2)}

    CRITICAL GRADING RULES FOR NUMERACY:
    1. PLACE VALUE MATTERS: "203" MUST be pronounced "two hundred three".
    2. STRICT FAILURE: Reading digit-by-digit ("two zero three") is INCORRECT.
    
    CRITICAL GRADING RULES FOR LITERACY (CHITONGA):
    1. Evaluate phonetic accuracy based on standard Chitonga pronunciation.

    PASS/FAIL CRITERIA:
    - To pass a level, the student must get at least 80% of the items correct (e.g., 4 out of 5, or 5 out of 6).
    - If they do not meet this threshold, set "level_passed" to false.

    OUTPUT FORMAT: Return ONLY valid JSON with no markdown wrapping.
    {{
      "transcription": "Exact transcription of what the child said",
      "correct_count": 0,
      "total_expected": 6,
      "level_passed": true_or_false,
      "feedback": "Brief feedback"
    }}
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[types.Part.from_bytes(data=audio_bytes, mime_type=mime_type), system_prompt],
            config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.0)
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"❌ Gemini Audio Error: {e}")
        return {"error": "Failed to process audio", "details": str(e), "level_passed": False}