"""
Authentication and Authorization Service

Implements JWT-based authentication with role-based access control.

"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.db import db

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = "U9DD6Q0xG27J8mEIeQbmWzvF1851BJceMOUa4LfvhnI="  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 

# Security scheme
security = HTTPBearer()

# Simple in-memory rate limiter for signup
_signup_attempts: dict = {}  # {"ip": [timestamp, ...]}
SIGNUP_RATE_LIMIT = 5  # max attempts per hour


def hashPassword(password: str) -> str:
    """
    Hash a password using bcrypt.
    """
    return pwd_context.hash(password)


def verifyPassword(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    """
    return pwd_context.verify(plain_password, hashed_password)


def createAccessToken(user_id: int, role: str) -> str:
    """
    Create a JWT access token with 24h expiration.
    
    """
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decodeAccessToken(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT access token.
    
    Returns the token payload or None if invalid.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def checkSignupRateLimit(client_ip: str) -> bool:
    """
    Check if the client IP has exceeded signup rate limit.
    Returns True if the request is allowed, False if rate limited.
    """
    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)
    
    if client_ip not in _signup_attempts:
        _signup_attempts[client_ip] = []
    
    # Remove timestamps older than 1 hour
    _signup_attempts[client_ip] = [
        ts for ts in _signup_attempts[client_ip] if ts > one_hour_ago
    ]
    
    if len(_signup_attempts[client_ip]) >= SIGNUP_RATE_LIMIT:
        return False
    
    _signup_attempts[client_ip].append(now)
    return True


async def registerUser(
    email: str,
    password: str,
    fullName: str,
    phone: Optional[str] = None,
    role: str = "PATIENT",
    specialization: Optional[str] = None,
) -> dict:
    """
    Register a new user with automatic profile creation.
    
    - Creates User record with hashed password
    - If PATIENT: auto-creates Patient record with defaults
    - If CLINICIAN: requires specialization; auto-creates Clinician record
    - Returns user data with JWT token (auto-login after signup)
    """
    # Check for duplicate email
    existing = await db.user.find_unique(where={"email": email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    
    # Create user record
    user = await db.user.create(data={
        "email": email,
        "password": hashPassword(password),
        "fullName": fullName,
        "phone": phone,
        "role": role,
    })
    
    # Auto-create role-specific profile
    if role == "PATIENT":
        await db.patient.create(data={
            "userId": user.id,
            "emergencyContact": "",
            "dateOfBirth": datetime.utcnow(),
            "gender": "Prefer not to say",
            "chronicConditions": "[]",
            "allergies": "[]",
            "baselineStatus": "stable",
        })
    elif role == "CLINICIAN":
        if not specialization:
            # Clean up the user we just created
            await db.user.delete(where={"id": user.id})
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Specialization is required for clinician accounts",
            )
        await db.clinician.create(data={
            "userId": user.id,
            "fullName": fullName,
            "specialization": specialization,
        })
    
    # Create access token
    token = createAccessToken(user.id, user.role)
    
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.fullName,
        "role": user.role,
        "token": token,
    }


async def authenticateUser(email: str, password: str) -> Optional[dict]:
    """
    Authenticate a user by email and password.
    
    Returns the user with token or None if authentication fails.

    """
    user = await db.user.find_unique(where={"email": email})
    
    if not user:
        return None
    
    if not verifyPassword(password, user.password):
        return None
    
    # Create access token
    token = createAccessToken(user.id, user.role)
    
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.fullName,
        "role": user.role,
        "token": token
    }


async def getCurrentUser(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    FastAPI dependency to get the current authenticated user.
    
    """
    token = credentials.credentials
    
    payload = decodeAccessToken(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = int(payload.get("sub"))
    
    user = await db.user.find_unique(where={"id": user_id})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.fullName,
        "role": user.role
    }


def requireRole(allowed_roles: List[str]):
    """
    FastAPI dependency factory for role-based access control.
    
    """
    async def role_checker(current_user: dict = Depends(getCurrentUser)) -> dict:
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {allowed_roles}"
            )
        return current_user
    
    return role_checker


async def checkDataAccess(current_user: dict, resource_type: str, resource_id: int) -> bool:
    """
    Check if the current user has access to a specific resource.
    
    Access rules:
    - PATIENT: Can only access own records (Requirement 16.3)
    - CLINICIAN: Can only access assigned patients' records (Requirement 16.4)
    - ADMIN: Can access all records (Requirement 16.5)
    
    Args:
        current_user: The authenticated user dict
        resource_type: Type of resource ("patient", "symptom_report", "alert")
        resource_id: ID of the resource
    
    Returns: True if access is granted, False otherwise
    """
    role = current_user["role"]
    user_id = current_user["id"]
    
    # ADMIN can access everything
    if role == "ADMIN":
        return True
    
    # PATIENT can only access own records
    if role == "PATIENT":
        if resource_type == "patient":
            # Check if the patient record belongs to this user
            patient = await db.patient.find_unique(where={"id": resource_id})
            return patient and patient.userId == user_id
        
        if resource_type == "symptom_report":
            # Check if the symptom report belongs to this patient
            report = await db.symptomreport.find_unique(
                where={"id": resource_id},
                include={"patient": True}
            )
            return report and report.patient.userId == user_id
        
        if resource_type == "alert":
            # Check if the alert is for this patient
            alert = await db.alert.find_unique(
                where={"id": resource_id},
                include={"patient": True}
            )
            return alert and alert.patient.userId == user_id
    
    # CLINICIAN can only access assigned patients' records
    if role == "CLINICIAN":
        # Get clinician ID for this user
        clinician = await db.clinician.find_unique(where={"userId": user_id})
        if not clinician:
            return False
        
        if resource_type == "patient":
            # Check if this clinician is assigned to the patient
            assignment = await db.assignment.find_first(
                where={
                    "clinicianId": clinician.id,
                    "patientId": resource_id,
                    "status": "ACTIVE"
                }
            )
            return assignment is not None
        
        if resource_type == "symptom_report":
            # Check if this clinician is assigned to the patient who owns the report
            report = await db.symptomreport.find_unique(
                where={"id": resource_id},
                include={"patient": True}
            )
            if not report:
                return False
            
            assignment = await db.assignment.find_first(
                where={
                    "clinicianId": clinician.id,
                    "patientId": report.patientId,
                    "status": "ACTIVE"
                }
            )
            return assignment is not None
        
        if resource_type == "alert":
            # Check if this clinician is assigned to the patient who owns the alert
            alert = await db.alert.find_unique(
                where={"id": resource_id},
                include={"patient": True}
            )
            if not alert:
                return False
            
            assignment = await db.assignment.find_first(
                where={
                    "clinicianId": clinician.id,
                    "patientId": alert.patientId,
                    "status": "ACTIVE"
                }
            )
            return assignment is not None
    
    return False
