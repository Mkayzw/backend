"""
Assignment Schemas — includes care context for clinical meaning.
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional
from app.schemas.clinician_schema import ClinicianResponse

VALID_CARE_CONTEXTS = {
    "ASTHMA_FOLLOWUP",
    "POST_SURGERY_RECOVERY",
    "CHRONIC_DISEASE_MONITORING",
    "INFECTION_FOLLOWUP",
    "GENERAL_REVIEW",
}


class CreateAssignment(BaseModel):
    patientId:   int
    clinicianId: int
    careContext: str = "GENERAL_REVIEW"   # Why is this clinician monitoring this patient?
    reason:      Optional[str] = None     # Free text: "Post-discharge BP monitoring"


class UpdateAssignmentStatus(BaseModel):
    status: str  # ACTIVE | INACTIVE


class AssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id:          int
    patientId:   int
    clinicianId: int
    assignedAt:  datetime
    status:      str
    endedAt:     Optional[datetime] = None
    careContext: str
    reason:      Optional[str]     = None
    clinician:   Optional[ClinicianResponse] = None
