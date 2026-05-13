"""
Follow-Up Appointment Service

Lightweight scheduling: clinicians can book a follow-up date for a patient
after reviewing a report. Status lifecycle: SCHEDULED → COMPLETED / CANCELLED / MISSED.
"""
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status

from app.db import db
from app.services.auth import checkDataAccess
from app.services.notification_service import createNotification


APPOINTMENT_INCLUDE = {
    "clinician": {"include": {"user": True}},
    "patient": {"include": {"user": True}},
}

VALID_STATUSES = {"SCHEDULED", "COMPLETED", "CANCELLED", "MISSED", "CONFIRMED", "DECLINED", "RESCHEDULE_REQUESTED"}
PATIENT_ALLOWED_STATUSES = {"CONFIRMED", "DECLINED", "RESCHEDULE_REQUESTED"}


async def _get_clinician_id_for_user(user_id: int) -> Optional[int]:
    clinician = await db.clinician.find_unique(where={"userId": user_id})
    return int(clinician.id) if clinician else None


async def createAppointment(
    *,
    current_user: dict,
    patientId: int,
    scheduledAt: datetime,
    reason: str,
    clinicianId: Optional[int] = None,
) -> dict:
    if current_user["role"] not in {"CLINICIAN", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Only clinicians may schedule")

    if not reason or not reason.strip():
        raise HTTPException(status_code=422, detail="reason is required")

    has_access = await checkDataAccess(current_user, "patient", patientId)
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied to this patient")

    effective_clinician_id = clinicianId
    if current_user["role"] == "CLINICIAN":
        effective_clinician_id = await _get_clinician_id_for_user(int(current_user["id"]))
        if effective_clinician_id is None:
            raise HTTPException(status_code=403, detail="Clinician profile required")
    elif effective_clinician_id is None:
        raise HTTPException(
            status_code=422,
            detail="clinicianId is required when scheduling as ADMIN",
        )

    appt = await db.followupappointment.create(
        data={
            "patientId": patientId,
            "clinicianId": effective_clinician_id,
            "scheduledAt": scheduledAt,
            "reason": reason.strip(),
            "status": "SCHEDULED",
        },
        include=APPOINTMENT_INCLUDE,
    )

    # Notify the patient
    patient = await db.patient.find_unique(
        where={"id": patientId}, include={"user": True}
    )
    if patient and patient.user:
        try:
            await createNotification(
                userId=int(patient.user.id),
                title="Follow-up scheduled",
                message=(
                    f"A follow-up has been scheduled for "
                    f"{scheduledAt.strftime('%b %d, %Y at %H:%M')}: {reason.strip()}"
                ),
                type="FOLLOW_UP_SCHEDULED",
                link="/patient",
            )
        except Exception:
            pass

    return appt


async def updateAppointment(
    *,
    appointmentId: int,
    current_user: dict,
    scheduledAt: Optional[datetime] = None,
    reason: Optional[str] = None,
    status_value: Optional[str] = None,
) -> dict:
    appt = await db.followupappointment.find_unique(
        where={"id": appointmentId}, include=APPOINTMENT_INCLUDE
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    has_access = await checkDataAccess(current_user, "patient", appt.patientId)
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    # Patients may only update the status of their own appointments
    if current_user["role"] == "PATIENT":
        patient_record = await db.patient.find_first(
            where={"userId": int(current_user["id"])}
        )
        if not patient_record or patient_record.id != appt.patientId:
            raise HTTPException(status_code=403, detail="You can only update your own appointments")
        if scheduledAt is not None or reason is not None:
            raise HTTPException(status_code=403, detail="Patients may only update appointment status")
        if status_value is not None:
            normalized = status_value.upper()
            if normalized not in PATIENT_ALLOWED_STATUSES:
                raise HTTPException(
                    status_code=422,
                    detail=f"Patients may set status to: {sorted(PATIENT_ALLOWED_STATUSES)}",
                )

    data: dict = {}
    if scheduledAt is not None:
        data["scheduledAt"] = scheduledAt
    if reason is not None:
        cleaned = reason.strip()
        if not cleaned:
            raise HTTPException(status_code=422, detail="reason cannot be empty")
        data["reason"] = cleaned
    if status_value is not None:
        normalized = status_value.upper()
        if normalized not in VALID_STATUSES:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid status. Allowed: {sorted(VALID_STATUSES)}",
            )
        data["status"] = normalized

    if not data:
        return appt

    return await db.followupappointment.update(
        where={"id": appointmentId}, data=data, include=APPOINTMENT_INCLUDE
    )


async def listAppointments(
    *,
    current_user: dict,
    patientId: Optional[int] = None,
    status_filter: Optional[str] = None,
    upcoming_only: bool = False,
) -> list:
    where: dict = {}

    if patientId is not None:
        has_access = await checkDataAccess(current_user, "patient", patientId)
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
        where["patientId"] = patientId
    else:
        # Scope to caller
        if current_user["role"] == "CLINICIAN":
            clinician_id = await _get_clinician_id_for_user(int(current_user["id"]))
            if clinician_id is None:
                return []
            where["clinicianId"] = clinician_id
        elif current_user["role"] == "PATIENT":
            patient = await db.patient.find_first(
                where={"userId": int(current_user["id"])}
            )
            if not patient:
                return []
            where["patientId"] = patient.id
        # ADMIN: no scoping

    if status_filter:
        where["status"] = status_filter.upper()

    if upcoming_only:
        where["scheduledAt"] = {"gte": datetime.utcnow()}
        where.setdefault("status", "SCHEDULED")

    return await db.followupappointment.find_many(
        where=where,
        include=APPOINTMENT_INCLUDE,
        order=[{"scheduledAt": "asc"}],
    )
