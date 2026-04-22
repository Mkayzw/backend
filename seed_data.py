"""
Comprehensive Seed Data Script — Clinical Decision-Support Prototype

Generates realistic test data that exercises the actual intelligence layer:
- Patients with chronic conditions and allergies
- Assignments with clinical care contexts matched to patient conditions
- Symptom reports with structured inputs processed through the real risk engine
- Alerts derived from actual HIGH_RISK and WORSENING_TREND classifications

This produces believable, consistent data that demonstrates the system
doing something intelligent — not random outputs.

Run with: python seed_data.py
"""
import asyncio
import json
import random
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

# ── Use the app's shared Prisma instance so the intelligence layer works ──
from app.db import db
from app.services.auth import hashPassword
from app.services.risk_classification import classifySymptomReport
from app.services.trend_analysis import analyzeTrend
from app.services.alert_service import generateRiskAlert, generateTrendAlert


# ─────────────────────────────────────────────
#  Configuration
# ─────────────────────────────────────────────
NUM_PATIENTS     = 50
NUM_CLINICIANS   = 15
NUM_ADMINS       = 3
REPORTS_PER_DAY  = 90   # days of history to generate
NUM_PERF_METRICS = 500

# ─────────────────────────────────────────────
#  Name pools (Zimbabwean / Southern African)
# ─────────────────────────────────────────────
FIRST_NAMES = [
    "Tendai", "Farai", "Nyasha", "Tafadzwa", "Chipo", "Rudo", "Tatenda", "Simbarashe",
    "Kudzai", "Munashe", "Rutendo", "Tadiwa", "Tinashe", "Kumbirai", "Shamiso", "Tsitsi",
    "Shingai", "Nhamo", "Vimbai", "Fadzai", "Tariro", "Simba", "Takudzwa", "Tapiwa",
    "Nokutenda", "Danai", "Chengetai", "Charmaine", "Pride", "Innocent", "Justice", "Memory",
    "Patience", "Blessing", "Precious", "Givemore", "Lovemore", "Mercy", "Hope", "Faith",
    "Joy", "Takesure", "Knowledge", "Wellington", "Admire", "Learnmore", "Prosper",
    "Bongani", "Sibusiso", "Thandeka", "Thabo", "Sipho", "Zenzele", "Nomalanga", "Themba",
    "Anesu", "Maita", "Panashe", "Ruvarashe", "Tinotenda", "Chiedza", "Garikai",
]

LAST_NAMES = [
    "Moyo", "Ncube", "Sibanda", "Ndlela", "Dube", "Nyoni", "Ndlovu", "Bango", "Gumbo",
    "Nkomo", "Tshuma", "Hove", "Shumba", "Sithole", "Muzenda", "Mlambo", "Mapfumo",
    "Makoni", "Mutasa", "Mahachi", "Mutema", "Katsande", "Mazarura", "Musarurwa",
    "Zvobgo", "Chitepo", "Mponda", "Makanza", "Biti", "Chamisa", "Madhuku", "Makamba",
    "Maponga", "Phiri", "Banda", "Chikwava", "Murehwa", "Chombo", "Khupe", "Mutsvangwa",
]

SPECIALIZATIONS = [
    "General Practice", "Cardiology", "Pulmonology", "Endocrinology",
    "Nephrology", "Neurology", "Infectious Disease", "Internal Medicine",
    "Pediatrics", "Psychiatry", "Orthopedics", "Oncology",
    "Gastroenterology", "Rheumatology", "Emergency Medicine",
]

GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"]

# ─────────────────────────────────────────────
#  Clinical profiles for patients
# ─────────────────────────────────────────────
PATIENT_PROFILES = [
    # (chronic_conditions, allergies, baseline_status, care_context, care_reason)
    (["asthma"],                      ["penicillin"],        "fragile", "ASTHMA_FOLLOWUP",           "Monitoring asthma exacerbation"),
    (["asthma", "diabetes"],          ["sulfa_drugs"],       "fragile", "ASTHMA_FOLLOWUP",           "Asthma + diabetes co-management"),
    (["copd"],                        [],                    "fragile", "ASTHMA_FOLLOWUP",           "COPD long-term monitoring"),
    (["hypertension"],                ["aspirin"],           "stable",  "CHRONIC_DISEASE_MONITORING", "Blood pressure management"),
    (["hypertension", "diabetes"],    ["penicillin"],        "fragile", "CHRONIC_DISEASE_MONITORING", "Hypertension and diabetes co-morbidity"),
    (["heart_disease"],               ["latex"],             "fragile", "CHRONIC_DISEASE_MONITORING", "Post-MI cardiac monitoring"),
    (["heart_disease", "hypertension"], [],                  "fragile", "CHRONIC_DISEASE_MONITORING", "Complex cardiac case"),
    (["diabetes"],                    [],                    "stable",  "CHRONIC_DISEASE_MONITORING", "T2DM glycaemic control"),
    (["epilepsy"],                    ["phenobarbital"],     "stable",  "CHRONIC_DISEASE_MONITORING", "Epilepsy medication review"),
    (["copd", "hypertension"],        [],                    "fragile", "CHRONIC_DISEASE_MONITORING", "COPD with hypertensive disease"),
    ([],                              [],                    "stable",  "INFECTION_FOLLOWUP",         "Post-typhoid recovery monitoring"),
    ([],                              ["penicillin"],        "stable",  "INFECTION_FOLLOWUP",         "Malaria follow-up"),
    ([],                              [],                    "stable",  "POST_SURGERY_RECOVERY",      "Post-appendectomy recovery"),
    ([],                              ["latex"],             "stable",  "POST_SURGERY_RECOVERY",      "Post-caesarean monitoring"),
    ([],                              [],                    "stable",  "GENERAL_REVIEW",             "Routine symptom review"),
]

# ─────────────────────────────────────────────
#  Symptom sets by care context
#  Each entry: (symptoms_list, typical_severity)
# ─────────────────────────────────────────────
SYMPTOM_SETS = {
    "ASTHMA_FOLLOWUP": [
        (["difficulty_breathing", "cough"],              "SEVERE"),
        (["shortness_of_breath"],                        "MODERATE"),
        (["chest_pain", "difficulty_breathing"],         "CRITICAL"),
        (["cough", "fatigue"],                           "MILD"),
        (["shortness_of_breath", "fatigue"],             "MODERATE"),
        (["cough"],                                      "MILD"),
        (["difficulty_breathing", "rapid_heartbeat"],    "SEVERE"),
    ],
    "POST_SURGERY_RECOVERY": [
        (["fever", "swelling"],                          "MODERATE"),
        (["severe_pain", "swelling"],                    "SEVERE"),
        (["fatigue"],                                    "MILD"),
        (["severe_bleeding", "fever"],                   "CRITICAL"),
        (["high_fever", "nausea"],                       "SEVERE"),
        (["swelling"],                                   "MILD"),
        (["fever", "fatigue"],                           "MODERATE"),
    ],
    "CHRONIC_DISEASE_MONITORING": [
        (["fatigue", "dizziness"],                       "MODERATE"),
        (["chest_pain", "rapid_heartbeat"],              "SEVERE"),
        (["headache", "dizziness"],                      "MILD"),
        (["confusion", "fatigue"],                       "SEVERE"),
        (["rapid_heartbeat"],                            "MODERATE"),
        (["fatigue"],                                    "MILD"),
        (["chest_pain", "shortness_of_breath"],         "CRITICAL"),
    ],
    "INFECTION_FOLLOWUP": [
        (["fever", "fatigue"],                           "MODERATE"),
        (["high_fever", "nausea"],                       "SEVERE"),
        (["persistent_vomiting", "fever"],               "SEVERE"),
        (["fatigue", "headache"],                        "MILD"),
        (["fever"],                                      "MILD"),
        (["nausea", "dizziness"],                        "MODERATE"),
        (["high_fever", "confusion"],                    "CRITICAL"),
    ],
    "GENERAL_REVIEW": [
        (["headache"],                                   "MILD"),
        (["fatigue"],                                    "MILD"),
        (["nausea", "dizziness"],                        "MILD"),
        (["back_pain"],                                  "MODERATE"),
        (["joint_pain"],                                 "MILD"),
        (["headache", "fatigue"],                        "MODERATE"),
        (["nausea"],                                     "MILD"),
    ],
}

FREQUENCY_POOL   = ["FIRST_TIME", "RECURRING", "RECURRING", "CHRONIC"]
NOTES_POOL = [
    "Patient reports symptoms have worsened overnight.",
    "Patient managing but remains uncomfortable.",
    "Slightly improved since last visit.",
    "No significant change noted.",
    "Patient anxious about symptoms.",
    "Symptoms worse with exertion.",
    "Resting has not helped significantly.",
    None,   # intentionally no notes
    None,
]

ENDPOINTS = [
    "/api/auth/login", "/api/patients", "/api/patients/{id}",
    "/api/clinicians", "/api/symptom-reports", "/api/symptom-reports/{id}",
    "/api/alerts", "/api/assignments", "/api/dashboard/stats",
    "/api/dashboard/prioritized-patients", "/metrics/latency", "/metrics/errors",
]
HTTP_METHODS  = ["GET", "POST", "PUT", "DELETE"]
STATUS_CODES  = [200, 200, 200, 201, 204, 400, 401, 403, 404, 500]
ERROR_TYPES   = [None, None, None, "ValidationError", "AuthorizationError", "NotFoundError", "DatabaseError"]


# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────

def name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def email(first: str, last: str, domain: str) -> str:
    return f"{first.lower()}.{last.lower()}.{uuid.uuid4().hex[:6]}@{domain}"


def phone() -> str:
    return f"+263-7{random.randint(1,9)}-{random.randint(100,999)}-{random.randint(1000,9999)}"


def dob(min_age: int = 18, max_age: int = 80) -> datetime:
    today = datetime.now()
    earliest = today - timedelta(days=max_age * 365)
    latest   = today - timedelta(days=min_age * 365)
    return earliest + timedelta(days=random.randint(0, (latest - earliest).days))


def past_ts(max_days: int = 90) -> datetime:
    return datetime.now() - timedelta(
        days=random.randint(0, max_days),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )


def chronological_timestamps(n: int, span_days: int = 90) -> List[datetime]:
    """Generate n timestamps in roughly ascending order over span_days."""
    start = datetime.now() - timedelta(days=span_days)
    segment = span_days / n
    timestamps = []
    for i in range(n):
        base    = start + timedelta(days=i * segment)
        jitter  = timedelta(hours=random.randint(0, max(1, int(segment * 24))))
        timestamps.append(base + jitter)
    return sorted(timestamps)


# ─────────────────────────────────────────────
#  Seeding functions
# ─────────────────────────────────────────────

async def clear_database():
    print("Clearing existing data...")
    await db.performancemetric.delete_many()
    await db.alert.delete_many()
    await db.symptomreport.delete_many()
    await db.assignment.delete_many()
    await db.patient.delete_many()
    await db.clinician.delete_many()
    await db.user.delete_many()
    print("  ✓ Database cleared")


async def seed_users() -> dict:
    print("Seeding users...")
    result = {"patients": [], "clinicians": [], "admins": []}
    pw     = hashPassword("password123")

    for i in range(NUM_ADMINS):
        n = name().split()
        result["admins"].append(await db.user.create(data={
            "email":     f"admin.{i+1}@telemed.local",
            "password":  pw,
            "fullName":  " ".join(n),
            "phone":     phone(),
            "role":      "ADMIN",
            "createdAt": past_ts(120),
        }))

    for i in range(NUM_PATIENTS):
        n = name().split()
        result["patients"].append(await db.user.create(data={
            "email":     email(n[0], n[-1], "patient.telemed.local"),
            "password":  pw,
            "fullName":  " ".join(n),
            "phone":     phone(),
            "role":      "PATIENT",
            "createdAt": past_ts(300),
        }))

    for i in range(NUM_CLINICIANS):
        n = name().split()
        result["clinicians"].append(await db.user.create(data={
            "email":     email(n[0], n[-1], "clinic.telemed.local"),
            "password":  pw,
            "fullName":  f"Dr. {' '.join(n)}",
            "phone":     phone(),
            "role":      "CLINICIAN",
            "createdAt": past_ts(200),
        }))

    print(f"  ✓ {NUM_ADMINS} admins, {NUM_PATIENTS} patients, {NUM_CLINICIANS} clinicians")
    return result


async def seed_patients(users: dict) -> List:
    print("Seeding patient records with clinical profiles...")
    patients = []
    profiles = PATIENT_PROFILES * 10  # enough to cover 50 patients

    for i, user in enumerate(users["patients"]):
        profile = profiles[i % len(PATIENT_PROFILES)]
        conditions, allergies, baseline, _, _ = profile

        patient = await db.patient.create(data={
            "userId":            user.id,
            "emergencyContact":  phone(),
            "dateOfBirth":       dob(),
            "gender":            random.choice(GENDERS),
            "chronicConditions": json.dumps(conditions),
            "allergies":         json.dumps(allergies),
            "baselineStatus":    baseline,
            "updatedAt":         datetime.now(),
        })
        patients.append(patient)

    print(f"  ✓ {len(patients)} patient records")
    return patients


async def seed_clinicians(users: dict) -> List:
    print("Seeding clinician records...")
    clinicians = []
    specs = SPECIALIZATIONS * 2

    for i, user in enumerate(users["clinicians"]):
        clinician = await db.clinician.create(data={
            "userId":         user.id,
            "fullName":       user.fullName or "Unknown",
            "specialization": specs[i % len(SPECIALIZATIONS)],
        })
        clinicians.append(clinician)

    print(f"  ✓ {len(clinicians)} clinician records")
    return clinicians


async def seed_assignments(patients: List, clinicians: List, patient_profiles: List) -> List:
    print("Seeding assignments with care contexts...")
    assignments = []
    seen_pairs  = set()  # Track active pairs to avoid duplicates in seed

    for i, patient in enumerate(patients):
        profile = patient_profiles[i % len(PATIENT_PROFILES)]
        _, _, _, care_context, care_reason = profile

        # Assign 1–2 clinicians per patient
        num_clinicians = random.randint(1, 2)
        selected       = random.sample(clinicians, min(num_clinicians, len(clinicians)))

        for clinician in selected:
            pair = (patient.id, clinician.id)
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)

            assignment = await db.assignment.create(data={
                "patientId":   patient.id,
                "clinicianId": clinician.id,
                "status":      "ACTIVE",
                "careContext": care_context,
                "reason":      care_reason,
                "assignedAt":  past_ts(180),
            })
            assignments.append(assignment)

    print(f"  ✓ {len(assignments)} assignments")
    return assignments


async def seed_symptom_reports(patients: List, patient_profiles: List) -> dict:
    """
    Create structured symptom reports and run each through the real intelligence layer.
    Reports are generated in chronological order so trend analysis sees a real progression.
    """
    print("Seeding symptom reports through the intelligence layer (this may take a moment)...")
    all_reports = []
    all_alerts  = []
    total_high  = 0
    total_worsen = 0

    for i, patient in enumerate(patients):
        profile = patient_profiles[i % len(PATIENT_PROFILES)]
        conditions, _, baseline, care_context, _ = profile

        # Determine number of reports based on baseline status
        n_reports = random.randint(12, 20) if baseline == "fragile" else random.randint(5, 12)

        # Generate timestamps in chronological order
        timestamps = chronological_timestamps(n_reports, span_days=85)

        # Build a severity progression:
        # 30% of patients worsening, 30% improving, 40% stable
        scenario = random.choices(["worsening", "improving", "stable"], weights=[0.30, 0.30, 0.40])[0]

        symptom_pool = SYMPTOM_SETS[care_context]

        for j, ts in enumerate(timestamps):
            progress = j / max(n_reports - 1, 1)  # 0.0 → 1.0

            # Pick symptom set weighted toward the scenario
            if scenario == "worsening":
                # Start mild, escalate
                if progress < 0.4:
                    sym_candidates = [s for s in symptom_pool if s[1] in ("MILD", "MODERATE")]
                elif progress < 0.7:
                    sym_candidates = [s for s in symptom_pool if s[1] in ("MODERATE", "SEVERE")]
                else:
                    sym_candidates = [s for s in symptom_pool if s[1] in ("SEVERE", "CRITICAL")]
            elif scenario == "improving":
                # Start severe, recover
                if progress < 0.4:
                    sym_candidates = [s for s in symptom_pool if s[1] in ("SEVERE", "CRITICAL")]
                elif progress < 0.7:
                    sym_candidates = [s for s in symptom_pool if s[1] in ("MODERATE", "SEVERE")]
                else:
                    sym_candidates = [s for s in symptom_pool if s[1] in ("MILD", "MODERATE")]
            else:
                # Stable — mix of mild/moderate with occasional spike
                sym_candidates = [s for s in symptom_pool if s[1] in ("MILD", "MODERATE")]

            if not sym_candidates:
                sym_candidates = symptom_pool

            symptoms, severity = random.choice(sym_candidates)

            duration_days = random.choice([1, 2, 3, 5, 7, 10, 14, 21])
            frequency     = random.choice(FREQUENCY_POOL)
            notes         = random.choice(NOTES_POOL)
            temperature   = round(random.uniform(36.5, 40.0), 1) if random.random() < 0.4 else None
            heart_rate    = random.randint(55, 130) if random.random() < 0.4 else None
            med_adherent  = random.choice([True, True, True, False]) if conditions else None

            # Create the report record
            report = await db.symptomreport.create(data={
                "patientId":          patient.id,
                "notes":              notes,
                "symptoms":           json.dumps(symptoms),
                "severity":           severity,
                "durationDays":       duration_days,
                "frequency":          frequency,
                "temperature":        temperature,
                "heartRate":          heart_rate,
                "medicationAdherent": med_adherent,
                "riskLevel":          "LOW",   # will be updated
                "riskScore":          0.0,
                "createdAt":          ts,
            })

            # Run through the real intelligence layer
            risk_level, risk_score, risk_factors_json, risk_explanation = await classifySymptomReport(
                patientId=patient.id,
                symptoms=symptoms,
                severity=severity,
                durationDays=duration_days,
                frequency=frequency,
                temperature=temperature,
                heartRate=heart_rate,
                medicationAdherent=med_adherent,
                careContext=care_context,
                chronicConditions=conditions,
            )

            trend_status, _ = await analyzeTrend(patient.id, severity)

            # Update report with computed risk data
            updated = await db.symptomreport.update(
                where={"id": report.id},
                data={
                    "riskLevel":       risk_level,
                    "riskScore":       risk_score,
                    "riskFactors":     risk_factors_json,
                    "riskExplanation": risk_explanation,
                },
            )
            all_reports.append(updated)

            # Update patient record
            await db.patient.update(
                where={"id": patient.id},
                data={
                    "currentRiskLevel":   risk_level,
                    "currentTrendStatus": trend_status,
                    "lastRiskUpdate":     ts,
                    "lastTrendUpdate":    ts,
                    "lastReportTime":     ts,
                },
            )

            # Generate alerts via the real alert service
            if risk_level == "HIGH":
                alert = await generateRiskAlert(patient.id, report.id, risk_level, risk_explanation)
                if alert:
                    all_alerts.append(alert)
                    total_high += 1

            if trend_status == "WORSENING":
                alert = await generateTrendAlert(patient.id, report.id, trend_status, risk_explanation)
                if alert:
                    all_alerts.append(alert)
                    total_worsen += 1

    print(f"  ✓ {len(all_reports)} symptom reports")
    print(f"  ✓ {total_high} HIGH_RISK alerts + {total_worsen} WORSENING_TREND alerts")
    return {"reports": all_reports, "alerts": all_alerts}


async def seed_performance_metrics(users: dict) -> List:
    print("Seeding performance metrics...")
    all_users = users["patients"] + users["clinicians"] + users["admins"]
    metrics   = []

    for _ in range(NUM_PERF_METRICS):
        status_code = random.choices(
            STATUS_CODES,
            weights=[0.40, 0.20, 0.10, 0.05, 0.05, 0.07, 0.04, 0.04, 0.03, 0.02],
        )[0]
        error_type    = None
        error_message = None

        if status_code >= 400:
            error_type = random.choice(ERROR_TYPES[3:])
            msgs = {
                "ValidationError":    "Invalid input data",
                "AuthorizationError": "Insufficient permissions",
                "NotFoundError":      "Resource not found",
                "DatabaseError":      "Database connection timeout",
            }
            error_message = msgs.get(error_type, "Unknown error")

        metric = await db.performancemetric.create(data={
            "endpoint":       random.choice(ENDPOINTS),
            "method":         random.choice(HTTP_METHODS),
            "responseTimeMs": random.randint(8, 1800),
            "statusCode":     status_code,
            "errorType":      error_type,
            "errorMessage":   error_message,
            "timestamp":      past_ts(7),
            "userId":         random.choice(all_users).id if random.random() > 0.3 else None,
        })
        metrics.append(metric)

    print(f"  ✓ {len(metrics)} performance metrics")
    return metrics


# ─────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────

async def main():
    print("=" * 62)
    print("  Remote Patient Monitoring System — Seed Data")
    print("=" * 62)
    print()

    try:
        await db.connect()
        print("Connected to database\n")

        await clear_database()
        print()

        users      = await seed_users()
        print()
        patients   = await seed_patients(users)
        print()
        clinicians = await seed_clinicians(users)
        print()
        assignments = await seed_assignments(patients, clinicians, PATIENT_PROFILES)
        print()
        intelligence = await seed_symptom_reports(patients, PATIENT_PROFILES)
        print()
        metrics = await seed_performance_metrics(users)
        print()

        # Final counts
        alerts_total = len(intelligence["alerts"])
        print("=" * 62)
        print("  SEED SUMMARY")
        print("=" * 62)
        total_users = NUM_ADMINS + NUM_PATIENTS + NUM_CLINICIANS
        print(f"  Users:            {total_users}  ({NUM_ADMINS} admins, {NUM_PATIENTS} patients, {NUM_CLINICIANS} clinicians)")
        print(f"  Patient records:  {len(patients)}")
        print(f"  Clinician records:{len(clinicians)}")
        print(f"  Assignments:      {len(assignments)}")
        print(f"  Symptom reports:  {len(intelligence['reports'])}  (scored by real engine)")
        print(f"  Alerts generated: {alerts_total}  (logic-derived, not random)")
        print(f"  Perf metrics:     {len(metrics)}")
        print("=" * 62)
        print()
        print("  Login credentials:  password123  (all users)")
        print("  Admin email:        admin.1@telemed.local")
        print()
        print("  Seed completed successfully ✓")

    except Exception as e:
        print(f"\n  ERROR during seeding: {e}")
        raise
    finally:
        await db.disconnect()
        print("  Disconnected from database")


if __name__ == "__main__":
    asyncio.run(main())
