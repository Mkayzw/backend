from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.controllers.alert_controller import getAlertsList, getPatientAlerts, markAlertRead, updateAlertTriage
from app.schemas.alert_schema import AlertResponse, AlertTriageRequest
from app.services.auth import requireRole

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/", response_model=List[AlertResponse])
async def list_alerts(
    priority: Optional[str] = Query(None, description="Filter by priority (LOW, MEDIUM, HIGH)"),
    isRead: Optional[bool] = Query(None, description="Filter by read status"),
    status: Optional[str] = Query(None, description="Filter by alert workflow status"),
    ownership: Optional[str] = Query(None, description="Use mine, new, escalated, resolved, snoozed"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of alerts to return"),
    current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"])),
) -> List[AlertResponse]:
    return await getAlertsList(
        priority=priority,
        isRead=isRead,
        limit=limit,
        status_filter=status,
        ownership=ownership,
        current_user=current_user,
    )


@router.put("/{alertId}/read", response_model=AlertResponse)
async def mark_alert_read(
    alertId: int,
    current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"])),
) -> AlertResponse:
    return await markAlertRead(alertId, current_user=current_user)


@router.patch("/{alertId}/triage", response_model=AlertResponse)
async def triage_alert(
    alertId: int,
    payload: AlertTriageRequest,
    current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"])),
) -> AlertResponse:
    return await updateAlertTriage(
        alertId=alertId,
        action=payload.action,
        resolutionNote=payload.resolutionNote,
        snoozedUntil=payload.snoozedUntil,
        assignedToClinicianId=payload.assignedToClinicianId,
        current_user=current_user,
    )


@router.get("/patient/{patientId}", response_model=List[AlertResponse])
async def get_patient_alerts(
    patientId: int,
    current_user: dict = Depends(requireRole(["CLINICIAN", "ADMIN"])),
) -> List[AlertResponse]:
    return await getPatientAlerts(patientId, current_user=current_user)
