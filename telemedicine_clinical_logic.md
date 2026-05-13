# Telemedicine Clinical Logic Deep Dive

This document explains the current clinical logic in the backend codebase. It is based on the implementation in:

- `app/services/risk_classification.py`
- `app/services/trend_analysis.py`
- `app/services/symptom_report.py`
- `app/services/alert_service.py`
- `app/services/clinical_workflow.py`
- `app/services/task_service.py`
- `schema.prisma`

The main presentation point is that the platform uses a deterministic, rule-based clinical pipeline. It does not use a black-box machine learning model for risk classification. Every score is built from visible inputs and every alert comes from explicit rules.

---

## 1) Full Clinical Event Flow

When a patient submits a symptom report, the backend does the work in this order:

1. Load the patient record.
2. Read chronic conditions from `Patient.chronicConditions`.
3. Derive the patient's age from `Patient.dateOfBirth`.
4. Check for the most recent active assignment.
5. Use that assignment's `careContext`.
6. Create the symptom report with temporary `LOW` risk.
7. Run risk classification.
8. Run trend analysis.
9. Update the symptom report with `riskLevel`, `riskScore`, `riskFactors`, and `riskExplanation`.
10. Update the patient's current risk/trend state.
11. Generate alerts when risk or trend rules are triggered.
12. Deliver realtime, push, and internal notifications to the care team and patient.

The active assignment check is important. A patient cannot submit a report unless they have an active clinician assignment:

```python
active_assignment = await db.assignment.find_first(
    where={"patientId": patientId, "status": "ACTIVE"},
    order={"assignedAt": "desc"},
)
if not active_assignment:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Patient must have an active clinician assignment before submitting a symptom report.",
    )
```

This means care context is not guessed. It comes from the actual clinician-patient assignment.

---

## 2) Risk Classification Algorithm

### What the algorithm does

The risk engine builds one numeric `risk_score` by adding explainable components:

- severity score
- symptom weights
- combination bonus for multiple high-weight symptoms
- duration score
- frequency score
- medication adherence penalty
- vital-sign score
- age score
- care-context baseline and symptom-match bonus
- chronic-condition relevance bonus
- recent-report frequency bonus

Then the score is mapped into `LOW`, `MEDIUM`, or `HIGH`.

### Core scoring components

The main function is `computeRiskScore(...)`. It receives structured clinical fields:

```python
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
    patientAge: Optional[int] = None,
) -> Tuple[float, dict]:
```

The fixed classification thresholds are:

```python
RISK_THRESHOLDS = {"HIGH": 5.0, "MEDIUM": 2.5}
```

The final level is:

```python
def classifyRiskLevel(risk_score: float) -> str:
    if risk_score >= RISK_THRESHOLDS["HIGH"]:
        return "HIGH"
    elif risk_score >= RISK_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    return "LOW"
```

So:

- `LOW`: score below `2.5`
- `MEDIUM`: score from `2.5` to `4.99`
- `HIGH`: score `5.0` or above

### Severity, frequency, and duration

Severity is scored like this:

```python
SEVERITY_SCORES = {
    "MILD": 0.0,
    "MODERATE": 1.0,
    "SEVERE": 2.5,
    "CRITICAL": 4.0,
}
```

Frequency is scored like this:

```python
FREQUENCY_SCORES = {
    "FIRST_TIME": 0.0,
    "RECURRING": 0.5,
    "CHRONIC": 1.5,
}
```

Duration adds:

```python
if durationDays >= 14:
    return 2.0
elif durationDays >= 7:
    return 1.0
return 0.0
```

### Symptom weights

Symptoms are stored as structured identifiers, not free-text search terms. Examples:

```python
SYMPTOM_WEIGHTS = {
    "chest_pain": 3.0,
    "difficulty_breathing": 3.0,
    "shortness_of_breath": 3.0,
    "severe_bleeding": 3.0,
    "unconscious": 3.0,
    "stroke_symptoms": 3.0,
    "seizure": 3.0,
    "severe_allergic_reaction": 3.0,
    "suicidal_ideation": 3.0,
    "severe_dehydration": 3.0,
    "blue_lips_or_face": 3.0,
    "high_fever": 2.0,
    "persistent_vomiting": 2.0,
    "severe_pain": 2.0,
    "confusion": 2.0,
    "fainting": 2.0,
    "rapid_heartbeat": 2.0,
    "escalation_request": 2.5,
}
```

If a symptom is unknown, the engine still gives it a small fallback score:

```python
sym_score = sum(SYMPTOM_WEIGHTS.get(s, 0.5) for s in symptoms)
```

There is also a combination bonus:

```python
high_weight = [s for s in symptoms if SYMPTOM_WEIGHTS.get(s, 0) >= 2.0]
if len(high_weight) >= 2:
    sym_score += 1.0
```

This means a report with multiple dangerous symptoms escalates faster than a report with only one.

### Vitals

Vitals add risk when temperature or heart rate is abnormal:

```python
if temperature >= 39.5:
    score += 2.0
elif temperature >= 38.0:
    score += 1.0

if heartRate >= 120 or heartRate < 50:
    score += 2.0
elif heartRate >= 100:
    score += 1.0
```

These flags are also placed into the human-readable explanation.

### Age-aware scoring

The current version includes age as a risk modifier. The service derives age from `Patient.dateOfBirth`, then passes it into `classifySymptomReport(...)`.

Age score is handled in `_scoreAge(...)`:

```python
if age < 1:
    score += 1.5
elif age < 5:
    score += 1.0
elif age >= 75:
    score += 1.5
elif age >= 65:
    score += 1.0
```

There are also age-and-symptom interaction bonuses:

```python
elderly_red_flags = {"chest_pain", "confusion", "fainting", "shortness_of_breath", "fall", "slurred_speech"}
pediatric_red_flags = {"high_fever", "persistent_vomiting", "severe_dehydration", "difficulty_breathing", "seizure", "blue_lips_or_face"}

if elderly and any(s in elderly_red_flags for s in symptoms):
    score += 0.5
if pediatric and any(s in pediatric_red_flags for s in symptoms):
    score += 0.5
```

This means the same symptom can carry extra concern for an elderly patient or a very young child.

### Care context

Care context comes from `Assignment.careContext`. The schema currently supports:

- `ASTHMA_FOLLOWUP`
- `POST_SURGERY_RECOVERY`
- `CHRONIC_DISEASE_MONITORING`
- `INFECTION_FOLLOWUP`
- `CARDIAC_FOLLOWUP`
- `DIABETES_MANAGEMENT`
- `HYPERTENSION_MONITORING`
- `MATERNAL_CARE`
- `MENTAL_HEALTH_FOLLOWUP`
- `PEDIATRIC_FOLLOWUP`
- `ONCOLOGY_FOLLOWUP`
- `RENAL_FOLLOWUP`
- `GENERAL_REVIEW`

Each context can add a baseline score and a symptom-match bonus. Example:

```python
"MATERNAL_CARE": {
    "matching_symptoms": ["severe_bleeding", "severe_headache", "swelling", "abdominal_pain", "high_blood_pressure", "vision_loss"],
    "bonus": 2.0,
    "baseline": 0.5,
}
```

The scoring rule is:

```python
total += ctx["baseline"]
matching = [s for s in symptoms if s in ctx["matching_symptoms"]]
if matching:
    total += ctx["bonus"]
```

This is why the system is context-aware. Chest pain in a cardiac follow-up, high fever in pediatric follow-up, or severe bleeding in maternal care can be escalated more strongly than the same symptom in a general review.

### Chronic-condition relevance

The patient can have chronic conditions stored as JSON in `Patient.chronicConditions`. The risk engine checks whether the symptoms match those conditions:

```python
CONDITION_SYMPTOM_RELEVANCE = {
    "asthma": ["difficulty_breathing", "shortness_of_breath", "cough", "chest_pain", "blue_lips_or_face"],
    "diabetes": ["fatigue", "confusion", "nausea", "dizziness", "low_blood_sugar", "frequent_urination", "vision_loss", "numbness"],
    "hypertension": ["chest_pain", "headache", "severe_headache", "rapid_heartbeat", "dizziness", "high_blood_pressure", "vision_loss"],
}
```

If at least one condition matches the report symptoms, the engine adds one bonus:

```python
total += 1.0
break
```

### Recent report frequency

The engine checks how many reports the patient made in the last 7 days:

```python
if count >= 5:
    return 2.0, count
elif count >= 3:
    return 1.0, count
return 0.0, count
```

This means repeated reporting is itself treated as a warning sign.

### Risk explanation

The score is not stored alone. The service also builds a readable explanation:

```python
parts.append(f"Severity: {severity.capitalize()}")
parts.append("Symptoms: " + ", ".join(clean))
parts.append(f"Duration: {durationDays} days")
parts.append(f"Pattern: {label}")
parts.append(f"Context: {label}")
parts.append("Chronic: " + ", ".join(chronicConditions[:2]))
parts.append("Non-adherent to medication")
parts.extend(ageFlags)
parts.extend(vitalFlags)
parts.append(f"-> {riskLevel} RISK")
```

That explanation is saved on `SymptomReport.riskExplanation` and is reused inside alert messages.

---

## 3) Trend Analysis Algorithm

Trend analysis answers a different question from risk classification:

- risk classification asks, "How serious is this report right now?"
- trend analysis asks, "Is the patient getting better, stable, or worse over time?"

The trend engine uses the granular `riskScore` values from recent symptom reports.

### Historical lookup

The engine fetches recent reports in descending order:

```python
historical = await getHistoricalReports(patientId, limit=6)
past_reports = historical[1:] if len(historical) > 0 else []
```

The newest report is excluded from the baseline so the algorithm does not compare the report against itself.

### Minimum history

The engine requires at least two past reports:

```python
if len(past_reports) < 2:
    return "STABLE", {
        "reason": "insufficient_history",
        "report_count": len(past_reports) + 1,
    }
```

So it needs three total reports: the current report plus two previous reports.

### Delta calculation

The baseline is the average of up to three recent past scores:

```python
historical_scores = [
    _calculateSeverityScore(r)
    for r in past_reports[:3]
]

avg_historical = sum(historical_scores) / len(historical_scores)
severity_change = current_score - avg_historical
```

The meaning is:

- positive delta: current report is worse than the recent average
- negative delta: current report is better than the recent average

### Current decision order

The current decision order is important:

1. Clear improvement wins first.
2. If not improving, a prior high-risk spike can force `WORSENING`.
3. If not improving, high volatility can force `WORSENING`.
4. Otherwise the standard delta threshold is used.

The thresholds are:

```python
IMPROVING_THRESHOLD = -2.0
WORSENING_THRESHOLD = 2.0
```

The current logic is:

```python
if severity_change <= IMPROVING_THRESHOLD:
    trend_status = "IMPROVING"
elif any(score >= 10.0 for score in historical_scores):
    trend_status = "WORSENING"
    trend_details["override"] = "high_risk_spike"
elif max(historical_scores) - min(historical_scores) > 5.0:
    trend_status = "WORSENING"
    trend_details["override"] = "volatility"
elif severity_change >= WORSENING_THRESHOLD:
    trend_status = "WORSENING"
else:
    trend_status = "STABLE"
```

This means a strong recovery is not hidden by an older spike. But if there is no clear improvement, high-risk history and large swings are still treated as clinically concerning.

---

## 4) Alert Generation and Delivery

Alerts are generated after the risk and trend stages.

In `app/services/symptom_report.py`:

```python
if risk_level == "HIGH":
    await generateRiskAlert(patientId, report.id, risk_level, risk_explanation)

if trend_status == "WORSENING":
    await generateTrendAlert(patientId, report.id, trend_status, risk_explanation)
```

### High-risk alert

`generateRiskAlert(...)` only creates an alert when the risk level is `HIGH`:

```python
if riskLevel != "HIGH":
    return None
```

It creates:

- `alertType="HIGH_RISK"`
- `priority="HIGH"`
- message containing the risk explanation

### Worsening-trend alert

`generateTrendAlert(...)` only creates an alert when the trend is `WORSENING`:

```python
if trendStatus != "WORSENING":
    return None
```

It creates:

- `alertType="WORSENING_TREND"`
- `priority="MEDIUM"`
- message containing the latest report explanation

### Alert ownership

Alert recipients are based on active assignments for the patient:

```python
assignments = await db.assignment.find_many(
    where={"patientId": patient_id, "status": "ACTIVE"},
    include={"clinician": True},
)
```

The active clinicians' user IDs become the alert owners. If an alert is later assigned to a clinician, that assignee is also included.

### Notification delivery

When `generateAlert(...)` creates an alert, it now does more than write an `Alert` row:

- stores the alert with `status="NEW"`
- publishes `alert.created` through the realtime broker
- sends Web Push notifications to the care team
- creates internal notifications for the care team
- creates a patient notification telling the patient that their clinician has been notified

When an alert is triaged, the service publishes `alert.updated` through the realtime broker.

---

## 5) Alert Triage Workflow

The `Alert` model now supports workflow state:

```prisma
status                AlertStatus   @default(NEW)
assignedToClinicianId Int?
resolutionNote        String?
resolvedAt            DateTime?
snoozedUntil          DateTime?
lastActionAt          DateTime?
lastActionByUserId    Int?
```

The status enum is:

```prisma
enum AlertStatus {
  NEW
  ACKNOWLEDGED
  IN_PROGRESS
  RESOLVED
  ESCALATED
  SNOOZED
}
```

The triage rules live in `apply_triage_action(...)`.

### Supported alert actions

- `ACKNOWLEDGE`: marks the alert as read and assigns it to the acting clinician.
- `START`: moves the alert to `IN_PROGRESS`.
- `ADD_NOTE`: stores a resolution or working note.
- `RESOLVE`: requires a note, sets `RESOLVED`, and stores `resolvedAt`.
- `SNOOZE`: requires `snoozedUntil` and sets `SNOOZED`.
- `ESCALATE`: sets `ESCALATED` and can assign the alert to another clinician.

Clinician-only actions require a clinician profile. Access is still checked through `checkDataAccess(...)`, so a clinician cannot triage an alert for a patient they should not access.

---

## 6) Tasks and Follow-ups

Alerts can now be turned into clinician tasks.

The `Task` model stores:

```prisma
patientId           Int
assignedClinicianId Int
createdFromAlertId  Int?
title               String
description         String?
dueAt               DateTime?
status              TaskStatus   @default(OPEN)
priority            TaskPriority @default(MEDIUM)
completedAt         DateTime?
```

Task status values are:

```prisma
enum TaskStatus {
  OPEN
  IN_PROGRESS
  DONE
  CANCELLED
}
```

Task priority values are:

```prisma
enum TaskPriority {
  LOW
  MEDIUM
  HIGH
}
```

When a task is created from an alert, `build_task_from_alert(...)` copies the patient, alert ID, assignee, and alert priority:

```python
return {
    "patientId": alert["patientId"],
    "assignedClinicianId": assigned_clinician_id,
    "createdFromAlertId": alert["id"],
    "title": clean_title,
    "description": (description or "").strip() or None,
    "dueAt": due_at,
    "status": "OPEN",
    "priority": str(alert.get("priority") or "MEDIUM"),
}
```

Clinician dashboards count open and overdue tasks using `OPEN` and `IN_PROGRESS` states. This makes prioritization visible beyond the alert itself: the alert is the signal, and the task is the follow-up work item.

---

## 7) Data Structures That Matter

The main database structures behind the clinical logic are:

- `Patient`: stores date of birth, chronic conditions, current risk, current trend, and last report time.
- `Assignment`: links a patient to a clinician and stores active care context.
- `SymptomReport`: stores structured symptom inputs and computed risk outputs.
- `Alert`: stores high-risk and worsening-trend clinical events.
- `Task`: stores follow-up work created from alerts or manually by clinicians/admins.
- `PushSubscription`: allows browser push notifications.
- `Notification`: stores in-app notifications.
- `AuditLog`: records system actions for accountability.

The most important enums are:

- `RiskLevel`: `LOW`, `MEDIUM`, `HIGH`
- `TrendStatus`: `IMPROVING`, `STABLE`, `WORSENING`
- `Severity`: `MILD`, `MODERATE`, `SEVERE`, `CRITICAL`
- `Frequency`: `FIRST_TIME`, `RECURRING`, `CHRONIC`
- `CareContext`: assignment-based clinical context
- `AlertStatus`: alert workflow state
- `TaskStatus`: follow-up task state
- `TaskPriority`: task urgency

---

## 8) Presentation-Ready Summary

The platform uses a deterministic clinical scoring engine. It adds scores for severity, symptoms, duration, frequency, medication adherence, vitals, patient age, care context, chronic-condition relevance, and recent report frequency. The final score is classified using fixed thresholds: below `2.5` is `LOW`, `2.5` to `4.99` is `MEDIUM`, and `5.0` or above is `HIGH`.

Trend analysis looks at recent symptom reports, excludes the current report from the baseline, averages recent past scores, and compares the current score against that average. A drop of `-2.0` or more means `IMPROVING`; an increase of `+2.0` or more means `WORSENING`. If there is no clear improvement, the system also treats high-risk spikes or volatile score swings as `WORSENING`.

Alerts are created after classification. A `HIGH` risk report creates a `HIGH_RISK` alert with `HIGH` priority. A `WORSENING` trend creates a `WORSENING_TREND` alert with `MEDIUM` priority. Alerts are sent to active assigned clinicians through realtime updates, push notifications, and stored notifications, while the patient also receives a notification that their clinician has been informed.

Clinicians can then triage alerts by acknowledging, starting work, adding notes, resolving, snoozing, or escalating. They can also create tasks from alerts, which turns a clinical signal into a visible follow-up action on the dashboard.
