import os
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    # 'K_SERVICE' is automatically set by Google Cloud Run. 
    # If it exists, we know we are in production.
    if os.getenv("K_SERVICE"):
        print("☁️ Running on Cloud Run: Using Application Default Credentials")
        # Initialize WITHOUT passing a certificate. 
        # Google automatically uses the Cloud Run service account!
        firebase_admin.initialize_app()
    else:
        print("💻 Running Locally: Using serviceAccountKey.json")
        # Local development ONLY
        if not os.path.exists("serviceAccountKey.json"):
            raise RuntimeError(
                "Firebase credentials not found. "
                "Please place serviceAccountKey.json in the root directory."
            )
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)

db = firestore.client()