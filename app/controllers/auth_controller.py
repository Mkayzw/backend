"""
Authentication Controller

Handles authentication HTTP requests.

Requirements: 16.1, 16.6, 16.7
"""
from fastapi import HTTPException, status, Depends
from pydantic import BaseModel
from app.services.auth import authenticateUser, getCurrentUser


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    id: int
    email: str
    fullName: str | None = None
    role: str
    token: str


class UserInfoResponse(BaseModel):
    id: int
    email: str
    fullName: str | None = None
    role: str


async def login(payload: LoginRequest) -> LoginResponse:
    """
    Authenticate user and return token.
    
    Returns 401 for invalid credentials.
    
    Requirements: 16.1, 16.6
    """
    user = await authenticateUser(payload.email, payload.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return LoginResponse(
        id=user["id"],
        email=user["email"],
        fullName=user["fullName"],
        role=user["role"],
        token=user["token"]
    )


async def getCurrentUserInfo(current_user: dict = Depends(getCurrentUser)) -> UserInfoResponse:
    """
    Get current authenticated user info.
    
    Requirements: 16.7
    """
    return UserInfoResponse(
        id=current_user["id"],
        email=current_user["email"],
        fullName=current_user["fullName"],
        role=current_user["role"]
    )
