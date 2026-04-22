# Welcome to Routers!
# Routers are like "mini apps". They hold a group of related endpoints.
# This prevents our `main.py` from growing to 10,000 lines long!

from fastapi import APIRouter
from pydantic import BaseModel

# We create a router.
# The `prefix="/api/health"` means every endpoint in this file will automatically start with that URL.
# Instead of `@app.get("/api/health/")`, we just do `@router.get("/")`!
router = APIRouter(prefix="/api/health", tags=["health"])


# --- SCHEMAS (Pydantic Models) ---
# Schemas are Python classes that describe exactly what your data should look like.
# If the caller returns the wrong type of data (e.g., an int instead of string), FastAPI throws an automatic error!
class HealthResponse(BaseModel):
    status: str
    message: str


# --- ENDPOINTS ---
# The `@router.get("/")` means this function executes when someone sends a GET request to `/api/health/`.
# `response_model=HealthResponse` tells FastAPI to format the response exactly like the Schema above, 
# AND it generates the beautiful automatic Swagger docs using this format.
@router.get("/", response_model=HealthResponse)
async def get_health():
    """
    Health check endpoint: 
    This documentation right here literally shows up in your auto-generated /docs API documentation! 
    It is used to check if the server is alive and responding.
    """
    
    # Notice we return a normal Python dictionary.
    # FastAPI and Pydantic will magically turn it into the "HealthResponse" JSON format when sending it to the user.
    return {"status": "ok", "message": "Server is running smoothly!"}
