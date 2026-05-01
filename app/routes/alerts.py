"""
Alert Routes


"""
from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from app.controllers.alert_controller import getAlertsList, markAlertRead, getPatientAlerts
from app.services.auth import requireRole

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/")
async def list_alerts(
    priority: Optional[str] = Query(None, description="Filter by priority (LOW, MEDIUM, HIGH)"),
    isRead: Optional[bool] = Query(None, description="Filter by read status"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of alerts to return"),
    current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"]))
) -> List[dict]:
    """
    Get alerts with optional filtering.
    
    Returns alerts sorted by priority (HIGH first) and timestamp (most recent first).
    
    """
    return await getAlertsList(priority=priority, isRead=isRead, limit=limit, current_user=current_user)


@router.put("/{alertId}/read")
async def mark_alert_read(
    alertId: int,
    current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"]))
) -> dict:
    """
    Mark an alert as read.
    

    """
    return await markAlertRead(alertId, current_user=current_user)


@router.get("/patient/{patientId}")
async def get_patient_alerts(
    patientId: int,
    current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"]))
) -> List[dict]:
    """
    Get all alerts for a specific patient.
    """
    return await getPatientAlerts(patientId, current_user=current_user)
