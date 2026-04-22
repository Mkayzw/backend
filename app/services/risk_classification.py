"""
Risk Classification Engine — Context-Aware

Computes risk scores from STRUCTURED symptom inputs with full clinical context:
  - Symptom severity enum (MILD / MODERATE / SEVERE / CRITICAL)
  - Typed symptom identifiers (not free-text keyword grep)
  - Duration, frequency, medication adherence
  - Care context bonus (asthma follow-up ≠ general review)
  - Chronic condition relevance matching
  - Optional vitals (temperature, heart rate)

All decisions are deterministic and fully explainable via riskExplanation.
"""
import json
import re
from datetime import datetime, timedelta
from typing import Tuple, Optional, List

from app.db import db


# ─────────────────────────────────────────────
#  Symptom identifier → base weight
# ─────────────────────────────────────────────
SYMPTOM_WEIGHTS: dict[str, float] = {
    # Critical (weight 3.0)
    "chest_pain":            3.0,
    "difficulty_breathing":  3.0,
    "shortness_of_breath":   3.0,
    "severe_bleeding":       3.0,
    "unconscious":           3.0,
    "stroke_symptoms":       3.0,
    # High (weight 2.0)
    "high_fever":            2.0,
    "persistent_vomiting":   2.0,
    "severe_pain":           2.0,
    "confusion":             2.0,
    "fainting":              2.0,
    "rapid_heartbeat":       2.0,
    # Moderate (weight 1.0)
    "fever":                 1.0,
    "cough":                 1.0,
    "headache":              1.0,
    "nausea":                1.0,
    "dizziness":             1.0,
    "fatigue":               1.0,
    "back_pain":             1.0,
    "joint_pain":            1.0,
    "abdominal_pain":        1.0,
    "muscle_weakness":       1.0,
    "swelling":              1.0,
    "rash":                  1.0,
}

# ─────────────────────────────────────────────
#  Severity field → base score
# ─────────────────────────────────────────────
SEVERITY_SCORES: dict[str, float] = {
    "MILD":     0.0,
    "MODERATE": 1.0,
    "SEVERE":   2.5,
    "CRITICAL": 4.0,
}

# ─────────────────────────────────────────────
#  Frequency → bonus score
# ─────────────────────────────────────────────
FREQUENCY_SCORES: dict[str, float] = {
    "FIRST_TIME": 0.0,
    "RECURRING":  0.5,
    "CHRONIC":    1.5,
}

# ─────────────────────────────────────────────
#  Care context: symptom bonuses + baseline
# ─────────────────────────────────────────────
CARE_CONTEXT_BONUSES: dict[str, dict] = {
    "ASTHMA_FOLLOWUP": {
        "matching_symptoms": ["difficulty_breathing", "shortness_of_breath", "chest_pain", "cough"],
        "bonus":    1.5,
        "baseline": 0.0,
    },
    "POST_SURGERY_RECOVERY": {
        "matching_symptoms": ["severe_bleeding", "fever", "high_fever", "chest_pain", "swelling", "severe_pain"],
        "bonus":    1.5,
        "baseline": 0.5,
    },
    "CHRONIC_DISEASE_MONITORING": {
        "matching_symptoms": ["chest_pain", "rapid_heartbeat", "confusion", "shortness_of_breath", "fatigue"],
        "bonus":    1.0,
        "baseline": 0.5,
    },
    "INFECTION_FOLLOWUP": {
        "matching_symptoms": ["high_fever", "fever", "persistent_vomiting", "confusion"],
        "bonus":    1.0,
        "baseline": 0.0,
    },
    "GENERAL_REVIEW": {
        "matching_symptoms": [],
        "bonus":    0.0,
        "baseline": 0.0,
    },
}

# ─────────────────────────────────────────────
#  Chronic condition → relevant symptoms
# ─────────────────────────────────────────────
CONDITION_SYMPTOM_RELEVANCE: dict[str, list] = {
    "asthma":        ["difficulty_breathing", "shortness_of_breath", "cough", "chest_pain"],
    "copd":          ["cough", "difficulty_breathing", "shortness_of_breath"],
    "diabetes":      ["fatigue", "confusion", "nausea", "dizziness"],
    "hypertension":  ["chest_pain", "headache", "rapid_heartbeat", "dizziness"],
    "heart_disease": ["chest_pain", "shortness_of_breath", "rapid_heartbeat", "fainting"],
    "epilepsy":      ["unconscious", "confusion", "fainting"],
}

# ─────────────────────────────────────────────
#  Risk classification thresholds
# ─────────────────────────────────────────────
RISK_THRESHOLDS = {"HIGH": 5.0, "MEDIUM": 2.5}

# ─────────────────────────────────────────────
#  Internal helpers
# ─────────────────────────────────────────────

def _scoreDuration(durationDays: int) -> float:
    if durationDays >= 14:
        return 2.0
    elif durationDays >= 7:
        return 1.0
    return 0.0


def _scoreVitals(
    temperature: Optional[float],
    heartRate: Optional[int],
) -> Tuple[float, List[str]]:
    score = 0.0
    flags: List[str] = []

    if temperature is not None:
        if temperature >= 39.5:
            score += 2.0
            flags.append(f"dangerously high temperature ({temperature:.1f}°C)")
        elif temperature >= 38.0:
            score += 1.0
            flags.append(f"fever ({temperature:.1f}°C)")

    if heartRate is not None:
        if heartRate >= 120 or heartRate < 50:
            score += 2.0
            flags.append(f"abnormal heart rate ({heartRate} bpm)")
        elif heartRate >= 100:
            score += 1.0
            flags.append(f"elevated heart rate ({heartRate} bpm)")

    return score, flags


def _buildRiskExplanation(
    severity: str,
    symptoms: List[str],
    durationDays: int,
    frequency: str,
    careContext: Optional[str],
    medicationAdherent: Optional[bool],
    chronicConditions: List[str],
    vitalFlags: List[str],
    riskLevel: str,
) -> str:
    """
    Build a human-readable explanation of the risk decision.
    Stored on SymptomReport.riskExplanation and embedded in Alert.message.
    """
    parts: List[str] = []

    parts.append(f"Severity: {severity.capitalize()}")

    if symptoms:
        clean = [s.replace("_", " ") for s in symptoms[:4]]
        parts.append("Symptoms: " + ", ".join(clean))

    if durationDays >= 7:
        parts.append(f"Duration: {durationDays} days")

    if frequency != "FIRST_TIME":
        label = frequency.replace("_", " ").lower()
        parts.append(f"Pattern: {label}")

    if careContext and careContext != "GENERAL_REVIEW":
        label = careContext.replace("_", " ").lower()
        parts.append(f"Context: {label}")

    if chronicConditions:
        parts.append("Chronic: " + ", ".join(chronicConditions[:2]))

    if medicationAdherent is False:
        parts.append("Non-adherent to medication")

    parts.extend(vitalFlags)

    parts.append(f"→ {riskLevel} RISK")
    return " | ".join(parts)


async def _analyzeReportFrequency(patientId: int) -> Tuple[float, int]:
    """Historical report frequency within the past 7 days."""
    window_start = datetime.now() - timedelta(days=7)
    reports = await db.symptomreport.find_many(
        where={"patientId": patientId, "createdAt": {"gte": window_start}}
    )
    count = len(reports)
    if count >= 5:
        return 2.0, count
    elif count >= 3:
        return 1.0, count
    return 0.0, count


# ─────────────────────────────────────────────
#  Core scoring function
# ─────────────────────────────────────────────

async def computeRiskScore(
    patientId: int,
    symptoms: List[str],
    severity: str,
    durationDays: int,
    frequency: str,
    temperature: Optional[float] = None,
    heartRate: Optional[int] = None,
    medicationAdherent: Optional[bool] = None,
    careContext: Optional[str] = None,
    chronicConditions: Optional[List[str]] = None,
) -> Tuple[float, dict]:
    """
    Compute a risk score from structured clinical inputs.

    Returns: (total_score, risk_factors_dict)
    """
    factors: dict = {}
    total = 0.0

    # 1. Severity
    sev_score = SEVERITY_SCORES.get(severity, 0.0)
    factors["severity_score"] = sev_score
    factors["severity"] = severity
    total += sev_score

    # 2. Structured symptoms
    sym_score = sum(SYMPTOM_WEIGHTS.get(s, 0.5) for s in symptoms)
    # Combination bonus: ≥ 2 high-weight symptoms
    high_weight = [s for s in symptoms if SYMPTOM_WEIGHTS.get(s, 0) >= 2.0]
    if len(high_weight) >= 2:
        sym_score += 1.0
    factors["symptom_score"] = sym_score
    factors["symptoms"] = symptoms
    total += sym_score

    # 3. Duration
    dur_score = _scoreDuration(durationDays)
    factors["duration_score"] = dur_score
    factors["duration_days"] = durationDays
    total += dur_score

    # 4. Frequency
    freq_score = FREQUENCY_SCORES.get(frequency, 0.0)
    factors["frequency_score"] = freq_score
    total += freq_score

    # 5. Medication adherence penalty
    med_score = 1.0 if medicationAdherent is False else 0.0
    factors["medication_score"] = med_score
    total += med_score

    # 6. Vitals
    vital_score, vital_flags = _scoreVitals(temperature, heartRate)
    factors["vital_score"] = vital_score
    factors["vital_flags"] = vital_flags
    total += vital_score

    # 7. Care context (baseline + symptom match bonus)
    context_key = careContext or "GENERAL_REVIEW"
    if context_key in CARE_CONTEXT_BONUSES:
        ctx = CARE_CONTEXT_BONUSES[context_key]
        total += ctx["baseline"]
        matching = [s for s in symptoms if s in ctx["matching_symptoms"]]
        if matching:
            total += ctx["bonus"]
            factors["context_bonus"] = ctx["bonus"]
            factors["context_matched_symptoms"] = matching
        else:
            factors["context_bonus"] = 0.0
    factors["care_context"] = context_key

    # 8. Chronic condition relevance
    conditions = chronicConditions or []
    for cond in conditions:
        relevant = CONDITION_SYMPTOM_RELEVANCE.get(cond.lower(), [])
        if any(s in relevant for s in symptoms):
            total += 1.0
            factors["chronic_condition_match"] = cond
            break  # One bonus per report
    factors["chronic_conditions"] = conditions

    # 9. Historical report frequency
    freq_hist_score, report_count = await _analyzeReportFrequency(patientId)
    factors["report_frequency_score"] = freq_hist_score
    factors["report_count_7d"] = report_count
    total += freq_hist_score

    return total, factors


# ─────────────────────────────────────────────
#  Classification
# ─────────────────────────────────────────────

def classifyRiskLevel(risk_score: float) -> str:
    if risk_score >= RISK_THRESHOLDS["HIGH"]:
        return "HIGH"
    elif risk_score >= RISK_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    return "LOW"


async def classifySymptomReport(
    patientId: int,
    symptoms: List[str],
    severity: str,
    durationDays: int,
    frequency: str,
    temperature: Optional[float] = None,
    heartRate: Optional[int] = None,
    medicationAdherent: Optional[bool] = None,
    careContext: Optional[str] = None,
    chronicConditions: Optional[List[str]] = None,
) -> Tuple[str, float, str, str]:
    """
    Main entry point for risk classification.

    Returns: (risk_level, risk_score, risk_factors_json, risk_explanation)
    """
    import time
    start = time.time()

    risk_score, risk_factors = await computeRiskScore(
        patientId=patientId,
        symptoms=symptoms,
        severity=severity,
        durationDays=durationDays,
        frequency=frequency,
        temperature=temperature,
        heartRate=heartRate,
        medicationAdherent=medicationAdherent,
        careContext=careContext,
        chronicConditions=chronicConditions,
    )

    risk_level = classifyRiskLevel(risk_score)

    vital_flags = risk_factors.get("vital_flags", [])
    chronic_match = risk_factors.get("chronic_condition_match")
    chronics = [chronic_match] if chronic_match else (chronicConditions or [])

    explanation = _buildRiskExplanation(
        severity=severity,
        symptoms=symptoms,
        durationDays=durationDays,
        frequency=frequency,
        careContext=careContext,
        medicationAdherent=medicationAdherent,
        chronicConditions=chronics,
        vitalFlags=vital_flags,
        riskLevel=risk_level,
    )

    elapsed_ms = (time.time() - start) * 1000
    if elapsed_ms > 500:
        print(f"Warning: Risk classification took {elapsed_ms:.0f}ms (target <500ms)")

    return risk_level, risk_score, json.dumps(risk_factors, default=str), explanation
