import os
import time
import smtplib
import logging
import pandas as pd
from email.message import EmailMessage
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv
import math

# ==========================================
# 0. SETUP & CREDENTIALS
# ==========================================
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
YOUR_EMAIL = os.getenv("YOUR_EMAIL")
YOUR_APP_PASSWORD = os.getenv("YOUR_APP_PASSWORD")

logger = logging.getLogger("internal_api")
router = APIRouter()

if not GEMINI_API_KEY:
    logger.warning("⚠️ GEMINI_API_KEY is missing from .env!")

# Initialize the Gemini Client securely
client = genai.Client(api_key=GEMINI_API_KEY)

# --- DYNAMIC FOLDER PATHS ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
CSV_FILE = os.path.join(BASE_DIR, "schools.csv")


# 👇 GLOBAL STATUS TRACKER (For React Frontend)
CURRENT_AGENT_STATUS = "Idle"


# =====================================================================
# PART 1: THE AI ARCHITECT (Reads your codebase)
# =====================================================================

def list_project_structure(directory: str = None) -> str:
    """Lists files and directories for the ENTIRE project (frontend + backend)."""
    global CURRENT_AGENT_STATUS
    CURRENT_AGENT_STATUS = "Scanning project directories..."
    start_time = time.time() # ⏱️ Start timer
    
    if directory is None or directory == ".":
        directory = PROJECT_ROOT
        
    ignore_dirs = {'node_modules', '.git', 'venv', '__pycache__', 'build', 'dist', '.next'}
    tree = []
    
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        level = root.replace(directory, '').count(os.sep)
        indent = ' ' * 4 * level
        tree.append(f"{indent}{os.path.basename(root)}/")
        
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            tree.append(f"{subindent}{f}")
            
    elapsed = time.time() - start_time # ⏱️ End timer
    logger.info(f"⏱️ [TASK] Scanned project structure in {elapsed:.4f} seconds.")
    return "\n".join(tree)


def read_local_file(filepath: str) -> str:
    """Reads a code file from anywhere in the frontend or backend."""
    global CURRENT_AGENT_STATUS
    # Update status so the frontend shows the exact file being read!
    file_name = os.path.basename(filepath)
    CURRENT_AGENT_STATUS = f"Analyzing {file_name}..."
    
    start_time = time.time() # ⏱️ Start timer
    
    if not os.path.isabs(filepath):
        full_path = os.path.join(PROJECT_ROOT, filepath)
    else:
        full_path = filepath
        
    try:
        with open(full_path, 'r', encoding='utf-8') as file:
            content = file.read()
            elapsed = time.time() - start_time # ⏱️ End timer
            logger.info(f"⏱️ [TASK] Read {file_name} in {elapsed:.4f} seconds.")
            return content
    except Exception as e:
        logger.error(f"Failed to read {full_path}: {e}")
        return f"Error reading file {full_path}: {str(e)}"


# 👇 NEW ENDPOINT: Frontend polls  every 500ms to get the live status
@router.get("/api/internal-agent/status")
async def get_agent_status():
    return {"status": CURRENT_AGENT_STATUS}


class ChatRequest(BaseModel):
    message: str

@router.post("/api/internal-agent/chat")
async def chat_with_architect(request: ChatRequest):
    """API Endpoint for the Architect Tab in the React Dashboard."""
    global CURRENT_AGENT_STATUS
    CURRENT_AGENT_STATUS = "Thinking..."
    start_time = time.time() # ⏱️ Start timer for total request
    
    try:
        SYSTEM_INSTRUCTION = """
        You are the Lead Architect for 'Booxclash', a B2B School Operating System. 
        Your job is to help the lead developer map the system architecture and write code.
        Always use your tools (`list_project_structure` and `read_local_file`) to verify the CURRENT state of the codebase before giving advice.
        """
        
        chat = client.chats.create(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                tools=[list_project_structure, read_local_file],
                temperature=0.2 
            )
        )
        response = chat.send_message(request.message)
        
        elapsed = time.time() - start_time # ⏱️ End timer
        logger.info(f"🚀 [ARCHITECT] Total response generated in {elapsed:.2f} seconds.")
        
        CURRENT_AGENT_STATUS = "Idle" # Reset status
        
        return {
            "reply": response.text,
            "time_taken": round(elapsed, 2) # Sending time back to frontend
        }
        
    except Exception as e:
        CURRENT_AGENT_STATUS = "Error"
        logger.error(f"Architect Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================================
# PART 2: THE SALES AGENT & CSV LOADER
# =====================================================================

@router.get("/api/sales/schools")
async def get_schools_list():
    """Reads schools.csv and returns it to the frontend Command Center."""
    logger.info(f"Looking for CSV at: {CSV_FILE}") 
    
    if not os.path.exists(CSV_FILE):
        logger.error("❌ schools.csv NOT FOUND!")
        return {"schools": []}
    
    try:
        try:
            df = pd.read_csv(CSV_FILE, encoding='utf-8')
        except UnicodeDecodeError:
            logger.warning("UTF-8 decode failed, falling back to latin1 encoding.")
            df = pd.read_csv(CSV_FILE, encoding='latin1')
            
        schools_data = []
        
        for index, row in df.iterrows():
            title = row.get('title')
            if pd.isna(title):
                continue
                
            phone = row.get('phone', '') if 'phone' in df.columns and pd.notna(row.get('phone')) else ""
            email = row.get('email', '') if 'email' in df.columns and pd.notna(row.get('email')) else ""
            
            schools_data.append({
                "title": str(title),
                "email": str(email),
                "phone": str(phone)
            })
            
        logger.info(f"✅ Successfully loaded {len(schools_data)} schools from CSV.")
        return {"schools": schools_data}
        
    except Exception as e:
        logger.error(f"Error reading CSV: {e}")
        return {"schools": []}

class PitchRequest(BaseModel):
    school_name: str

@router.post("/api/sales/generate")
async def generate_pitch_api(request: PitchRequest):
    """API Endpoint for the Sales Tab in the React Dashboard."""
    school_name = request.school_name
    logger.info(f"Generating pitch for: {school_name}")
    start_time = time.time() # ⏱️ Start timer
    
    prompt = f"""
    You are the Head of Sales for 'Booxclash', an Operating System for Zambian schools.
    Our software completely automates: Schemes of Work, Weekly Forecasts, Lesson Plans, School Based Assessments (SBA), and Record of Work data.
    
    Write a short, punchy cold email to the Headteacher of {school_name}. 
    Tone: Professional, empathetic to teacher burnout, and focused on saving time and staying compliant with the Zambian syllabus. Keep it under 4 sentences.
    
    Also, provide a 2-sentence WhatsApp pitch and a short Facebook post.
    
    Format EXACTLY like this:
    SUBJECT: [Email Subject]
    EMAIL: [Email Body]
    WHATSAPP: [WhatsApp Copy]
    FACEBOOK: [Facebook Copy]
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        copy = response.text
        
        lines = copy.split('\n')
        subject = [l for l in lines if l.startswith('SUBJECT:')][0].replace('SUBJECT:', '').strip()
        email_body = copy.split('EMAIL:')[1].split('WHATSAPP:')[0].strip()
        whatsapp_copy = copy.split('WHATSAPP:')[1].split('FACEBOOK:')[0].strip()
        facebook_copy = copy.split('FACEBOOK:')[1].strip()
        
        elapsed = time.time() - start_time # ⏱️ End timer
        logger.info(f"🚀 [SALES] Pitch generated in {elapsed:.2f} seconds.")
        
        return {
            "email": f"Subject: {subject}\n\n{email_body}",
            "whatsapp": whatsapp_copy,
            "facebook": facebook_copy,
            "time_taken": round(elapsed, 2)
        }
    except Exception as e:
        logger.error(f"Sales Agent Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate pitch.")

# =====================================================================
# PART 3: BULK EMAIL SENDER (Run via Terminal)
# =====================================================================

def send_email(to_email, subject, body):
    """Sends an email using Gmail SMTP."""
    msg = EmailMessage()
    msg.set_content(body)
    msg['Subject'] = subject
    msg['From'] = YOUR_EMAIL
    msg['To'] = to_email

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(YOUR_EMAIL, YOUR_APP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Failed to send to {to_email}: {e}")
        return False

def run_sales_campaign():
    """Terminal loop to read schools.csv and send bulk emails."""
    if not os.path.exists(CSV_FILE):
        print(f"⚠️ Could not find {CSV_FILE}.")
        return

    try:
        df = pd.read_csv(CSV_FILE, encoding='utf-8')
    except UnicodeDecodeError:
        df = pd.read_csv(CSV_FILE, encoding='latin1')
        
    print(f"🚀 Starting Booxclash Campaign for {len(df)} schools...")
    
    for index, row in df.head(50).iterrows():
        school_name = row.get('title', 'Your School')
        email_address = row.get('email', None)
        
        print(f"\n--- Processing: {school_name} ---")
        
        mock_request = PitchRequest(school_name=school_name)
        
        import asyncio
        try:
            result = asyncio.run(generate_pitch_api(mock_request))
            
            if pd.notna(email_address) and str(email_address).strip() != "":
                subject = result["email"].split('\n\n')[0].replace('Subject: ', '')
                body = result["email"].split('\n\n', 1)[1]
                
                if send_email(email_address, subject, body):
                    print(f"✅ Email sent to {email_address}")
            else:
                print("⚠️ No email found. Save this WhatsApp copy:")
                print(result["whatsapp"])
                
        except Exception as e:
            print("⚠️ Error generating pitch. Skipping...")
            
        time.sleep(10)

if __name__ == "__main__":
    run_sales_campaign()