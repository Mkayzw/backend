"""
Dashboard Service — Decision View

Priority order for patients:
  1. Risk level      — HIGH first
  2. Trend status    — WORSENING first
  3. Last report     — most recent first
"""
from app.db import db
from typing import Optional, List
from datetime import datetime, timedelta


async def getStats(clinicianId: Optional[int] = None) -> dict:
    """
    Platform statistics including urgency indicators.
    """
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if clinicianId is not None:
        patient_where = {
            "assignments": {
                "some": {"clinicianId": clinicianId, "status": "ACTIVE"}
            }
        }
        total_users = 0 # Not relevant for clinician view typically, but keeping shape
        total_clinicians = 1
        total_patients = await db.patient.count(where=patient_where)
        total_assignments = await db.assignment.count(where={"clinicianId": clinicianId})
        active_assignments = await db.assignment.count(where={"clinicianId": clinicianId, "status": "ACTIVE"})
        
        unread_alerts = await db.alert.count(
            where={
                "isRead": False,
                "patient": {
                    "assignments": {
                        "some": {"clinicianId": clinicianId, "status": "ACTIVE"}
                    }
                }
            }
        )
        high_risk_patients = await db.patient.count(
            where={"currentRiskLevel": "HIGH", **patient_where}
        )
        worsening_patients = await db.patient.count(
            where={"currentTrendStatus": "WORSENING", **patient_where}
        )
        reports_today = await db.symptomreport.count(
            where={
                "createdAt": {"gte": today_start},
                "patient": {
                    "assignments": {
                        "some": {"clinicianId": clinicianId, "status": "ACTIVE"}
                    }
                }
            }
        )
        open_tasks = await db.task.count(
            where={
                "assignedClinicianId": clinicianId,
                "status": {"in": ["OPEN", "IN_PROGRESS"]},
            }
        )
        overdue_tasks = await db.task.count(
            where={
                "assignedClinicianId": clinicianId,
                "status": {"in": ["OPEN", "IN_PROGRESS"]},
                "dueAt": {"lt": now},
            }
        )
    else:
        total_users         = await db.user.count()
        total_patients      = await db.patient.count()
        total_clinicians    = await db.clinician.count()
        total_assignments   = await db.assignment.count()
        active_assignments  = await db.assignment.count(where={"status": "ACTIVE"})
        unread_alerts       = await db.alert.count(where={"isRead": False})
        high_risk_patients  = await db.patient.count(where={"currentRiskLevel": "HIGH"})
        worsening_patients  = await db.patient.count(where={"currentTrendStatus": "WORSENING"})
        reports_today       = await db.symptomreport.count(
            where={"createdAt": {"gte": today_start}}
        )
        open_tasks          = await db.task.count(where={"status": {"in": ["OPEN", "IN_PROGRESS"]}})
        overdue_tasks       = await db.task.count(
            where={"status": {"in": ["OPEN", "IN_PROGRESS"]}, "dueAt": {"lt": now}}
        )

    return {
        "totalUsers":         total_users,
        "totalPatients":      total_patients,
        "totalClinicians":    total_clinicians,
        "totalAssignments":   total_assignments,
        "activeAssignments":  active_assignments,
        # Urgency indicators
        "unreadAlerts":       unread_alerts,
        "highRiskPatients":   high_risk_patients,
        "worseningPatients":  worsening_patients,
        "reportsToday":       reports_today,
        "openTasks":          open_tasks,
        "overdueTasks":       overdue_tasks,
    }


async def getRecentActivity(clinicianId: Optional[int] = None) -> dict:
    """
    Recent platform activity for the admin overview panel.
    """
    if clinicianId is not None:
        patient_where = {
            "patient": {
                "assignments": {
                    "some": {"clinicianId": clinicianId, "status": "ACTIVE"}
                }
            }
        }
        recent_reports = await db.symptomreport.find_many(
            where=patient_where,
            take=5,
            order={"createdAt": "desc"},
            include={"patient": {"include": {"user": True}}},
        )

        recent_assignments = await db.assignment.find_many(
            where={"clinicianId": clinicianId},
            take=5,
            order={"assignedAt": "desc"},
            include={
                "patient":   {"include": {"user": True}},
                "clinician": {"include": {"user": True}},
            },
        )
        
        recent_users = [] 
    else:
        recent_reports = await db.symptomreport.find_many(
            take=5,
            order={"createdAt": "desc"},
            include={"patient": {"include": {"user": True}}},
        )

        recent_assignments = await db.assignment.find_many(
            take=5,
            order={"assignedAt": "desc"},
            include={
                "patient":   {"include": {"user": True}},
                "clinician": {"include": {"user": True}},
            },
        )

        recent_users = await db.user.find_many(
            take=5,
            order={"createdAt": "desc"},
        )

    return {
        "recentSymptomReports": recent_reports,
        "recentAssignments":    recent_assignments,
        "recentUsers":          recent_users,
    }


async def getPrioritizedPatients(clinicianId: Optional[int] = None) -> list:
    """
    Return patients sorted by: HIGH risk → WORSENING trend → most recent report.

    If clinicianId is provided, only returns that clinician's active patients.
    Enriches each patient with:
      - Latest symptom report (with riskExplanation)
      - Active assignment (with careContext)
      - Unread alert count
    """
    where: dict = {}
    if clinicianId is not None:
        where = {
            "assignments": {
                "some": {"clinicianId": clinicianId, "status": "ACTIVE"}
            }
        }

    patients = await db.patient.find_many(
        where=where,
        include={
            "user": True,
            "symptomReports": {
                "order_by": {"createdAt": "desc"},
                "take": 1,
            },
            "assignments": {
                "where": {"status": "ACTIVE"},
                "take": 1,
                "order_by": {"assignedAt": "desc"},
                "include": {"clinician": True},
            },
            "alerts": {
                "where": {"isRead": False},
                "order_by": {"createdAt": "desc"},
                "take": 10,
            },
        },
    )

    risk_order  = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    trend_order = {"WORSENING": 0, "STABLE": 1, "IMPROVING": 2}

    # --- DEMO HACK: Dynamically recalculate trends on every GET request ---

    from app.services.trend_analysis import analyzeTrend

    for patient in patients:
        if patient.symptomReports:
            current_report = patient.symptomReports[0]
            # Recalculate using the latest engine logic
            fresh_trend, _ = await analyzeTrend(patient.id, float(current_report.riskScore))
            
            # If it changed, save it to the DB and update the in-memory object
            if str(patient.currentTrendStatus) != fresh_trend:
                await db.patient.update(
                    where={"id": patient.id},
                    data={"currentTrendStatus": fresh_trend}
                )
                patient.currentTrendStatus = fresh_trend
    # ----------------------------------------------------------------------

    def sort_key(patient):
        risk  = str(patient.currentRiskLevel)  if patient.currentRiskLevel  else "LOW"
        trend = str(patient.currentTrendStatus) if patient.currentTrendStatus else "STABLE"

        # Use lastReportTime if set, else fall back to first report in loaded list.
        # Avoid datetime.min — on Windows, .timestamp() on pre-1970 datetimes
        # raises OSError [Errno 22]. Use a numeric sentinel instead.
        last_time = None
        if patient.lastReportTime:
            last_time = patient.lastReportTime
        elif patient.symptomReports:
            last_time = patient.symptomReports[0].createdAt

        if last_time is None:
            last_ts = 0.0  # patients with no reports sort last (most-recent first)
        else:
            try:
                last_ts = last_time.timestamp()
            except (OSError, OverflowError, ValueError):
                last_ts = 0.0

        return (
            risk_order.get(risk, 3),
            trend_order.get(trend, 3),
            -last_ts,
        )

    return sorted(patients, key=sort_key)


async def getPatientTrendData(patientId: int) -> Optional[dict]:
    """
    Detailed trend view for a single patient — used by the clinician detail panel.
    """
    patient = await db.patient.find_unique(
        where={"id": patientId},
        include={
            "user": True,
            "symptomReports": {
                "order_by": {"createdAt": "desc"},
                "take": 10,
            },
            "assignments": {
                "where": {"status": "ACTIVE"},
                "take": 1,
                "order_by": {"assignedAt": "desc"},
            },
        },
    )

    if not patient:
        return None

    active_assignment = patient.assignments[0] if patient.assignments else None

    return {
        "patientId":          patient.id,
        "userId":             patient.userId,
        "userName":           patient.user.fullName if patient.user else None,
        "phone":              patient.user.phone if patient.user else None,
        "emergencyContact":   patient.emergencyContact,
        "address":            patient.address,
        "dateOfBirth":        patient.dateOfBirth.isoformat() if patient.dateOfBirth else None,
        "gender":             patient.gender,
        "allergies":          patient.allergies,
        "chronicConditions":  patient.chronicConditions,
        "baselineStatus":     patient.baselineStatus,
        "careContext":        str(active_assignment.careContext) if active_assignment else None,
        "careReason":         active_assignment.reason if active_assignment else None,
        "currentRiskLevel":   str(patient.currentRiskLevel),
        "currentTrendStatus": str(patient.currentTrendStatus),
        "lastRiskUpdate":     patient.lastRiskUpdate,
        "lastTrendUpdate":    patient.lastTrendUpdate,
        "lastReportTime":     patient.lastReportTime,
        "recentReports":      patient.symptomReports,
    }
