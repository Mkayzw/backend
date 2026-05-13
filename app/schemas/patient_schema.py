"""
Patient Schemas — includes clinical context fields.
"""
import json
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator, Field
from typing import Optional, List
from app.schemas.user_schemas import UserResponse


class CreatePatient(BaseModel):
    userId:            int
    emergencyContact:  str
    address:           str
    dateOfBirth:       datetime
    gender:            str
    chronicConditions: List[str] = []  # e.g. ["asthma", "diabetes"] - optional
    allergies:         List[str]  # e.g. ["penicillin"] - required, can include "None known"
    baselineStatus:    str       # "stable" | "fragile" | "unknown"

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        """Gender must be Male, Female, or Other."""
        if not v or v not in ["Male", "Female", "Other"]:
            raise ValueError("Gender must be Male, Female, or Other")
        return v

    @field_validator("allergies")
    @classmethod
    def validate_allergies(cls, v: List[str]) -> List[str]:
        """Allergies must be provided (can include 'None known' or 'Unknown')."""
        if not v or len(v) == 0:
            raise ValueError("Allergies must be specified (e.g. 'None known' or 'Unknown')")
        return v

    @field_validator("baselineStatus")
    @classmethod
    def validate_baseline_status(cls, v: str) -> str:
        """Baseline status must be stable, fragile, or unknown."""
        if not v or v.lower() not in ["stable", "fragile", "unknown"]:
            raise ValueError("Baseline status must be stable, fragile, or unknown")
        return v.lower()


class UpdatePatient(BaseModel):
    emergencyContact:  str
    address:           str
    dateOfBirth:       datetime
    gender:            str
    chronicConditions: List[str] = []  # Optional
    allergies:         List[str]  # Required
    baselineStatus:    str

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        """Gender must be Male, Female, or Other."""
        if not v or v not in ["Male", "Female", "Other"]:
            raise ValueError("Gender must be Male, Female, or Other")
        return v

    @field_validator("allergies")
    @classmethod
    def validate_allergies(cls, v: List[str]) -> List[str]:
        """Allergies must be provided (can include 'None known' or 'Unknown')."""
        if not v or len(v) == 0:
            raise ValueError("Allergies must be specified (e.g. 'None known' or 'Unknown')")
        return v

    @field_validator("baselineStatus")
    @classmethod
    def validate_baseline_status(cls, v: str) -> str:
        """Baseline status must be stable, fragile, or unknown."""
        if not v or v.lower() not in ["stable", "fragile", "unknown"]:
            raise ValueError("Baseline status must be stable, fragile, or unknown")
        return v.lower()


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id:               int
    userId:           int
    emergencyContact: str
    address:          Optional[str] = None
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
