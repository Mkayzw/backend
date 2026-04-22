from fastapi import APIRouter
from typing import List
from app.controllers import symptom_report_controller as controller
from app.schemas.symptom_report_schema import CreateSymptomReport, SymptomReportResponse

router = APIRouter(prefix="/api/symptom-reports", tags=["symptom-reports"])


@router.post("/", response_model=SymptomReportResponse, status_code=201)
async def createSymptomReport(payload: CreateSymptomReport):
    return await controller.createSymptomReport(payload)


@router.get("/", response_model=List[SymptomReportResponse])
async def getAllSymptomReports():
    return await controller.getAllSymptomReports()


@router.get("/patient/{patientId}", response_model=List[SymptomReportResponse])
async def getSymptomReportsByPatient(patientId: int):
    return await controller.getSymptomReportsByPatient(patientId)


@router.get("/{reportId}", response_model=SymptomReportResponse)
async def getSymptomReport(reportId: int):
    return await controller.getSymptomReport(reportId)


@router.delete("/{reportId}")
async def deleteSymptomReport(reportId: int):
    return await controller.deleteSymptomReport(reportId)
