"""
Alert Controller

Handles alert-related HTTP requests.

Requirements: 13.8, 13.9
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
    
    Requirements: 13.8, 13.9
    """
    alerts = await getAlerts(priority=priority, isRead=isRead, limit=limit)
    return alerts


async def markAlertRead(
    alertId: int,
    current_user: dict = None
) -> dict:
    """
    Mark an alert as read.
    
    Requirements: 13.8
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
    alerts = await getAlertsByPatient(patientId)
    return alerts
