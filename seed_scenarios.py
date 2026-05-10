"""Seed data specifically for project defense and platform validation scenarios.

Creates deterministic accounts and rich scenario datasets matching:
- `defense/SIMULATED_PATIENT_SCENARIOS.md`

Key properties:
- Does NOT wipe the whole database.
- Cleans up only users with email domain `@defense.local`.
- Inserts timestamped symptom reports and runs the *real* intelligence logic:
  - risk classification (`classifySymptomReport`)
  - trend analysis (`analyzeTrend`)
  - alert generation with embedded reasoning
- Adds platform validation fixtures:
  - empty and single-report patient edge cases
  - active, inactive, and reassigned clinician assignments
  - alert workflow states
  - clinician tasks
  - push subscriptions
  - audit logs
  - performance metrics

Run:
  python seed_scenarios.py
"""

import asyncio
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
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


def _now_minus_hours(hours: int) -> datetime:
    return datetime.now() - timedelta(hours=hours)


async def _cleanup_defense_data() -> None:
    users = await db.user.find_many(where={"email": {"contains": f"@{DOMAIN}"}})
    if not users:
        return

    user_ids = [u.id for u in users]

    clinicians = await db.clinician.find_many(where={"userId": {"in": user_ids}})
    clinician_ids = [c.id for c in clinicians]

    patients = await db.patient.find_many(where={"userId": {"in": user_ids}})
    patient_ids = [p.id for p in patients]

    # New: clear notifications, follow-up responses & appointments before parents.
    try:
        await db.notification.delete_many(where={"userId": {"in": user_ids}})
    except Exception:
        pass
    if patient_ids:
        try:
            await db.followupresponse.delete_many(where={"patientId": {"in": patient_ids}})
        except Exception:
            pass
        try:
            await db.followupappointment.delete_many(where={"patientId": {"in": patient_ids}})
        except Exception:
            pass
        await db.task.delete_many(where={"patientId": {"in": patient_ids}})
        await db.alert.delete_many(where={"patientId": {"in": patient_ids}})
        await db.symptomreport.delete_many(where={"patientId": {"in": patient_ids}})
        await db.assignment.delete_many(where={"patientId": {"in": patient_ids}})

    await db.pushsubscription.delete_many(where={"userId": {"in": user_ids}})
    await db.auditlog.delete_many(where={"actorUserId": {"in": user_ids}})
    await db.performancemetric.delete_many(where={"userId": {"in": user_ids}})

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
    date_of_birth: str = "1990-01-01T00:00:00",
    gender: str = "Prefer not to say",
    address: Optional[str] = None,
) -> dict:
    user = await _create_user(email=email, full_name=full_name, role="PATIENT")
    patient = await db.patient.create(
        data={
            "userId": user.id,
            "emergencyContact": "+263-77-000-0000",
            "address": address,
            "dateOfBirth": datetime.fromisoformat(date_of_birth),
            "gender": gender,
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


async def _ensure_active_assignment(
    patient_id: int,
    clinician_id: int,
    care_context: str,
    reason: str,
) -> dict:
    existing = await db.assignment.find_first(
        where={"patientId": patient_id, "status": "ACTIVE"},
        order={"assignedAt": "desc"},
    )
    if existing:
        return existing

    return await _create_assignment(
        patient_id=patient_id,
        clinician_id=clinician_id,
        care_context=care_context,
        reason=reason,
        assigned_at=_now_minus_hours(1),
        active=True,
    )


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
) -> dict:
    return await db.alert.create(
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


async def _create_task(
    patient_id: int,
    clinician_id: int,
    title: str,
    priority: str,
    due_at: datetime,
    status: str = "OPEN",
    alert_id: Optional[int] = None,
    description: Optional[str] = None,
    completed_at: Optional[datetime] = None,
) -> dict:
    return await db.task.create(
        data={
            "patientId": patient_id,
            "assignedClinicianId": clinician_id,
            "createdFromAlertId": alert_id,
            "title": title,
            "description": description,
            "dueAt": due_at,
            "status": status,
            "priority": priority,
            "completedAt": completed_at,
            "createdAt": due_at - timedelta(days=1),
        }
    )


async def _create_push_subscription(user_id: int, label: str) -> dict:
    safe_label = label.lower().replace(" ", "-")
    return await db.pushsubscription.create(
        data={
            "userId": user_id,
            "endpoint": f"https://push.defense.local/{safe_label}/{user_id}",
            "p256dh": f"defense-p256dh-{safe_label}-{user_id}",
            "auth": f"defense-auth-{safe_label}-{user_id}",
            "createdAt": _now_minus(3),
            "updatedAt": _now_minus(1),
        }
    )


async def _create_audit_log(
    actor_user_id: int,
    actor_role: str,
    action: str,
    method: str,
    path: str,
    status_code: int,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    created_at: Optional[datetime] = None,
) -> dict:
    return await db.auditlog.create(
        data={
            "actorUserId": actor_user_id,
            "actorRole": actor_role,
            "action": action,
            "method": method,
            "path": path,
            "resourceType": resource_type,
            "resourceId": resource_id,
            "statusCode": status_code,
            "ipAddress": "127.0.0.1",
            "userAgent": "DefenseScenarioSeeder/1.0",
            "metadata": json.dumps(metadata or {}),
            "createdAt": created_at or datetime.now(),
        }
    )


async def _create_performance_metric(
    user_id: int,
    endpoint: str,
    method: str,
    response_time_ms: int,
    status_code: int,
    error_type: Optional[str] = None,
    error_message: Optional[str] = None,
    timestamp: Optional[datetime] = None,
) -> dict:
    return await db.performancemetric.create(
        data={
            "endpoint": endpoint,
            "method": method,
            "responseTimeMs": response_time_ms,
            "statusCode": status_code,
            "errorType": error_type,
            "errorMessage": error_message,
            "timestamp": timestamp or datetime.now(),
            "userId": user_id,
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
    if not active_assignment:
        raise RuntimeError(
            f"Cannot seed report for patient {patient_id}: no active clinician assignment."
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

    trend_status, _trend_details = await analyzeTrend(patient_id, risk_score)

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


async def _create_followup_response(
    *,
    symptom_report_id: int,
    clinician_id: int,
    patient_id: int,
    message: str,
    action_required: bool,
    created_at: datetime,
) -> dict:
    return await db.followupresponse.create(
        data={
            "symptomReportId": symptom_report_id,
            "clinicianId": clinician_id,
            "patientId": patient_id,
            "message": message,
            "actionRequired": action_required,
            "createdAt": created_at,
        }
    )


async def _create_followup_appointment(
    *,
    patient_id: int,
    clinician_id: int,
    scheduled_at: datetime,
    reason: str,
    status: str = "SCHEDULED",
    created_at: Optional[datetime] = None,
) -> dict:
    now = datetime.now(timezone.utc)
    return await db.followupappointment.create(
        data={
            "patientId": patient_id,
            "clinicianId": clinician_id,
            "scheduledAt": scheduled_at,
            "reason": reason,
            "status": status,
            "createdAt": created_at or (scheduled_at - timedelta(days=2)),
            "updatedAt": now,
        }
    )


async def _create_notification(
    *,
    user_id: int,
    title: str,
    message: str,
    notif_type: str,
    is_read: bool = False,
    link: Optional[str] = None,
    created_at: Optional[datetime] = None,
) -> dict:
    return await db.notification.create(
        data={
            "userId": user_id,
            "title": title,
            "message": message,
            "type": notif_type,
            "isRead": is_read,
            "link": link,
            "createdAt": created_at or datetime.now(timezone.utc),
        }
    )


async def _seed_followup_workflow_artifacts(
    patients: Dict[str, dict],
    clinicians: Dict[str, dict],
) -> Dict[str, int]:
    """Create deterministic clinician follow-up responses, scheduled appointments,
    and patient-facing notifications so the new UI flows have rich demo data."""

    clinician_ids = {key: value["clinician"].id for key, value in clinicians.items()}
    counts = {"responses": 0, "appointments": 0, "notifications": 0}

    # ── 1. Clinician responses: reply to the most recent HIGH-risk reports ──
    response_map = [
        ("emergency", "cardio", True,  "High-risk presentation. Please proceed to the emergency department immediately."),
        ("tendai",    "pulmo",  True,  "Use rescue inhaler now and book an in-person review within 24 hours."),
        ("farai",     "cardio", True,  "Blood-pressure trend is concerning — please double-check readings twice daily."),
        ("nyasha",    "cardio", False, "Glucose values look acceptable; continue current insulin regimen and dietary plan."),
        ("chipo",     "general", False, "Fever appears to be resolving — continue prescribed antimalarials and rest."),
        ("improving", "general", False, "Recovery is on track. Keep wound clean and watch for redness or new fever."),
        ("stable",    "cardio", False, "Readings remain within target range. Continue current medications."),
    ]

    for patient_key, clinician_key, action_required, message in response_map:
        patient_rec = patients.get(patient_key)
        if not patient_rec:
            continue
        latest_report = await db.symptomreport.find_first(
            where={"patientId": patient_rec["patient"].id},
            order={"createdAt": "desc"},
        )
        if not latest_report:
            continue

        report_created = latest_report.createdAt
        if report_created.tzinfo is None:
            report_created = report_created.replace(tzinfo=timezone.utc)
        responded_at = min(
            report_created + timedelta(hours=4, minutes=30),
            datetime.now(timezone.utc),
        )

        await _create_followup_response(
            symptom_report_id=latest_report.id,
            clinician_id=clinician_ids[clinician_key],
            patient_id=patient_rec["patient"].id,
            message=message,
            action_required=action_required,
            created_at=responded_at,
        )
        counts["responses"] += 1

        await _create_notification(
            user_id=patient_rec["user"].id,
            title="Clinician response received",
            message=(
                "Your clinician has reviewed your latest report"
                + (" — action required." if action_required else ".")
            ),
            notif_type="FOLLOW_UP_RESPONSE",
            is_read=False,
            link="/patient/history",
            created_at=responded_at,
        )
        counts["notifications"] += 1

    # ── 2. Scheduled follow-up appointments (mix of upcoming + completed) ──
    now_utc = datetime.now(timezone.utc)
    appointment_map = [
        # (patient_key, clinician_key, scheduled_offset_days, reason, status)
        ("emergency", "cardio",  1,  "Urgent cardiology review after critical presentation", "SCHEDULED"),
        ("tendai",    "pulmo",   2,  "Asthma follow-up: review inhaler technique",            "SCHEDULED"),
        ("farai",     "cardio",  4,  "Blood-pressure recheck and medication review",          "SCHEDULED"),
        ("nyasha",    "cardio",  7,  "Glycaemic control quarterly review",                    "SCHEDULED"),
        ("improving", "general", 5,  "Post-surgery wound check",                              "SCHEDULED"),
        ("chipo",     "general", -3, "Post-malaria recovery review",                          "COMPLETED"),
        ("stable",    "cardio",  -10,"Routine quarterly hypertension check-in",               "COMPLETED"),
        ("s8",        "general", -2, "Frequent-reporting pattern review",                     "MISSED"),
    ]

    for patient_key, clinician_key, offset_days, reason, status in appointment_map:
        patient_rec = patients.get(patient_key)
        if not patient_rec:
            continue
        scheduled_at = now_utc + timedelta(days=offset_days, hours=10)

        await _create_followup_appointment(
            patient_id=patient_rec["patient"].id,
            clinician_id=clinician_ids[clinician_key],
            scheduled_at=scheduled_at,
            reason=reason,
            status=status,
            created_at=scheduled_at - timedelta(days=2),
        )
        counts["appointments"] += 1

        if status == "SCHEDULED":
            await _create_notification(
                user_id=patient_rec["user"].id,
                title="Follow-up scheduled",
                message=f"Follow-up scheduled for {scheduled_at.strftime('%b %d, %Y at %H:%M')}: {reason}",
                notif_type="FOLLOW_UP_SCHEDULED",
                is_read=False,
                link="/patient",
                created_at=scheduled_at - timedelta(days=2),
            )
            counts["notifications"] += 1

    # ── 3. Generic patient-facing notifications (medication / system) ──
    generic_for_patients = [
        ("Medication reminder",   "Time to take your evening medication.",                        "MEDICATION_CHECK_IN"),
        ("Daily check-in",        "Don't forget to log today's symptoms and vitals.",             "MEDICATION_CHECK_IN"),
        ("Privacy reminder",      "Your health data is encrypted and shared only with your team.", "SYSTEM_MESSAGE"),
    ]
    for patient_rec in patients.values():
        for title, message, ntype in generic_for_patients:
            await _create_notification(
                user_id=patient_rec["user"].id,
                title=title,
                message=message,
                notif_type=ntype,
                is_read=False,
                created_at=now_utc - timedelta(hours=6),
            )
            counts["notifications"] += 1

    # ── 4. Clinician + admin system notifications ──
    for clinician_rec in clinicians.values():
        await _create_notification(
            user_id=clinician_rec["user"].id,
            title="New high-risk alerts pending",
            message="You have HIGH-priority alerts awaiting triage.",
            notif_type="HIGH_RISK_ALERT",
            is_read=False,
            link="/clinician/alerts",
            created_at=now_utc - timedelta(hours=2),
        )
        counts["notifications"] += 1

    return counts


async def _seed_alert_workflow_artifacts(
    patient_ids: List[int],
    clinician_ids: Dict[str, int],
) -> None:
    alerts = await db.alert.find_many(
        where={"patientId": {"in": patient_ids}},
        order={"createdAt": "asc"},
        take=8,
    )

    workflow_updates = [
        ("ACKNOWLEDGED", "pulmo", "Clinician acknowledged the respiratory warning.", None, None),
        ("IN_PROGRESS", "general", "Follow-up call started.", None, None),
        ("RESOLVED", "infect", "Patient reviewed and symptoms improved after treatment.", _now_minus(3), None),
        ("SNOOZED", "cardio", "Review again after the next scheduled reading.", None, datetime.now() + timedelta(days=1)),
        ("ESCALATED", "cardio", "Escalated to cardiology because vitals were unstable.", None, None),
    ]

    for alert, (status, clinician_key, note, resolved_at, snoozed_until) in zip(alerts, workflow_updates):
        await db.alert.update(
            where={"id": alert.id},
            data={
                "status": status,
                "isRead": True,
                "assignedToClinicianId": clinician_ids[clinician_key],
                "resolutionNote": note,
                "resolvedAt": resolved_at,
                "snoozedUntil": snoozed_until,
                "lastActionAt": _now_minus(1),
            },
        )

    task_sources = alerts[:5]
    for index, alert in enumerate(task_sources):
        clinician_key = ["pulmo", "general", "infect", "cardio", "cardio"][index]
        task_status = ["OPEN", "IN_PROGRESS", "DONE", "OPEN", "OPEN"][index]
        due_at = [_now_minus(1), datetime.now() + timedelta(hours=8), _now_minus(2), datetime.now() + timedelta(days=1), datetime.now() + timedelta(days=2)][index]
        await _create_task(
            patient_id=alert.patientId,
            clinician_id=clinician_ids[clinician_key],
            alert_id=alert.id,
            title=[
                "Call patient about urgent symptoms",
                "Check vitals after treatment started",
                "Document resolved infection follow-up",
                "Review snoozed recovery alert",
                "Escalated cardiology review",
            ][index],
            description=f"Task generated from seeded alert {alert.id}.",
            priority=str(alert.priority),
            due_at=due_at,
            status=task_status,
            completed_at=_now_minus(1) if task_status == "DONE" else None,
        )


async def _seed_operational_artifacts(
    admin: dict,
    clinicians: Dict[str, dict],
    patients: Dict[str, dict],
) -> None:
    clinician_ids = {key: value["clinician"].id for key, value in clinicians.items()}
    patient_ids = [value["patient"].id for value in patients.values()]

    await _seed_alert_workflow_artifacts(patient_ids, clinician_ids)
    followup_counts = await _seed_followup_workflow_artifacts(patients, clinicians)

    # Notify admin of the seeded operational state.
    await _create_notification(
        user_id=admin.id,
        title="Defense scenario data seeded",
        message=(
            f"Seeded {followup_counts['responses']} clinician responses, "
            f"{followup_counts['appointments']} follow-up appointments, "
            f"{followup_counts['notifications']} notifications."
        ),
        notif_type="SYSTEM_MESSAGE",
        is_read=False,
        link="/admin",
    )

    await _create_task(
        patient_id=patients["empty"]["patient"].id,
        clinician_id=clinician_ids["general"],
        title="Initial onboarding check",
        description="Confirm that the patient can submit their first symptom report.",
        priority="LOW",
        due_at=datetime.now() + timedelta(days=3),
    )

    await _create_push_subscription(clinicians["general"]["user"].id, "general clinician")
    await _create_push_subscription(clinicians["cardio"]["user"].id, "cardiology clinician")
    await _create_push_subscription(admin.id, "admin")

    audit_events = [
        (admin.id, "ADMIN", "LIST_DASHBOARD", "GET", "/api/dashboard/admin", 200, "dashboard", None, {"screen": "admin_overview"}, _now_minus(1)),
        (clinicians["general"]["user"].id, "CLINICIAN", "LIST_ALERTS", "GET", "/api/alerts", 200, "alert", None, {"filter": "new"}, _now_minus(1)),
        (clinicians["cardio"]["user"].id, "CLINICIAN", "TRIAGE_ALERT", "PATCH", "/api/alerts/triage", 200, "alert", "seeded", {"action": "ESCALATE"}, _now_minus(1)),
        (patients["single"]["user"].id, "PATIENT", "CREATE_SYMPTOM_REPORT", "POST", "/api/symptom-reports", 201, "symptom_report", "seeded", {"scenario": "single_report"}, _now_minus(2)),
        (patients["empty"]["user"].id, "PATIENT", "LIST_REPORTS", "GET", "/api/symptom-reports", 200, "symptom_report", None, {"scenario": "empty_state"}, _now_minus(2)),
        (clinicians["infect"]["user"].id, "CLINICIAN", "ACCESS_DENIED", "GET", "/api/patients/99999", 403, "patient", "99999", {"reason": "unassigned_patient"}, _now_minus(3)),
    ]
    for event in audit_events:
        await _create_audit_log(*event)

    metrics = [
        (admin.id, "/api/dashboard/admin", "GET", 84, 200, None, None, _now_minus(1)),
        (clinicians["general"]["user"].id, "/api/alerts", "GET", 71, 200, None, None, _now_minus(1)),
        (clinicians["cardio"]["user"].id, "/api/tasks", "GET", 63, 200, None, None, _now_minus(1)),
        (patients["single"]["user"].id, "/api/symptom-reports", "POST", 118, 201, None, None, _now_minus(2)),
        (patients["empty"]["user"].id, "/api/dashboard/patient", "GET", 59, 200, None, None, _now_minus(2)),
        (clinicians["infect"]["user"].id, "/api/patients/99999", "GET", 31, 403, "AccessDenied", "Clinician is not assigned to this patient", _now_minus(3)),
        (admin.id, "/api/metrics/performance", "GET", 96, 200, None, None, _now_minus(1)),
    ]
    for metric in metrics:
        await _create_performance_metric(*metric)


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
        assigned_at=_now_minus_hours(22),
        active=True,
    )
    s6_assignment_b = await _create_assignment(
        patient_id=tendai["patient"].id,
        clinician_id=cardio["clinician"].id,
        care_context="ASTHMA_FOLLOWUP",
        reason="Cardiac co-monitoring during asthma care",
        assigned_at=_now_minus_hours(21),
        active=True,
    )
    await _run_scenario_reports(
        tendai["patient"].id,
        [
            ReportInput(_now_minus_hours(18), ["shortness_of_breath"], "MODERATE", 3, "RECURRING"),
            ReportInput(_now_minus_hours(12), ["difficulty_breathing"], "SEVERE", 2, "RECURRING"),
            ReportInput(_now_minus_hours(6), ["cough"], "MODERATE", 2, "RECURRING"),
        ],
    )
    await _set_assignment_inactive(s6_assignment_b.id, _now_minus_hours(3))
    # Assignment A remains ACTIVE

    # Scenario S7 — Reassignment mid-care
    # Reuse the same patient; create fresh assignments and reports close to now so it’s demo-friendly.
    s7a_assignment = await _create_assignment(
        patient_id=chipo["patient"].id,
        clinician_id=infect["clinician"].id,
        care_context="INFECTION_FOLLOWUP",
        reason="Infection follow-up (initial clinician)",
        assigned_at=_now_minus_hours(36),
        active=True,
    )
    await _run_scenario_reports(
        chipo["patient"].id,
        [
            ReportInput(_now_minus_hours(32), ["fever"], "MODERATE", 2, "FIRST_TIME", temperature=38.2),
            ReportInput(_now_minus_hours(24), ["high_fever"], "MODERATE", 3, "RECURRING", temperature=39.6),
        ],
    )
    await _set_assignment_inactive(s7a_assignment.id, _now_minus_hours(20))

    s7b_assignment = await _create_assignment(
        patient_id=chipo["patient"].id,
        clinician_id=general["clinician"].id,
        care_context="INFECTION_FOLLOWUP",
        reason="Infection follow-up (reassigned clinician)",
        assigned_at=_now_minus_hours(20),
        active=True,
    )
    await _run_scenario_reports(
        chipo["patient"].id,
        [
            ReportInput(_now_minus_hours(16), ["high_fever", "confusion"], "SEVERE", 1, "FIRST_TIME", temperature=39.8),
            ReportInput(_now_minus_hours(4), [], "MILD", 1, "FIRST_TIME", temperature=36.9),
        ],
    )
    await _set_assignment_inactive(s7b_assignment.id, _now_minus_hours(1))

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

    # Scenario S9 — Dashboard empty state: assigned patient with no reports
    empty_patient = await _create_patient(
        email=f"patient.empty.noreports@{DOMAIN}",
        full_name="Scenario9 (No reports yet)",
        chronic_conditions=[],
        baseline_status="stable",
        date_of_birth="2001-04-12T00:00:00",
        gender="Female",
        address="Harare demo district",
    )
    await _create_assignment(
        patient_id=empty_patient["patient"].id,
        clinician_id=general["clinician"].id,
        care_context="GENERAL_REVIEW",
        reason="New patient onboarding with empty dashboard state",
        assigned_at=_now_minus(2),
        active=True,
    )

    # Scenario S10 — Single-report edge case: risk computes, trend remains STABLE
    single_patient = await _create_patient(
        email=f"patient.single.report@{DOMAIN}",
        full_name="Scenario10 (Single report)",
        chronic_conditions=["asthma"],
        baseline_status="stable",
        date_of_birth="1988-08-30T00:00:00",
        gender="Male",
        address="Bulawayo demo district",
    )
    await _create_assignment(
        patient_id=single_patient["patient"].id,
        clinician_id=pulmo["clinician"].id,
        care_context="ASTHMA_FOLLOWUP",
        reason="Single report trend-analysis edge case",
        assigned_at=_now_minus(3),
        active=True,
    )
    await _run_scenario_reports(
        single_patient["patient"].id,
        [
            ReportInput(
                _now_minus(1),
                ["shortness_of_breath"],
                "MODERATE",
                2,
                "FIRST_TIME",
                heart_rate=98,
                medication_adherent=True,
                notes="Single seeded report: trend should remain STABLE because history is insufficient.",
            ),
        ],
    )

    # Scenario S11 — Immediate emergency: critical symptoms should produce HIGH risk and alert
    emergency_patient = await _create_patient(
        email=f"patient.emergency.critical@{DOMAIN}",
        full_name="Scenario11 (Emergency critical)",
        chronic_conditions=["heart_disease", "hypertension"],
        baseline_status="fragile",
        date_of_birth="1966-11-18T00:00:00",
        gender="Male",
        address="Gweru demo district",
    )
    await _create_assignment(
        patient_id=emergency_patient["patient"].id,
        clinician_id=cardio["clinician"].id,
        care_context="CHRONIC_DISEASE_MONITORING",
        reason="Emergency cardiology presentation",
        assigned_at=_now_minus(4),
        active=True,
    )
    await _run_scenario_reports(
        emergency_patient["patient"].id,
        [
            ReportInput(
                _now_minus(1),
                ["chest_pain", "difficulty_breathing", "rapid_heartbeat"],
                "CRITICAL",
                1,
                "FIRST_TIME",
                temperature=37.9,
                heart_rate=132,
                medication_adherent=False,
                notes="Emergency scenario: validates immediate high-risk classification and alerting.",
            ),
        ],
    )

    # Scenario S12 — Clear improvement: high initial risk settles to low risk
    improving_patient = await _create_patient(
        email=f"patient.improving.recovery@{DOMAIN}",
        full_name="Scenario12 (Improving recovery)",
        chronic_conditions=[],
        baseline_status="stable",
        date_of_birth="1997-02-20T00:00:00",
        gender="Female",
        address="Mutare demo district",
    )
    await _create_assignment(
        patient_id=improving_patient["patient"].id,
        clinician_id=general["clinician"].id,
        care_context="POST_SURGERY_RECOVERY",
        reason="Recovery trajectory after procedure",
        assigned_at=_now_minus(9),
        active=True,
    )
    await _run_scenario_reports(
        improving_patient["patient"].id,
        [
            ReportInput(_now_minus(8), ["severe_pain", "swelling"], "SEVERE", 1, "FIRST_TIME", heart_rate=106),
            ReportInput(_now_minus(6), ["fever", "swelling"], "MODERATE", 2, "RECURRING", temperature=38.1),
            ReportInput(_now_minus(3), ["fatigue"], "MILD", 2, "RECURRING", temperature=37.1),
            ReportInput(_now_minus(1), [], "MILD", 1, "FIRST_TIME", temperature=36.8, notes="Recovery report with no active symptoms."),
        ],
    )

    # Scenario S13 — Stable chronic patient: repeated low-grade symptoms without alert noise
    stable_patient = await _create_patient(
        email=f"patient.stable.chronic@{DOMAIN}",
        full_name="Scenario13 (Stable chronic)",
        chronic_conditions=["hypertension"],
        baseline_status="stable",
        date_of_birth="1974-06-09T00:00:00",
        gender="Female",
        address="Masvingo demo district",
    )
    await _create_assignment(
        patient_id=stable_patient["patient"].id,
        clinician_id=cardio["clinician"].id,
        care_context="CHRONIC_DISEASE_MONITORING",
        reason="Stable hypertension monitoring without false-positive alerts",
        assigned_at=_now_minus(14),
        active=True,
    )
    await _run_scenario_reports(
        stable_patient["patient"].id,
        [
            ReportInput(_now_minus(12), ["headache"], "MILD", 1, "RECURRING", heart_rate=84, medication_adherent=True),
            ReportInput(_now_minus(8), ["headache"], "MILD", 1, "RECURRING", heart_rate=82, medication_adherent=True),
            ReportInput(_now_minus(4), ["fatigue"], "MILD", 1, "RECURRING", heart_rate=80, medication_adherent=True),
            ReportInput(_now_minus(1), ["headache"], "MILD", 1, "RECURRING", heart_rate=83, medication_adherent=True),
        ],
    )

    patients = {
        "tendai": tendai,
        "tafadzwa": tafadzwa,
        "farai": farai,
        "chipo": chipo,
        "nyasha": nyasha,
        "s8": s8_patient,
        "empty": empty_patient,
        "single": single_patient,
        "emergency": emergency_patient,
        "improving": improving_patient,
        "stable": stable_patient,
    }

    # Guarantee every defense patient remains visible in active-assignment views.
    await _ensure_active_assignment(
        patient_id=tendai["patient"].id,
        clinician_id=pulmo["clinician"].id,
        care_context="ASTHMA_FOLLOWUP",
        reason="Current demo respiratory monitoring assignment",
    )
    await _ensure_active_assignment(
        patient_id=tafadzwa["patient"].id,
        clinician_id=general["clinician"].id,
        care_context="POST_SURGERY_RECOVERY",
        reason="Current demo post-surgery monitoring assignment",
    )
    await _ensure_active_assignment(
        patient_id=farai["patient"].id,
        clinician_id=cardio["clinician"].id,
        care_context="CHRONIC_DISEASE_MONITORING",
        reason="Current demo hypertension monitoring assignment",
    )
    await _ensure_active_assignment(
        patient_id=chipo["patient"].id,
        clinician_id=infect["clinician"].id,
        care_context="INFECTION_FOLLOWUP",
        reason="Current demo infection follow-up assignment",
    )
    await _ensure_active_assignment(
        patient_id=nyasha["patient"].id,
        clinician_id=cardio["clinician"].id,
        care_context="CHRONIC_DISEASE_MONITORING",
        reason="Current demo glycaemic control follow-up assignment",
    )
    await _ensure_active_assignment(
        patient_id=s8_patient["patient"].id,
        clinician_id=general["clinician"].id,
        care_context="GENERAL_REVIEW",
        reason="Current demo frequent-reporting assignment",
    )
    await _ensure_active_assignment(
        patient_id=empty_patient["patient"].id,
        clinician_id=general["clinician"].id,
        care_context="GENERAL_REVIEW",
        reason="Current demo empty-state assignment",
    )
    await _ensure_active_assignment(
        patient_id=single_patient["patient"].id,
        clinician_id=pulmo["clinician"].id,
        care_context="ASTHMA_FOLLOWUP",
        reason="Current demo single-report assignment",
    )
    await _ensure_active_assignment(
        patient_id=emergency_patient["patient"].id,
        clinician_id=cardio["clinician"].id,
        care_context="CHRONIC_DISEASE_MONITORING",
        reason="Current demo emergency monitoring assignment",
    )
    await _ensure_active_assignment(
        patient_id=improving_patient["patient"].id,
        clinician_id=general["clinician"].id,
        care_context="POST_SURGERY_RECOVERY",
        reason="Current demo recovery monitoring assignment",
    )
    await _ensure_active_assignment(
        patient_id=stable_patient["patient"].id,
        clinician_id=cardio["clinician"].id,
        care_context="CHRONIC_DISEASE_MONITORING",
        reason="Current demo stable chronic monitoring assignment",
    )

    await _seed_operational_artifacts(
        admin=admin,
        clinicians={
            "pulmo": pulmo,
            "cardio": cardio,
            "general": general,
            "infect": infect,
        },
        patients=patients,
    )

    return {
        "admin": admin,
        "clinicians": {
            "pulmo": pulmo,
            "cardio": cardio,
            "general": general,
            "infect": infect,
        },
        "patients": patients,
    }


async def main() -> None:
    await db.connect()
    try:
        print("Cleaning up existing @defense.local data...")
        await _cleanup_defense_data()
        print("  cleanup complete")

        print("Seeding rich defense and platform validation scenarios...")
        await seed_defense_scenarios()
        print("  done")

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
        print(f"- patient.empty.noreports@{DOMAIN}")
        print(f"- patient.single.report@{DOMAIN}")
        print(f"- patient.emergency.critical@{DOMAIN}")
        print(f"- patient.improving.recovery@{DOMAIN}")
        print(f"- patient.stable.chronic@{DOMAIN}")

        print("\nSeeded validation coverage:")
        print("- Risk levels: LOW, MEDIUM, HIGH")
        print("- Trend statuses: STABLE, IMPROVING, WORSENING")
        print("- Clinical workflows: active/inactive assignments, reassignment, dual assignment")
        print("- Operational data: alerts, triage states, tasks, push subscriptions, audit logs, metrics")
        print("- Follow-up workflow: clinician responses, scheduled appointments, action-required flags")
        print("- Notifications: HIGH_RISK_ALERT, FOLLOW_UP_RESPONSE, FOLLOW_UP_SCHEDULED, MEDICATION_CHECK_IN, SYSTEM_MESSAGE")

    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
