import asyncio
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status

from app.db import db
from app.services.auth import checkDataAccess
from app.services.clinical_workflow import apply_triage_action
from app.services.push_notifications import send_push_to_user_ids
from app.services.realtime_broker import broker


ALERT_INCLUDE = {
    "patient": {"include": {"user": True}},
    "symptomReport": True,
    "assignedToClinician": {"include": {"user": True}},
}


async def _get_clinician_id_for_user(user_id: int) -> Optional[int]:
    clinician = await db.clinician.find_unique(where={"userId": user_id})
    return int(clinician.id) if clinician else None


async def _owner_user_ids_for_alert(patient_id: int, assigned_clinician_id: int | None = None) -> set[int]:
    owner_user_ids: set[int] = set()
    assignments = await db.assignment.find_many(
        where={"patientId": patient_id, "status": "ACTIVE"},
        include={"clinician": True},
    )
    for assignment in assignments or []:
        clinician = getattr(assignment, "clinician", None)
        if clinician and getattr(clinician, "userId", None) is not None:
            owner_user_ids.add(int(clinician.userId))

    if assigned_clinician_id is not None:
        assignee = await db.clinician.find_unique(where={"id": assigned_clinician_id})
        if assignee and getattr(assignee, "userId", None) is not None:
            owner_user_ids.add(int(assignee.userId))

    return owner_user_ids


def _sort_key(alert) -> tuple[int, int]:
    priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    status_order = {
        "NEW": 0,
        "ESCALATED": 1,
        "ACKNOWLEDGED": 2,
        "IN_PROGRESS": 3,
        "SNOOZED": 4,
        "RESOLVED": 5,
    }
    priority_rank = priority_order.get(str(alert.priority), 3)
    status_rank = status_order.get(str(getattr(alert, "status", "NEW")), 6)
    timestamp = getattr(alert, "createdAt", None)
    ts_value = timestamp.timestamp() if timestamp and hasattr(timestamp, "timestamp") else 0
    return (status_rank * 10 + priority_rank, -ts_value)


async def generateAlert(
    patientId: int,
    symptomReportId: int,
    alertType: str,
    priority: str,
    message: str,
) -> dict:
    alert = await db.alert.create(
        data={
            "patientId": patientId,
            "symptomReportId": symptomReportId,
            "alertType": alertType,
            "priority": priority,
            "message": message,
            "isRead": False,
            "status": "NEW",
            "createdAt": datetime.now(),
        },
        include=ALERT_INCLUDE,
    )

    owner_user_ids = await _owner_user_ids_for_alert(patientId)

    try:
        asyncio.create_task(
            broker.publish_to_users(
                event="alert.created",
                data=alert,
                user_ids=owner_user_ids,
                also_admin=True,
                event_id=str(getattr(alert, "id", "")) or None,
            )
        )
    except Exception:
        pass

    try:
        patient_user = getattr(getattr(alert, "patient", None), "user", None)
        patient_name = None
        if patient_user is not None:
            patient_name = getattr(patient_user, "fullName", None) or getattr(patient_user, "email", None)

        title = "New patient alert"
        if getattr(alert, "priority", None) == "HIGH":
            title = "HIGH RISK alert"
        elif getattr(alert, "priority", None) == "MEDIUM":
            title = "Worsening trend alert"

        body = str(getattr(alert, "message", ""))[:240]
        if patient_name:
            body = f"{patient_name}: {body}"

        asyncio.create_task(
            send_push_to_user_ids(
                user_ids=owner_user_ids,
                message={
                    "type": "alert.created",
                    "title": title,
                    "body": body,
                    "url": "/clinician/alerts",
                    "alertId": getattr(alert, "id", None),
                    "patientId": patientId,
                    "priority": getattr(alert, "priority", None),
                    "alertType": getattr(alert, "alertType", None),
                },
            )
        )
    except Exception:
        pass

    return alert


async def generateRiskAlert(
    patientId: int,
    symptomReportId: int,
    riskLevel: str,
    riskExplanation: Optional[str] = None,
) -> Optional[dict]:
    if riskLevel != "HIGH":
        return None

    base = "Patient classified as HIGH RISK - immediate clinical attention required."
    message = f"{base}\nReasoning: {riskExplanation}" if riskExplanation else base

    return await generateAlert(
        patientId=patientId,
        symptomReportId=symptomReportId,
        alertType="HIGH_RISK",
        priority="HIGH",
        message=message,
    )


async def generateTrendAlert(
    patientId: int,
    symptomReportId: int,
    trendStatus: str,
    riskExplanation: Optional[str] = None,
) -> Optional[dict]:
    if trendStatus != "WORSENING":
        return None

    base = "Patient condition is WORSENING based on trend analysis clinical review recommended."
    message = f"{base}\nLatest report: {riskExplanation}" if riskExplanation else base

    return await generateAlert(
        patientId=patientId,
        symptomReportId=symptomReportId,
        alertType="WORSENING_TREND",
        priority="MEDIUM",
        message=message,
    )


async def getAlerts(
    *,
    priority: Optional[str] = None,
    isRead: Optional[bool] = None,
    limit: int = 50,
    clinicianId: Optional[int] = None,
    status_filter: Optional[str] = None,
    ownership: Optional[str] = None,
) -> list:
    where: dict = {}
    if priority is not None:
        where["priority"] = priority
    if isRead is not None:
        where["isRead"] = isRead
    if clinicianId is not None:
        where["patient"] = {"assignments": {"some": {"clinicianId": clinicianId, "status": "ACTIVE"}}}
    if status_filter:
        where["status"] = status_filter

    normalized_ownership = (ownership or "").strip().lower()
    if normalized_ownership == "mine" and clinicianId is not None:
        where["assignedToClinicianId"] = clinicianId
    elif normalized_ownership == "new":
        where["status"] = "NEW"
    elif normalized_ownership == "escalated":
        where["status"] = "ESCALATED"
    elif normalized_ownership == "resolved":
        where["status"] = "RESOLVED"
    elif normalized_ownership == "snoozed":
        where["status"] = "SNOOZED"

    alerts = await db.alert.find_many(
        where=where,
        include=ALERT_INCLUDE,
    )
    return sorted(alerts, key=_sort_key)[:limit]


async def markAlertAsRead(alertId: int, current_user: dict | None = None) -> dict:
    alert = await db.alert.find_unique(where={"id": alertId}, include=ALERT_INCLUDE)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert with id {alertId} not found")

    if current_user:
        has_access = await checkDataAccess(current_user, "patient", alert.patientId)
        if not has_access:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this alert")

    return await db.alert.update(where={"id": alertId}, data={"isRead": True}, include=ALERT_INCLUDE)


async def triageAlert(
    *,
    alertId: int,
    action: str,
    current_user: dict,
    resolutionNote: str | None = None,
    snoozedUntil=None,
    assignedToClinicianId: int | None = None,
) -> dict:
    alert = await db.alert.find_unique(where={"id": alertId}, include=ALERT_INCLUDE)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert with id {alertId} not found")

    has_access = await checkDataAccess(current_user, "patient", alert.patientId)
    if not has_access:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this alert")

    actor_clinician_id = None
    if current_user.get("role") == "CLINICIAN":
        actor_clinician_id = await _get_clinician_id_for_user(int(current_user["id"]))

    if action.upper() in {"ACKNOWLEDGE", "START", "ADD_NOTE", "RESOLVE", "SNOOZE"} and actor_clinician_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clinician profile required for this triage action",
        )

    try:
        updated_fields = apply_triage_action(
            {
                "id": alert.id,
                "patientId": alert.patientId,
                "priority": str(alert.priority),
                "status": str(alert.status),
                "assignedToClinicianId": alert.assignedToClinicianId,
                "resolutionNote": alert.resolutionNote,
                "resolvedAt": alert.resolvedAt,
                "snoozedUntil": alert.snoozedUntil,
                "isRead": alert.isRead,
            },
            action=action,
            actor_clinician_id=actor_clinician_id,
            resolution_note=resolutionNote,
            snoozed_until=snoozedUntil,
            escalate_to_clinician_id=assignedToClinicianId,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    data = {
        "status": updated_fields["status"],
        "assignedToClinicianId": updated_fields.get("assignedToClinicianId"),
        "resolutionNote": updated_fields.get("resolutionNote"),
        "resolvedAt": updated_fields.get("resolvedAt"),
        "snoozedUntil": updated_fields.get("snoozedUntil"),
        "isRead": updated_fields.get("isRead", alert.isRead),
        "lastActionAt": updated_fields.get("lastActionAt"),
        "lastActionByUserId": current_user["id"],
    }

    updated_alert = await db.alert.update(where={"id": alertId}, data=data, include=ALERT_INCLUDE)

    try:
        owner_user_ids = await _owner_user_ids_for_alert(
            updated_alert.patientId,
            getattr(updated_alert, "assignedToClinicianId", None),
        )
        asyncio.create_task(
            broker.publish_to_users(
                event="alert.updated",
                data=updated_alert,
                user_ids=owner_user_ids,
                also_admin=True,
                event_id=str(getattr(updated_alert, "id", "")) or None,
            )
        )
    except Exception:
        pass

    return updated_alert


async def getAlertsByPatient(patientId: int) -> list:
    return await db.alert.find_many(
        where={"patientId": patientId},
        order={"createdAt": "desc"},
        include=ALERT_INCLUDE,
    )
