# Test Accounts — Login & Testing Guide

These accounts are seeded deterministically by `seed_data.py` so their credentials never change between runs. Use them to exercise every role and edge case in the system.

> Run `python seed_data.py` to (re)create them.

---

## Quick reference

| Email                                     | Password         | Role      | Specialization / Profile                                |
| ----------------------------------------- | ---------------- | --------- | ------------------------------------------------------- |
| `admin@telemed.local`                     | `Admin123!`      | ADMIN     | System administrator                                    |
| `clinician.cardiology@telemed.local`      | `Clinician123!`  | CLINICIAN | Cardiology — assigned patients                          |
| `clinician.pulmonology@telemed.local`     | `Clinician123!`  | CLINICIAN | Pulmonology — assigned patients                         |
| `clinician.unassigned@telemed.local`      | `Clinician123!`  | CLINICIAN | General Practice — **edge case: no patients**           |
| `patient.asthma@telemed.local`            | `Patient123!`    | PATIENT   | Fragile · Asthma · Allergic to penicillin               |
| `patient.hypertension@telemed.local`      | `Patient123!`    | PATIENT   | Stable · Hypertension · Allergic to aspirin             |
| `patient.diabetes@telemed.local`          | `Patient123!`    | PATIENT   | Stable · Diabetes · No allergies                        |
| `patient.postop@telemed.local`            | `Patient123!`    | PATIENT   | Stable · Post-appendectomy recovery                     |
| `patient.unassigned@telemed.local`        | `Patient123!`    | PATIENT   | **Edge case: no clinician assigned**                    |

---

## Admin

### `admin@telemed.local`
- **Password:** `Admin123!`
- **Role:** `ADMIN`
- **Name:** Admin User
- **Phone:** +263-77-000-0001
- **What to test:**
  - Admin console / system-wide views.
  - Audit log access.
  - Cross-tenant data visibility.

---

## Clinicians

All clinician passwords: **`Clinician123!`**

### `clinician.cardiology@telemed.local`
- **Name:** Dr. Chiedza Moyo
- **Specialization:** Cardiology
- **Assigned patients:**
  - `patient.asthma@telemed.local` (asthma + cardiac co-monitoring)
  - `patient.hypertension@telemed.local` (BP management)
  - `patient.diabetes@telemed.local` (T2DM glycaemic control)
- **What to test:**
  - Clinical dashboard with multiple prioritized patients.
  - HIGH-risk alerts triage (Acknowledge → Resolve / Escalate).
  - **Respond** to symptom reports, **Schedule Follow-Up**.
  - Tasks tab and follow-up appointments tab.

### `clinician.pulmonology@telemed.local`
- **Name:** Dr. Garikai Ncube
- **Specialization:** Pulmonology
- **Assigned patients:**
  - `patient.asthma@telemed.local` (asthma follow-up)
  - `patient.postop@telemed.local` (post-appendectomy recovery)
- **What to test:**
  - Sharing a patient (`patient.asthma`) with another clinician (Cardiology).
  - Worsening-trend alerts on the asthma patient.

### `clinician.unassigned@telemed.local`  *(edge case)*
- **Name:** Dr. Rudo Sibanda
- **Specialization:** General Practice
- **Assigned patients:** *none*
- **What to test:**
  - Empty-state dashboard.
  - Behaviour when a clinician has zero assignments (no alerts, no tasks).

---

## Patients

All patient passwords: **`Patient123!`**

### `patient.asthma@telemed.local`
- **Name:** Tendai Dube · Female · DOB 1990-03-15
- **Baseline:** Fragile
- **Chronic conditions:** asthma
- **Allergies:** penicillin
- **Care context:** ASTHMA_FOLLOWUP
- **Assigned clinicians:** Cardiology + Pulmonology
- **What to test:**
  - Submit a HIGH-severity report (`difficulty_breathing` + `chest_pain`, severity SEVERE) → triggers HIGH-risk alert + notification to both clinicians.
  - View clinician responses + scheduled follow-ups.
  - Live notification bell updates via SSE.

### `patient.hypertension@telemed.local`
- **Name:** Farai Ndlela · Male · DOB 1975-08-22
- **Baseline:** Stable
- **Chronic conditions:** hypertension
- **Allergies:** aspirin
- **Care context:** CHRONIC_DISEASE_MONITORING
- **Assigned clinician:** Cardiology
- **What to test:**
  - Routine reports (mild/moderate) staying below alert threshold.
  - Trend analysis showing stable vs. worsening over time.

### `patient.diabetes@telemed.local`
- **Name:** Nyasha Nyoni · Female · DOB 1985-11-10
- **Baseline:** Stable
- **Chronic conditions:** diabetes
- **Allergies:** *(none)*
- **Care context:** CHRONIC_DISEASE_MONITORING
- **Assigned clinician:** Cardiology
- **What to test:**
  - Glycaemic-control workflow.
  - Medication-adherence flag impact on risk score.

### `patient.postop@telemed.local`
- **Name:** Tafadzwa Gumbo · Male · DOB 1992-06-05
- **Baseline:** Stable
- **Chronic conditions:** *(none)*
- **Allergies:** *(none)*
- **Care context:** POST_SURGERY_RECOVERY
- **Assigned clinician:** Pulmonology
- **What to test:**
  - Post-surgery recovery context.
  - Symptoms like `fever` + `swelling` that escalate via the surgical-context rules.

### `patient.unassigned@telemed.local`  *(edge case)*
- **Name:** Chipo Hove · Female · DOB 1988-01-20
- **Baseline:** Stable
- **Chronic conditions:** *(none)*
- **Allergies:** penicillin
- **Care context:** GENERAL_REVIEW
- **Assigned clinician:** *none*
- **What to test:**
  - Patient flow when no clinician is assigned (alerts have no owner).
  - System notifications reach the patient even without a clinician.

---

## Bulk demo accounts

In addition to the deterministic accounts above, `seed_data.py` also generates ~50 randomized patients, ~15 randomized clinicians, and ~3 admins.

- **Email pattern:**
  - Admins: `admin.<n>@telemed.local`
  - Patients: `<first>.<last>.<hash>@patient.telemed.local`
  - Clinicians: `<first>.<last>.<hash>@clinic.telemed.local`
- **Password (all bulk accounts):** `password123`

These exist to make the dashboards feel populated — use them for visual / load testing rather than scripted scenarios.

---

## End-to-end demo flow

1. Log in as **`patient.asthma@telemed.local`** in one browser.
2. Submit a symptom report:
   - Symptoms: `difficulty_breathing`, `chest_pain`
   - Severity: `SEVERE`
3. In a second browser, log in as **`clinician.cardiology@telemed.local`**.
4. Watch the notification bell badge increment in real time (SSE).
5. Open **Alerts** → on the new HIGH alert click:
   - **Respond** — write a clinical reply, optionally tick *Action required*.
   - **Schedule Follow-Up** — pick a date/time + reason.
6. Switch back to the patient browser:
   - The notification bell shows new entries (`Clinician response received`, `Follow-up scheduled`).
   - Patient dashboard shows the response card and the upcoming follow-up.
7. Back as the clinician: open **Follow-Ups** tab → mark the appointment **Completed** / **Missed** / **Cancelled**.
