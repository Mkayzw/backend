# Key Code Snippets for Presentation

*Use these snippets to demonstrate the "Intelligence" of the platform. Each includes a layman's explanation you can use with the school board.*

---

## 🔬 1. The "Context-Aware" Risk Brain
**File**: `app/services/risk_classification.py`

This snippet shows that the system isn't just counting symptoms—it's understanding the **patient's medical context**.

```python
# Care context bonuses: symptom weight increased if it matches patient history
if context_key in CARE_CONTEXT_BONUSES:
    ctx = CARE_CONTEXT_BONUSES[context_key]
    matching = [s for s in symptoms if s in ctx["matching_symptoms"]]
    if matching:
        total_score += ctx["bonus"]  # Applying the clinical context bonus
```

**🗣️ Translation for the Board:**
> "In a normal system, a cough is just a cough. In our system, the code checks if the patient has a history of Asthma. If they do, the 'Cough' symptom is automatically prioritized with a 'Clinical Bonus,' moving that patient up the list for immediate review."

---

## 📈 2. Sequential Trend Detection
**File**: `app/services/trend_analysis.py`

This shows how the system "remembers" the past to predict the future.

```python
# Calculate trajectory by comparing current severity against the historical average
historical_scores = [calculate_severity(r) for r in last_three_reports]
avg_historical = sum(historical_scores) / len(historical_scores)

severity_change = current_score - avg_historical

if severity_change >= WORSENING_THRESHOLD:
    trend_status = "WORSENING" # Triggers high-priority alert
```

**🗣️ Translation for the Board:**
> "A doctor doesn't just want to know how you feel *now*; they want to know if you're getting worse. This piece of logic calculates a patient's 'Trajectory.' It looks at the last three reports and mathematically identifies if a patient is on a 'Worsening' path, triggering an automated alert even if their current symptoms are only moderate."

---

## 🏆 3. The Urgency-First Dashboard Sort
**File**: `app/services/dashboard.py`

This is the "Decision-Support" logic that ensures no one is forgotten.

```python
# The prioritization algorithm: Risk Level > Trend Status > Recency
def sort_key(patient):
    risk_rank  = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    trend_rank = {"WORSENING": 0, "STABLE": 1, "IMPROVING": 2}
    
    return (
        risk_rank.get(patient.currentRiskLevel),
        trend_rank.get(patient.currentTrendStatus),
        -patient.lastReportTime.timestamp(),
    )
```

**🗣️ Translation for the Board:**
> "In an overstretched clinic, you can't just look at patients alphabetically. We built a custom sorting algorithm that replicates a clinician's triage process. The system mathematically ranks 'High Risk' and 'Worsening' patients at the top, so the clinician's eyes land on the most critical cases the second they log in."

---

## ✍️ 4. Explainable AI (The Reasoner)
**File**: `app/services/risk_classification.py`

This shows that the system is **Transparent**, not a "Black Box."

```python
# Building the human-readable explanation stored in the database
explanation = f"Severity: {severity} | Symptoms: {symptoms} | Context: {care_context} → {risk_level} RISK"
```

**🗣️ Translation for the Board:**
> "We don't just tell the doctor 'Risk Is High.' We provide the 'Evidence.' The system automatically generates a human-readable explanation for its decision. This ensures that the clinician can trust the machine’s output and verify the reasoning in seconds."
