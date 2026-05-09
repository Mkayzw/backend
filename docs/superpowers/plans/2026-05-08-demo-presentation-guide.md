# Telemedicine Demo Presentation Guide

> **For the group:** each person has a clear speaking part, a clear code area, and a clear moment in the live demo.

**Goal:** Present the full system as one smooth story: login, patient reporting, risk scoring, clinician monitoring, and admin/system management.

**Architecture:** Start from the frontend login flow, move through the patient report journey, then show how the backend scores risk and creates alerts, then finish with clinician and admin dashboards. Each speaker explains one layer of the system and points to the exact code that powers it.

**Tech Stack:** React/Vite frontend, FastAPI backend, Prisma/PostgreSQL data layer, JWT authentication, rule-based risk scoring, trend analysis, alerts, and dashboard metrics.

---

## Demo Order

1. Person 1 opens the app and shows login and signup.
2. Person 2 shows the patient dashboard and symptom report submission.
3. Person 3 explains the backend logic that scores risk and detects trends.
4. Person 4 shows the clinician dashboard, prioritized patients, and alerts.
5. Person 5 shows the admin dashboard and system metrics.

---

## Person 1: Login, Signup, and App Entry

**Main job:** Explain how a user enters the system and how the app sends them to the correct dashboard based on their role.

**What to say:**
- The app starts in the React entry point and loads the main `App` component.
- Login and signup are handled on the frontend, then the token is saved in auth state.
- After login, the app redirects by role to patient, clinician, or admin pages.
- Protected routes stop unauthenticated users from opening dashboard pages.

**Files to explain:**
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/components/ProtectedRoute.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/SignupPage.jsx`
- `app/routes/auth.py`
- `app/controllers/auth_controller.py`
- `app/services/auth.py`

**Live demo part:**
- Show login using the demo accounts on the login page.
- Show signup briefly if needed.
- Explain that JWT token storage is what keeps the session active.

**Good handoff line to Person 2:**
- "Now that the user is inside the system, I will show what a patient can do after login."

---

## Person 2: Patient Reporting Flow

**Main job:** Explain how a patient submits symptoms and how the frontend sends structured data to the backend.

**What to say:**
- The patient dashboard is where the user records symptoms, severity, duration, frequency, and optional vitals.
- The form sends structured data, not just free text, so the backend can score it properly.
- The patient can also view previous reports, assigned clinicians, and profile information.
- After submission, the dashboard reloads and reflects the new report.

**Files to explain:**
- `frontend/src/pages/patient/PatientDashboard.jsx`
- `frontend/src/pages/patient/PatientDashboard.css`
- `frontend/src/api/symptomReports.js`
- `frontend/src/api/patients.js`
- `frontend/src/api/assignments.js`
- `frontend/src/api/users.js`
- `app/routes/symptom_reports.py`
- `app/controllers/symptom_report_controller.py`
- `app/services/symptom_report.py`
- `schema.prisma`

**Live demo part:**
- Open the patient dashboard.
- Fill in a symptom report.
- Show how the report appears in history or updates the page after submission.

**Good handoff line to Person 3:**
- "This is where the important logic happens in the backend, because the report is now scored and turned into a risk level."

---

## Person 3: Risk Scoring, Trend Analysis, and Alerts

**Main job:** Explain the core algorithm and the intelligence layer behind the system.

**What to say:**
- The backend uses a deterministic scoring model so the result is explainable.
- It combines symptom weights, severity, duration, frequency, medication adherence, care context, chronic conditions, and recent report history.
- The result becomes a risk score and a risk level.
- Trend analysis compares the new score with previous reports to decide whether the patient is improving, stable, or worsening.
- If the risk is high or the trend is worsening, the system generates alerts automatically.

**Files to explain:**
- `app/services/risk_classification.py`
- `app/services/trend_analysis.py`
- `app/services/alert_service.py`
- `app/services/metrics.py`
- `app/services/symptom_report.py`
- `app/controllers/symptom_report_controller.py`
- `telemedicine_clinical_logic.md`
- `schema.prisma`

**Key logic to mention:**
- `risk_classification.py` has the symptom weights and score thresholds.
- `trend_analysis.py` compares the current report against recent history.
- `alert_service.py` creates high-risk and worsening-trend alerts.
- `symptom_report.py` connects the whole pipeline in one flow.

**Live demo part:**
- Explain the report submission result.
- Point to the risk level and any alert that was created.
- Show that the explanation text is stored so clinicians can understand why the report was flagged.

**Good handoff line to Person 4:**
- "Once the backend creates the risk and alert data, the clinician dashboard is where that information is used for monitoring."

---

## Person 4: Clinician Dashboard and Prioritization

**Main job:** Show how the clinician sees the most urgent patients first and reviews alerts and trends.

**What to say:**
- The clinician dashboard pulls stats, prioritized patients, and alerts.
- Patients are sorted by risk level, then trend status, then most recent report.
- The clinician can open a patient to view trend data and care context.
- Alerts can be marked as read once they are handled.

**Files to explain:**
- `frontend/src/pages/clinician/ClinicianDashboard.jsx`
- `frontend/src/pages/clinician/ClinicianDashboard.css`
- `frontend/src/api/dashboard.js`
- `frontend/src/api/alerts.js`
- `frontend/src/components/RiskBadge.jsx`
- `frontend/src/components/TrendIndicator.jsx`
- `frontend/src/components/AlertCard.jsx`
- `frontend/src/components/StatCard.jsx`
- `app/routes/dashboard.py`
- `app/controllers/dashboard_controller.py`
- `app/services/dashboard.py`
- `app/routes/alerts.py`
- `app/controllers/alert_controller.py`
- `app/services/alert_service.py`

**Live demo part:**
- Open the clinician dashboard.
- Show the summary cards, the prioritized patient list, and at least one alert.
- Expand one patient to show the trend view.

**Good handoff line to Person 5:**
- "The final view is the admin side, where the whole platform can be monitored and managed."

---

## Person 5: Admin Dashboard and System Metrics

**Main job:** Explain the system-wide overview, user management, assignments, and performance metrics.

**What to say:**
- The admin dashboard shows total users, patients, clinicians, assignments, high-risk cases, alerts, and reports.
- Admin can manage users and assignments.
- System metrics show error rate, latency, and risk classification accuracy.
- This part proves the platform is not only functional, but also monitored.

**Files to explain:**
- `frontend/src/pages/admin/AdminDashboard.jsx`
- `frontend/src/pages/admin/AdminDashboard.css`
- `frontend/src/api/dashboard.js`
- `frontend/src/api/users.js`
- `frontend/src/api/assignments.js`
- `frontend/src/api/alerts.js`
- `frontend/src/api/metrics.js`
- `app/routes/metrics.py`
- `app/controllers/metrics_controller.py`
- `app/services/metrics.py`
- `app/routes/users.py`
- `app/routes/assignments.py`
- `app/routes/patients.py`
- `app/routes/clinicians.py`

**Live demo part:**
- Open the admin dashboard.
- Show the system overview cards.
- Show user or assignment management if time allows.
- Show the metrics section last.

**Closing line:**
- "That is the complete system: a patient reports symptoms, the backend scores risk, alerts are created automatically, clinicians review priorities, and admins monitor the whole platform."

---

## Short Speaking Time Split

- Person 1: 2 minutes
- Person 2: 3 minutes
- Person 3: 3 minutes
- Person 4: 3 minutes
- Person 5: 2 minutes

---

## Backup Notes

- If the internet or backend is slow, Person 1 should still show the login flow and explain the role redirect.
- If the patient demo is rushed, Person 2 can explain the form without submitting it.
- If the alert does not appear live, Person 3 should explain the code path that creates it.
- If the clinician dashboard takes time to load, Person 4 can focus on the prioritized-patient logic first.
- If time is short, Person 5 can show only the overview cards and metrics.

