"""
Authentication Schemas

"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    id: int
    email: str
    fullName: Optional[str] = None
    role: str
    token: str


class TokenPayload(BaseModel):
    sub: str
    role: str
    exp: int
    iat: int


class UserInfoResponse(BaseModel):
    id: int
    email: str
    fullName: Optional[str] = None
    role: str


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    fullName: str
    phone: Optional[str] = None
    role: str = "PATIENT"
    specialization: Optional[str] = None  # Required if role=CLINICIAN

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Password must be at least 8 chars with at least one letter and one number."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Role must be PATIENT, CLINICIAN, or ADMIN."""
        normalized = v.strip().upper()
        if normalized not in ("PATIENT", "CLINICIAN"):
            raise ValueError("Role must be PATIENT or CLINICIAN")
        return normalized


class SignupResponse(BaseModel):
    id: int
    email: str
    fullName: Optional[str] = None
    role: str
    token: str
