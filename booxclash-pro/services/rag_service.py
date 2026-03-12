# app/services/rag_service.py
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Connect to the SAME database where Admin uploaded the PDF
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.booxclash_db
syllabus_collection = db.syllabus

async def get_syllabus_context(grade: int, subject: str, query: str):
    """
    Searches the database for syllabus topics matching the student's current query.
    """
    print(f"🔎 RAG Search: Grade {grade} {subject} - Topic: {query}")

    # 1. Search DB for matching Grade + Subject + Topic Keywords
    # We use a regex search to be flexible (e.g., 'Photosynthesis' matches 'Chapter 4: Photosynthesis')
    results = await syllabus_collection.find({
        "grade": int(grade),
        "subject": {"$regex": subject, "$options": "i"}, # Case-insensitive
        "topic": {"$regex": query, "$options": "i"}
    }).to_list(length=3)

    # 2. IF FOUND: Return the specific Cambridge/Zambian content
    if results:
        context_text = "OFFICIAL SYLLABUS DATA FOUND:\n"
        for item in results:
            # We explicitly mention the "Original Level" (e.g., Form 1, Stage 7)
            # so the AI knows to tell the student "I found this in the Form 1 syllabus"
            level_name = item.get("original_level", f"Grade {grade}")
            content = item.get("content", "No details.")
            
            context_text += f"- [{level_name}] {item['topic']}: {content}\n"
        
        return context_text

    # 3. IF NOT FOUND: Return None (AI will use general knowledge)
    print("⚠️ No specific syllabus document found for this topic.")
    return None