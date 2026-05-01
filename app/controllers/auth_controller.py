from fastapi import HTTPException, status, Depends, Request
from pydantic import BaseModel
from app.services.auth import authenticateUser, getCurrentUser, registerUser, checkSignupRateLimit


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


async def signup(payload, request: Request) -> dict:
    """
    Register a new user and return token for auto-login.
    
    Validates password strength, email uniqueness, and role constraints.
    Applies rate limiting to prevent abuse.
    """
    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    if not checkSignupRateLimit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many signup attempts. Please try again later.",
        )
    
    # Validate CLINICIAN role requires specialization
    if payload.role == "CLINICIAN" and not payload.specialization:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Specialization is required for clinician accounts",
        )
    
    result = await registerUser(
        email=payload.email,
        password=payload.password,
        fullName=payload.fullName,
        phone=payload.phone,
        role=payload.role,
        specialization=payload.specialization,
    )
    
    return result


async def getCurrentUserInfo(current_user: dict = Depends(getCurrentUser)) -> UserInfoResponse:
    """
    Get current authenticated user info.
    """
    return UserInfoResponse(
        id=current_user["id"],
        email=current_user["email"],
        fullName=current_user["fullName"],
        role=current_user["role"]
    )
