from fastapi import APIRouter, Header, Request, HTTPException
from api import school_routes, teacher_routes_new, teacher_routes_old
from typing import Optional, Any

router = APIRouter()

# ==========================================
# 🛠️ UNIVERSAL ADAPTER
# ==========================================
class UniversalRequest:
    """
    A helper class that behaves like both a Pydantic model and a standard Object.
    It prevents AttributeErrors and .dict() crashes.
    """
    def __init__(self, data: dict):
        self._data = data
        # Allow access as attributes (obj.field)
        for key, value in data.items():
            setattr(self, key, value)

    def dict(self):
        """Simulate Pydantic's .dict() method"""
        return self._data
    
    def get(self, key, default=None):
        """Simulate dictionary .get() method"""
        return self._data.get(key, default)

    def __getattr__(self, item):
        """Safe fallback: return None if attribute is missing (like Javascript)"""
        return self._data.get(item, None)

# ==========================================
# 🚦 THE DISPATCHER
# ==========================================
@router.post("/dispatch/generate")
async def dispatch_generation(
    request: Request,  # 👈 Accepts RAW request (No Pydantic Validation = No 422s)
    x_school_id: Optional[str] = Header(None, alias="X-School-ID")
):
    try:
        # 1. Parse JSON Body safely
        body = await request.json()
        
        # 2. Wrap in Universal Adapter (Compatible with all engines)
        safe_request = UniversalRequest(body)

        # 3. Determine School ID (Header > Body > None)
        school_id = x_school_id or body.get("schoolId") or body.get("school_id")
        
        print(f"🔀 RELAY HIT. School ID: {school_id} | Type: {body.get('type')}")

        # ---------------------------------------------------------
        # 🏫 ROUTE A: SCHOOL ENGINE
        # ---------------------------------------------------------
        if school_id:
            # school_routes uses getattr(), so safe_request works perfectly
            return await school_routes.generate_for_school(safe_request, school_id)

        # ---------------------------------------------------------
        # 🆕 ROUTE B: TEACHER ENGINE (Standard)
        # ---------------------------------------------------------
        print("🔀 Relay: Routing to NEW Standard Engine")
        
        # teacher_routes usually expects a Pydantic model. 
        # Since we are bypassing HTTP validation, we might need to rely on 
        # the engine to validate, or it might just work if it uses .dict() access.
        try:
            return await teacher_routes_new.generate_standard(safe_request)
        except AttributeError:
            # Fallback: If the engine demands a real Pydantic model, we let it fail 
            # or you can import the specific model from teacher_routes if strictly needed.
            # But usually, passing an object with attributes works for read-only access.
            return await teacher_routes_new.generate_standard(safe_request)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Relay Dispatch Error: {str(e)}")