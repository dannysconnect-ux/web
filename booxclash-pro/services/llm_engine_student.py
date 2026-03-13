import os
import json
import asyncio
import urllib.parse
import httpx
import re
from typing import List, Dict, Any
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def get_model():
    return genai.GenerativeModel("gemini-2.5-flash")

# =====================================================
# 🛠️ HELPER: ROBUST JSON EXTRACTION
# =====================================================
def extract_json_string(text: str) -> str:
    """Finds the JSON object within a string."""
    try:
        clean_text = text.replace("```json", "").replace("```", "").strip()
        start_idx = clean_text.find("{")
        end_idx = clean_text.rfind("}")
        if start_idx != -1 and end_idx != -1:
            return clean_text[start_idx : end_idx + 1]
        return clean_text
    except Exception:
        return text

# =====================================================
# STUDENT TOOLS
# =====================================================

async def generate_quiz_json(topic: str, grade: str) -> Dict[str, Any]:
    model = get_model()
    prompt = f"""
    Create a 5-question multiple-choice quiz for "{topic}" (Grade {grade}).
    OUTPUT JSON ONLY:
    {{
      "questions": [
        {{ "id": 1, "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "explanation": "..." }}
      ]
    }}
    """
    try:
        response = await model.generate_content_async(prompt)
        text = extract_json_string(response.text)
        return json.loads(text)
    except Exception as e:
        print(f"❌ Quiz Generation Failed: {e}")
        return {"questions": []}

async def analyze_quiz_remediation(topic: str, mistakes: List[dict], grade: str) -> str:
    model = get_model()
    mistake_summary = "\n".join([f"- Q: {m['question']} | Answered: {m['selected']}" for m in mistakes])
    prompt = f"""
    A Grade {grade} learner made these mistakes on {topic}:
    {mistake_summary}
    Provide a short, encouraging remediation (max 3 sentences).
    """
    try:
        response = await model.generate_content_async(prompt)
        return response.text
    except Exception:
        return "Good effort! Review the topic and try again."

async def generate_builder_json(goal: str, grade: str) -> Dict[str, Any]:
    model = get_model()
    prompt = f"""
    Create a simple logic-builder simulation. Goal: {goal}, Grade: {grade}
    OUTPUT JSON ONLY:
    {{ "goal_description": "...", "available_blocks": [{{ "id": "b1", "label": "...", "type": "trigger" }}], "solution_logic": ["b1"] }}
    """
    try:
        response = await model.generate_content_async(prompt)
        text = extract_json_string(response.text)
        return json.loads(text)
    except Exception:
        return {}

async def generate_realistic_image(query: str) -> str:
    """
    Fetches a diagram from Wikimedia Commons.
    Fixed: Uses a compliant User-Agent to avoid 403 Forbidden errors.
    """
    wiki_url = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query", 
        "format": "json", 
        "list": "search",
        "srsearch": f"{query} diagram filetype:bitmap", 
        "srnamespace": "6", 
        "srlimit": "1"
    }
    
    # ✅ FIX: Wikimedia requires a specific User-Agent format:
    # "AppName/Version (ContactInfo) Library/Version"
    headers = {
        "User-Agent": "ZambianStudyCompanion/1.0 (contact@booxclash.com)" 
    }

    async with httpx.AsyncClient() as client:
        try:
            # 1. Search for the file
            resp = await client.get(wiki_url, params=params, headers=headers, timeout=5.0)
            
            if resp.status_code == 403:
                print("⚠️ Wikimedia 403 Forbidden (User-Agent issue). using Fallback.")
                raise Exception("403 Forbidden")

            data = resp.json()
            
            if data.get("query", {}).get("search"):
                title = data["query"]["search"][0]["title"]
                
                # 2. Get the actual Image URL
                img_params = {
                    "action": "query", 
                    "format": "json", 
                    "titles": title, 
                    "prop": "imageinfo", 
                    "iiprop": "url"
                }
                img_resp = await client.get(wiki_url, params=img_params, headers=headers)
                pages = img_resp.json()["query"]["pages"]
                
                for page_id in pages:
                    if "imageinfo" in pages[page_id]:
                        final_url = pages[page_id]["imageinfo"][0]["url"]
                        print(f"✅ Wikimedia Image Found: {final_url}")
                        return final_url

        except Exception as e:
            print(f"⚠️ Wikimedia Search failed: {e}")

    # Fallback: Pollinations.ai
    print("🔄 Using Fallback Image Generator...")
    safe_query = urllib.parse.quote(f"educational diagram {query} white background")
    return f"https://image.pollinations.ai/prompt/{safe_query}?width=800&height=600&model=flux&nologo=true"

async def optimize_search_term(user_query: str, subject: str) -> str:
    model = get_model()
    prompt = f"Context: {subject}. User asked: '{user_query}'. Return ONE specific, searchable noun phrase for a diagram (e.g., 'DNA Double Helix', 'Human Heart')."
    try:
        response = await model.generate_content_async(prompt)
        return response.text.strip()
    except:
        return user_query