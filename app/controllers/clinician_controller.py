from fastapi import HTTPException
from app.schemas.clinician_schema import CreateClinician, UpdateClinician
from app.services import clinician as clinicianService
from app.services import user as userService


async def createClinician(payload: CreateClinician):
    user = await userService.getUserById(payload.userId)
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")
    if str(user.role).upper() != "CLINICIAN":
        raise HTTPException(status_code=400, detail="User must have CLINICIAN role")

    existing = await clinicianService.getClinicianByUserId(payload.userId)
    if existing:
        raise HTTPException(status_code=409, detail="Clinician profile already exists for this user")

    return await clinicianService.createClinician(
        userId=payload.userId,
        specialization=payload.specialization,
        fullName=payload.fullName,
    )


async def getClinician(clinicianId: int):
    clinician = await clinicianService.getClinicianById(clinicianId)
    if not clinician:
        raise HTTPException(status_code=404, detail="Clinician not found")
    return clinician


async def getAllClinicians():
    return await clinicianService.getAllClinicians()


async def updateClinician(clinicianId: int, payload: UpdateClinician):
    existing = await clinicianService.getClinicianById(clinicianId)
    if not existing:
        raise HTTPException(status_code=404, detail="Clinician not found")
    return await clinicianService.updateClinician(
        clinicianId=clinicianId,
        fullName=payload.fullName,
        specialization=payload.specialization,
    )


async def deleteClinician(clinicianId: int):
    existing = await clinicianService.getClinicianById(clinicianId)
    if not existing:
        raise HTTPException(status_code=404, detail="Clinician not found")
    await clinicianService.deleteClinician(clinicianId)
    return {"message": "Clinician profile deleted successfully"}
