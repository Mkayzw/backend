"""
Symptom Report Schemas with structured clinical inputs.
"""
import json
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List


# ─── Valid symptom identifiers (matching SYMPTOM_WEIGHTS keys in risk engine) ───
VALID_SYMPTOMS = {
    "chest_pain", "difficulty_breathing", "shortness_of_breath", "severe_bleeding",
    "unconscious", "stroke_symptoms", "high_fever", "persistent_vomiting",
    "severe_pain", "confusion", "fainting", "rapid_heartbeat", "fever", "cough",
    "headache", "nausea", "dizziness", "fatigue", "back_pain", "joint_pain",
    "abdominal_pain", "muscle_weakness", "swelling", "rash",
}

VALID_SEVERITIES  = {"MILD", "MODERATE", "SEVERE", "CRITICAL"}
VALID_FREQUENCIES = {"FIRST_TIME", "RECURRING", "CHRONIC"}


class CreateSymptomReport(BaseModel):
    patientId:          int
    symptoms:           List[str]        
    severity:           str              # MILD | MODERATE | SEVERE | CRITICAL
    durationDays:       int              # days symptoms have persisted
    frequency:          str              # FIRST_TIME | RECURRING | CHRONIC
    notes:              Optional[str] = None   # Free-text context — NOT scored
    temperature:        Optional[float] = None # °C
    heartRate:          Optional[int]   = None # bpm
    medicationAdherent: Optional[bool]  = None

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        v = v.upper()
        if v not in VALID_SEVERITIES:
            raise ValueError(f"severity must be one of {VALID_SEVERITIES}")
        return v

    @field_validator("frequency")
    @classmethod
    def validate_frequency(cls, v: str) -> str:
        v = v.upper()
        if v not in VALID_FREQUENCIES:
            raise ValueError(f"frequency must be one of {VALID_FREQUENCIES}")
        return v

    @field_validator("symptoms")
    @classmethod
    def validate_symptoms(cls, v: list) -> list:
        invalid = [s for s in v if s not in VALID_SYMPTOMS]
        if invalid:
            raise ValueError(f"Unknown symptom identifiers: {invalid}. Valid: {sorted(VALID_SYMPTOMS)}")
        return v

    @field_validator("durationDays")
    @classmethod
    def validate_duration(cls, v: int) -> int:
        if v < 1:
            raise ValueError("durationDays must be >= 1")
        return v


class SymptomReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id:                 int
    patientId:          int
    notes:              Optional[str]   = None
    createdAt:          datetime
    # Structured inputs
    symptoms:           str             # JSON string from DB
    severity:           str
    durationDays:       int
    frequency:          str
    temperature:        Optional[float] = None
    heartRate:          Optional[int]   = None
    medicationAdherent: Optional[bool]  = None
    # Intelligence outputs
    riskLevel:          str             = "LOW"
    riskScore:          float           = 0.0
    riskFactors:        Optional[str]   = None
    riskExplanation:    Optional[str]   = None
    patient:            Optional['PatientResponse'] = None

# Avoid circular imports by doing late binding
from app.schemas.patient_schema import PatientResponse
SymptomReportResponse.model_rebuild()
