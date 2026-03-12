import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

# CONFIGURATION
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
# Ideally load these from environment variables for security
SENDER_EMAIL = os.getenv("EMAIL_USER", "booxclash@gmail.com")
SENDER_PASSWORD = os.getenv("EMAIL_PASS", "ygbh vgzy dvfw nies") 

# IMPORTANT: Put your actual WhatsApp number here (include the country code, no + or spaces)
# Example for Zambia: "https://wa.me/260971234567"
WHATSAPP_LINK = "https://wa.me/260967001972" 

def send_whatsapp_invite(user_email: str, user_name: str = None):
    """
    Sends a targeted 72-hour flash promo email to free users,
    pitching the new Exam/Revision feature and offering a K60 Termly upgrade.
    """
    if not user_email or "@" not in user_email:
        print(f"⚠️ Invalid email: {user_email}")
        return False

    # --- 1. SMART NAME LOGIC ---
    # If no name provided, default to 'Teacher'
    # If "John Doe" provided, split it to just "John"
    greeting_name = "Teacher"
    if user_name:
        greeting_name = user_name.split(" ")[0].capitalize()

    try:
        msg = MIMEMultipart()
        # Make it look like it's coming directly from you, not a generic "Team"
        msg['From'] = f"Kondwani from BooxClash <{SENDER_EMAIL}>"
        msg['To'] = user_email
        msg['Subject'] = "🚨 Generate your Term 1 Exams in 30 Seconds (72-Hour Promo)"

        # --- 2. THE FOUNDER MESSAGE (UPDATED FOR EXAM PROMO) ---
        body = f"""Hi {greeting_name},

Week 10 Assessments are almost here. Stop typing your exams manually.

Booxclash can now automatically generate your End-of-Term Exams, Revision Catch-up plans, and Marking Keys—perfectly aligned to the Zambian syllabus in seconds.

🎁 72-HOUR FLASH PROMO:
To help you prepare, we are cutting the Termly Plan from K120 down to K60. Pay just K60 today, and you get full access to generate all your Week 10 assessments and revision materials instantly.

You have exactly 3 days to claim this K60 promo before it goes back to normal pricing. 

To pay via Mobile Money and get your account activated instantly, click here to message me directly on WhatsApp: 
{WHATSAPP_LINK}

Let's get your exams done today.

Best,
Kondwani
Founder, Booxclash
"""
        
        msg.attach(MIMEText(body, 'plain')) 

        # Connect to Server
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Exam Promo sent to: {user_email} (Hi {greeting_name})")
        return True

    except Exception as e:
        print(f"❌ Failed to email {user_email}: {e}")
        return False