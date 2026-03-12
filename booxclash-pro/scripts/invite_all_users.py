import firebase_admin
from firebase_admin import credentials, firestore
import sys
import os

# Get the folder where this script lives
script_dir = os.path.dirname(os.path.abspath(__file__))

# Go up one level to the project root (where main.py and serviceAccountKey.json are)
project_root = os.path.dirname(script_dir)

# Add root to system path so we can import 'services'
sys.path.append(project_root)

# Create the full path to the key file
key_path = os.path.join(project_root, "serviceAccountKey.json")

# Import the service (now that path is fixed)
try:
    from services.notification_service import send_whatsapp_invite
except ImportError:
    print("❌ Error: Could not import 'services'. Make sure you are running this correctly.")
    sys.exit(1)

# --- 2. INITIALIZE FIREBASE ---
if not firebase_admin._apps:
    print(f"🔑 Loading key from: {key_path}")
    if not os.path.exists(key_path):
        print("❌ Error: serviceAccountKey.json not found in the root folder!")
        sys.exit(1)
        
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# --- 3. MAIN FUNCTION ---
def invite_all_users():
    print("🔄 Fetching all users from Firestore...")
    
    users_ref = db.collection("users")
    
    # 🚨 THE FIX: Convert the stream to a list immediately!
    # This downloads all 93 users instantly so the database doesn't time out.
    docs = list(users_ref.stream())
    
    print(f"✅ Successfully downloaded {len(docs)} users. Starting email blast...")
    
    count = 0
    success_count = 0
    
    for doc in docs:
        data = doc.to_dict()
        email = data.get("email")
        name = data.get("displayName") or data.get("name") or "Teacher"
        
        if email:
            print(f"📩 [{count+1}/{len(docs)}] Sending K60 Exam Promo to {email}...")
            
            # Send the email using the imported function
            sent = send_whatsapp_invite(email, name)
            
            if sent:
                success_count += 1
            
            count += 1

    print(f"\n🎉 Finished! Sent {success_count} promos out of {count} valid emails found.")
    print("📲 Keep your phone loud. The mobile money notifications are about to start.")

if __name__ == "__main__":
    invite_all_users()