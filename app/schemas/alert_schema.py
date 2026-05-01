"""
Alert Schemas

"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AlertResponse(BaseModel):
    id: int
    patientId: int
    symptomReportId: int
    priority: str
    alertType: str
    message: str
    isRead: bool
    createdAt: datetime
    
    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    alerts: list[AlertResponse]
    total: int


class MarkAlertRead(BaseModel):
    isRead: bool = True
