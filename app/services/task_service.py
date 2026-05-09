from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status

from app.db import db
from app.services.auth import checkDataAccess
from app.services.clinical_workflow import build_task_from_alert


TASK_INCLUDE = {
    "patient": {"include": {"user": True}},
    "createdFromAlert": True,
}


async def _get_clinician_id_for_user(user_id: int) -> Optional[int]:
    clinician = await db.clinician.find_unique(where={"userId": user_id})
    return int(clinician.id) if clinician else None


async def listTasks(*, current_user: dict, status_filter: Optional[str] = None, due_filter: Optional[str] = None) -> list:
    where: dict = {}

    if current_user["role"] == "CLINICIAN":
        clinician_id = await _get_clinician_id_for_user(int(current_user["id"]))
        if clinician_id is None:
            return []
        where["assignedClinicianId"] = clinician_id

    if status_filter:
        where["status"] = status_filter

    normalized_due = (due_filter or "").strip().lower()
    if normalized_due == "overdue":
        where["dueAt"] = {"lt": datetime.now()}
        where["status"] = {"in": ["OPEN", "IN_PROGRESS"]}

    return await db.task.find_many(
        where=where,
        include=TASK_INCLUDE,
        order=[{"dueAt": "asc"}, {"createdAt": "desc"}],
    )


async def createTask(
    *,
    current_user: dict,
    patientId: Optional[int],
    assignedClinicianId: Optional[int],
    createdFromAlertId: Optional[int],
    title: str,
    description: Optional[str],
    dueAt,
    priority: Optional[str],
) -> dict:
    clinician_id = await _get_clinician_id_for_user(int(current_user["id"])) if current_user["role"] == "CLINICIAN" else None

    if createdFromAlertId is not None:
        alert = await db.alert.find_unique(where={"id": createdFromAlertId}, include={"patient": True})
        if not alert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source alert not found")
        has_access = await checkDataAccess(current_user, "patient", alert.patientId)
        if not has_access:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this alert")
        effective_assignee = assignedClinicianId or clinician_id or alert.assignedToClinicianId
        if effective_assignee is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="assignedClinicianId is required",
            )

        task_data = build_task_from_alert(
            alert={"id": alert.id, "patientId": alert.patientId, "priority": str(alert.priority)},
            assigned_clinician_id=effective_assignee,
            title=title,
            due_at=dueAt,
            description=description,
        )
    else:
        if patientId is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="patientId is required")
        has_access = await checkDataAccess(current_user, "patient", patientId)
        if not has_access and current_user["role"] != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this patient")

        effective_assignee = assignedClinicianId or clinician_id
        if effective_assignee is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="assignedClinicianId is required",
            )
        task_data = {
            "patientId": patientId,
            "assignedClinicianId": effective_assignee,
            "createdFromAlertId": None,
            "title": title.strip(),
            "description": (description or "").strip() or None,
            "dueAt": dueAt,
            "status": "OPEN",
            "priority": (priority or "MEDIUM").upper(),
        }

    if current_user["role"] == "CLINICIAN" and clinician_id is not None:
        task_data["assignedClinicianId"] = clinician_id

    created = await db.task.create(data=task_data, include=TASK_INCLUDE)
    return created


async def updateTask(
    *,
    taskId: int,
    current_user: dict,
    title: Optional[str] = None,
    description: Optional[str] = None,
    dueAt=None,
    priority: Optional[str] = None,
    status_value: Optional[str] = None,
) -> dict:
    task = await db.task.find_unique(where={"id": taskId}, include=TASK_INCLUDE)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if current_user["role"] == "CLINICIAN":
        clinician_id = await _get_clinician_id_for_user(int(current_user["id"]))
        if clinician_id != task.assignedClinicianId:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this task")

    data: dict = {}
    if title is not None:
        data["title"] = title.strip()
    if description is not None:
        data["description"] = description.strip() or None
    if dueAt is not None:
        data["dueAt"] = dueAt
    if priority is not None:
        data["priority"] = priority.upper()
    if status_value is not None:
        normalized_status = status_value.upper()
        data["status"] = normalized_status
        data["completedAt"] = datetime.now() if normalized_status == "DONE" else None

    return await db.task.update(where={"id": taskId}, data=data, include=TASK_INCLUDE)
