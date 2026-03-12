import json
import os
import io # 👈 Added for handling the PDF file in memory
from pathlib import Path
from typing import List, Optional

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

# Base directory → /backend
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
# 2️⃣ 🆕 FETCH DETAILED SYLLABUS CONTENT
# ==========================================

@router.get("/syllabus/{subject}")
async def get_subject_syllabus(subject: str):
    """
    Fetches the detailed syllabus (topics, subtopics, practicals) for a given subject.
    Expects files like /backend/sba/physics.json, /backend/sba/biology.json, etc.
    """
    # Normalize subject name (e.g., "Computer Studies" -> "computer_studies")
    clean_subject = subject.lower().replace(" ", "_")
    file_path = SBA_DATA_DIR / f"{clean_subject}.json"

    if not file_path.exists():
        # Return a safe, empty structure so the frontend doesn't crash 
        # if a specific subject hasn't been uploaded yet.
        return {
            "curriculum": f"Zambia ECZ {subject} Syllabus", 
            "grades": []
        }

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail=f"The syllabus JSON file for {subject} is corrupted."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import re

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