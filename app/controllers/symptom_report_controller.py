import json
from fastapi import HTTPException
from app.services import symptom_report as symptomReportService
from app.services import patient as patientService
from app.schemas.symptom_report_schema import CreateSymptomReport


async def createSymptomReport(payload: CreateSymptomReport):
    # Verify patient exists
    patient = await patientService.getPatientbyId(payload.patientId)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return await symptomReportService.createSymptomReport(
        patientId=payload.patientId,
        symptoms=payload.symptoms,
        severity=payload.severity,
        durationDays=payload.durationDays,
        frequency=payload.frequency,
        notes=payload.notes,
        temperature=payload.temperature,
        heartRate=payload.heartRate,
        medicationAdherent=payload.medicationAdherent,
    )


async def getSymptomReport(reportId: int):
    report = await symptomReportService.getSymptomReportById(reportId)
    if not report:
        raise HTTPException(status_code=404, detail="Symptom report not found")
    return report


async def getAllSymptomReports():
    return await symptomReportService.getAllSymptomReports()


async def getSymptomReportsByPatient(patientId: int):
    return await symptomReportService.getSymptomReportsByPatient(patientId)


async def deleteSymptomReport(reportId: int):
    existing = await symptomReportService.getSymptomReportById(reportId)
    if not existing:
        raise HTTPException(status_code=404, detail="Symptom report not found")
    await symptomReportService.deleteSymptomReport(reportId)
    return {"message": "Symptom report deleted successfully"}
