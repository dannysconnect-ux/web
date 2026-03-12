from services.new.teacher_shared import get_model, calculate_week_dates, extract_json_string
from services.new.teacher_schemes import generate_scheme_with_ai, extract_scheme_details
from services.new.teacher_weekly import generate_weekly_plan_from_scheme
from services.new.teacher_lessons import generate_specific_lesson_plan, generate_lesson_notes,generate_chalkboard_diagram,evaluate_lesson_feedback
from services.new.teacher_records import generate_record_of_work
# Future placeholders for Record of Work and Worksheets
# from teacher_records import generate_record_of_work
# from teacher_worksheets import generate_worksheet

__all__ = [
    "get_model",
    "calculate_week_dates",
    "extract_json_string",
    "generate_scheme_with_ai",
    "extract_scheme_details",
    "generate_weekly_plan_from_scheme",
    "generate_specific_lesson_plan",
    "generate_lesson_notes",
    "generate_record_of_work",
    "generate_chalkboard_diagram",
    "evaluate_lesson_feedback"
]