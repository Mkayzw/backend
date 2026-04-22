"""
Patient Schemas — includes clinical context fields.
"""
import json
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List
from app.schemas.user_schemas import UserResponse


class CreatePatient(BaseModel):
    userId:            int
    emergencyContact:  str
    dateOfBirth:       datetime
    gender:            str
    chronicConditions: Optional[List[str]] = None  # e.g. ["asthma", "diabetes"]
    allergies:         Optional[List[str]] = None  # e.g. ["penicillin"]
    baselineStatus:    Optional[str]       = None  # "stable" | "fragile" | "unknown"


class UpdatePatient(BaseModel):
    emergencyContact:  Optional[str]       = None
    dateOfBirth:       Optional[datetime]  = None
    gender:            Optional[str]       = None
    chronicConditions: Optional[List[str]] = None
    allergies:         Optional[List[str]] = None
    baselineStatus:    Optional[str]       = None


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id:               int
    userId:           int
    emergencyContact: str
    dateOfBirth:      datetime
    gender:           str
    updatedAt:        datetime
    user:             Optional[UserResponse] = None

    # Clinical context
    chronicConditions: Optional[str] = None  # JSON string
    allergies:         Optional[str] = None  # JSON string
    baselineStatus:    Optional[str] = None

    # Intelligence Layer
    currentRiskLevel:   str               = "LOW"
    currentTrendStatus: str               = "STABLE"
    lastRiskUpdate:     Optional[datetime] = None
    lastTrendUpdate:    Optional[datetime] = None
    lastReportTime:     Optional[datetime] = None
