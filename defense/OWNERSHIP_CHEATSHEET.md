# Ownership Cheat Sheet (Instant Proof)

Use this as your *live* script + code map if you get hit with “where is this in your code?”

## 0) 10-second overview (say this first)

“This backend is built around one pipeline: **a symptom report is submitted → risk is scored deterministically from structured fields → trend is computed from recent reports → patient summary fields update → alerts are generated for HIGH risk and WORSENING trend**.”

---

## 1) End-to-end flows (exact endpoints → code)

### A) How a patient is created

**Typical demo path (recommended):**
- `POST /auth/signup` with `role: PATIENT`

**What happens:**
1. Router: `signup_endpoint` in `app/routes/auth.py`
2. Controller: `signup` in `app/controllers/auth_controller.py`
3. Service: `registerUser` in `app/services/auth.py`
4. DB: when `role == "PATIENT"`, it auto-creates a `Patient` profile via `db.patient.create(...)`

**Why this is strong in a demo:** you don’t need separate “create patient profile” calls; signup is the single entrypoint.

---

### B) How they get assigned to a clinician

**Endpoint:**
- `POST /api/assignments`

**Code path:**
1. Router: `app/routes/assignments.py`
2. Controller: `createAssignment` in `app/controllers/assignment_controller.py`
3. Service:
   - `checkActiveAssignmentExists` in `app/services/assignment.py` (active-only uniqueness enforced here)
   - `createAssignment` in `app/services/assignment.py`

**Important detail you can say out loud:**
- Schema intentionally allows multiple assignments over time (re-admission, new care context). There is **no DB-level unique constraint** for `(patientId, clinicianId)`.
- Active-only uniqueness is enforced at the service layer.

---

### C) What happens when a symptom report is submitted

**Endpoint:**
- `POST /api/symptom-reports`

**Code path (this is the money shot):**
1. Router: `app/routes/symptom_reports.py`
2. Controller: `createSymptomReport` in `app/controllers/symptom_report_controller.py`
3. Intelligence pipeline: `createSymptomReport` in `app/services/symptom_report.py`

**Pipeline steps (what to say while scrolling that file):**
1. Fetch patient chronic conditions
2. Fetch most recent ACTIVE assignment to get `careContext`
3. Create report (initial defaults)
4. Risk classification (context-aware)
5. Trend analysis (history-aware)
6. Update report with computed fields
7. Update patient’s current risk/trend summary + timestamps
8. Generate alerts (HIGH risk and/or WORSENING trend)

---

### D) Where the risk calculation logic lives

**Primary module:** `app/services/risk_classification.py`

**Key entrypoint:**
- `classifySymptomReport(...)`

**What risk uses (structured, deterministic):**
- severity enum
- symptom IDs (typed)
- duration + frequency
- medication adherence
- vitals (temperature, heart rate)
- care context bonus
- chronic condition relevance
- 7-day report frequency bonus

**Why this answer sounds credible:**
- You can point to constants in that file (weights + thresholds) and show the explanation builder.

---

### E) How alerts are triggered

**Trigger site (pipeline):** `app/services/symptom_report.py`
- If risk is `HIGH` → `generateRiskAlert(...)`
- If trend is `WORSENING` → `generateTrendAlert(...)`

**Alert implementations:** `app/services/alert_service.py`
- `generateRiskAlert` creates `HIGH_RISK` (priority HIGH)
- `generateTrendAlert` creates `WORSENING_TREND` (priority MEDIUM)

**Clinician viewing/acting:**
- `GET /alerts/` (restricted to CLINICIAN/ADMIN)
- `PUT /alerts/{alertId}/read`

---

## 2) “Lecturer trap” answers (say these verbatim)

### “How exactly is risk calculated?”

“It’s a deterministic numeric score. We add:
- severity score
- weighted symptom score (plus combo bonus for multiple high-weight symptoms)
- duration bonus
- frequency bonus
- medication non-adherence penalty
- vitals flags bonus
- care context baseline/bonus
- chronic-condition match bonus
- 7-day report-frequency bonus

Then we map score to LOW/MEDIUM/HIGH using fixed thresholds. The report stores both a JSON breakdown and a human-readable explanation string.”

**Code:** `computeRiskScore(...)` and `classifyRiskLevel(...)` in `app/services/risk_classification.py`.

---

### “Why did you choose this approach?”

“I optimized for explainability and controlled behavior in a clinical workflow. All scoring is driven by structured fields, not free text, so it’s predictable, testable, and we can always show a clinician the reasoning via `riskExplanation`.”

---

### “What happens if two reports come in at the same time?”

“Both symptom reports are stored; there’s no loss of history. The patient summary fields like `currentRiskLevel` and `currentTrendStatus` are denormalized ‘latest known’ values, so under concurrency it’s last-write-wins depending on which request finishes last. If we needed strict serialization, we’d wrap the pipeline in a DB transaction or use row-level locking.”

**Code:** the multi-step pipeline in `app/services/symptom_report.py`.

---
s
### “Where is this handled in your code?”

(Answer with *file + function*, no filler.)
- Signup/profile creation: `app/services/auth.py::registerUser`
- Assignment creation: `app/controllers/assignment_controller.py::createAssignment`
- Report pipeline: `app/services/symptom_report.py::createSymptomReport`
- Risk: `app/services/risk_classification.py::classifySymptomReport`
- Trend: `app/services/trend_analysis.py::analyzeTrend`
- Alerts: `app/services/alert_service.py::generateRiskAlert` / `generateTrendAlert`

---

## 3) Clean demo flow (Scenario S1: Asthma follow-up)

Use the existing scripts for copy/paste:
- `defense/DEMO_WALKTHROUGH_API.md`
- `defense/DEMO_CURL_SCRIPT.md`

### Minimum “intentional demo” checklist

1. Create clinician + patient via `POST /auth/signup`
2. (Optional) update patient chronic conditions via `PUT /api/patients/{id}`
3. Create assignment: `POST /api/assignments` with `careContext: ASTHMA_FOLLOWUP`
4. Submit report #1 (mild)
5. Submit report #2 (moderate + key symptom) → HIGH risk alert
6. Submit report #3 (severe + vitals) → WORSENING trend alert
7. Switch to clinician view: `GET /alerts/` and show alert message includes reasoning
8. Mark one alert read: `PUT /alerts/{alertId}/read`
9. End assignment: `PUT /api/assignments/{assignmentId}/status` with `INACTIVE`

### What to show on screen (in order)
- Patient + clinician exist
- Assignment record exists (careContext visible)
- Each report response includes `riskLevel`, `riskScore`, and explanation fields
- Alerts list shows HIGH_RISK and WORSENING_TREND

---

## 4) Weak spots (own them confidently)

- **Not “AI”**: this is an explainable rules engine + trend heuristic.
- **No transaction in the report pipeline**: patient summary fields are last-write-wins under concurrency.
- **Assignment active-uniqueness is app-enforced**: there’s a theoretical race for concurrent creates.

If pressed: “That tradeoff was fine for an MVP demo; the next step is transactional updates + stronger DB constraints (or partial unique indexes) depending on requirements.”
