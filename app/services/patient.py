from app.db import db
from datetime import datetime


async def getPatientbyId(patientId: int):
    return await db.patient.find_unique(
        where={"id": patientId},
        include={"user": True},
    )


async def getPatientbyUserId(userId: int):
    return await db.patient.find_unique(
        where={"userId": userId},
        include={"user": True},
    )


async def createPatient(
    userId: int,
    emergencyContact: str,
    gender: str,
    dateOfBirth: datetime,
    address: str | None = None,
    chronicConditions: str | None = None,  # JSON array string e.g. '["asthma"]'
    allergies: str | None = None,           # JSON array string e.g. '["penicillin"]'
    baselineStatus: str | None = None,      # "stable" | "fragile" | "unknown"
):
    return await db.patient.create(
        data={
            "userId":            userId,
            "emergencyContact":  emergencyContact,
            "address":           address,
            "dateOfBirth":       dateOfBirth,
            "gender":            gender,
            "chronicConditions": chronicConditions,
            "allergies":         allergies,
            "baselineStatus":    baselineStatus,
        },
        include={"user": True},
    )


async def updatePatient(
    patientId: int,
    emergencyContact: str | None = None,
    address: str | None = None,
    dateOfBirth=None,
    gender: str | None = None,
    chronicConditions: str | None = None,
    allergies: str | None = None,
    baselineStatus: str | None = None,
):
    data = {}
    if emergencyContact is not None:
        data["emergencyContact"] = emergencyContact
    if address is not None:
        data["address"] = address
    if dateOfBirth is not None:
        data["dateOfBirth"] = dateOfBirth
    if gender is not None:
        data["gender"] = gender
    if chronicConditions is not None:
        data["chronicConditions"] = chronicConditions
    if allergies is not None:
        data["allergies"] = allergies
    if baselineStatus is not None:
        data["baselineStatus"] = baselineStatus

    return await db.patient.update(
        where={"id": patientId},
        data=data,
        include={"user": True},
    )


async def deletePatient(patientId: int):
    return await db.patient.delete(where={"id": patientId})


async def getAllPatients():
    return await db.patient.find_many(include={"user": True})
