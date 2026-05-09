# Telemedicine Clinical Logic Deep Dive

This document explains the actual algorithmic flow in the backend codebase, with direct references to the implementation in:

- `app/services/risk_classification.py`
- `app/services/trend_analysis.py`
- `app/services/alert_service.py`
- `app/controllers/symptom_report_controller.py`
- `app/services/symptom_report.py`

The key point for presentation is that the platform uses a deterministic, rule-based scoring pipeline. It does not rely on a black-box model for risk classification.

---

## 1) Risk Classification Algorithm

### What the algorithm is doing

The risk engine builds a single numeric `risk_score` by adding together a series of explainable components:

- severity score
- symptom weights
- duration score
- frequency score
- medication adherence penalty
- vital-sign score
- care-context bonus
- chronic-condition relevance bonus
- recent-report frequency bonus

That total is then mapped into `LOW`, `MEDIUM`, or `HIGH` using fixed thresholds.

### The exact scoring logic

The core accumulation happens in `computeRiskScore(...)`:

```python
sev_score = SEVERITY_SCORES.get(severity, 0.0)
total += sev_score

sym_score = sum(SYMPTOM_WEIGHTS.get(s, 0.5) for s in symptoms)
high_weight = [s for s in symptoms if SYMPTOM_WEIGHTS.get(s, 0) >= 2.0]
if len(high_weight) >= 2:
    sym_score += 1.0
total += sym_score

dur_score = _scoreDuration(durationDays)
total += dur_score

freq_score = FREQUENCY_SCORES.get(frequency, 0.0)
total += freq_score

med_score = 1.0 if medicationAdherent is False else 0.0
total += med_score

vital_score, vital_flags = _scoreVitals(temperature, heartRate)
total += vital_score

if context_key in CARE_CONTEXT_BONUSES:
    ctx = CARE_CONTEXT_BONUSES[context_key]
    total += ctx["baseline"]
    matching = [s for s in symptoms if s in ctx["matching_symptoms"]]
    if matching:
        total += ctx["bonus"]

for cond in conditions:
    relevant = CONDITION_SYMPTOM_RELEVANCE.get(cond.lower(), [])
    if any(s in relevant for s in symptoms):
        total += 1.0
        break

freq_hist_score, report_count = await _analyzeReportFrequency(patientId)
total += freq_hist_score
```

### The weights and thresholds

The algorithm is completely rule-based. The values are hard-coded in the module:

```python
SEVERITY_SCORES = {
    "MILD":     0.0,
    "MODERATE": 1.0,
    "SEVERE":   2.5,
    "CRITICAL": 4.0,
}

FREQUENCY_SCORES = {
    "FIRST_TIME": 0.0,
    "RECURRING":  0.5,
    "CHRONIC":    1.5,
}

RISK_THRESHOLDS = {"HIGH": 5.0, "MEDIUM": 2.5}
```

The final classification is:

```python
def classifyRiskLevel(risk_score: float) -> str:
    if risk_score >= RISK_THRESHOLDS["HIGH"]:
        return "HIGH"
    elif risk_score >= RISK_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    return "LOW"
```

### How a patient moves from Low to Medium or High

The transition is not a probabilistic model; it is a threshold gate:

- `LOW` if `risk_score < 2.5`
- `MEDIUM` if `2.5 <= risk_score < 5.0`
- `HIGH` if `risk_score >= 5.0`

### The specific rule components that push the score upward

#### 1. Symptom weights

The symptom dictionary assigns direct base weights:

```python
SYMPTOM_WEIGHTS = {
    "chest_pain":            3.0,
    "difficulty_breathing":  3.0,
    "shortness_of_breath":   3.0,
    "severe_bleeding":       3.0,
    "unconscious":           3.0,
    "stroke_symptoms":       3.0,
    "high_fever":            2.0,
    "persistent_vomiting":   2.0,
    "severe_pain":           2.0,
    "confusion":             2.0,
    "fainting":              2.0,
    "rapid_heartbeat":       2.0,
    ...
}
```

This means one critical symptom such as `chest_pain` already contributes `3.0`, which is enough to place a patient into `MEDIUM` even before other factors are added.

#### 2. Combination bonus

There is an additional escalation rule:

```python
high_weight = [s for s in symptoms if SYMPTOM_WEIGHTS.get(s, 0) >= 2.0]
if len(high_weight) >= 2:
    sym_score += 1.0
```

So if the report contains at least two high-weight symptoms, the engine adds `+1.0` on top of the symptom sum.

#### 3. Duration

Duration is bucketed:

```python
def _scoreDuration(durationDays: int) -> float:
    if durationDays >= 14:
        return 2.0
    elif durationDays >= 7:
        return 1.0
    return 0.0
```

Longer duration increases risk, with the strongest escalation at `14+` days.

#### 4. Vital signs

Vitals are scored independently:

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

This means abnormal physiology can move the score into `HIGH` even if symptom severity alone is not enough.

#### 5. Care context

The system adds a baseline and a context-specific bonus:

```python
CARE_CONTEXT_BONUSES = {
    "ASTHMA_FOLLOWUP": {
        "matching_symptoms": ["difficulty_breathing", "shortness_of_breath", "chest_pain", "cough"],
        "bonus":    1.5,
        "baseline": 0.0,
    },
    ...
}
```

If the report symptoms match the active care context, the code adds the bonus:

```python
matching = [s for s in symptoms if s in ctx["matching_symptoms"]]
if matching:
    total += ctx["bonus"]
```

This is a contextual escalation rule, not a generic symptom-only score.

#### 6. Chronic-condition relevance

The chronic-condition mapping also contributes a flat bonus:

```python
CONDITION_SYMPTOM_RELEVANCE = {
    "asthma": ["difficulty_breathing", "shortness_of_breath", "cough", "chest_pain"],
    "diabetes": ["fatigue", "confusion", "nausea", "dizziness"],
    ...
}
```

If any symptom matches the patient’s chronic-condition relevance list, the engine adds:

```python
total += 1.0
```

#### 7. Recent report frequency

The engine also checks report density in the last 7 days:

```python
reports = await db.symptomreport.find_many(
    where={"patientId": patientId, "createdAt": {"gte": window_start}}
)
count = len(reports)
if count >= 5:
    return 2.0, count
elif count >= 3:
    return 1.0, count
return 0.0, count
```

This means repeated reporting itself increases risk, which is useful for detecting unstable patients.

### Presentation-ready summary

The risk engine is a deterministic additive model:

`risk_score = severity + symptoms + duration + frequency + adherence + vitals + context + chronic relevance + recent-report frequency`

Then the code applies:

- `HIGH` at `>= 5.0`
- `MEDIUM` at `>= 2.5`
- `LOW` otherwise

---

## 2) Trend Analysis Algorithm

### What “memory” means here

The trend engine looks backward through the patient’s prior symptom reports and compares the current score against recent history. It is effectively a short-term temporal model.

### How it looks backward in time

The historical fetch is:

```python
historical = await getHistoricalReports(patientId, limit=6)
```

and the helper queries the database in descending time order:

```python
return await db.symptomreport.find_many(
    where={"patientId": patientId},
    order={"createdAt": "desc"},
    take=limit,
)
```

Then the code explicitly excludes the most recent record from the baseline:

```python
past_reports = historical[1:] if len(historical) > 0 else []
```

That means the algorithm is not comparing the report against itself.

### Minimum history requirement

The trend engine refuses to make a directional call unless there are at least 2 past reports:

```python
if len(past_reports) < 2:
    return "STABLE", {
        "reason": "insufficient_history",
        "report_count": len(past_reports) + 1,
    }
```

So the system needs 3 total reports before it will classify the trajectory as improving or worsening.

### How the delta is calculated

The baseline is an average of up to the 3 most recent past scores:

```python
historical_scores = [
    _calculateSeverityScore(r)
    for r in past_reports[:3]
]

avg_historical = sum(historical_scores) / len(historical_scores)
severity_change = current_score - avg_historical
```

This is the core delta logic:

- positive `severity_change` means the current report is worse than the recent average
- negative `severity_change` means the current report is better than the recent average

### The exact deterioration rule

The standard classification thresholds are:

```python
IMPROVING_THRESHOLD = -2.0
WORSENING_THRESHOLD = 2.0
```

The decision order is important:

1. High-risk spike override
2. Volatility override
3. Delta-based comparison

### High-risk spike override

If any recent past report is already very severe, the engine forces `WORSENING`:

```python
if any(score >= 10.0 for score in historical_scores):
    trend_status = "WORSENING"
    trend_details["override"] = "high_risk_spike"
```

This is a stability override: one prior score at or above `10.0` is treated as evidence of an unstable patient trajectory.

### Volatility override

If recent scores swing too widely, the patient is also marked `WORSENING`:

```python
elif max(historical_scores) - min(historical_scores) > 5.0:
    trend_status = "WORSENING"
    trend_details["override"] = "volatility"
```

This means the algorithm treats unstable oscillation as clinically concerning, even if the current delta alone is not extreme.

### Standard delta-based trend logic

If no override applies:

```python
elif severity_change <= IMPROVING_THRESHOLD:
    trend_status = "IMPROVING"
elif severity_change >= WORSENING_THRESHOLD:
    trend_status = "WORSENING"
else:
    trend_status = "STABLE"
```

So the exact deterioration condition is:

- `severity_change >= 2.0`

and improvement is:

- `severity_change <= -2.0`

Everything in between is `STABLE`.

### Presentation-ready summary

The trend engine is a short-horizon comparison model:

- it pulls the latest reports in reverse chronological order
- it averages up to 3 prior scores
- it computes `current_score - average_previous_score`
- it overrides the result if history is already severe or volatile

This makes the trend logic both time-aware and explainable.

---

## 3) Alert Trigger and Event Flow

### Important clarification

The controller does **not** decide whether an alert should be created. It only verifies the patient exists and delegates to the service layer.

The controller branch is:

```python
async def createSymptomReport(payload: CreateSymptomReport):
    patient = await patientService.getPatientbyId(payload.patientId)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return await symptomReportService.createSymptomReport(...)
```

So the real alert trigger lives in `app/services/symptom_report.py`.

### Full event flow

The report service executes the pipeline in this order:

1. resolve chronic conditions
2. resolve care context
3. create the symptom report
4. run risk classification
5. run trend analysis
6. update the stored report
7. update patient state
8. generate alerts if thresholds are met

### The exact line where the system says “risk is high enough, create an alert”

In `app/services/symptom_report.py`, the trigger is:

```python
if risk_level == "HIGH":
    await generateRiskAlert(patientId, report.id, risk_level, risk_explanation)
```

That is the exact decision point for a high-risk alert.

The worsening-trend trigger is parallel:

```python
if trend_status == "WORSENING":
    await generateTrendAlert(patientId, report.id, trend_status, risk_explanation)
```

### How the alert is generated and saved

`generateRiskAlert(...)` is a guard + persistence wrapper:

```python
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
```

Then `generateAlert(...)` writes the database row:

```python
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
```

### What the clinician receives

The alert message embeds the explanation string so the clinician sees the reasoning trail immediately:

```python
message = f"{base}\nReasoning: {riskExplanation}"
```

This is important because it means the alert is not just a flag; it is a structured clinical explanation derived from the risk engine.

### Why this is clinically useful

The system separates:

- risk classification: “How severe is this report right now?”
- trend analysis: “Is the patient worsening over time?”
- alert persistence: “Should we notify a clinician and store the event?”

That separation makes the logic easier to defend in an academic presentation because each stage has a clear responsibility.

---

## Short Presentation Script

If you need a concise verbal explanation:

> The platform uses a deterministic clinical scoring engine. It assigns weights to symptoms, severity, duration, vitals, care context, chronic-condition relevance, and recent report frequency. The total score is classified using fixed thresholds: below 2.5 is Low, 2.5 to 4.99 is Medium, and 5.0 or above is High.

> For trend analysis, the system looks at the most recent reports in reverse chronological order, excludes the current report from the baseline, averages up to three previous scores, and computes the delta between the current score and that baseline. It also overrides the result if there is a high-risk spike or high volatility in the recent history.

> Alerts are generated in the symptom-report service after classification. If `risk_level == "HIGH"`, the code calls `generateRiskAlert(...)`, which persists an `Alert` row with `alertType="HIGH_RISK"`, `priority="HIGH"`, and a message containing the explanation trail.

