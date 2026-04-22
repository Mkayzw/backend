import json
from fastapi import HTTPException
from app.services import patient as patientService
from app.services import user as UserService
from app.schemas.patient_schema import CreatePatient, UpdatePatient


async def createPatient(payload: CreatePatient):
    user = await UserService.getUserById(payload.userId)
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")
    if str(user.role).upper() != "PATIENT":
        raise HTTPException(status_code=400, detail="User must have PATIENT role")

    existing = await patientService.getPatientbyUserId(payload.userId)
    if existing:
        raise HTTPException(status_code=409, detail="Patient profile already exists for this user")

    # Serialize list fields to JSON strings for DB storage
    chronic_json  = json.dumps(payload.chronicConditions) if payload.chronicConditions is not None else None
    allergies_json = json.dumps(payload.allergies)         if payload.allergies         is not None else None

    return await patientService.createPatient(
        userId=payload.userId,
        emergencyContact=payload.emergencyContact,
        dateOfBirth=payload.dateOfBirth,
        gender=payload.gender,
        chronicConditions=chronic_json,
        allergies=allergies_json,
        baselineStatus=payload.baselineStatus,
    )


async def getPatient(id: int):
    patient = await patientService.getPatientbyId(id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


async def getAllPatients():
    return await patientService.getAllPatients()


async def updatePatient(patientId: int, payload: UpdatePatient):
    existing = await patientService.getPatientbyId(patientId)
    if not existing:
        raise HTTPException(status_code=404, detail="Patient not found")

    chronic_json   = json.dumps(payload.chronicConditions) if payload.chronicConditions is not None else None
    allergies_json = json.dumps(payload.allergies)         if payload.allergies         is not None else None

    return await patientService.updatePatient(
        patientId=patientId,
        emergencyContact=payload.emergencyContact,
        dateOfBirth=payload.dateOfBirth,
        gender=payload.gender,
        chronicConditions=chronic_json,
        allergies=allergies_json,
        baselineStatus=payload.baselineStatus,
    )


async def deletePatient(patientId: int):
    existing = await patientService.getPatientbyId(patientId)
    if not existing:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    await patientService.deletePatient(patientId)
    return {"message": "Patient profile deleted successfully"}
