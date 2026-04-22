from app.db import db
from datetime import datetime


async def createAssignment(
    patientId: int,
    clinicianId: int,
    careContext: str = "GENERAL_REVIEW",
    reason: str | None = None,
):
    return await db.assignment.create(
        data={
            "patientId":   patientId,
            "clinicianId": clinicianId,
            "status":      "ACTIVE",
            "careContext": careContext,
            "reason":      reason,
            "assignedAt":  datetime.now(),
        },
        include={
            "patient":   {"include": {"user": True}},
            "clinician": {"include": {"user": True}},
        },
    )


async def getAssignmentById(assignmentId: int):
    return await db.assignment.find_unique(
        where={"id": assignmentId},
        include={
            "patient":   {"include": {"user": True}},
            "clinician": {"include": {"user": True}},
        },
    )


async def getAllAssignments():
    return await db.assignment.find_many(
        include={
            "patient":   {"include": {"user": True}},
            "clinician": {"include": {"user": True}},
        },
    )


async def updateAssignmentStatus(assignmentId: int, status: str):
    data: dict = {"status": status}
    # Record when an assignment ends
    if status == "INACTIVE":
        data["endedAt"] = datetime.now()

    return await db.assignment.update(
        where={"id": assignmentId},
        data=data,
        include={
            "patient":   {"include": {"user": True}},
            "clinician": {"include": {"user": True}},
        },
    )


async def deleteAssignment(assignmentId: int):
    return await db.assignment.delete(where={"id": assignmentId})


async def checkActiveAssignmentExists(patientId: int, clinicianId: int):
    """
    Return the first ACTIVE assignment for this patient-clinician pair, or None.

    The DB no longer has a unique constraint on (patientId, clinicianId).
    Active-only uniqueness is enforced here at the service layer.
    """
    return await db.assignment.find_first(
        where={
            "patientId":   patientId,
            "clinicianId": clinicianId,
            "status":      "ACTIVE",
        }
    )


async def getAssignmentsByPatient(patientId: int):
    return await db.assignment.find_many(
        where={"patientId": patientId},
        include={"clinician": {"include": {"user": True}}},
        order={"assignedAt": "desc"},
    )
