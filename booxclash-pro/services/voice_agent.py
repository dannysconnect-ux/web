# app/services/voice_agent.py

import requests
import json
from core.config import settings

class ElevenLabsService:
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.agent_id = settings.ELEVENLABS_AGENT_ID 
        self.base_url = "https://api.elevenlabs.io/v1/convai"

    def get_signed_url(self, student_name: str, grade: int, subject: str, country: str = "Zambia") -> str:
        """
        Fetches a Signed URL to authorize the frontend to connect to the Agent.
        
        NOTE: The Prompt Injection logic (changing name/grade dynamically) happens 
        either via updating the Agent configuration OR sending context in the 
        Frontend WebSocket handshake. This function focuses on secure AUTH.
        """
        headers = {
            "xi-api-key": self.api_key
        }

        # API Endpoint to get the signed URL
        url = f"{self.base_url}/conversation/get_signed_url?agent_id={self.agent_id}"
        
        try:
            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                print(f"❌ ElevenLabs Auth Error: {response.text}")
                return None
                
            data = response.json()
            return data["signed_url"]

        except Exception as e:
            print(f"❌ Voice Service Exception: {e}")
            return None

# ==========================================
# INSTANCE CREATION (Critical for import)
# ==========================================
voice_service = ElevenLabsService()