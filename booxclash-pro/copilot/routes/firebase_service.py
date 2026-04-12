import os
import json
import firebase_admin
from firebase_admin import credentials, storage

def init_firebase():
    if not firebase_admin._apps:
        # 1. Handle the cross-account credentials securely
        firebase_json_string = os.getenv("FIREBASE_SERVICE_ACCOUNT")
        
        if firebase_json_string:
            print("☁️ Production: Loading Firebase from Environment Variable")
            cred_dict = json.loads(firebase_json_string)
            cred = credentials.Certificate(cred_dict)
        else:
            print("💻 Local Dev: Loading Firebase from serviceAccountKey.json")
            if not os.path.exists("serviceAccountKey.json"):
                raise RuntimeError("Firebase credentials not found.")
            cred = credentials.Certificate("serviceAccountKey.json")

        # 2. You MUST set FIREBASE_STORAGE_BUCKET in your .env or Cloud Run!
        # e.g., your-project-id.appspot.com
        bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
        
        firebase_admin.initialize_app(cred, {
            'storageBucket': bucket_name
        })
        print(f"✅ Firebase Storage initialized on bucket: {bucket_name}")