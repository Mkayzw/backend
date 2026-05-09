from typing import List, Optional

from app.services.alert_service import getAlerts, getAlertsByPatient, markAlertAsRead, triageAlert


async def getAlertsList(
    priority: Optional[str] = None,
    isRead: Optional[bool] = None,
    limit: int = 50,
    status_filter: Optional[str] = None,
    ownership: Optional[str] = None,
    current_user: dict | None = None,
) -> List[dict]:
    clinician_id = None
    if current_user and current_user.get("role") == "CLINICIAN":
        from app.db import db

        clinician = await db.clinician.find_unique(where={"userId": current_user["id"]})
        if clinician:
            clinician_id = clinician.id

    return await getAlerts(
        priority=priority,
        isRead=isRead,
        limit=limit,
        clinicianId=clinician_id,
        status_filter=status_filter,
        ownership=ownership,
    )


async def markAlertRead(alertId: int, current_user: dict | None = None) -> dict:
    return await markAlertAsRead(alertId, current_user=current_user)


async def updateAlertTriage(
    *,
    alertId: int,
    action: str,
    resolutionNote: str | None,
    snoozedUntil,
    assignedToClinicianId: int | None,
    current_user: dict,
) -> dict:
    return await triageAlert(
        alertId=alertId,
        action=action,
        current_user=current_user,
        resolutionNote=resolutionNote,
        snoozedUntil=snoozedUntil,
        assignedToClinicianId=assignedToClinicianId,
    )


async def getPatientAlerts(patientId: int, current_user: dict | None = None) -> List[dict]:
    if current_user:
        from fastapi import HTTPException, status
        from app.services.auth import checkDataAccess

        has_access = await checkDataAccess(current_user, "patient", patientId)
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this patient's alerts",
            )

    return await getAlertsByPatient(patientId)
