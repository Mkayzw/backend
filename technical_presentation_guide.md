# Technical Architecture: Remote Patient Monitoring & Decision-Support

This document serves as the technical defense for the Telemedicine Overhaul. It explains the transition from a passive data-storage system to an **active clinical decision-support prototype**.

---

## 1. Problem Framing
**Old Framework**: A system to manage patients and doctors (CRUD).  
**New Framework**: A remote monitoring platform that identifies high-risk patients in low-resource settings using **Contextual Intelligence**.

The core value is **Prioritization**. In a setting with 1,000 patients and 5 clinicians, the system must tell the clinician exactly who to call first and *why*.

---

## 2. The Intelligence Layer (The "Core" Feature)
The platform uses a rule-based engine designed for **Explainability** and **Clinical Context**. Unlike a "black box" AI, every decision made by this system can be traced to specific clinical logic.

### A. Context-Aware Risk Classification
The system doesn't just look at a symptom; it looks at the **patient profile** behind the symptom.

*   **Logic**: If a patient reports "Shortness of Breath," the risk is calculated differently based on their assignment:
    *   **General Review**: Score = 3 (Moderate)
    *   **Asthma Follow-up**: Score = 4.5 (High Risk - *Bonus applied for condition match*)
*   **Explainable Output**: Instead of returning a raw number, the system generates a `riskExplanation`.
    *   *Example*: `"High Severity | Chest Pain | 3 Days | Match: Asthma Context → HIGH RISK"`

### B. Sequential Trend Analysis
Individual reports are snapshots; trends are trajectories. The system analyzes the **Last 3-5 reports** to determine if a patient is:
1.  **IMPROVING**: Severity scores are trending down.
2.  **STABLE**: No significant change.
3.  **WORSENING**: Severity is increasing over time—**triggers an automatic high-priority alert.**

---

## 3. Key Design Features

### I. Structured Clinical Inputs
We moved from free-text notes (unreliable for machines) to **Structured Enums**.
*   **Why?**: By forcing inputs into `Severity`, `Frequency`, and `Symptom List` buckets, we enable 100% deterministic scoring. We retain `notes` only for human context, not for system logic.

### II. The "Decision-View" Dashboard
The dashboard is sorted by a **Clinical Priority Algorithm**:
1.  **Risk Level**: (HIGH → MEDIUM → LOW)
2.  **Trend Status**: (WORSENING patients are bumped higher than STABLE ones)
3.  **Recency**: (The most recent data is prioritized within those tiers)

### III. Proactive Alerting (Explainable Notifications)
Alerts are not just "Patient X has a problem." They embed the underlying reasoning:
*   *Alert Message*: `WORSENING_TREND: Patient condition is declining. Latest: Severe cough + Fever + 3 days duration.`
*   **Benefit**: Clinicians gain "at-a-glance" situational awareness without needing to dig through history.

---

## 4. Technical Defense (Internal Quality)

### I. Defensive Data Modeling
*   **Assignment Lifecycle**: We removed database-level constraints that blocked re-assignments. The system now supports a full history of care relationships (e.g., a patient can be treated for Asthma, recovered, and later reassigned for Surgery follow-up).
*   **Model Normalization**: Fixed inconsistent field naming (e.g., `fullName` standardization) to ensure API predictability and maintainability.

### II. System Performance & Evaluation
The system includes built-in **Performance Measurement**:
*   Tracks every API response time and error rate.
*   **Why it matters**: In a clinical setting, **Latency = Risk**. If the intelligence layer is too slow or errors out, patient safety is compromised. We measure this to prove the system is "Production-Ready."

---

## 5. Summary for Stakeholders
> "The platform transforms raw symptom data into actionable clinical insights. By combining patient history (Chronic Conditions) with current symptoms and temporal trends, we reduce 'Alert Fatigue' and ensure the most vulnerable patients receive care first."
