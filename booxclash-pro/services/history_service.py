import os
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.history import HistoryCreate
from datetime import datetime

# --- Database Setup ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI)
db = client.zambia_syllabus_db
history_collection = db.user_history

# Ensure we have an index on user_name for fast lookups
# (You might want to run this once on startup)
# await history_collection.create_index("user_name")

async def save_session(data: HistoryCreate) -> str:
    """
    Saves a Teacher, Exam, or Tutor session to MongoDB.
    """
    document = data.model_dump()
    document["created_at"] = datetime.utcnow()
    
    result = await history_collection.insert_one(document)
    return str(result.inserted_id)

async def get_user_history(user_name: str, mode: str = None, limit: int = 20):
    """
    Get history for a user.
    Optional: Filter by mode (e.g., only show Exams).
    """
    query = {"user_name": user_name}
    if mode:
        query["mode"] = mode

    plans = []
    # Sort by newest first
    cursor = history_collection.find(query).sort("created_at", -1).limit(limit)
    
    async for document in cursor:
        document["_id"] = str(document["_id"])
        plans.append(document)
        
    return plans

async def get_all_history(limit: int = 50):
    """Admin view: see mostly recently generated items globally"""
    plans = []
    cursor = history_collection.find({}).sort("created_at", -1).limit(limit)
    async for document in cursor:
        document["_id"] = str(document["_id"])
        plans.append(document)
    return plans