import os
from google.adk.agents import Agent
from dotenv import load_dotenv

# Load the environment variables from the .env file
load_dotenv()
# 1. Define your tool as a standard Python function
def submit_grade(action: str, message: str, next_level: str = None, final_grade: str = None) -> dict:
    """Submit the final grade based on the flowchart logic.
    
    Args:
        action: "pass" or "fail"
        message: Feedback message for the student
        next_level: The exact step name to go to next (e.g., 'Level 4 Assessment'), if applicable.
        final_grade: The final outcome level (e.g., '4-digit', 'Beginner'), if the assessment ends here.
    """
    # The ADK automatically runs this function and returns the result to Gemini
    return {
        "status": "success",
        "action": action, 
        "message": message, 
        "next_level": next_level, 
        "final_grade": final_grade
    }

# 2. Define the core system instruction
system_instruction = """
You are the VVOB AI Examiner for Zambian primary students.

RULES:
1. Evaluate pronunciation and PLACE VALUE based on the audio received. Example: 203 should be spoken as "two hundred three".
2. Apply the strict pass/fail rubric (at least 4 correct = pass).
3. CRITICAL: Follow the "flow_chart" logic EXACTLY to determine the next step or final outcome.
4. CRITICAL: DO NOT generate spoken audio responses. DO NOT chat. 
5. Your ONLY allowed action when the turn ends is to execute the submit_grade tool.
6. When submitting the grade, provide the `next_level` if the flowchart continues, OR the `final_grade` if the flowchart reaches an "end_assessment_path".
"""

# 3. Instantiate the ADK Agent (Using standard Flash to prevent audio modality crashes)
vvob_agent = Agent(
    name="vvob_examiner",
    model=os.getenv("GEMINI_API_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025"),
    tools=[submit_grade],
    instruction=system_instruction,
)