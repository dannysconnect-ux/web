import os
import time
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pinecone import Pinecone, ServerlessSpec
import google.generativeai as genai
from google.genai import types

# 1. Load Environment Variables
load_dotenv()

# 2. Initialize Clients
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

INDEX_NAME = "booxclash-syllabus"

def setup_index():
    """Checks if the index exists, creates it if not."""
    existing_indexes = [index.name for index in pc.list_indexes()]
    
    if INDEX_NAME not in existing_indexes:
        print(f"Creating index: {INDEX_NAME}...")
        pc.create_index(
            name=INDEX_NAME,
            dimension=768, 
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
        time.sleep(5) # Give Pinecone a moment to spin up
    
    return pc.Index(INDEX_NAME)

def get_batch_embeddings(texts):
    """
    Turns a LIST of text chunks into vectors in one API call.
    Uses 'RETRIEVAL_DOCUMENT' to optimize for search.
    """
    try:
        response = gemini_client.models.batch_embed_contents(
            model="text-embedding-004",
            requests=[
                types.EmbedContentRequest(
                    content=types.Content(parts=[types.Part(text=t)]),
                    task_type="RETRIEVAL_DOCUMENT", # <--- CRITICAL FOR ACCURACY
                    title="Syllabus Segment" # Optional but helps accuracy
                ) for t in texts
            ]
        )
        # Extract just the vector values
        return [e.values for e in response.embeddings]
    except Exception as e:
        print(f"Embedding API Error: {e}")
        return []

def ingest_file(file_path: str, grade: str, subject: str):
    print(f"📄 Processing: {file_path}...")
    
    # A. Load PDF
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    print(f"   Found {len(documents)} pages.")

    # B. Split Text (Optimized for Context)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,  # Slightly larger to capture full definitions
        chunk_overlap=100,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    chunks = text_splitter.split_documents(documents)
    print(f"   Created {len(chunks)} searchable chunks.")

    # C. Embed and Upload in Batches
    index = setup_index()
    
    BATCH_SIZE = 50 # Send 50 chunks at once to Pinecone
    
    # Process main list in batches
    for i in range(0, len(chunks), BATCH_SIZE):
        batch_chunks = chunks[i : i + BATCH_SIZE]
        batch_texts = [c.page_content for c in batch_chunks]
        
        # 1. Get Vectors for the whole batch at once (Much Faster)
        print(f"   Embedding batch {i} to {i+len(batch_chunks)}...")
        vectors = get_batch_embeddings(batch_texts)
        
        if not vectors:
            continue

        # 2. Prepare Data for Pinecone
        vectors_to_upsert = []
        for j, chunk in enumerate(batch_chunks):
            vector_data = vectors[j]
            chunk_id = f"{grade}-{subject}-{i+j}"
            
            metadata = {
                "text": chunk.page_content,
                "grade": grade,
                "subject": subject,
                "page": chunk.metadata.get("page", 0)
            }
            
            vectors_to_upsert.append((chunk_id, vector_data, metadata))
        
        # 3. Upsert to Pinecone
        try:
            index.upsert(vectors=vectors_to_upsert)
            print(f"   ✅ Upserted batch {i} successfully.")
        except Exception as e:
            print(f"   ❌ Pinecone Error on batch {i}: {e}")

    print(f"🎉 Success! {subject} for Grade {grade} is now in the Brain.")

# --- RUNNER ---
if __name__ == "__main__":
    # Example usage
    # ingest_file("grade7_math.pdf", "7", "Math")
    pass