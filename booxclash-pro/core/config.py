import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "BooxClash Pro"
    # Get this free key from aistudio.google.com
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY") 
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY")
    # ElevenLabs is still best for the "Voice", but logic is now free.
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY")
    ELEVENLABS_AGENT_ID: str = os.getenv("ELEVENLABS_AGENT_ID")

settings = Settings()