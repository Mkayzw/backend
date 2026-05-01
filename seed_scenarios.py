"""Seed data specifically for project defense scenarios.

Creates deterministic accounts and **8 scenario datasets** matching:
- `defense/SIMULATED_PATIENT_SCENARIOS.md`

Key properties:
- Does NOT wipe the whole database.
- Cleans up only users with email domain `@defense.local`.
- Inserts timestamped symptom reports and runs the *real* intelligence logic:
  - risk classification (`classifySymptomReport`)
  - trend analysis (`analyzeTrend`)
  - alert generation with embedded reasoning

Run:
  python seed_defense_scenarios.py
"""

import asyncio
import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, List, Dict

from app.db import db
from app.services.auth import hashPassword
from app.services.risk_classification import classifySymptomReport
from app.services.trend_analysis import analyzeTrend


DOMAIN = "defense.local"
DEFAULT_PASSWORD = "Defense123!"


@dataclass(frozen=True)
class ReportInput:
    created_at: datetime
    symptoms: List[str]
    severity: str
    duration_days: int
    frequency: str
    temperature: Optional[float] = None
    heart_rate: Optional[int] = None
    medication_adherent: Optional[bool] = None
    notes: Optional[str] = None


def _now_minus(days: int) -> datetime:
    return datetime.now() - timedelta(days=days)


async def _cleanup_defense_data() -> None:
    users = await db.user.find_many(where={"email": {"contains": f"@{DOMAIN}"}})
    if not users:
        return

    user_ids = [u.id for u in users]

    clinicians = await db.clinician.find_many(where={"userId": {"in": user_ids}})
    clinician_ids = [c.id for c in clinicians]

    patients = await db.patient.find_many(where={"userId": {"in": user_ids}})
    patient_ids = [p.id for p in patients]

    if patient_ids:
        await db.alert.delete_many(where={"patientId": {"in": patient_ids}})
        await db.symptomreport.delete_many(where={"patientId": {"in": patient_ids}})
        await db.assignment.delete_many(where={"patientId": {"in": patient_ids}})

    if clinician_ids:
        await db.assignment.delete_many(where={"clinicianId": {"in": clinician_ids}})

    if patient_ids:
        await db.patient.delete_many(where={"id": {"in": patient_ids}})

    if clinician_ids:
        await db.clinician.delete_many(where={"id": {"in": clinician_ids}})

    await db.user.delete_many(where={"id": {"in": user_ids}})


async def _create_user(email: str, full_name: str, role: str) -> dict:
    return await db.user.create(
        data={
            "email": email,
            "password": hashPassword(DEFAULT_PASSWORD),
            "fullName": full_name,
            "phone": "+263-77-DEFENSE",
            "role": role,
            "createdAt": _now_minus(120),
        }
    )


async def _create_clinician(email: str, full_name: str, specialization: str) -> dict:
    user = await _create_user(email=email, full_name=full_name, role="CLINICIAN")
    clinician = await db.clinician.create(
        data={
            "userId": user.id,
            "fullName": full_name,
            "specialization": specialization,
        }
    )
    return {"user": user, "clinician": clinician}


async def _create_patient(
    email: str,
    full_name: str,
    chronic_conditions: List[str],
    baseline_status: str = "stable",
    allergies: Optional[List[str]] = None,
) -> dict:
    user = await _create_user(email=email, full_name=full_name, role="PATIENT")
    patient = await db.patient.create(
        data={
            "userId": user.id,
            "emergencyContact": "+263-77-000-0000",
            "dateOfBirth": datetime.fromisoformat("1990-01-01T00:00:00"),
            "gender": "Prefer not to say",
            "chronicConditions": json.dumps(chronic_conditions),
            "allergies": json.dumps(allergies or []),
            "baselineStatus": baseline_status,
            "updatedAt": datetime.now(),
        }
    )
    return {"user": user, "patient": patient}


async def _create_assignment(
    patient_id: int,
    clinician_id: int,
    care_context: str,
    reason: str,
    assigned_at: datetime,
    active: bool = True,
    ended_at: Optional[datetime] = None,
) -> dict:
    assignment = await db.assignment.create(
        data={
            "patientId": patient_id,
            "clinicianId": clinician_id,
            "status": "ACTIVE" if active else "INACTIVE",
            "careContext": care_context,
            "reason": reason,
            "assignedAt": assigned_at,
            "endedAt": ended_at,
        }
    )
    return assignment


async def _set_assignment_inactive(assignment_id: int, ended_at: datetime) -> None:
    await db.assignment.update(
        where={"id": assignment_id},
        data={"status": "INACTIVE", "endedAt": ended_at},
    )


async def _create_alert(
    patient_id: int,
    report_id: int,
    alert_type: str,
    priority: str,
    message: str,
    created_at: datetime,
) -> None:
    await db.alert.create(
        data={
            "patientId": patient_id,
            "symptomReportId": report_id,
            "alertType": alert_type,
            "priority": priority,
            "message": message,
            "isRead": False,
            "createdAt": created_at,
        }
    )


async def _create_report_with_intelligence(patient_id: int, report_input: ReportInput) -> dict:
    # Resolve clinical context
    patient = await db.patient.find_unique(where={"id": patient_id})
    chronic_conditions: List[str] = []
    if patient and patient.chronicConditions:
        try:
            chronic_conditions = json.loads(patient.chronicConditions)
        except (json.JSONDecodeError, TypeError):
            chronic_conditions = []

    active_assignment = await db.assignment.find_first(
        where={"patientId": patient_id, "status": "ACTIVE"},
        order={"assignedAt": "desc"},
    )
    care_context = str(active_assignment.careContext) if active_assignment and active_assignment.careContext else "GENERAL_REVIEW"

    report = await db.symptomreport.create(
        data={
            "patientId": patient_id,
            "notes": report_input.notes,
            "createdAt": report_input.created_at,
            "symptoms": json.dumps(report_input.symptoms),
            "severity": report_input.severity,
            "durationDays": report_input.duration_days,
            "frequency": report_input.frequency,
            "temperature": report_input.temperature,
            "heartRate": report_input.heart_rate,
            "medicationAdherent": report_input.medication_adherent,
            "riskLevel": "LOW",
            "riskScore": 0.0,
        }
    )

    risk_level, risk_score, risk_factors_json, risk_explanation = await classifySymptomReport(
        patientId=patient_id,
        symptoms=report_input.symptoms,
        severity=report_input.severity,
        durationDays=report_input.duration_days,
        frequency=report_input.frequency,
        temperature=report_input.temperature,
        heartRate=report_input.heart_rate,
        medicationAdherent=report_input.medication_adherent,
        careContext=care_context,
        chronicConditions=chronic_conditions,
    )

    trend_status, _trend_details = await analyzeTrend(patient_id, report_input.severity)

    updated_report = await db.symptomreport.update(
        where={"id": report.id},
        data={
            "riskLevel": risk_level,
            "riskScore": risk_score,
            "riskFactors": risk_factors_json,
            "riskExplanation": risk_explanation,
        },
    )

    await db.patient.update(
        where={"id": patient_id},
        data={
            "currentRiskLevel": risk_level,
            "currentTrendStatus": trend_status,
            "lastRiskUpdate": report_input.created_at,
            "lastTrendUpdate": report_input.created_at,
            "lastReportTime": report_input.created_at,
        },
    )

    if risk_level == "HIGH":
        base = "Patient classified as HIGH RISK — immediate clinical attention required."
        message = f"{base}\nReasoning: {risk_explanation}" if risk_explanation else base
        await _create_alert(
            patient_id=patient_id,
            report_id=report.id,
            alert_type="HIGH_RISK",
            priority="HIGH",
            message=message,
            created_at=report_input.created_at,
        )

    if trend_status == "WORSENING":
        base = "Patient condition is WORSENING based on trend analysis — clinical review recommended."
        message = f"{base}\nLatest report: {risk_explanation}" if risk_explanation else base
        await _create_alert(
            patient_id=patient_id,
            report_id=report.id,
            alert_type="WORSENING_TREND",
            priority="MEDIUM",
            message=message,
            created_at=report_input.created_at,
        )

    return updated_report


async def _run_scenario_reports(patient_id: int, reports: List[ReportInput]) -> None:
    for r in reports:
        await _create_report_with_intelligence(patient_id, r)


async def seed_defense_scenarios() -> Dict[str, dict]:
    # Accounts
    admin = await _create_user(
        email=f"admin@{DOMAIN}",
        full_name="Defense Admin",
        role="ADMIN",
    )

    pulmo = await _create_clinician(
        email=f"clinician.pulmonology@{DOMAIN}",
        full_name="Dr. Pulmonology",
        specialization="Pulmonology",
    )
    cardio = await _create_clinician(
        email=f"clinician.cardiology@{DOMAIN}",
        full_name="Dr. Cardiology",
        specialization="Cardiology",
    )
    general = await _create_clinician(
        email=f"clinician.general@{DOMAIN}",
        full_name="Dr. General",
        specialization="General Practice",
    )
    infect = await _create_clinician(
        email=f"clinician.infectious@{DOMAIN}",
        full_name="Dr. Infectious",
        specialization="Infectious Disease",
    )

    # Patients
    tendai = await _create_patient(
        email=f"patient.tendai.asthma@{DOMAIN}",
        full_name="Tendai (Asthma)",
        chronic_conditions=["asthma"],
        baseline_status="fragile",
        allergies=["penicillin"],
    )
    tafadzwa = await _create_patient(
        email=f"patient.tafadzwa.postop@{DOMAIN}",
        full_name="Tafadzwa (Post-op)",
        chronic_conditions=[],
    )
    farai = await _create_patient(
        email=f"patient.farai.hypertension@{DOMAIN}",
        full_name="Farai (Hypertension)",
        chronic_conditions=["hypertension"],
    )
    chipo = await _create_patient(
        email=f"patient.chipo.infection@{DOMAIN}",
        full_name="Chipo (Infection follow-up)",
        chronic_conditions=[],
    )
    nyasha = await _create_patient(
        email=f"patient.nyasha.general@{DOMAIN}",
        full_name="Nyasha (General review)",
        chronic_conditions=["diabetes"],
    )

    # Scenario S1 — Asthma follow-up (short-term)
    s1_assigned_at = _now_minus(12)
    s1_end_at = _now_minus(1)
    s1_assignment = await _create_assignment(
        patient_id=tendai["patient"].id,
        clinician_id=pulmo["clinician"].id,
        care_context="ASTHMA_FOLLOWUP",
        reason="Monitoring asthma exacerbation",
        assigned_at=s1_assigned_at,
        active=True,
    )
    await _run_scenario_reports(
        tendai["patient"].id,
        [
            ReportInput(_now_minus(10), ["cough"], "MILD", 2, "FIRST_TIME", medication_adherent=True),
            ReportInput(_now_minus(8), ["shortness_of_breath"], "MODERATE", 3, "RECURRING", medication_adherent=True),
            ReportInput(_now_minus(6), ["difficulty_breathing", "rapid_heartbeat"], "SEVERE", 4, "RECURRING", temperature=38.2, heart_rate=122, medication_adherent=False),
            ReportInput(_now_minus(3), ["cough", "fatigue"], "MODERATE", 2, "RECURRING", medication_adherent=True),
        ],
    )
    await _set_assignment_inactive(s1_assignment.id, s1_end_at)

    # Scenario S2 — Post-surgery recovery (short-term, defined endpoint)
    s2_assignment = await _create_assignment(
        patient_id=tafadzwa["patient"].id,
        clinician_id=general["clinician"].id,
        care_context="POST_SURGERY_RECOVERY",
        reason="Post-appendectomy recovery monitoring",
        assigned_at=_now_minus(16),
        active=True,
    )
    await _run_scenario_reports(
        tafadzwa["patient"].id,
        [
            ReportInput(_now_minus(15), ["severe_pain", "swelling"], "MODERATE", 1, "FIRST_TIME"),
            ReportInput(_now_minus(13), ["fever", "swelling"], "MODERATE", 3, "RECURRING", temperature=38.4),
            ReportInput(_now_minus(11), ["severe_bleeding", "high_fever"], "SEVERE", 1, "FIRST_TIME", temperature=39.7, heart_rate=125),
            ReportInput(_now_minus(9), ["swelling"], "MILD", 2, "RECURRING", temperature=37.4),
        ],
    )
    await _set_assignment_inactive(s2_assignment.id, _now_minus(8))

    # Scenario S3 — Chronic monitoring (ends due to transfer)
    s3_assignment = await _create_assignment(
        patient_id=farai["patient"].id,
        clinician_id=cardio["clinician"].id,
        care_context="CHRONIC_DISEASE_MONITORING",
        reason="Blood pressure management",
        assigned_at=_now_minus(60),
        active=True,
    )
    await _run_scenario_reports(
        farai["patient"].id,
        [
            ReportInput(_now_minus(55), ["headache"], "MILD", 2, "FIRST_TIME"),
            ReportInput(_now_minus(45), ["headache", "dizziness"], "MODERATE", 7, "RECURRING"),
            ReportInput(_now_minus(38), ["headache", "rapid_heartbeat"], "SEVERE", 3, "RECURRING", heart_rate=110),
            ReportInput(_now_minus(35), ["chest_pain", "rapid_heartbeat"], "CRITICAL", 1, "FIRST_TIME", heart_rate=128),
            ReportInput(_now_minus(20), ["headache"], "MODERATE", 2, "RECURRING", heart_rate=92),
            ReportInput(_now_minus(7), ["fatigue"], "MILD", 2, "RECURRING"),
        ],
    )
    await _set_assignment_inactive(s3_assignment.id, _now_minus(4))

    # Scenario S4 — Infection follow-up (short-term)
    s4_assignment = await _create_assignment(
        patient_id=chipo["patient"].id,
        clinician_id=infect["clinician"].id,
        care_context="INFECTION_FOLLOWUP",
        reason="Malaria follow-up",
        assigned_at=_now_minus(16),
        active=True,
    )
    await _run_scenario_reports(
        chipo["patient"].id,
        [
            ReportInput(_now_minus(14), ["fever", "fatigue"], "MODERATE", 2, "FIRST_TIME", temperature=38.3),
            ReportInput(_now_minus(12), ["high_fever", "nausea"], "MODERATE", 4, "RECURRING", temperature=39.6),
            ReportInput(_now_minus(10), ["high_fever", "confusion"], "SEVERE", 1, "FIRST_TIME", temperature=39.8),
            ReportInput(_now_minus(8), ["fatigue"], "MODERATE", 2, "RECURRING", temperature=37.6),
            ReportInput(_now_minus(5), [], "MILD", 1, "FIRST_TIME", temperature=36.9),
        ],
    )
    await _set_assignment_inactive(s4_assignment.id, _now_minus(2))

    # Scenario S5 — General review ends, later re-assigned
    s5a_assignment = await _create_assignment(
        patient_id=nyasha["patient"].id,
        clinician_id=general["clinician"].id,
        care_context="GENERAL_REVIEW",
        reason="Routine quarterly review",
        assigned_at=_now_minus(110),
        active=True,
    )
    await _run_scenario_reports(
        nyasha["patient"].id,
        [
            ReportInput(_now_minus(100), ["fatigue"], "MILD", 7, "CHRONIC", medication_adherent=True),
            ReportInput(_now_minus(80), ["fatigue", "dizziness"], "MODERATE", 14, "CHRONIC", medication_adherent=True),
            ReportInput(_now_minus(73), ["confusion", "nausea"], "SEVERE", 2, "RECURRING", medication_adherent=False),
            ReportInput(_now_minus(60), ["fatigue"], "MODERATE", 2, "RECURRING", medication_adherent=True),
        ],
    )
    await _set_assignment_inactive(s5a_assignment.id, _now_minus(55))

    s5b_assignment = await _create_assignment(
        patient_id=nyasha["patient"].id,
        clinician_id=cardio["clinician"].id,
        care_context="CHRONIC_DISEASE_MONITORING",
        reason="Glycaemic control follow-up",
        assigned_at=_now_minus(20),
        active=True,
    )
    await _run_scenario_reports(
        nyasha["patient"].id,
        [
            ReportInput(_now_minus(6), ["fatigue"], "MODERATE", 3, "RECURRING", medication_adherent=True),
            ReportInput(_now_minus(2), ["dizziness"], "MILD", 2, "RECURRING", medication_adherent=True),
        ],
    )

    # Scenario S6 — Dual clinician assignment (end one, one continues)
    s6_assignment_a = await _create_assignment(
        patient_id=tendai["patient"].id,
        clinician_id=pulmo["clinician"].id,
        care_context="ASTHMA_FOLLOWUP",
        reason="Primary respiratory monitoring",
        assigned_at=_now_minus(21),
        active=True,
    )
    s6_assignment_b = await _create_assignment(
        patient_id=tendai["patient"].id,
        clinician_id=cardio["clinician"].id,
        care_context="ASTHMA_FOLLOWUP",
        reason="Cardiac co-monitoring during asthma care",
        assigned_at=_now_minus(20),
        active=True,
    )
    await _run_scenario_reports(
        tendai["patient"].id,
        [
            ReportInput(_now_minus(18), ["shortness_of_breath"], "MODERATE", 3, "RECURRING"),
            ReportInput(_now_minus(14), ["difficulty_breathing"], "SEVERE", 2, "RECURRING"),
            ReportInput(_now_minus(9), ["cough"], "MODERATE", 2, "RECURRING"),
        ],
    )
    await _set_assignment_inactive(s6_assignment_b.id, _now_minus(7))
    # Assignment A remains ACTIVE

    # Scenario S7 — Reassignment mid-care
    # Reuse the same patient; create fresh assignments and reports close to now so it’s demo-friendly.
    s7a_assignment = await _create_assignment(
        patient_id=chipo["patient"].id,
        clinician_id=infect["clinician"].id,
        care_context="INFECTION_FOLLOWUP",
        reason="Infection follow-up (initial clinician)",
        assigned_at=_now_minus(9),
        active=True,
    )
    await _run_scenario_reports(
        chipo["patient"].id,
        [
            ReportInput(_now_minus(8), ["fever"], "MODERATE", 2, "FIRST_TIME", temperature=38.2),
            ReportInput(_now_minus(6), ["high_fever"], "MODERATE", 3, "RECURRING", temperature=39.6),
        ],
    )
    await _set_assignment_inactive(s7a_assignment.id, _now_minus(5))

    s7b_assignment = await _create_assignment(
        patient_id=chipo["patient"].id,
        clinician_id=general["clinician"].id,
        care_context="INFECTION_FOLLOWUP",
        reason="Infection follow-up (reassigned clinician)",
        assigned_at=_now_minus(5),
        active=True,
    )
    await _run_scenario_reports(
        chipo["patient"].id,
        [
            ReportInput(_now_minus(4), ["high_fever", "confusion"], "SEVERE", 1, "FIRST_TIME", temperature=39.8),
            ReportInput(_now_minus(1), [], "MILD", 1, "FIRST_TIME", temperature=36.9),
        ],
    )
    await _set_assignment_inactive(s7b_assignment.id, _now_minus(0))

    # Scenario S8 — Frequent reporting in 7 days escalates risk
    s8_patient = await _create_patient(
        email=f"patient.s8.frequent@{DOMAIN}",
        full_name="Scenario8 (Frequent reports)",
        chronic_conditions=[],
    )
    await _create_assignment(
        patient_id=s8_patient["patient"].id,
        clinician_id=general["clinician"].id,
        care_context="GENERAL_REVIEW",
        reason="Frequent reporting pattern demo",
        assigned_at=_now_minus(7),
        active=True,
    )
    # 5 reports within last 7 days → report-frequency score triggers escalation
    await _run_scenario_reports(
        s8_patient["patient"].id,
        [
            ReportInput(_now_minus(6), ["fatigue", "dizziness"], "MODERATE", 7, "RECURRING"),
            ReportInput(_now_minus(5), ["fatigue", "dizziness"], "MODERATE", 7, "RECURRING"),
            ReportInput(_now_minus(4), ["fatigue", "dizziness"], "MODERATE", 7, "RECURRING"),
            ReportInput(_now_minus(2), ["fatigue", "dizziness"], "MODERATE", 7, "RECURRING"),
            ReportInput(_now_minus(1), ["fatigue", "dizziness"], "MODERATE", 7, "RECURRING"),
        ],
    )

    return {
        "admin": admin,
        "clinicians": {
            "pulmo": pulmo,
            "cardio": cardio,
            "general": general,
            "infect": infect,
        },
        "patients": {
            "tendai": tendai,
            "tafadzwa": tafadzwa,
            "farai": farai,
            "chipo": chipo,
            "nyasha": nyasha,
            "s8": s8_patient,
        },
    }


async def main() -> None:
    await db.connect()
    try:
        print("Cleaning up existing @defense.local data...")
        await _cleanup_defense_data()
        print("  ✓ cleanup complete")

        print("Seeding 8 defense scenarios...")
        await seed_defense_scenarios()
        print("  ✓ done")

        print("\nLogin credentials (deterministic):")
        print(f"- Admin:     admin@{DOMAIN} / {DEFAULT_PASSWORD}")
        print(f"- Clinician: clinician.general@{DOMAIN} / {DEFAULT_PASSWORD}")
        print(f"- Clinician: clinician.cardiology@{DOMAIN} / {DEFAULT_PASSWORD}")
        print(f"- Clinician: clinician.pulmonology@{DOMAIN} / {DEFAULT_PASSWORD}")
        print(f"- Clinician: clinician.infectious@{DOMAIN} / {DEFAULT_PASSWORD}")

        print("\nPatients:")
        print(f"- patient.tendai.asthma@{DOMAIN}")
        print(f"- patient.tafadzwa.postop@{DOMAIN}")
        print(f"- patient.farai.hypertension@{DOMAIN}")
        print(f"- patient.chipo.infection@{DOMAIN}")
        print(f"- patient.nyasha.general@{DOMAIN}")
        print(f"- patient.s8.frequent@{DOMAIN}")

    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
