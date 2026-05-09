"""
Symptom Report Service — Intelligence Layer Integration

Flow for every new report:
  1. Fetch patient chronic conditions
  2. Fetch active assignment care context
  3. Create report with structured fields
  4. Run risk classification (context-aware)
  5. Run trend analysis
  6. Update report, patient risk/trend, lastReportTime
  7. Generate HIGH_RISK and/or WORSENING_TREND alerts if triggered
"""
import json
from datetime import datetime
from typing import Optional, List

from fastapi import HTTPException, status

from app.db import db
from app.services.risk_classification import classifySymptomReport
from app.services.trend_analysis import analyzeTrend
from app.services.alert_service import generateRiskAlert, generateTrendAlert


async def createSymptomReport(
    patientId: int,
    symptoms: List[str],
    severity: str,
    durationDays: int,
    frequency: str,
    notes: Optional[str] = None,
    temperature: Optional[float] = None,
    heartRate: Optional[int] = None,
    medicationAdherent: Optional[bool] = None,
) -> dict:
    """
    Create a structured symptom report and run the full intelligence pipeline.

    Notes are stored as supplementary context only — they are NOT used for
    risk scoring. All scoring is driven by the structured fields.
    """
    # 1. Resolve patient's clinical context (chronic conditions)
    patient = await db.patient.find_unique(where={"id": patientId})
    chronic_conditions: List[str] = []
    if patient and patient.chronicConditions:
        try:
            chronic_conditions = json.loads(patient.chronicConditions)
        except (json.JSONDecodeError, TypeError):
            chronic_conditions = []

    # 2. Resolve care context from the most recent active assignment
    active_assignment = await db.assignment.find_first(
        where={"patientId": patientId, "status": "ACTIVE"},
        order={"assignedAt": "desc"},
    )
    if not active_assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient must have an active clinician assignment before submitting a symptom report.",
        )

    care_context: str = "GENERAL_REVIEW"
    if active_assignment.careContext:
        care_context = str(active_assignment.careContext)

    # 3. Create the report with default LOW risk (will be updated below)
    report = await db.symptomreport.create(
        data={
            "patientId":          patientId,
            "notes":              notes,
            "symptoms":           json.dumps(symptoms),
            "severity":           severity,
            "durationDays":       durationDays,
            "frequency":          frequency,
            "temperature":        temperature,
            "heartRate":          heartRate,
            "medicationAdherent": medicationAdherent,
            "riskLevel":          "LOW",
            "riskScore":          0.0,
        }
    )

    # 4. Risk classification — uses full clinical context
    risk_level, risk_score, risk_factors_json, risk_explanation = await classifySymptomReport(
        patientId=patientId,
        symptoms=symptoms,
        severity=severity,
        durationDays=durationDays,
        frequency=frequency,
        temperature=temperature,
        heartRate=heartRate,
        medicationAdherent=medicationAdherent,
        careContext=care_context,
        chronicConditions=chronic_conditions,
    )

    # 5. Trend analysis — compares current risk score against recent history
    trend_status, _ = await analyzeTrend(patientId, risk_score)

    # 6. Update report with computed risk data
    updated_report = await db.symptomreport.update(
        where={"id": report.id},
        data={
            "riskLevel":       risk_level,
            "riskScore":       risk_score,
            "riskFactors":     risk_factors_json,
            "riskExplanation": risk_explanation,
        },
    )

    # 7. Update patient record
    now = datetime.now()
    await db.patient.update(
        where={"id": patientId},
        data={
            "currentRiskLevel":   risk_level,
            "currentTrendStatus": trend_status,
            "lastRiskUpdate":     now,
            "lastTrendUpdate":    now,
            "lastReportTime":     now,
        },
    )

    # 8. Alert generation
    if risk_level == "HIGH":
        await generateRiskAlert(patientId, report.id, risk_level, risk_explanation)

    if trend_status == "WORSENING":
        await generateTrendAlert(patientId, report.id, trend_status, risk_explanation)

    return updated_report


async def getSymptomReportById(reportId: int) -> Optional[dict]:
    return await db.symptomreport.find_unique(
        where={"id": reportId},
        include={"patient": {"include": {"user": True}}},
    )


async def getAllSymptomReports() -> list:
    return await db.symptomreport.find_many(
        order={"createdAt": "desc"},
        include={"patient": {"include": {"user": True}}},
    )


async def getSymptomReportsByPatient(patientId: int) -> list:
    return await db.symptomreport.find_many(
        where={"patientId": patientId},
        order={"createdAt": "desc"},
        include={"patient": {"include": {"user": True}}},
    )


async def deleteSymptomReport(reportId: int) -> Optional[dict]:
    return await db.symptomreport.delete(where={"id": reportId})
