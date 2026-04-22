from app.db import db


async def getClinicianById(clinicianId: int):
    return await db.clinician.find_unique(
        where={"id": clinicianId},
        include={"user": True},
    )


async def getClinicianByUserId(userId: int):
    return await db.clinician.find_unique(
        where={"userId": userId},
        include={"user": True},
    )


async def createClinician(userId: int, fullName: str, specialization: str):
    return await db.clinician.create(
        data={
            "userId":         userId,
            "fullName":       fullName,
            "specialization": specialization,
        },
        include={"user": True},
    )


async def updateClinician(
    clinicianId: int,
    fullName: str | None = None,
    specialization: str | None = None,
):
    data = {}
    if fullName is not None:
        data["fullName"] = fullName
    if specialization is not None:
        data["specialization"] = specialization

    return await db.clinician.update(
        where={"id": clinicianId},
        data=data,
        include={"user": True},
    )


async def deleteClinician(clinicianId: int):
    return await db.clinician.delete(where={"id": clinicianId})


async def getAllClinicians():
    return await db.clinician.find_many(include={"user": True})
