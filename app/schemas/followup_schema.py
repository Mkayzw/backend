from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.clinician_schema import ClinicianResponse
from app.schemas.patient_schema import PatientResponse


# ─────────────────────────────────────────────
# Follow-Up Response (clinician reply to a symptom report)
# ─────────────────────────────────────────────

class CreateFollowUpResponseRequest(BaseModel):
    symptomReportId: int
    message: str
    actionRequired: bool = False


class FollowUpResponseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    symptomReportId: int
    clinicianId: int
    patientId: int
    message: str
    actionRequired: bool
    createdAt: datetime
    clinician: Optional[ClinicianResponse] = None
    patient: Optional[PatientResponse] = None


# ─────────────────────────────────────────────
# Follow-Up Appointment
# ─────────────────────────────────────────────

class CreateFollowUpAppointmentRequest(BaseModel):
    patientId: int
    scheduledAt: datetime
    reason: str
    clinicianId: Optional[int] = None  # admin override; clinicians use their own profile


class UpdateFollowUpAppointmentRequest(BaseModel):
    scheduledAt: Optional[datetime] = None
    reason: Optional[str] = None
    status: Optional[str] = None  # SCHEDULED | COMPLETED | CANCELLED | MISSED


class FollowUpAppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    patientId: int
    clinicianId: int
    scheduledAt: datetime
    reason: str
    status: str
    createdAt: datetime
    updatedAt: datetime
    clinician: Optional[ClinicianResponse] = None
    patient: Optional[PatientResponse] = None
