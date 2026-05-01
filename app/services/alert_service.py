"""
Alert Generation Service

Generates alert records when:
  - Risk level is HIGH   → HIGH_RISK alert
  - Trend is WORSENING   → WORSENING_TREND alert

Alert messages embed the riskExplanation so clinicians see the full reasoning
trail without opening the symptom report.
"""
from app.db import db
from datetime import datetime
from typing import Optional, List


async def generateAlert(
    patientId: int,
    symptomReportId: int,
    alertType: str,
    priority: str,
    message: str,
) -> dict:
    """
    Persist an alert record linked to a patient and the triggering report.
    """
    return await db.alert.create(
        data={
            "patientId":       patientId,
            "symptomReportId": symptomReportId,
            "alertType":       alertType,
            "priority":        priority,
            "message":         message,
            "isRead":          False,
            "createdAt":       datetime.now(),
        },
        include={
            "patient":       {"include": {"user": True}},
            "symptomReport": True,
        },
    )


async def generateRiskAlert(
    patientId: int,
    symptomReportId: int,
    riskLevel: str,
    riskExplanation: Optional[str] = None,
) -> Optional[dict]:
    """
    Generate a HIGH_RISK alert.  Only fires when riskLevel == 'HIGH'.

    The riskExplanation is embedded directly in the alert message so the
    clinician sees the full reasoning trail without opening the report.
    """
    if riskLevel != "HIGH":
        return None

    base = "Patient classified as HIGH RISK — immediate clinical attention required."
    message = f"{base}\nReasoning: {riskExplanation}" if riskExplanation else base

    return await generateAlert(
        patientId=patientId,
        symptomReportId=symptomReportId,
        alertType="HIGH_RISK",
        priority="HIGH",
        message=message,
    )


async def generateTrendAlert(
    patientId: int,
    symptomReportId: int,
    trendStatus: str,
    riskExplanation: Optional[str] = None,
) -> Optional[dict]:
    """
    Generate a WORSENING_TREND alert.  Only fires when trendStatus == 'WORSENING'.
    """
    if trendStatus != "WORSENING":
        return None

    base = "Patient condition is WORSENING based on trend analysis clinical review recommended."
    message = f"{base}\nLatest report: {riskExplanation}" if riskExplanation else base

    return await generateAlert(
        patientId=patientId,
        symptomReportId=symptomReportId,
        alertType="WORSENING_TREND",
        priority="MEDIUM",
        message=message,
    )


async def getAlerts(
    priority: Optional[str] = None,
    isRead: Optional[bool] = None,
    limit: int = 50,
) -> List:
    """
    Retrieve alerts sorted by priority (HIGH first) then timestamp (newest first).
    """
    where: dict = {}
    if priority is not None:
        where["priority"] = priority
    if isRead is not None:
        where["isRead"] = isRead

    alerts = await db.alert.find_many(
        where=where,
        order={"createdAt": "desc"},
        include={
            "patient":       {"include": {"user": True}},
            "symptomReport": True,
        },
    )

    # Prisma sorts enums alphabetically. Sort in Python: HIGH → MEDIUM → LOW.
    priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    sorted_alerts = sorted(
        alerts,
        key=lambda a: (priority_order.get(str(a.priority), 3), -a.createdAt.timestamp()),
    )

    return sorted_alerts[:limit]


async def markAlertAsRead(alertId: int) -> dict:
    return await db.alert.update(
        where={"id": alertId},
        data={"isRead": True},
    )


async def getAlertsByPatient(patientId: int) -> list:
    return await db.alert.find_many(
        where={"patientId": patientId},
        order={"createdAt": "desc"},
        include={"symptomReport": True},
    )
