from fastapi import APIRouter
from typing import List
from app.controllers import patient_controller as controller
from app.schemas.patient_schema import CreatePatient, UpdatePatient, PatientResponse

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.post("/", response_model=PatientResponse, status_code=201)
async def createPatient(payload: CreatePatient):
    return await controller.createPatient(payload)


@router.get("/", response_model=List[PatientResponse])
async def getAllPatients():
    return await controller.getAllPatients()


@router.get("/{patientId}", response_model=PatientResponse)
async def getPatient(patientId: int):
    return await controller.getPatient(patientId)


@router.put("/{patientId}", response_model=PatientResponse)
async def updatePatient(patientId: int, payload: UpdatePatient):
    return await controller.updatePatient(patientId, payload)


@router.delete("/{patientId}")
async def deletePatient(patientId: int):
    return await controller.deletePatient(patientId)
