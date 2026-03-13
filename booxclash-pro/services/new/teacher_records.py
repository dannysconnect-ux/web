import json
from typing import List, Dict, Any
from .teacher_shared import get_model, extract_json_string, calculate_week_dates
from .teacher_schemes import extract_scheme_details

async def generate_record_of_work(
    teacher_name: str,
    school_name: str,
    grade: str,
    subject: str,
    term: str,
    year: str,
    start_date: str,
    scheme_data: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Generates a 'Record of Work' structure based on the Scheme.
    Matches the Zambian format: [Week Ending | Topics | References | Methods/Aids | Evaluation]
    
    NOTE: The 'Evaluation' field is intentionally left BLANK for the teacher to fill in daily.
    """
    
    print(f"\n📂 [Records Generator] Processing Scheme Data for {subject} Grade {grade}...")

    model = get_model()
    records_context = []

    # 1. ITERATE AND EXTRACT RICH DATA
    # We process each week found in the scheme data
    for item in scheme_data:
        # Determine week number safely
        week_num = item.get("week_number")
        if not week_num and item.get("week"):
             # Try parse "Week 1" -> 1
             try:
                 week_num = int(str(item["week"]).lower().replace("week", "").strip().split()[0])
             except:
                 continue
        
        if not week_num: continue

        # Use the shared extractor to get the "Truth" from the scheme
        details = extract_scheme_details(scheme_data, week_num)
        
        if details["found"]:
            # Calculate the specific "Week Ending" date (Friday of that week)
            date_info = calculate_week_dates(start_date, week_num)
            
            # Combine Methods and Resources for the "Methodology & Aids" column
            methods_list = details.get("methods", [])
            resources_list = details.get("resources", [])
            
            # Create a clean string for methodology
            combined_methods = []
            if methods_list: combined_methods.extend(methods_list)
            if resources_list: combined_methods.extend(resources_list)
            
            records_context.append({
                "week_num": week_num,
                "week_ending": date_info["end_iso"], # e.g. 2026-01-16
                "topic": details["topic"],
                "subtopics": details["content"], # or subtopics
                "references": details["refs"],   # STRICT references from scheme
                "methods_aids": combined_methods
            })

    # 2. PROMPT
    prompt = f"""
    Act as a professional Teacher in Zambia. Prepare a **Record of Work** table structure.
    
    CONTEXT:
    - School: {school_name}
    - Teacher: {teacher_name}
    - Subject: {subject}, Grade: {grade}, Term: {term}, Year: {year}

    INPUT DATA (From Scheme of Work):
    {json.dumps(records_context)}

    INSTRUCTIONS:
    1. **Format**: Map the input data to the standard Zambian columns:
       - **Week Ending**: Format as "Friday, 17th Oct".
       - **Topics Covered**: Summarize the Topic and key content points clearly.
       - **References**: Use the EXACT references provided in the input. Do not invent new ones.
       - **Methodology & Teaching Aids**: Combine the provided methods and resources into this single column (e.g. "Group Discussion, Charts, Textbooks").
       
       - **Teacher's Evaluation**: 
         🔴 **CRITICAL**: LEAVE THIS FIELD BLANK (Empty String). 
         The teacher will manually write this evaluation after delivering the lesson.

    2. **Logic**:
       - Ensure every week from the input is included.
       - Keep descriptions concise to fit in a table cell.

    OUTPUT JSON ONLY:
    {{
      "header": {{
        "school": "{school_name}",
        "teacher": "{teacher_name}",
        "details": "{grade} {subject} - Term {term} {year}"
      }},
      "records": [
        {{
          "week": 1,
          "week_ending": "Friday, 17th Jan",
          "topics_covered": "Topic Name: Subtopic details...",
          "references": "Syllabus Pg 12, Pupil's Book Pg 4",
          "methodology_aids": "Q&A, Group Work, Charts",
          "evaluation": ""  <-- MUST BE EMPTY
        }}
      ]
    }}
    """

    try:
        response = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(extract_json_string(response.text))

    except Exception as e:
        print(f"❌ [Records Generator] Error: {e}")
        return {"header": {}, "records": []}