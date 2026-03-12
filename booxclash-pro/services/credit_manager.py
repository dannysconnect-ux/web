from datetime import datetime, timezone, timedelta
from google.cloud.firestore import Increment
from services.firebase_setup import db 

def check_and_deduct_credit(uid: str, cost: int = 1, school_id: str = None):
    """
    Checks credits and deducts 'cost' credits atomically.
    Also checks for subscription expiration.
    Returns a dictionary with remaining credits and expiration date.
    """

    # 🔧 Dev fallback
    if not uid or uid == "default_user":
        print("⚠️ Dev mode credit bypass")
        return {"success": True, "remaining_credits": 999, "expires_at": None}

    print(f"🔑 Credit Check | UID: {uid} | School ID: {school_id} | Cost: {cost}")
    
    # Get current time in UTC (Firestore uses UTC datetimes)
    now = datetime.now(timezone.utc)

    # =========================================================
    # 🏫 PATH A: SCHOOL CREDIT DEDUCTION
    # =========================================================
    if school_id:
        school_ref = db.collection("schools").document(school_id)
        doc = school_ref.get()

        if not doc.exists:
            print(f"❌ School ID {school_id} not found.")
            raise Exception("School account not found or invalid.")

        school_data = doc.to_dict()
        current_credits = int(school_data.get("credits", 0))
        expires_at = school_data.get("expires_at")

        # ⏳ Check Expiration for School
        if expires_at and expires_at < now:
            raise Exception("School subscription has expired. Please contact Admin to renew.")

        if current_credits < cost:
            print(f"⛔ SCHOOL Credit exhausted for {school_id}. Has: {current_credits}, Needs: {cost}")
            raise Exception(f"School credits exhausted (Available: {current_credits}). Please contact Admin.")

        # Deduct from School
        school_ref.update({ "credits": Increment(-cost) })
        print(f"💰 SCHOOL Credit deducted. Remaining: {current_credits - cost}")
        
        return {
            "success": True, 
            "remaining_credits": current_credits - cost,
            "expires_at": expires_at.isoformat() if expires_at else None
        }

    # =========================================================
    # 👤 PATH B: INDIVIDUAL USER DEDUCTION
    # =========================================================
    user_ref = db.collection("users").document(uid)
    doc = user_ref.get()

    # 🆕 FIRST-TIME USER (Initialize & Deduct)
    if not doc.exists:
        initial_credits = 3
        
        # 🛡️ SAFETY CHECK: Prevent negative balance on expensive first actions
        if initial_credits < cost:
            print(f"⛔ New user tried premium action. Has: {initial_credits}, Needs: {cost}")
            raise Exception(f"Insufficient free credits for this action (Required: {cost}, Available: {initial_credits}). Please upgrade to Premium.")

        # Give free credits a 14-day expiry to create urgency
        trial_expires_at = now + timedelta(days=14) 
        
        user_ref.set({
            "credits": initial_credits - cost, 
            "is_approved": False,
            "joined_at": now,
            "expires_at": trial_expires_at, # Store expiration
            "email": "user@example.com" 
        })
        print(f"🆕 User initialized with 3 credits. Deducted {cost}. Remaining: {initial_credits - cost}")
        return {
            "success": True, 
            "remaining_credits": initial_credits - cost, 
            "expires_at": trial_expires_at.isoformat()
        }

    user_data = doc.to_dict()
    current_credits = int(user_data.get("credits", 0))
    expires_at = user_data.get("expires_at")

    # ⏳ Check Expiration for Individual
    if expires_at and expires_at < now:
        raise Exception("Your subscription has expired! Please renew your K50 Monthly or K120 Termly plan.")

    # 🛡️ SAFETY: Missing credits field (Reset to 3)
    if "credits" not in user_data:
        # 🛡️ SAFETY CHECK: Prevent negative balance if resetting account
        if 3 < cost:
            print(f"⛔ Missing credits user tried premium action. Has: 3, Needs: {cost}")
            raise Exception(f"Insufficient free credits (Required: {cost}, Available: 3). Please upgrade.")

        # Give them 3 credits, valid for 14 days
        reset_expires_at = now + timedelta(days=14)
        user_ref.update({
            "credits": 3 - cost,
            "expires_at": reset_expires_at
        })
        print(f"♻️ Credits field missing — reset to 3 and deducted {cost}")
        return {
            "success": True, 
            "remaining_credits": 3 - cost, 
            "expires_at": reset_expires_at.isoformat()
        }

    # ⛔ NO CREDITS LEFT
    if current_credits < cost:
        print(f"⛔ Credit exhausted for {uid}. Has: {current_credits}, Needs: {cost}")
        raise Exception(
            f"Insufficient credits (Required: {cost}, Available: {current_credits}). Please upgrade to Premium."
        )

    # 💰 ATOMIC CREDIT DEDUCTION
    user_ref.update({ "credits": Increment(-cost) })
    print(f"💰 Credit deducted for {uid}. Remaining: {current_credits - cost}")
    
    # Return success and expiration date to send to the frontend
    return {
        "success": True, 
        "remaining_credits": current_credits - cost, 
        "expires_at": expires_at.isoformat() if expires_at else None
    }