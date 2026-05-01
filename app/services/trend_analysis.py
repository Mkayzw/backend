"""
Trend Analysis Engine

Analyzes sequential symptom reports to classify patient trajectory as:
  IMPROVING  — severity decreasing over recent reports
  STABLE     — no significant change
  WORSENING  — severity increasing (triggers alert)

Design decisions:
  - Uses structured Severity enum for scoring (not free-text keyword grep)
  - Falls back to notes keyword scan only if severity field unavailable
  - Requires ≥ 3 historical reports before making a trend call (returns STABLE otherwise)
  - Compares current submission against average of last 3 reports
"""
from app.db import db
from datetime import datetime
from typing import List, Tuple
import re

MIN_HISTORICAL_REPORTS = 3

# Structured severity → integer score (higher = more severe)
SEVERITY_SCORE_MAP = {
    "MILD":     0,
    "MODERATE": 1,
    "SEVERE":   2,
    "CRITICAL": 3,
}

# Fallback: keyword patterns for legacy free-text reports (notes only)
LEGACY_SEVERITY_KEYWORDS = {
    r'\b(chest pain|difficulty breathing|severe bleeding|unconscious|stroke)\b': 3,
    r'\b(high fever|persistent vomiting|severe pain|confusion|fainting|rapid heartbeat)\b': 2,
    r'\b(fever|cough|headache|nausea|dizziness|fatigue|pain)\b': 1,
    r'\b(better|improving|less pain|recovering|healing)\b': -1,
}


def _calculateSeverityScore(report) -> int:
    """
    Calculate a severity score from a symptom report object.

    Prefers the structured `severity` enum field. Falls back to notes keyword
    scan for legacy reports that lack the structured field.
    """
    # Prefer structured severity field (primary path)
    severity_val = getattr(report, 'severity', None)
    if severity_val is not None:
        # Prisma returns enum values; convert to string for mapping
        key = str(severity_val).upper()
        return SEVERITY_SCORE_MAP.get(key, 0)

    # Fallback: keyword scan on notes
    notes = getattr(report, 'notes', '') or ''
    notes_lower = notes.lower()
    total = 0
    for pattern, score in LEGACY_SEVERITY_KEYWORDS.items():
        if re.search(pattern, notes_lower):
            total += score
    return total


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


async def analyzeTrend(patientId: int, currentSeverity: str) -> Tuple[str, dict]:
    """
    Analyze the patient's health trend based on sequential symptom reports.

    Args:
        patientId:       Patient to analyze.
        currentSeverity: Severity of the report being submitted right now.

    Returns: (trend_status, trend_details_dict)
    """
    # Fetch enough historical reports (we look at the last MIN_HISTORICAL_REPORTS)
    historical = await getHistoricalReports(patientId, limit=MIN_HISTORICAL_REPORTS + 1)

    # Not enough history → default STABLE (requirement: no false positives)
    if len(historical) < MIN_HISTORICAL_REPORTS:
        return "STABLE", {
            "reason": "insufficient_history",
            "report_count": len(historical),
        }

    # Score historical reports
    historical_scores = [
        _calculateSeverityScore(r)
        for r in historical[:MIN_HISTORICAL_REPORTS]
    ]

    # Score current submission
    current_score = SEVERITY_SCORE_MAP.get(currentSeverity.upper(), 0)

    avg_historical = sum(historical_scores) / len(historical_scores)
    severity_change = current_score - avg_historical

    trend_details = {
        "current_severity":       currentSeverity,
        "current_score":          current_score,
        "avg_historical_score":   round(avg_historical, 2),
        "severity_change":        round(severity_change, 2),
        "historical_scores":      historical_scores,
    }

    # Thresholds — tuned to avoid noise for stable cases
    IMPROVING_THRESHOLD = -0.5
    WORSENING_THRESHOLD = 0.5

    if severity_change <= IMPROVING_THRESHOLD:
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
