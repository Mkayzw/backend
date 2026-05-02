"""
Alert Controller

Handles alert-related HTTP requests.


"""
from fastapi import HTTPException, status, Depends
from typing import Optional, List
from app.services.alert_service import getAlerts, markAlertAsRead, getAlertsByPatient
from app.services.auth import requireRole


async def getAlertsList(
    priority: Optional[str] = None,
    isRead: Optional[bool] = None,
    limit: int = 50,
    current_user: dict = None
) -> List[dict]:
    """
    Get alerts with optional filtering.

    Only CLINICIAN and ADMIN roles can access alerts.


    """
    clinicianId = None
    if current_user and current_user.get("role") == "CLINICIAN":
        from app.db import db
        clinician = await db.clinician.find_unique(where={"userId": current_user["id"]})
        if clinician:
            clinicianId = clinician.id

    alerts = await getAlerts(priority=priority, isRead=isRead, limit=limit, clinicianId=clinicianId)
    return alerts


async def markAlertRead(
    alertId: int,
    current_user: dict = None
) -> dict:
    """
    Mark an alert as read.


    """
    try:
        alert = await markAlertAsRead(alertId)
        return alert
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with id {alertId} not found"
        )


async def getPatientAlerts(
    patientId: int,
    current_user: dict = None
) -> List[dict]:
    """
    Get all alerts for a specific patient.
    """
    if current_user:
        from app.services.auth import checkDataAccess
        has_access = await checkDataAccess(current_user, "patient", patientId)
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this patient's alerts"
            )

    alerts = await getAlertsByPatient(patientId)
    return alerts
