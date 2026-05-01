"""
Authentication Routes

"""
from fastapi import APIRouter, Depends, Request
from app.controllers.auth_controller import login, getCurrentUserInfo, signup
from app.schemas.auth_schema import LoginRequest, LoginResponse, UserInfoResponse, SignupRequest, SignupResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login_endpoint(payload: LoginRequest) -> LoginResponse:
    """
    Authenticate user and return JWT token.
    
    """
    return await login(payload)


@router.post("/signup", response_model=SignupResponse)
async def signup_endpoint(payload: SignupRequest, request: Request) -> SignupResponse:
    """
    Register a new user and return JWT token for auto-login.
    
    Creates a User record and, depending on the role, an associated
    Patient or Clinician profile automatically.

    """
    result = await signup(payload, request)
    return SignupResponse(**result)


@router.get("/me", response_model=UserInfoResponse)
async def get_me(current_user: dict = Depends(getCurrentUserInfo)) -> UserInfoResponse:
    """
    Get current authenticated user info.
    
    """
    return current_user
