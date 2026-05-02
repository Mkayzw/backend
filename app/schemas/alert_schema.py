"""
Alert Schemas

"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.schemas.patient_schema import PatientResponse


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    patientId: int
    symptomReportId: int
    priority: str
    alertType: str
    message: str
    isRead: bool
    createdAt: datetime
    patient: Optional[PatientResponse] = None


class AlertListResponse(BaseModel):
    alerts: list[AlertResponse]
    total: int


class MarkAlertRead(BaseModel):
    isRead: bool = True
