import os
import google.generativeai as genai
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Header, Query
from firebase_admin import firestore, auth
from typing import List, Optional
from pydantic import BaseModel

# ✅ CONFIGURE GEMINI
# genai.configure(api_key="YOUR_GEMINI_API_KEY") 

router = APIRouter()
db = firestore.client()

# ==========================================
# 📦 MODELS
# ==========================================

class ReferralRequest(BaseModel):
    new_user_uid: str
    referred_by_uid: str

class UserTopUpRequest(BaseModel):
    target_uid: str
    amount_paid: int

class SchoolTopUpRequest(BaseModel):
    school_id: str
    amount_paid: int
    credits_to_add: int
    teachers_to_add: Optional[int] = None 

class ContentAction(BaseModel):
    doc_id: str
    collection_name: str

class CampaignRequest(BaseModel):
    target_uids: List[str]
    goal: str

# ==========================================
# 🛡️ ADMIN VERIFICATION
# ==========================================

async def verify_admin(x_user_id: str):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_ref = db.collection("users").document(x_user_id)
    user_doc = user_ref.get()

    if not user_doc.exists or user_doc.to_dict().get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admins only")

    return True

# ==========================================
# 🏫 SCHOOLS
# ==========================================

@router.get("/schools")
async def get_all_schools(x_user_id: str = Header(None, alias="X-User-ID")):
    await verify_admin(x_user_id)
    schools = []
    try:
        docs = db.collection("schools").stream()
        for doc in docs:
            data = doc.to_dict()
            teacher_count = len(list(db.collection("teachers").where("schoolId", "==", doc.id).stream()))
            
            # Format dates for frontend
            created_at = data.get("createdAt", "")
            if hasattr(created_at, 'strftime'): created_at = created_at.strftime("%Y-%m-%d")
            
            # Handle expires_at
            expiry = data.get("expires_at")
            expiry_str = expiry.strftime("%Y-%m-%d") if hasattr(expiry, 'strftime') else "No Expiry"

            pending = data.get("pendingRequest")
            if pending and pending.get("requestedAt"):
                ts = pending["requestedAt"]
                pending["requestedAt"] = ts.strftime("%Y-%m-%d %H:%M:%S") if hasattr(ts, 'strftime') else str(ts)

            schools.append({
                "id": doc.id,
                "adminId": data.get("adminId", ""),
                "schoolName": data.get("schoolName", "Unknown School"),
                "email": data.get("email", ""),
                "phone": data.get("phone", ""),
                "credits": data.get("credits", 0),
                "maxTeachers": data.get("maxTeachers", 0),
                "subscriptionPlan": data.get("subscriptionPlan", "None"),
                "isApproved": data.get("isApproved", False),
                "subscriptionStatus": data.get("subscriptionStatus", False),
                "teacherCount": teacher_count,
                "createdAt": str(created_at),
                "expires_at": expiry_str, # ✅ Now visible to Admin
                "pendingRequest": pending
            })
        return {"status": "success", "data": schools}
    except Exception as e:
        raise HTTPException(500, f"Failed to load schools: {str(e)}")


@router.post("/schools/topup")
async def top_up_school(action: SchoolTopUpRequest, x_user_id: str = Header(None, alias="X-User-ID")):
    await verify_admin(x_user_id)
    school_ref = db.collection("schools").document(action.school_id)
    doc_snap = school_ref.get()

    if not doc_snap.exists:
        # Fallback to searching by adminId if doc ID doesn't match
        query = db.collection("schools").where("adminId", "==", action.school_id).limit(1).stream()
        found = list(query)
        if not found: raise HTTPException(404, "School not found")
        school_ref = found[0].reference
        doc_snap = found[0]

    now = datetime.now(timezone.utc)
    
    # 🕵️‍♂️ Detect Plan based on Rate Per Teacher
    num_teachers = action.teachers_to_add or doc_snap.to_dict().get("maxTeachers", 1)
    rate_per_teacher = action.amount_paid / num_teachers

    days_to_add = 30
    plan_name = "School Monthly"

    # K105 or K120 per teacher signifies a Termly plan
    if rate_per_teacher >= 100: 
        days_to_add = 90
        plan_name = "School Termly"
    
    new_expiry = now + timedelta(days=days_to_add)

    update_data = {
        "credits": firestore.Increment(action.credits_to_add),
        "lastPaymentAmount": action.amount_paid,
        "lastPaymentDate": firestore.SERVER_TIMESTAMP,
        "subscriptionPlan": plan_name,
        "subscriptionStatus": True,
        "isApproved": True,
        "expires_at": new_expiry, # ✅ Consistent snake_case
        "pendingRequest": firestore.DELETE_FIELD
    }
    
    if action.teachers_to_add is not None:
        update_data["maxTeachers"] = action.teachers_to_add

    school_ref.update(update_data)
    
    return {
        "status": "success",
        "plan_name": plan_name,
        "expiry": new_expiry.strftime('%Y-%m-%d'),
        "credits_added": action.credits_to_add
    }

# ==========================================
# 👥 USERS
# ==========================================

@router.post("/users/topup")
async def top_up_user(action: UserTopUpRequest, x_user_id: str = Header(None, alias="X-User-ID")):
    await verify_admin(x_user_id)
    now = datetime.now(timezone.utc)
    
    # ✅ Fixed Individual Logic: K120=200/90days, K50=60/30days
    if action.amount_paid == 120:
        credits, plan, days_to_add = 200, "Individual Termly (K120)", 90
    elif action.amount_paid == 50:
        credits, plan, days_to_add = 60, "Individual Monthly (K50)", 30
    else:
        # Custom fallback
        credits, plan, days_to_add = int(action.amount_paid * 1.5), "Custom Top-up", 30

    new_expiry = now + timedelta(days=days_to_add)
    user_ref = db.collection("users").document(action.target_uid)
    
    user_ref.update({
        "credits": firestore.Increment(credits),
        "is_approved": True,
        "subscriptionPlan": plan,
        "last_payment_amount": action.amount_paid,
        "last_payment_date": firestore.SERVER_TIMESTAMP,
        "expires_at": new_expiry # ✅ Consistent snake_case
    })

    return {"status": "success", "plan": plan, "expires_at": new_expiry}

@router.get("/users")
async def get_all_users(x_user_id: str = Header(None, alias="X-User-ID")):
    await verify_admin(x_user_id)
    db_docs = {d.id: d.to_dict() for d in db.collection("users").stream()}
    auth_users = auth.list_users().iterate_all()
    users = []
    
    for u in auth_users:
        uid = u.uid
        data = db_docs.get(uid, {})
        role = data.get("role", "user")
        if role in ["school_admin", "admin", "super_admin"]: continue
            
        raw_date = data.get("createdAt") or data.get("joined_at")
        joined_str = raw_date.strftime("%Y-%m-%d") if hasattr(raw_date, 'strftime') else str(raw_date)

        users.append({
            "uid": uid,
            "email": u.email or data.get("email", "No Email"),
            "name": data.get("name") or u.display_name or "Unknown",
            "role": role,
            "credits": data.get("credits", 0),
            "subscriptionPlan": data.get("subscriptionPlan", "None"),
            "joined_at": joined_str, 
            "is_approved": data.get("is_approved", False),
        })
    return sorted(users, key=lambda x: x["joined_at"], reverse=True)

@router.delete("/users/{uid}")
async def delete_user(uid: str, x_user_id: str = Header(None, alias="X-User-ID")):
    await verify_admin(x_user_id)
    try:
        db.collection("users").document(uid).delete()
        try: auth.delete_user(uid)
        except: pass
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(500, str(e))

# ==========================================
# 📧 AI CAMPAIGN LOGIC 
# ==========================================

async def generate_email_content(user_name: str, goal: str):
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = f"Act as BooxClash Manager. Write a warm 60-word email to {user_name}. Goal: {goal}. Include Subject."
        response = model.generate_content(prompt)
        return response.text
    except:
        return f"Subject: We miss you!\n\nHi {user_name},\n\nWe noticed you haven't been active. {goal}\n\nBest, BooxClash Team"

@router.post("/campaign/start")
async def start_campaign(action: CampaignRequest, x_user_id: str = Header(None, alias="X-User-ID")):
    await verify_admin(x_user_id)
    success = 0
    for uid in action.target_uids:
        try:
            doc = db.collection("users").document(uid).get()
            if not doc.exists: continue
            data = doc.to_dict()
            if not data.get("email"): continue
            # Mock sending logic
            success += 1
        except: continue
    return {"status": "success", "message": f"Campaign complete. Sent: {success}"}

# ==========================================
# 📊 STATS & CONTENT
# ==========================================

@router.get("/content/all")
async def get_all_content(type: str = Query(...), x_user_id: str = Header(None, alias="X-User-ID")):
    await verify_admin(x_user_id)
    cmap = {"scheme": "generated_schemes", "weekly": "generated_weekly_plans", "lesson": "generated_lesson_plans"}
    if type not in cmap: raise HTTPException(400, "Invalid content type")
    docs = db.collection(cmap[type]).order_by("createdAt", direction=firestore.Query.DESCENDING).limit(50).stream()
    return [{**d.to_dict(), "id": d.id, "createdAt": str(d.to_dict().get("createdAt"))} for d in docs]

@router.get("/stats")
async def get_stats(x_user_id: str = Header(None, alias="X-User-ID")):
    await verify_admin(x_user_id)
    def count_col(n): return len(list(db.collection(n).limit(500).stream()))
    return {
        "total_users": count_col("users"),
        "total_schools": count_col("schools"),
        "total_schemes": count_col("generated_schemes"),
        "total_lessons": count_col("generated_lesson_plans")
    }

@router.post("/api/reward-referral")
async def reward_referral(req: ReferralRequest):
    try:
        referrer_ref = db.collection("users").document(req.referred_by_uid)
        if not referrer_ref.get().exists: return {"status": "ignored"}
        referrer_ref.update({"credits": firestore.Increment(10)})
        db.collection("referral_logs").add({
            "referrer_uid": req.referred_by_uid,
            "new_user_uid": req.new_user_uid,
            "reward_credits": 10,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        return {"status": "success"}
    except:
        raise HTTPException(500, "Referral failed")