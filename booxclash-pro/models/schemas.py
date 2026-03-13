from pydantic import BaseModel, Field, validator, ConfigDict
from typing import List, Optional, Any, Dict, Literal, Union

# ==========================================
# 🚀 SHARED CONFIG
# ==========================================
# This config allows the frontend to send extra fields (like 'school' vs 'schoolName')
# without crashing the server.
STRICT_IGNORE_EXTRA = ConfigDict(extra='ignore')

# ==========================================
# 🍎 SCHEME MODELS
# ==========================================

class SchemeRequest(BaseModel):
    # Core Fields
    subject: str
    grade: str
    term: str = "Term 1"
    weeks: int
    
    # Optional / Context Fields
    startDate: Optional[str] = None
    uid: Optional[str] = None
    schoolId: Optional[str] = None
    schoolName: Optional[str] = None # Added to catch frontend mapping
    
    # ✅ FIX 1: Robust Validators to handle Strings vs Ints
    @validator('weeks', pre=True)
    def parse_weeks(cls, v):
        if isinstance(v, str):
            return int(v) if v.strip() else 13
        return v

    @validator('startDate', pre=True)
    def parse_start_date(cls, v):
        if not v or (isinstance(v, str) and not v.strip()):
            return None
        return v

    # ✅ FIX 2: Ignore extra fields (like 'school' if passed instead of 'schoolName')
    model_config = STRICT_IGNORE_EXTRA


class SchemeRow(BaseModel):
    # 1. Identifiers
    week: Union[str, int]
    week_number: Optional[int] = None
    date_range: Optional[str] = "" 
    
    # 2. Content
    topic: Optional[str] = ""
    subtopic: Optional[str] = ""
    unit: Optional[str] = "" 
    theme: Optional[str] = ""
    topic_content: Optional[str] = "" 

    # 3. Competences & Outcomes
    outcomes: List[str] = [] 
    prescribed_competences: List[str] = []
    specific_competences: List[str] = []
    
    # 4. Activities & Methods
    content: List[str] = []
    learning_activities: List[str] = [] 
    methods: List[str] = []
    assessment: List[str] = []
    resources: List[str] = []
    references: List[str] = []

    # 5. Meta
    month: Optional[str] = None
    isSpecialRow: bool = False

    # 🛡️ VALIDATORS: Auto-fix AI mapping errors (String -> List conversion)
    @validator('methods', 'resources', 'references', 'content', 'outcomes', 'assessment', 'learning_activities', 'prescribed_competences', 'specific_competences', pre=True)
    def coerce_to_list(cls, v):
        if v is None: return []
        if isinstance(v, str):
            if "\n" in v: return [x.strip() for x in v.split("\n") if x.strip()]
            return [v.strip()]
        return v

    model_config = ConfigDict(populate_by_name=True, extra='allow')


class SchemeResponse(BaseModel):
    intro: Dict[str, Any] = {} 
    rows: List[SchemeRow]
    model_config = ConfigDict(extra='allow')


# ==========================================
# 📅 WEEKLY PLAN REQUEST
# ==========================================
class WeeklyPlanRequest(BaseModel):
    uid: Optional[str] = None
    grade: str
    subject: str
    term: str
    weekNumber: int
    
    # Flexible Fields
    school: Optional[str] = "Unknown School"
    schoolId: Optional[str] = None
    days: Optional[int] = 5
    startDate: Optional[str] = None
    
    # Content Overrides
    topic: Optional[str] = None 
    theme: Optional[str] = None
    references: Optional[str] = None # Added to match frontend

    # Validator for weekNumber (handle string input)
    @validator('weekNumber', 'days', pre=True)
    def parse_ints(cls, v):
        if isinstance(v, str): return int(v) if v.strip() else 0
        return v

    model_config = STRICT_IGNORE_EXTRA


# ==========================================
# 📝 LESSON PLAN REQUEST
# ==========================================
class LessonPlanRequest(BaseModel):
    uid: Optional[str] = None
    grade: str
    subject: str
    term: str
    weekNumber: int
    date: str
    
    # Topic Data
    topic: str
    subtopic: Optional[str] = ""
    
    # Context
    school: Optional[str] = "Unknown School"
    schoolId: Optional[str] = None
    teacherName: Optional[str] = "Teacher"
    
    # Details
    timeStart: Optional[str] = "08:00"
    timeEnd: Optional[str] = "08:40"
    
    boys: Optional[int] = 0
    girls: Optional[int] = 0
    objectives: List[str] = []

    # Used to flag if this is a remedial lesson being generated
    is_remedial: Optional[bool] = False
    parent_lesson_id: Optional[str] = None 

    @validator('weekNumber', 'boys', 'girls', pre=True)
    def parse_ints(cls, v):
        if isinstance(v, str):
            return int(v) if v.strip() else 0
        return v

    model_config = STRICT_IGNORE_EXTRA


# ==========================================
# 📋 RECORD OF WORK REQUEST
# ==========================================
class RecordOfWorkRequest(BaseModel): 
    uid: Optional[str] = None
    grade: str
    subject: str
    term: str
    weekNumber: int
    
    school: Optional[str] = "Unknown School"
    schoolId: Optional[str] = None
    teacherName: Optional[str] = "Teacher"
    
    year: Optional[str] = "2024"
    days: Optional[int] = 5
    startDate: Optional[str] = None
    topic: Optional[str] = ""
    references: Optional[str] = None

    model_config = STRICT_IGNORE_EXTRA


# ==========================================
# 🧩 WORKSHEET MODELS
# ==========================================
class WorksheetRequest(BaseModel):
    uid: Optional[str] = None
    grade: str
    subject: str
    topic: str
    subtopic: Optional[str] = ""
    term: Optional[str] = "Term 1"
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    school_name: Optional[str] = "School"
    schoolId: Optional[str] = None
    
    model_config = STRICT_IGNORE_EXTRA

class WorksheetBlock(BaseModel):
    id: int
    type: Literal["mcq", "matching", "fill_blank", "svg_diagram", "open_question"]
    instruction: str
    content: Any 
    answer_key: str 

class WorksheetResponse(BaseModel):
    title: str
    grade: str
    blocks: List[WorksheetBlock]

# ==========================================
# ⚙️ GENERIC GENERATION REQUEST
# ==========================================
class GenerationRequest(BaseModel):
    type: str = "lesson"
    uid: Optional[str] = None
    school_id: Optional[str] = None
    grade: Optional[str] = "Grade 9"
    subject: Optional[str] = "Mathematics"
    topic: Optional[str] = ""
    subtopic: Optional[str] = ""
    term: Optional[str] = "Term 1" 
    weekNumber: Optional[int] = 1
    weeks: Optional[int] = 13
    days: Optional[int] = 5
    startDate: Optional[str] = None
    model_config = STRICT_IGNORE_EXTRA


# ====================================================================================
# 🔄 LESSON LIFECYCLE & AI ASSISTANT MODELS (NEW)
# ====================================================================================

class ChalkboardDiagramRequest(BaseModel):
    """Schema for generating simple line-art diagrams for the chalkboard."""
    uid: Optional[str] = None
    prompt: str  # e.g., "Human Heart" or "Water Cycle"
    lesson_id: Optional[str] = None # To optionally link it to a specific lesson
    
    model_config = STRICT_IGNORE_EXTRA


class ClassroomTroubleshooterRequest(BaseModel):
    """Schema for the quick text-based advice tool (The Lesson Fixer)."""
    uid: Optional[str] = None
    grade: str
    subject: str
    topic: str
    struggle_description: str # e.g., "Students failed to find the common denominator"
    
    model_config = STRICT_IGNORE_EXTRA


class LessonEvaluationRequest(BaseModel):
    """Schema to submit post-lesson evaluation feedback."""
    uid: str
    lesson_id: str
    feedback: str # e.g., "Half the class didn't understand how leaves make food"
    
    model_config = STRICT_IGNORE_EXTRA


class RemedialLessonRequest(BaseModel):
    """Schema to generate a follow-up remedial lesson based on an evaluation."""
    uid: str
    original_lesson_id: str
    grade: str
    subject: str
    topic: str
    subtopic: Optional[str] = ""
    teacher_feedback: str # Feeds into the AI to specifically target the learnin
    duration: Optional[str] = "20 minutes" # Remedials are usually shorter
    
    model_config = STRICT_IGNORE_EXTRA


# ==========================================
# 📝 EXAM ASSISTANT REQUEST (NEW)
# ==========================================
class ExamBlueprint(BaseModel):
    mcq: int = 10
    true_false: int = 0
    matching: int = 0
    short_answer: int = 5
    computational: int = 0
    essay: int = 2
    case_study: int = 0
    model_config = STRICT_IGNORE_EXTRA

class ExamRequest(BaseModel):
    uid: Optional[str] = None
    grade: str
    subject: str
    term: Optional[str] = "Term 1"
    
    # Core Exam Fields
    topics: List[str] = ["General Review"]
    blueprint: ExamBlueprint
    
    # Flexible Context Fields (Catches both 'school' and 'school_name')
    school: Optional[str] = "Unknown School"
    school_name: Optional[str] = None
    schoolId: Optional[str] = None
    schoolLogo: Optional[str] = None
    
    model_config = STRICT_IGNORE_EXTRA