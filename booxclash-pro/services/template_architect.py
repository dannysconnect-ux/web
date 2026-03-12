import google.generativeai as genai
import requests
from PIL import Image
import io

# Helper to get image from URL
def load_image_from_url(url):
    response = requests.get(url)
    return Image.open(io.BytesIO(response.content))

async def generate_html_template_from_pdf(pdf_url: str, doc_type: str):
    
    model = genai.GenerativeModel("gemini-1.5-pro") 
    image = load_image_from_url(pdf_url)

    # --- PROMPT STRATEGY: DYNAMIC INSTRUCTIONS ---
    
    base_instructions = """
    You are an expert Frontend Engineer. 
    Convert this document image into a SINGLE HTML file with embedded CSS.
    
    DESIGN RULES:
    1. Replicate the visual layout (tables, borders, headers) EXACTLY.
    2. Use {{ school_name }}, <img src="{{ logo_url }}">, {{ motto }} for branding.
    3. Return ONLY raw HTML.
    """

    # Specific logic for each document type
    if doc_type == "lesson_plan":
        specific_instructions = """
        DATA PLACEHOLDERS:
        - {{ teacher_name }}, {{ subject }}, {{ grade }}, {{ topic }}, {{ date }}
        
        DYNAMIC CONTENT (Use Jinja2 Loops):
        - For Objectives: {% for item in objectives %} <li>{{ item }}</li> {% endfor %}
        - For Activity Table: 
          {% for step in activities %}
          <tr>
            <td>{{ step.time }}</td>
            <td>{{ step.step }}</td>
            <td>{{ step.teacher_activity }}</td>
            <td>{{ step.learner_activity }}</td>
          </tr>
          {% endfor %}
        """

    elif doc_type == "scheme_of_work":
        specific_instructions = """
        CONTEXT: This is a termly Scheme of Work (10-13 weeks).
        
        DATA PLACEHOLDERS:
        - {{ teacher_name }}, {{ subject }}, {{ grade }}, {{ term }}, {{ year }}
        
        DYNAMIC CONTENT (The Main Table):
        It must be a table with headers like Week, Topic, Outcomes, Methods, Resources.
        Use this loop exactly:
        
        <tbody>
          {% for week in weeks %}
          <tr>
            <td>{{ week.week_number }}</td>
            <td>{{ week.topic }}</td>
            <td>{{ week.outcomes }}</td>
            <td>{{ week.methods }}</td>
            <td>{{ week.resources }}</td>
            <td>{{ week.references }}</td>
          </tr>
          {% endfor %}
        </tbody>
        """

    elif doc_type == "weekly_forecast":
        specific_instructions = """
        CONTEXT: This is a Weekly Forecast / Record of Work.
        
        DATA PLACEHOLDERS:
        - {{ week_ending }}, {{ subject }}, {{ grade }}
        
        DYNAMIC CONTENT:
        This is usually a table showing Mon-Fri.
        Use this loop:
        
        {% for day in days %}
        <tr>
            <td>{{ day.name }}</td> (e.g., Monday)
            <td>{{ day.topic }}</td>
            <td>{{ day.work_covered }}</td>
            <td>{{ day.homework }}</td>
        </tr>
        {% endfor %}
        """

    # Combine prompts
    full_prompt = base_instructions + "\n" + specific_instructions

    # Generate
    response = await model.generate_content_async([full_prompt, image])
    
    # Clean up markdown if AI adds it
    clean_html = response.text.replace("```html", "").replace("```", "")
    return clean_html