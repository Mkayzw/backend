"""
Follow-Up Response Service

Allows clinicians to respond to a patient's symptom report with guidance
("Continue medication and monitor for 24 hours.", etc.). Each response
notifies the patient via the internal notification log.
"""
from typing import Optional

from fastapi import HTTPException, status

from app.db import db
from app.services.auth import checkDataAccess
from app.services.notification_service import createNotification


RESPONSE_INCLUDE = {
    "clinician": {"include": {"user": True}},
    "patient": {"include": {"user": True}},
}


async def _get_clinician_id_for_user(user_id: int) -> Optional[int]:
    clinician = await db.clinician.find_unique(where={"userId": user_id})
    return int(clinician.id) if clinician else None


async def createFollowUpResponse(
    *,
    current_user: dict,
    symptomReportId: int,
    message: str,
    actionRequired: bool = False,
) -> dict:
    if current_user["role"] not in {"CLINICIAN", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Only clinicians may respond")

    if not message or not message.strip():
        raise HTTPException(status_code=422, detail="Response message is required")

    report = await db.symptomreport.find_unique(
        where={"id": symptomReportId}, include={"patient": {"include": {"user": True}}}
    )
    if not report:
        raise HTTPException(status_code=404, detail="Symptom report not found")

    has_access = await checkDataAccess(current_user, "patient", report.patientId)
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied to this patient")

    clinician_id: Optional[int] = None
    if current_user["role"] == "CLINICIAN":
        clinician_id = await _get_clinician_id_for_user(int(current_user["id"]))
        if clinician_id is None:
            raise HTTPException(status_code=403, detail="Clinician profile required")
    else:
        # Admin path — must specify a clinician owning the response
        any_clinician = await db.clinician.find_first(where={"userId": int(current_user["id"])})
        if any_clinician:
            clinician_id = int(any_clinician.id)
        else:
            # fall back to first active assignment for this patient
            assignment = await db.assignment.find_first(
                where={"patientId": report.patientId, "status": "ACTIVE"}
            )
            if not assignment:
                raise HTTPException(
                    status_code=422,
                    detail="No clinician profile found for admin to act on behalf of",
                )
            clinician_id = int(assignment.clinicianId)

    response = await db.followupresponse.create(
        data={
            "symptomReportId": symptomReportId,
            "clinicianId": clinician_id,
            "patientId": report.patientId,
            "message": message.strip(),
            "actionRequired": bool(actionRequired),
        },
        include=RESPONSE_INCLUDE,
    )

    # Notify the patient
    patient_user_id = getattr(getattr(report.patient, "user", None), "id", None) or report.patient.userId
    if patient_user_id is not None:
        try:
            await createNotification(
                userId=int(patient_user_id),
                title="Clinician response received",
                message=(
                    "Your clinician responded to your symptom report"
                    + (" — action required." if actionRequired else ".")
                ),
                type="FOLLOW_UP_RESPONSE",
                link="/patient/history",
            )
        except Exception:
            pass

    return response


async def listResponsesForReport(*, symptomReportId: int, current_user: dict) -> list:
    report = await db.symptomreport.find_unique(where={"id": symptomReportId})
    if not report:
        raise HTTPException(status_code=404, detail="Symptom report not found")

    has_access = await checkDataAccess(current_user, "symptom_report", symptomReportId)
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    return await db.followupresponse.find_many(
        where={"symptomReportId": symptomReportId},
        include=RESPONSE_INCLUDE,
        order={"createdAt": "desc"},
    )


async def listResponsesForPatient(*, patientId: int, current_user: dict) -> list:
    has_access = await checkDataAccess(current_user, "patient", patientId)
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    return await db.followupresponse.find_many(
        where={"patientId": patientId},
        include=RESPONSE_INCLUDE,
        order={"createdAt": "desc"},
    )
