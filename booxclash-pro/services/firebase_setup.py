import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    # 1. Check for the Environment Variable first (Production)
    firebase_json_string = os.getenv("FIREBASE_SERVICE_ACCOUNT")

    if firebase_json_string:
        print("☁️ Production: Loading Firebase from Environment Variable")
        # Parse the string back into a dictionary
        cred_dict = json.loads(firebase_json_string)
        cred = credentials.Certificate(cred_dict)
    
    # 2. If no Environment Variable, look for the local file (Local Dev)
    else:
        print("💻 Local Dev: Loading Firebase from serviceAccountKey.json")
        if not os.path.exists("serviceAccountKey.json"):
            raise RuntimeError(
                "Firebase credentials not found. "
                "Ensure serviceAccountKey.json is in the root directory OR set FIREBASE_SERVICE_ACCOUNT."
            )
        cred = credentials.Certificate("serviceAccountKey.json")

    # Initialize the app with the loaded credentials
    firebase_admin.initialize_app(cred)

db = firestore.client()