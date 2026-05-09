from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.clinician_schema import ClinicianResponse
from app.schemas.patient_schema import PatientResponse


class AlertTriageRequest(BaseModel):
    action: str
    resolutionNote: Optional[str] = None
    snoozedUntil: Optional[datetime] = None
    assignedToClinicianId: Optional[int] = None


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    patientId: int
    symptomReportId: int
    priority: str
    alertType: str
    message: str
    isRead: bool
    status: str
    assignedToClinicianId: Optional[int] = None
    resolutionNote: Optional[str] = None
    resolvedAt: Optional[datetime] = None
    snoozedUntil: Optional[datetime] = None
    lastActionAt: Optional[datetime] = None
    lastActionByUserId: Optional[int] = None
    createdAt: datetime
    patient: Optional[PatientResponse] = None
    assignedToClinician: Optional[ClinicianResponse] = None


class AlertListResponse(BaseModel):
    alerts: list[AlertResponse]
    total: int


class MarkAlertRead(BaseModel):
    isRead: bool = True
