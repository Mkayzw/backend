"""
Trend Analysis Engine

Analyzes sequential symptom reports to classify patient trajectory as:
  IMPROVING  — risk score decreasing significantly compared to recent baseline
  STABLE     — no significant change in risk score
  WORSENING  — risk score increasing significantly (triggers alert)

Design decisions:
  - Uses the highly granular `riskScore` (0.0 to 15.0+) computed by the intelligence pipeline.
  - Requires at least 3 total reports (1 current + 2 past) before making a trend call (returns STABLE otherwise).
  - Calculates the baseline by averaging up to the 3 most recent *past* reports (strictly excluding the current report from the baseline).
  - Rule overrides (applied before the delta threshold):
      1. High-risk spike override: if any past report had a riskScore >= 10.0, the patient is WORSENING.
      2. Volatility override: if the spread between the highest and lowest past scores > 5.0, the patient is WORSENING.
  - If no override applies, triggers IMPROVING or WORSENING if the delta exceeds +/- 2.0; otherwise STABLE.
"""
from app.db import db
from datetime import datetime
from typing import List, Tuple
import re

MIN_HISTORICAL_REPORTS = 3

def _calculateSeverityScore(report) -> float:
    """
    Extracts the intelligence pipeline's 'riskScore' directly from the report for high granularity.
    """
    return float(getattr(report, 'riskScore', 0.0))


async def getHistoricalReports(patientId: int, limit: int = 4) -> list:
    """
    Retrieve the most recent historical symptom reports for a patient.
    Ordered by createdAt descending (most recent first).
    """
    return await db.symptomreport.find_many(
        where={"patientId": patientId},
        order={"createdAt": "desc"},
        take=limit,
    )


async def analyzeTrend(patientId: int, currentRiskScore: float) -> Tuple[str, dict]:
    """
    Analyze the patient's health trend based on sequential symptom reports.

    Args:
        patientId:        Patient to analyze.
        currentRiskScore: Granular risk score of the report being submitted right now.

    Returns: (trend_status, trend_details_dict)
    """
    # Fetch historical reports (get enough to have up to 5 past reports, just in case)
    historical = await getHistoricalReports(patientId, limit=6)

    # Exclude the current report (which is historical[0] since we order by desc)
    past_reports = historical[1:] if len(historical) > 0 else []

    # Not enough history → default STABLE
    # We require at least 2 past reports (meaning 3 total reports including current)
    if len(past_reports) < 2:
        return "STABLE", {
            "reason": "insufficient_history",
            "report_count": len(past_reports) + 1,
        }

    # Score historical reports (average the past reports, up to 3)
    historical_scores = [
        _calculateSeverityScore(r)
        for r in past_reports[:3]
    ]

    # Score current submission
    current_score = float(currentRiskScore)

    avg_historical = sum(historical_scores) / len(historical_scores)
    severity_change = current_score - avg_historical

    trend_details = {
        "current_score":          round(current_score, 2),
        "avg_historical_score":   round(avg_historical, 2),
        "severity_change":        round(severity_change, 2),
        "historical_scores":      [round(s, 2) for s in historical_scores],
    }

    # Thresholds — tuned for riskScore which ranges ~ 0.0 to 15.0+
    IMPROVING_THRESHOLD = -2.0
    WORSENING_THRESHOLD = 2.0

    # Override 1: High-risk spike — any recent report >= 10.0 indicates an unstable patient
    if any(score >= 10.0 for score in historical_scores):
        trend_status = "WORSENING"
        trend_details["override"] = "high_risk_spike"

    # Override 2: Volatility — large swings in recent scores indicate an unstable condition
    elif max(historical_scores) - min(historical_scores) > 5.0:
        trend_status = "WORSENING"
        trend_details["override"] = "volatility"

    # Standard delta-based classification
    elif severity_change <= IMPROVING_THRESHOLD:
        trend_status = "IMPROVING"
    elif severity_change >= WORSENING_THRESHOLD:
        trend_status = "WORSENING"
    else:
        trend_status = "STABLE"

    trend_details["trend_status"] = trend_status
    return trend_status, trend_details


async def updatePatientTrendStatus(patientId: int, trendStatus: str) -> None:
    #Update the patient's current trend status in the database.
    await db.patient.update(
        where={"id": patientId},
        data={
            "currentTrendStatus": trendStatus,
            "lastTrendUpdate": datetime.now(),
        },
    )
