from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter(prefix="/api/health", tags=["health"])



class HealthResponse(BaseModel):
    status: str
    message: str


@router.get("/", response_model=HealthResponse)
async def get_health():
    """
    Health check endpoint: 
    This documentation right here literally shows up in your auto-generated /docs API documentation!
    """
    

    return {"status": "ok", "message": "Server is running smoothly!"}
