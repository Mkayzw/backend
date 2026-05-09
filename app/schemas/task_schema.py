from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.patient_schema import PatientResponse


class CreateTaskRequest(BaseModel):
    patientId: Optional[int] = None
    assignedClinicianId: Optional[int] = None
    createdFromAlertId: Optional[int] = None
    title: str
    description: Optional[str] = None
    dueAt: Optional[datetime] = None
    priority: Optional[str] = None


class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    dueAt: Optional[datetime] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    patientId: int
    assignedClinicianId: int
    createdFromAlertId: Optional[int] = None
    title: str
    description: Optional[str] = None
    dueAt: Optional[datetime] = None
    status: str
    priority: str
    completedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
    patient: Optional[PatientResponse] = None
