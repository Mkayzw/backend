# Intelligence Layer: Risk Classification & Trend Analysis

## Overview

The Intelligence Layer is the **core innovation** of this system. It automatically analyzes symptom reports with full clinical context to help clinicians prioritize urgent cases in resource-constrained settings.

**Two Main Components:**
1. **Risk Classification Engine**: Scores individual symptom reports
2. **Trend Analysis Engine**: Detects worsening patient trajectories

## Problem Statement

### The Challenge
In low-resource healthcare settings, clinicians monitor dozens of patients remotely. Without automation:
- Clinicians must manually review every symptom report
- Urgent cases can be missed in high volume
- No systematic way to prioritize patients
- Context (chronic conditions, care reason) is often ignored

### Our Solution
**Context-aware, deterministic algorithms** that:
- Score risk based on structured clinical inputs
- Consider patient's chronic conditions and care context
- Track trends over time to detect deterioration
- Generate alerts with full reasoning trail
- Operate in <500ms for real-time use

## Risk Classification Engine

### Design Philosophy

**Structured Data Over Free Text**
- ❌ **NOT**: Keyword scanning of free-text notes ("patient says chest pain")
- ✅ **YES**: Typed symptom identifiers + severity enum + vitals

**Why?**
- Free text is unreliable (typos, abbreviations, language variations)
- Structured data enables deterministic, explainable scoring
- Consistent inputs → consistent outputs → trustworthy system

### Input Structure

```python
{
    "symptoms": ["chest_pain", "difficulty_breathing"],  # Typed identifiers
    "severity": "SEVERE",                                # Enum: MILD/MODERATE/SEVERE/CRITICAL
    "durationDays": 7,                                   # Integer
    "frequency": "RECURRING",                            # Enum: FIRST_TIME/RECURRING/CHRONIC
    "temperature": 38.5,                                 # Optional vital (°C)
    "heartRate": 110,                                    # Optional vital (bpm)
    "medicationAdherent": false,                         # Boolean
    
    # Clinical context (from patient record)
    "careContext": "ASTHMA_FOLLOWUP",                   # Why clinician monitors this patient
    "chronicConditions": ["asthma", "hypertension"]     # Patient's chronic conditions
}
```

### Scoring Algorithm

The risk score is computed by summing weighted components:

#### 1. Severity Score (Base Score)
```python
SEVERITY_SCORES = {
    "MILD":     0.0,
    "MODERATE": 1.0,
    "SEVERE":   2.5,
    "CRITICAL": 4.0,
}
```

**Rationale:**
- Exponential weighting: CRITICAL is 4x MODERATE (not 3x)
- Reflects clinical urgency: severe symptoms need immediate attention

#### 2. Symptom Weights
```python
SYMPTOM_WEIGHTS = {
    # Critical symptoms (weight 3.0)
    "chest_pain":            3.0,
    "difficulty_breathing":  3.0,
    "severe_bleeding":       3.0,
    "unconscious":           3.0,
    
    # High-priority symptoms (weight 2.0)
    "high_fever":            2.0,
    "persistent_vomiting":   2.0,
    "confusion":             2.0,
    "rapid_heartbeat":       2.0,
    
    # Moderate symptoms (weight 1.0)
    "fever":                 1.0,
    "cough":                 1.0,
    "headache":              1.0,
    "nausea":                1.0,
    ...
}
```

**Combination Bonus:**
- If ≥2 high-weight symptoms (≥2.0) present: +1.0 bonus
- **Rationale**: Multiple severe symptoms indicate systemic issue

#### 3. Duration Score
```python
def _scoreDuration(durationDays: int) -> float:
    if durationDays >= 14:
        return 2.0
    elif durationDays >= 7:
        return 1.0
    return 0.0
```

**Rationale:**
- Persistent symptoms (>7 days) indicate unresolved condition
- Very long duration (>14 days) suggests chronic deterioration

#### 4. Frequency Score
```python
FREQUENCY_SCORES = {
    "FIRST_TIME": 0.0,
    "RECURRING":  0.5,
    "CHRONIC":    1.5,
}
```

**Rationale:**
- Chronic symptoms indicate ongoing health issue
- Recurring patterns suggest inadequate treatment

#### 5. Medication Adherence Penalty
```python
med_score = 1.0 if medicationAdherent is False else 0.0
```

**Rationale:**
- Non-adherence increases risk of complications
- Indicates need for clinician intervention

#### 6. Vital Signs Score
```python
def _scoreVitals(temperature, heartRate):
    score = 0.0
    flags = []
    
    if temperature >= 39.5:
        score += 2.0
        flags.append(f"dangerously high temperature ({temperature}°C)")
    elif temperature >= 38.0:
        score += 1.0
        flags.append(f"fever ({temperature}°C)")
    
    if heartRate >= 120 or heartRate < 50:
        score += 2.0
        flags.append(f"abnormal heart rate ({heartRate} bpm)")
    elif heartRate >= 100:
        score += 1.0
        flags.append(f"elevated heart rate ({heartRate} bpm)")
    
    return score, flags
```

**Rationale:**
- Objective measurements more reliable than subjective symptoms
- Extreme values (very high fever, abnormal heart rate) are red flags

#### 7. Care Context Bonus
```python
CARE_CONTEXT_BONUSES = {
    "ASTHMA_FOLLOWUP": {
        "matching_symptoms": ["difficulty_breathing", "shortness_of_breath", "chest_pain", "cough"],
        "bonus": 1.5,
        "baseline": 0.0,
    },
    "POST_SURGERY_RECOVERY": {
        "matching_symptoms": ["severe_bleeding", "fever", "high_fever", "chest_pain", "swelling"],
        "bonus": 1.5,
        "baseline": 0.5,  # Post-surgery patients inherently higher risk
    },
    ...
}
```

**How It Works:**
1. Add baseline score for care context (e.g., post-surgery = +0.5)
2. If any reported symptom matches context-relevant symptoms, add bonus

**Example:**
- Patient in ASTHMA_FOLLOWUP reports "difficulty_breathing"
- Baseline: 0.0
- Symptom match bonus: +1.5
- **Total context contribution: 1.5**

**Rationale:**
- Same symptom has different urgency in different contexts
- "Chest pain" during asthma follow-up is more concerning than during general review
- Post-surgery patients need closer monitoring (baseline risk)

#### 8. Chronic Condition Relevance
```python
CONDITION_SYMPTOM_RELEVANCE = {
    "asthma":        ["difficulty_breathing", "shortness_of_breath", "cough", "chest_pain"],
    "diabetes":      ["fatigue", "confusion", "nausea", "dizziness"],
    "hypertension":  ["chest_pain", "headache", "rapid_heartbeat", "dizziness"],
    "heart_disease": ["chest_pain", "shortness_of_breath", "rapid_heartbeat", "fainting"],
}
```

**How It Works:**
- If patient has chronic condition AND reports relevant symptom: +1.0
- Only one bonus per report (prevents double-counting)

**Example:**
- Patient has "asthma" chronic condition
- Reports "difficulty_breathing"
- Bonus: +1.0

**Rationale:**
- Chronic conditions amplify risk of related symptoms
- Asthma patient with breathing difficulty needs urgent attention

#### 9. Historical Report Frequency
```python
async def _analyzeReportFrequency(patientId: int):
    # Count reports in last 7 days
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
```

**Rationale:**
- Frequent reporting indicates persistent health issues
- Patient submitting 5+ reports in 7 days needs attention

### Risk Level Classification

```python
RISK_THRESHOLDS = {
    "HIGH":   5.0,
    "MEDIUM": 2.5
}

def classifyRiskLevel(risk_score: float) -> str:
    if risk_score >= 5.0:
        return "HIGH"
    elif risk_score >= 2.5:
        return "MEDIUM"
    return "LOW"
```

**Threshold Tuning:**
- HIGH (≥5.0): Requires immediate clinician attention
- MEDIUM (≥2.5): Monitor closely, review within 24 hours
- LOW (<2.5): Routine monitoring

**Example Scenarios:**

**Scenario 1: HIGH RISK**
```
Severity: SEVERE (2.5)
Symptoms: chest_pain (3.0) + difficulty_breathing (3.0) = 6.0
Combination bonus: +1.0
Care context: ASTHMA_FOLLOWUP, symptom match: +1.5
Chronic condition: asthma + breathing symptom: +1.0
---
Total: 14.0 → HIGH RISK
```

**Scenario 2: MEDIUM RISK**
```
Severity: MODERATE (1.0)
Symptoms: fever (1.0) + cough (1.0) = 2.0
Duration: 7 days: +1.0
---
Total: 4.0 → MEDIUM RISK
```

**Scenario 3: LOW RISK**
```
Severity: MILD (0.0)
Symptoms: headache (1.0)
Duration: 1 day: 0.0
---
Total: 1.0 → LOW RISK
```

### Risk Explanation Generation

**Purpose:** Provide human-readable reasoning for the risk decision

```python
def _buildRiskExplanation(severity, symptoms, durationDays, frequency, 
                          careContext, medicationAdherent, chronicConditions, 
                          vitalFlags, riskLevel):
    parts = []
    
    parts.append(f"Severity: {severity.capitalize()}")
    
    if symptoms:
        clean = [s.replace("_", " ") for s in symptoms[:4]]
        parts.append("Symptoms: " + ", ".join(clean))
    
    if durationDays >= 7:
        parts.append(f"Duration: {durationDays} days")
    
    if frequency != "FIRST_TIME":
        parts.append(f"Pattern: {frequency.lower()}")
    
    if careContext and careContext != "GENERAL_REVIEW":
        parts.append(f"Context: {careContext.replace('_', ' ').lower()}")
    
    if chronicConditions:
        parts.append("Chronic: " + ", ".join(chronicConditions[:2]))
    
    if medicationAdherent is False:
        parts.append("Non-adherent to medication")
    
    parts.extend(vitalFlags)  # e.g., "fever (38.5°C)"
    
    parts.append(f"→ {riskLevel} RISK")
    
    return " | ".join(parts)
```

**Example Output:**
```
Severity: Severe | Symptoms: chest pain, difficulty breathing | Duration: 7 days | 
Context: asthma followup | Chronic: asthma | fever (38.5°C) | → HIGH RISK
```

**Why This Matters:**
- Clinicians see the reasoning, not just a score
- Builds trust in the system
- Helps clinicians make informed decisions
- Stored in database for audit trail

### Performance Optimization

```python
import time

async def classifySymptomReport(...):
    start = time.time()
    
    # ... perform classification ...
    
    elapsed_ms = (time.time() - start) * 1000
    if elapsed_ms > 500:
        print(f"Warning: Risk classification took {elapsed_ms:.0f}ms (target <500ms)")
```

**Target:** <500ms per classification
**Why:** Real-time feedback for clinicians and patients

**Optimization Techniques:**
1. Single database query for historical reports
2. In-memory scoring (no additional DB calls)
3. Async operations for concurrent processing

## Trend Analysis Engine

### Purpose
Detect patients whose condition is **worsening over time** by analyzing sequential symptom reports.

### Design Philosophy

**Sequential Analysis, Not Point-in-Time**
- Single report shows current state
- Trend shows trajectory (improving vs. worsening)
- Worsening trend triggers alert even if current risk is MEDIUM

**Conservative Approach**
- Requires ≥3 historical reports before making trend call
- Default to STABLE if insufficient data
- **Rationale:** Avoid false positives that waste clinician time

### Algorithm

```python
MIN_HISTORICAL_REPORTS = 3

async def analyzeTrend(patientId: int, currentSeverity: str):
    # 1. Fetch last 3 historical reports
    historical = await getHistoricalReports(patientId, limit=3)
    
    # 2. Not enough history? Default to STABLE
    if len(historical) < MIN_HISTORICAL_REPORTS:
        return "STABLE", {"reason": "insufficient_history"}
    
    # 3. Score historical reports
    historical_scores = [_calculateSeverityScore(r) for r in historical]
    
    # 4. Score current submission
    current_score = SEVERITY_SCORE_MAP[currentSeverity.upper()]
    
    # 5. Compare current to historical average
    avg_historical = sum(historical_scores) / len(historical_scores)
    severity_change = current_score - avg_historical
    
    # 6. Classify trend
    IMPROVING_THRESHOLD = -0.5
    WORSENING_THRESHOLD = 0.5
    
    if severity_change <= IMPROVING_THRESHOLD:
        return "IMPROVING"
    elif severity_change >= WORSENING_THRESHOLD:
        return "WORSENING"
    else:
        return "STABLE"
```

### Severity Scoring

**Primary Method: Structured Severity Enum**
```python
SEVERITY_SCORE_MAP = {
    "MILD":     0,
    "MODERATE": 1,
    "SEVERE":   2,
    "CRITICAL": 3,
}
```

**Fallback: Keyword Scan (Legacy Reports)**
```python
LEGACY_SEVERITY_KEYWORDS = {
    r'\b(chest pain|difficulty breathing|severe bleeding)\b': 3,
    r'\b(high fever|persistent vomiting|confusion)\b': 2,
    r'\b(fever|cough|headache|nausea)\b': 1,
    r'\b(better|improving|less pain)\b': -1,
}
```

**Why Fallback?**
- Supports legacy reports that only have free-text notes
- Graceful degradation for incomplete data

### Trend Classification Examples

**Example 1: WORSENING**
```
Historical reports: [MILD, MILD, MODERATE]
Historical scores: [0, 0, 1]
Average: 0.33

Current report: SEVERE
Current score: 2

Severity change: 2 - 0.33 = 1.67
1.67 >= 0.5 → WORSENING
```

**Example 2: IMPROVING**
```
Historical reports: [SEVERE, MODERATE, MODERATE]
Historical scores: [2, 1, 1]
Average: 1.33

Current report: MILD
Current score: 0

Severity change: 0 - 1.33 = -1.33
-1.33 <= -0.5 → IMPROVING
```

**Example 3: STABLE**
```
Historical reports: [MODERATE, MODERATE, MODERATE]
Historical scores: [1, 1, 1]
Average: 1.0

Current report: MODERATE
Current score: 1

Severity change: 1 - 1.0 = 0.0
-0.5 < 0.0 < 0.5 → STABLE
```

### Threshold Tuning

**WORSENING_THRESHOLD = 0.5**
- Requires significant increase to trigger alert
- Avoids noise from minor fluctuations
- Example: MILD → MODERATE (0 → 1) triggers WORSENING

**IMPROVING_THRESHOLD = -0.5**
- Symmetric with worsening threshold
- Detects meaningful improvement
- Example: MODERATE → MILD (1 → 0) triggers IMPROVING

**Why These Values?**
- Tested against sample patient data
- Balances sensitivity (catching real deterioration) vs. specificity (avoiding false alarms)
- Can be adjusted based on clinical feedback

### Database Update

```python
async def updatePatientTrendStatus(patientId: int, trendStatus: str):
    await db.patient.update(
        where={"id": patientId},
        data={
            "currentTrendStatus": trendStatus,
            "lastTrendUpdate": datetime.now(),
        },
    )
```

**Why Store in Patient Record?**
- Dashboard can sort/filter by trend status
- No need to recompute for every query
- Timestamp tracks when trend was last analyzed

## Alert Generation

### Trigger Conditions

**1. HIGH_RISK Alert**
```python
async def generateRiskAlert(patientId, symptomReportId, riskLevel, riskExplanation):
    if riskLevel != "HIGH":
        return None  # Only HIGH risk generates alert
    
    message = f"Patient classified as HIGH RISK — immediate clinical attention required.\n"
    message += f"Reasoning: {riskExplanation}"
    
    return await generateAlert(
        patientId=patientId,
        symptomReportId=symptomReportId,
        alertType="HIGH_RISK",
        priority="HIGH",
        message=message,
    )
```

**2. WORSENING_TREND Alert**
```python
async def generateTrendAlert(patientId, symptomReportId, trendStatus, riskExplanation):
    if trendStatus != "WORSENING":
        return None  # Only WORSENING generates alert
    
    message = f"Patient condition is WORSENING based on trend analysis — clinical review recommended.\n"
    message += f"Latest report: {riskExplanation}"
    
    return await generateAlert(
        patientId=patientId,
        symptomReportId=symptomReportId,
        alertType="WORSENING_TREND",
        priority="MEDIUM",
        message=message,
    )
```

### Alert Priority Mapping
- **HIGH_RISK** → **HIGH priority** (red flag, immediate action)
- **WORSENING_TREND** → **MEDIUM priority** (monitor closely, review soon)

### Alert Message Design

**Embedded Risk Explanation**
- Alert message includes full risk reasoning
- Clinician sees context without opening report
- Faster triage decisions

**Example Alert:**
```
Patient classified as HIGH RISK — immediate clinical attention required.
Reasoning: Severity: Severe | Symptoms: chest pain, difficulty breathing | 
Duration: 7 days | Context: asthma followup | Chronic: asthma | → HIGH RISK
```

## Integration: Symptom Report Submission Flow

```python
async def createSymptomReport(patientId, symptoms, severity, ...):
    # 1. Fetch patient record (for chronic conditions, care context)
    patient = await db.patient.find_unique(
        where={"id": patientId},
        include={"assignments": {"where": {"status": "ACTIVE"}}}
    )
    
    # 2. Get care context from active assignment
    careContext = patient.assignments[0].careContext if patient.assignments else None
    
    # 3. Parse chronic conditions from patient record
    chronicConditions = json.loads(patient.chronicConditions or "[]")
    
    # 4. RISK CLASSIFICATION
    riskLevel, riskScore, riskFactors, riskExplanation = await classifySymptomReport(
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
    
    # 5. TREND ANALYSIS
    trendStatus, trendDetails = await analyzeTrend(patientId, severity)
    
    # 6. Create symptom report record
    report = await db.symptomreport.create(
        data={
            "patientId": patientId,
            "symptoms": json.dumps(symptoms),
            "severity": severity,
            "durationDays": durationDays,
            "frequency": frequency,
            "notes": notes,
            "temperature": temperature,
            "heartRate": heartRate,
            "medicationAdherent": medicationAdherent,
            "riskLevel": riskLevel,
            "riskScore": riskScore,
            "riskFactors": riskFactors,
            "riskExplanation": riskExplanation,
        }
    )
    
    # 7. Update patient's denormalized fields
    await db.patient.update(
        where={"id": patientId},
        data={
            "currentRiskLevel": riskLevel,
            "currentTrendStatus": trendStatus,
            "lastRiskUpdate": datetime.now(),
            "lastTrendUpdate": datetime.now(),
            "lastReportTime": datetime.now(),
        }
    )
    
    # 8. Generate alerts if needed
    if riskLevel == "HIGH":
        await generateRiskAlert(patientId, report.id, riskLevel, riskExplanation)
    
    if trendStatus == "WORSENING":
        await generateTrendAlert(patientId, report.id, trendStatus, riskExplanation)
    
    return report
```

## Why This Approach Works

### 1. Deterministic and Explainable
- No black-box machine learning
- Every score component is traceable
- Clinicians can verify reasoning

### 2. Context-Aware
- Same symptom scored differently based on patient context
- Chronic conditions and care context integrated
- Personalized risk assessment

### 3. Efficient
- Single-pass scoring algorithm
- Minimal database queries
- <500ms response time

### 4. Conservative
- Requires sufficient data before making trend calls
- Thresholds tuned to avoid false positives
- Defaults to STABLE when uncertain

### 5. Actionable
- Alerts include full reasoning
- Priority levels guide triage
- Embedded explanations enable quick decisions

## Potential Lecturer Questions & Answers

**Q: Why not use machine learning?**
A: 
- ML requires large training datasets (we don't have)
- ML models are black boxes (clinicians need explainability)
- Deterministic rules are auditable and trustworthy
- Can evolve to ML later with sufficient data

**Q: How did you choose the weights and thresholds?**
A:
- Based on clinical severity guidelines (e.g., chest pain is critical)
- Iterative testing with sample patient scenarios
- Tuned to balance sensitivity vs. specificity
- Can be adjusted based on real-world feedback

**Q: What if a patient games the system (reports mild symptoms to avoid alerts)?**
A:
- System is decision-support, not replacement for clinician judgment
- Clinicians review all patients, alerts just prioritize
- Trend analysis catches gradual deterioration
- Historical report frequency detects unusual patterns

**Q: How do you handle missing data (e.g., no vitals)?**
A:
- Optional fields don't penalize if missing
- Scoring works with partial data
- Severity + symptoms alone can trigger HIGH risk
- Graceful degradation

**Q: Why store risk level on both SymptomReport and Patient?**
A:
- SymptomReport: Historical record of risk at submission time
- Patient: Current risk for dashboard sorting/filtering
- Trade-off: Storage space for query performance
- Dashboard needs to sort 100+ patients by risk quickly

**Q: How do you validate the algorithm's accuracy?**
A:
- Metrics endpoint tracks risk classification accuracy
- Compare system classifications with clinician reviews
- Monitor alert generation rate (should be ~5-10% of reports)
- Collect feedback from clinicians on false positives/negatives

## Future Enhancements

### 1. Adaptive Thresholds
- Learn optimal thresholds from clinician feedback
- Adjust weights based on outcome data
- Personalize thresholds per patient

### 2. Predictive Modeling
- Predict risk of hospitalization in next 7 days
- Identify patients likely to miss appointments
- Forecast resource needs

### 3. Multi-Variate Trend Analysis
- Analyze trends in specific symptoms (not just overall severity)
- Detect patterns (e.g., symptoms worse at night)
- Correlate with medication changes

### 4. Integration with Wearables
- Continuous vitals monitoring (heart rate, SpO2)
- Detect anomalies in real-time
- Trigger alerts for sudden changes

### 5. Natural Language Processing
- Extract structured data from free-text notes
- Support voice input for patients
- Multilingual symptom reporting

## Conclusion

The Intelligence Layer transforms raw symptom data into actionable clinical insights through:
- **Context-aware risk scoring** with 9 weighted components
- **Sequential trend analysis** to detect deterioration
- **Automatic alert generation** with embedded reasoning
- **Deterministic, explainable algorithms** that clinicians can trust

This approach balances **clinical accuracy** with **computational efficiency**, enabling real-time decision support in resource-constrained healthcare settings.
