"""
Authentication Schemas

Requirements: 16.1
"""
from pydantic import BaseModel
from typing import Optional


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
