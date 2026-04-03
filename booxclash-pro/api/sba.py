import json
import os
import io # 👈 Added for handling the PDF file in memory
from pathlib import Path
from typing import List, Optional
import re
import pdfplumber # 👈 Added for reading PDFs
from fastapi import APIRouter, HTTPException, UploadFile, File # 👈 Added UploadFile and File
from pydantic import BaseModel
import google.generativeai as genai

# ==========================================
# ROUTER (NO PREFIX HERE — defined in main.py)
# ==========================================

router = APIRouter(tags=["School Based Assessments"])

# ==========================================
# CONFIGURATION
# ==========================================

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

BASE_DIR = Path(__file__).resolve().parent.parent
SBA_DATA_DIR = BASE_DIR / "sba"

# ==========================================
# OPTIONAL SYLLABUS LOADER
# ==========================================

try:
    from services.syllabus_manager import load_syllabus
except ImportError:
    def load_syllabus(country, grade, subject):
        return None

# ==========================================
# MODELS
# ==========================================

class GenerateSBARequest(BaseModel):
    country: str = "Zambia"
    grade: str
    subject: str
    task_title: str
    task_type: str
    max_score: int
    specific_topic: Optional[str] = None


class RubricItem(BaseModel):
    criteria: str
    marks: int


class GenerateSBAResponse(BaseModel):
    title: str
    teacher_instructions: str
    learner_instructions: str
    maxScore: int
    rubric: List[RubricItem]


# ==========================================
# 1️⃣ FETCH SBA CONFIG (Primary / Secondary)
# ==========================================

@router.get("/config/{level}")
async def get_sba_config(level: str):
    """
    Returns SBA configuration from:
    /backend/sba/sba_primary.json
    /backend/sba/sba_secondary.json
    """

    level = level.lower()

    if level not in ["primary", "secondary"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid level. Use 'primary' or 'secondary'."
        )

    file_path = SBA_DATA_DIR / f"sba_{level}.json"

    if not file_path.exists():
        print(f"❌ SBA FILE NOT FOUND: {file_path}")
        raise HTTPException(
            status_code=404,
            detail=f"{level.capitalize()} SBA configuration file not found."
        )

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail=f"{level} JSON file is corrupted."
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 2️⃣ 🆕 DYNAMIC SYLLABUS CONTENT MATCHER
# ==========================================
@router.get("/syllabus/{subject}")
async def get_subject_syllabus(subject: str):
    """
    DYNAMIC MATCHING (Bulletproof Hybrid Version):
    - Handles syllabi WITH outcome numbers (Integrated Science)
    - Handles syllabi WITHOUT outcome numbers (English, Social Studies, CTS)
    - Supports both 'Syllabus_Outcomes' and 'Syllabus_Topics' (Mathematics) formats.
    """
    clean_subject = subject.lower().replace(" ", "_").replace("&", "and")
    response_data = {
        "curriculum": f"Zambia ECZ {subject} Syllabus", 
        "grades": []
    }

    # 1. Load both primary and secondary config files
    sba_configs = {}
    for level in ["primary", "secondary"]:
        path = SBA_DATA_DIR / f"sba_{level}.json"
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    sba_configs[level] = json.load(f)
            except Exception as e:
                print(f"⚠️ Error reading sba_{level}.json: {e}")

    # 2. Iterate through grades 1 to 12
    for grade_num in range(1, 13):
        level = "primary" if grade_num <= 7 else "secondary"
        config = sba_configs.get(level, {})
        
        if level == "primary":
            subjects_dict = config.get("Primary_SBA_Comprehensive_Guidelines", {}).get("Subjects", {})
        else:
            subjects_dict = config.get("Secondary_SBA_Comprehensive_Guidelines", {}).get("Subjects", {}) or config.get("Subjects", {})

        # Flexible Subject Name Matching (e.g., "CTS" matches "Creative_and_Technology_Studies_CTS")
        target_subject_key = None
        for k in subjects_dict.keys():
            k_lower = k.lower()
            if clean_subject in k_lower or k_lower in clean_subject or clean_subject == k_lower.replace("_cts", ""):
                target_subject_key = k
                break
                
        grade_key = f"Grade_{grade_num}"
        required_topics = set()
        required_codes = set()

        # 3. Extract BOTH Topic Names and Specific Codes
        if target_subject_key and grade_key in subjects_dict[target_subject_key]:
            grade_data = subjects_dict[target_subject_key][grade_key]
            
            # A. Support for "Syllabus_Outcomes" (English, Science, Social Studies, CTS)
            outcomes_dict = grade_data.get("Syllabus_Outcomes", {})
            for topic_key, value in outcomes_dict.items():
                required_topics.add(topic_key.replace("_", " ").lower())
                
            # B. Support for "Syllabus_Topics" (Mathematics)
            for t in grade_data.get("Syllabus_Topics", []):
                required_topics.add(t.get("topic", "").lower())
                for code in t.get("outcomes", []):
                    required_codes.add(str(code).strip())

            # C. Recursively extract all outcome codes (e.g., "5.1.1.1")
            def extract_codes(obj):
                if isinstance(obj, dict):
                    for v in obj.values(): extract_codes(v)
                elif isinstance(obj, list):
                    for item in obj: extract_codes(item)
                elif isinstance(obj, str):
                    if re.match(r'^\d+\.\d+', obj.strip()):
                        required_codes.add(obj.strip())
            extract_codes(outcomes_dict)

        # 4. Fetch the actual syllabus JSON
        full_syllabus_data = load_syllabus("Zambia", f"Grade {grade_num}", subject)
        if not full_syllabus_data:
            continue

        full_syllabus = full_syllabus_data.get("topics", []) if isinstance(full_syllabus_data, dict) else full_syllabus_data

        # 5. Hybrid Filtering
        grouped_topics = {}

        for item in full_syllabus:
            raw_unit = item.get("unit", "")
            raw_topic = item.get("topic_title", item.get("topic", ""))
            
            # Check if this topic is required based on its name
            search_text = (raw_unit + " " + raw_topic).lower()
            topic_is_required = False
            
            if not required_topics:
                topic_is_required = True # Fallback if no rules exist
            else:
                for req_topic in required_topics:
                    if req_topic in search_text or search_text in req_topic:
                        topic_is_required = True
                        break

            outcomes = item.get("learning_outcomes", [])
            matched_outcomes = []

            for outcome in outcomes:
                match = re.match(r'^(\d+\.\d+(\.\d+)*[a-z]?)\b', outcome.strip())
                if match:
                    # SCENARIO A: Sentence HAS A NUMBER (e.g., Integrated Science)
                    code = match.group(1)
                    is_code_required = False
                    if not required_codes:
                        is_code_required = True
                    else:
                        # Allow partial matches (e.g. SBA requires "5.1.2", Syllabus has "5.1.2.1")
                        for req_code in required_codes:
                            if code.startswith(req_code) or req_code.startswith(code):
                                is_code_required = True
                                break
                    
                    if is_code_required:
                        matched_outcomes.append(outcome)
                else:
                    # SCENARIO B: Sentence HAS NO NUMBER (e.g., English, Social Studies, CTS)
                    # If the topic name matched, we safely include all outcomes in this section
                    if topic_is_required:
                        matched_outcomes.append(outcome)

            # Fallback: If 'learning_outcomes' is completely empty but 'subtopics' exist
            if not outcomes and topic_is_required:
                matched_outcomes.extend(item.get("subtopics", []))

            # 6. Grouping and formatting
            if matched_outcomes:
                display_name = raw_topic if raw_topic else raw_unit
                display_name = display_name.split(":")[-1].strip() if ":" in display_name else display_name

                if display_name not in grouped_topics:
                    grouped_topics[display_name] = {
                        "topic": display_name,
                        "subtopics": [],
                        "practical_and_experimental_content": []
                    }
                # Use a set to prevent duplicates, then convert back to list
                for m in matched_outcomes:
                    if m not in grouped_topics[display_name]["subtopics"]:
                        grouped_topics[display_name]["subtopics"].append(m)

        # 7. Append to final payload
        filtered_topics = list(grouped_topics.values())
        if filtered_topics:
            response_data["grades"].append({
                "grade": grade_num,
                "topics": filtered_topics
            })

    return response_data

@router.get("/subjects/{grade}")
async def get_available_secondary_subjects(grade: str):
    """
    Scans the /sba folder, reads the syllabus JSON files, 
    and checks if the requested grade exists inside them.
    """
    print(f"\n🔍 [SBA Subjects] Request received for grade string: '{grade}'")
    
    # Extract the numeric grade (e.g., "Grade 10" -> "10")
    match = re.search(r'\d+', grade)
    if not match:
        print(f"⚠️ [SBA Subjects] No numeric grade found in '{grade}'. Returning empty list.")
        return {"subjects": []}
        
    target_grade_str = match.group() # Keep as string for safe comparison
    print(f"🎯 [SBA Subjects] Extracted target grade number: {target_grade_str}")
    
    subjects = []
    
    if SBA_DATA_DIR.exists():
        print(f"📂 [SBA Subjects] Scanning directory: {SBA_DATA_DIR}")
        for file in SBA_DATA_DIR.glob("*.json"):
            # Ignore the main primary/secondary config files
            if file.stem in ["sba_primary", "sba_secondary"]:
                continue
                
            print(f"📄 [SBA Subjects] Checking file: {file.name}...")
            try:
                with open(file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                    # Ensure data is a dictionary and has the 'grades' key
                    if isinstance(data, dict) and "grades" in data:
                        found_in_file = False
                        for g in data["grades"]:
                            # Force both to string to prevent 10 != "10" bugs
                            if str(g.get("grade")) == target_grade_str:
                                # Found it! Format name: "computer_studies" -> "Computer Studies"
                                formatted_name = file.stem.replace("-", " ").replace("_", " ").title()
                                subjects.append(formatted_name)
                                print(f"   ✅ MATCH FOUND! Added subject: '{formatted_name}'")
                                found_in_file = True
                                break # Move to the next file once found
                                
                        if not found_in_file:
                            print(f"   ❌ Grade {target_grade_str} not found in {file.name}")
                    else:
                        print(f"   ⚠️ Skipping {file.name}: Invalid format or missing 'grades' array.")
                            
            except Exception as e:
                print(f"   💥 Error reading syllabus file {file.name}: {e}")
    else:
        print(f"❌ [SBA Subjects] Data directory does not exist: {SBA_DATA_DIR}")
                
    sorted_subjects = sorted(subjects)
    print(f"🚀 [SBA Subjects] Returning final list for Grade {target_grade_str}: {sorted_subjects}\n")
    return {"subjects": sorted_subjects}
# ==========================================
# 3️⃣ GENERATE SBA TASK USING GEMINI 
# ==========================================

@router.post("/generate", response_model=GenerateSBAResponse)
async def generate_sba_task(request: GenerateSBARequest):
    try:
        syllabus_data = load_syllabus(
            request.country,
            request.grade,
            request.subject
        )

        syllabus_context = (
            json.dumps(syllabus_data)[:10000]
            if syllabus_data
            else "Use ECZ curriculum standards."
        )

        model = genai.GenerativeModel("gemini-2.5-flash")

        prompt = f"""
You are an expert Zambian Examinations Council (ECZ) Examiner.

Generate a School-Based Assessment (SBA) task.

Grade: {request.grade}
Subject: {request.subject}
Task Title: {request.task_title}
Task Type: {request.task_type}
Maximum Marks: {request.max_score}

Syllabus Context:
{syllabus_context}

Respond ONLY with a valid JSON object in this format:

{{
  "title": "Task Title",
  "teacher_instructions": "...",
  "learner_instructions": "...",
  "maxScore": {request.max_score},
  "rubric": [
    {{
      "criteria": "Description",
      "marks": {request.max_score}
    }}
  ]
}}
"""

        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json"
            )
        )

        try:
            parsed = json.loads(response.text)
            return parsed
        except Exception:
            raise HTTPException(
                status_code=500,
                detail="Gemini returned invalid JSON."
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 4️⃣ EXTRACT ROSTER FROM PDF (USING GEMINI)
# ==========================================

@router.post("/extract-roster")
async def extract_roster(file: UploadFile = File(...)):
    """
    Accepts a PDF upload, extracts the text using pdfplumber, 
    and uses Gemini to intelligently parse out only the student names.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a PDF.")

    try:
        # 1. Read PDF into memory
        file_bytes = await file.read()
        raw_text = ""

        # 2. Extract text from PDF pages
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    raw_text += extracted + "\n"

        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract any text from the PDF. It might be an image-based scanned document.")

        # 3. Use Gemini to perfectly parse the names from the messy text
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = f"""
        Extract a list of student names from the following raw PDF text. 
        This text is from a school class roster. 
        Ignore teacher names, school headers, dates, column headers, and page numbers.
        Return ONLY a valid JSON array of strings containing just the full names of the students.
        Format example: ["John Banda", "Mary Phiri", "David Musonda"]
        
        Raw Text:
        {raw_text[:15000]} 
        """

        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json"
            )
        )

        # 4. Parse Gemini's JSON response
        names_list = json.loads(response.text)

        # 5. Format to match frontend expectations
        students = [
            {
                "id": f"stu_{i}_{name.replace(' ', '').lower()}", 
                "name": name
            }
            for i, name in enumerate(names_list)
        ]

        return {
            "students": students, 
            "count": len(students)
        }

    except Exception as e:
        print(f"Error extracting roster: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process roster: {str(e)}")