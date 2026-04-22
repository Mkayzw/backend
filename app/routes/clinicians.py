from fastapi import APIRouter
from typing import List
from app.controllers import clinician_controller as controller
from app.schemas.clinician_schema import CreateClinician, UpdateClinician, ClinicianResponse

router = APIRouter(prefix="/api/clinicians", tags=["clinicians"])


@router.post("/", response_model=ClinicianResponse, status_code=201)
async def createClinician(payload: CreateClinician):
    return await controller.createClinician(payload)


@router.get("/", response_model=List[ClinicianResponse])
async def getAllClinicians():
    return await controller.getAllClinicians()


@router.get("/{clinicianId}", response_model=ClinicianResponse)
async def getClinician(clinicianId: int):
    return await controller.getClinician(clinicianId)


@router.put("/{clinicianId}", response_model=ClinicianResponse)
async def updateClinician(clinicianId: int, payload: UpdateClinician):
    return await controller.updateClinician(clinicianId, payload)


@router.delete("/{clinicianId}")
async def deleteClinician(clinicianId: int):
    return await controller.deleteClinician(clinicianId)
