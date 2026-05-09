from datetime import UTC, datetime
from typing import Any


def _utcnow() -> datetime:
    return datetime.now(UTC)


def apply_triage_action(
    alert: dict[str, Any],
    *,
    action: str,
    actor_clinician_id: int | None,
    resolution_note: str | None = None,
    snoozed_until: datetime | None = None,
    escalate_to_clinician_id: int | None = None,
) -> dict[str, Any]:
    action_name = (action or "").strip().upper()
    if not action_name:
        raise ValueError("action is required")

    updated = dict(alert)
    updated["lastActionAt"] = _utcnow()

    if action_name == "ACKNOWLEDGE":
        if actor_clinician_id is None:
            raise ValueError("actor clinician id is required")
        updated["status"] = "ACKNOWLEDGED"
        updated["assignedToClinicianId"] = actor_clinician_id
        updated["isRead"] = True
        updated["resolvedAt"] = None
        return updated

    if action_name == "START":
        if actor_clinician_id is None:
            raise ValueError("actor clinician id is required")
        updated["status"] = "IN_PROGRESS"
        updated["assignedToClinicianId"] = actor_clinician_id
        updated["isRead"] = True
        return updated

    if action_name == "ADD_NOTE":
        note = (resolution_note or "").strip()
        if not note:
            raise ValueError("resolution note is required")
        if actor_clinician_id is None and not updated.get("assignedToClinicianId"):
            raise ValueError("actor clinician id is required")
        updated["resolutionNote"] = note
        updated["assignedToClinicianId"] = updated.get("assignedToClinicianId") or actor_clinician_id
        return updated

    if action_name == "RESOLVE":
        note = (resolution_note or "").strip()
        if not note:
            raise ValueError("resolution note is required")
        if actor_clinician_id is None and not updated.get("assignedToClinicianId"):
            raise ValueError("actor clinician id is required")
        updated["status"] = "RESOLVED"
        updated["assignedToClinicianId"] = updated.get("assignedToClinicianId") or actor_clinician_id
        updated["resolutionNote"] = note
        updated["resolvedAt"] = _utcnow()
        updated["snoozedUntil"] = None
        updated["isRead"] = True
        return updated

    if action_name == "SNOOZE":
        if snoozed_until is None:
            raise ValueError("snoozed_until is required")
        if actor_clinician_id is None and not updated.get("assignedToClinicianId"):
            raise ValueError("actor clinician id is required")
        updated["status"] = "SNOOZED"
        updated["assignedToClinicianId"] = updated.get("assignedToClinicianId") or actor_clinician_id
        updated["snoozedUntil"] = snoozed_until
        updated["resolvedAt"] = None
        updated["isRead"] = True
        return updated

    if action_name == "ESCALATE":
        updated["status"] = "ESCALATED"
        updated["assignedToClinicianId"] = escalate_to_clinician_id
        updated["resolutionNote"] = (resolution_note or "").strip() or updated.get("resolutionNote")
        updated["resolvedAt"] = None
        updated["isRead"] = True
        return updated

    raise ValueError(f"unsupported alert action: {action_name}")


def build_task_from_alert(
    *,
    alert: dict[str, Any],
    assigned_clinician_id: int,
    title: str,
    due_at: datetime | None,
    description: str | None = None,
) -> dict[str, Any]:
    clean_title = (title or "").strip()
    if not clean_title:
        raise ValueError("title is required")

    return {
        "patientId": alert["patientId"],
        "assignedClinicianId": assigned_clinician_id,
        "createdFromAlertId": alert["id"],
        "title": clean_title,
        "description": (description or "").strip() or None,
        "dueAt": due_at,
        "status": "OPEN",
        "priority": str(alert.get("priority") or "MEDIUM"),
    }
