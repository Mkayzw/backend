"""
Authentication Routes

Requirements: 16.1, 16.6, 16.7
"""
from fastapi import APIRouter, Depends
from app.controllers.auth_controller import login, getCurrentUserInfo, LoginRequest, LoginResponse, UserInfoResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login_endpoint(payload: LoginRequest) -> LoginResponse:
    """
    Authenticate user and return JWT token.
    
    Requirements: 16.1, 16.6
    """
    return await login(payload)


@router.get("/me", response_model=UserInfoResponse)
async def get_me(current_user: dict = Depends(getCurrentUserInfo)) -> UserInfoResponse:
    """
    Get current authenticated user info.
    
    Requirements: 16.7
    """
    return current_user
