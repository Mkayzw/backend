"""
Testing Strategies for the Remote Patient Monitoring System

This module documents comprehensive testing strategies beyond unit tests,
including simulated patient scenarios, edge cases, workflow testing, and
an RBAC verification matrix. It also provides helper functions for running
test scenarios against a live API instance.

Usage:
    # Run all patient scenarios
    python -c "from app.utils.testing_strategies import run_patient_scenario; import asyncio; asyncio.run(run_patient_scenario('acute_asthma'))"

    # Run full RBAC verification
    python -c "from app.utils.testing_strategies import verify_rbac_matrix; import asyncio; asyncio.run(verify_rbac_matrix())"

Testing Strategy Overview:
    1. Simulated Patient Scenarios - Realistic clinical workflows
    2. Edge Cases - Boundary and error conditions
    3. Workflow Testing - End-to-end clinical operations
    4. RBAC Verification Matrix - Role-based access control validation
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

# ─────────────────────────────────────────────────────────────────────────────
#  1. SIMULATED PATIENT SCENARIOS
# ─────────────────────────────────────────────────────────────────────────────

PATIENT_SCENARIOS = {
    "acute_asthma": {
        "description": (
            "Acute Asthma Exacerbation: A patient with asthma submits escalating "
            "symptoms over 3 days. The risk level should escalate from LOW/MEDIUM "
            "to HIGH, the trend should shift to WORSENING, and a HIGH_RISK alert "
            "should be generated. This tests the intelligence layer's ability to "
            "detect rapidly deteriorating respiratory conditions."
        ),
        "patient_email": "patient.asthma@telemed.local",
        "steps": [
            {
                "day": 0,
                "symptoms": ["cough"],
                "severity": "MILD",
                "durationDays": 1,
                "frequency": "RECURRING",
                "expected_risk": "LOW",
                "expected_trend": "STABLE",
                "expected_alert": False,
            },
            {
                "day": 1,
                "symptoms": ["cough", "shortness_of_breath"],
                "severity": "MODERATE",
                "durationDays": 2,
                "frequency": "RECURRING",
                "expected_risk": "MEDIUM",
                "expected_trend": "STABLE",
                "expected_alert": False,
            },
            {
                "day": 2,
                "symptoms": ["difficulty_breathing", "cough"],
                "severity": "SEVERE",
                "durationDays": 3,
                "frequency": "RECURRING",
                "expected_risk": "HIGH",
                "expected_trend": "WORSENING",
                "expected_alert": True,
            },
        ],
    },

    "post_surgical_recovery": {
        "description": (
            "Post-Surgical Recovery: A patient who had appendectomy submits "
            "improving symptoms over 7 days. The trend should shift to IMPROVING "
            "and the risk level should de-escalate from MEDIUM to LOW. This tests "
            "the trend analysis engine's ability to detect positive trajectories."
        ),
        "patient_email": "patient.postop@telemed.local",
        "steps": [
            {
                "day": 0,
                "symptoms": ["severe_pain", "swelling"],
                "severity": "SEVERE",
                "durationDays": 1,
                "frequency": "FIRST_TIME",
                "expected_risk": "HIGH",
                "expected_trend": "STABLE",
                "expected_alert": True,
            },
            {
                "day": 2,
                "symptoms": ["fever", "fatigue"],
                "severity": "MODERATE",
                "durationDays": 3,
                "frequency": "RECURRING",
                "expected_risk": "MEDIUM",
                "expected_trend": "STABLE",
                "expected_alert": False,
            },
            {
                "day": 5,
                "symptoms": ["fatigue"],
                "severity": "MILD",
                "durationDays": 5,
                "frequency": "RECURRING",
                "expected_risk": "LOW",
                "expected_trend": "IMPROVING",
                "expected_alert": False,
            },
            {
                "day": 7,
                "symptoms": ["fatigue"],
                "severity": "MILD",
                "durationDays": 7,
                "frequency": "CHRONIC",
                "expected_risk": "LOW",
                "expected_trend": "IMPROVING",
                "expected_alert": False,
            },
        ],
    },

    "chronic_stable_monitoring": {
        "description": (
            "Chronic Stable Monitoring: A hypertension patient submits stable "
            "mild reports over several days. The trend should remain STABLE and "
            "no alerts should be generated. This validates the system does not "
            "produce false positives for well-managed chronic conditions."
        ),
        "patient_email": "patient.hypertension@telemed.local",
        "steps": [
            {
                "day": 0,
                "symptoms": ["headache", "dizziness"],
                "severity": "MILD",
                "durationDays": 1,
                "frequency": "RECURRING",
                "expected_risk": "LOW",
                "expected_trend": "STABLE",
                "expected_alert": False,
            },
            {
                "day": 3,
                "symptoms": ["fatigue"],
                "severity": "MILD",
                "durationDays": 2,
                "frequency": "RECURRING",
                "expected_risk": "LOW",
                "expected_trend": "STABLE",
                "expected_alert": False,
            },
            {
                "day": 7,
                "symptoms": ["headache"],
                "severity": "MILD",
                "durationDays": 1,
                "frequency": "RECURRING",
                "expected_risk": "LOW",
                "expected_trend": "STABLE",
                "expected_alert": False,
            },
        ],
    },

    "medication_non_adherence": {
        "description": (
            "Medication Non-Adherence: A patient with chronic conditions reports "
            "not taking prescribed medication. The risk score should increase "
            "because medicationAdherent=False is a known risk amplifier, "
            "especially in chronic disease contexts."
        ),
        "patient_email": "patient.diabetes@telemed.local",
        "steps": [
            {
                "day": 0,
                "symptoms": ["fatigue"],
                "severity": "MILD",
                "durationDays": 1,
                "frequency": "RECURRING",
                "medicationAdherent": True,
                "expected_risk": "LOW",
                "expected_trend": "STABLE",
                "expected_alert": False,
            },
            {
                "day": 3,
                "symptoms": ["fatigue", "dizziness"],
                "severity": "MODERATE",
                "durationDays": 3,
                "frequency": "RECURRING",
                "medicationAdherent": False,
                "expected_risk": "MEDIUM",
                "expected_trend": "STABLE",
                "expected_alert": False,
            },
        ],
    },

    "emergency_critical": {
        "description": (
            "Emergency Critical Symptoms: A patient submits chest_pain + "
            "difficulty_breathing with CRITICAL severity. This should immediately "
            "trigger HIGH risk classification and a HIGH priority alert. "
            "This tests the system's ability to handle life-threatening "
            "presentations without delay."
        ),
        "patient_email": "patient.asthma@telemed.local",
        "steps": [
            {
                "day": 0,
                "symptoms": ["chest_pain", "difficulty_breathing"],
                "severity": "CRITICAL",
                "durationDays": 1,
                "frequency": "FIRST_TIME",
                "expected_risk": "HIGH",
                "expected_trend": "STABLE",
                "expected_alert": True,
            },
        ],
    },
}

# ─────────────────────────────────────────────────────────────────────────────
#  2. EDGE CASES
# ─────────────────────────────────────────────────────────────────────────────

EDGE_CASES = {
    "patient_no_reports": {
        "description": (
            "Patient with no symptom reports. The dashboard should display "
            "empty state, risk level should be LOW (default), and trend should "
            "be STABLE (default). No alerts should exist."
        ),
        "patient_email": "patient.unassigned@telemed.local",
        "expected_state": {
            "risk_level": "LOW",
            "trend_status": "STABLE",
            "report_count": 0,
            "alert_count": 0,
        },
    },

    "patient_single_report": {
        "description": (
            "Patient with only one symptom report. Trend analysis requires "
            "at least 3 historical reports, so trend should default to STABLE. "
            "Risk classification should still work correctly for the single report."
        ),
        "expected_behavior": (
            "Trend defaults to STABLE when insufficient history exists. "
            "Risk classification still processes the single report."
        ),
    },

    "duplicate_email_signup": {
        "description": (
            "Attempting to sign up with an email that already exists should "
            "return a 409 Conflict error with a clear message."
        ),
        "endpoint": "POST /auth/signup",
        "expected_status": 409,
        "expected_detail": "A user with this email already exists",
    },

    "token_expiration": {
        "description": (
            "A JWT token that has expired should result in a 401 Unauthorized "
            "response when used to access protected endpoints. The frontend "
            "should redirect to login."
        ),
        "expected_behavior": (
            "Backend returns 401 for expired tokens. Frontend clears stored "
            "credentials and redirects to login page."
        ),
    },

    "cross_patient_data_access": {
        "description": (
            "A PATIENT user attempting to access another patient's data should "
            "receive a 403 Forbidden response. This is a critical RBAC test."
        ),
        "test_accounts": [
            "patient.asthma@telemed.local",
            "patient.hypertension@telemed.local",
        ],
        "expected_status": 403,
    },

    "clinician_unassigned_patient_access": {
        "description": (
            "A CLINICIAN attempting to access a patient they are not assigned "
            "to should receive a 403 Forbidden response. This tests the "
            "assignment-based access control."
        ),
        "clinician_email": "clinician.unassigned@telemed.local",
        "patient_email": "patient.asthma@telemed.local",
        "expected_status": 403,
    },

    "admin_deletes_own_account": {
        "description": (
            "An admin attempting to delete their own account should either be "
            "prevented (recommended) or the system should ensure at least one "
            "admin remains. This prevents accidental lockout."
        ),
        "expected_behavior": (
            "System should prevent self-deletion or ensure minimum admin count."
        ),
    },

    "weak_password_rejection": {
        "description": (
            "Signup with a weak password (less than 8 chars, no numbers, or "
            "no letters) should be rejected with a 422 validation error."
        ),
        "test_passwords": ["short", "allletters", "12345678", "a1"],
        "expected_status": 422,
    },

    "clinician_signup_without_specialization": {
        "description": (
            "Signing up as a CLINICIAN without providing a specialization "
            "should be rejected with a 422 error."
        ),
        "expected_status": 422,
        "expected_detail": "Specialization is required for clinician accounts",
    },
}

# ─────────────────────────────────────────────────────────────────────────────
#  3. WORKFLOW TESTING
# ─────────────────────────────────────────────────────────────────────────────

WORKFLOW_TESTS = {
    "full_clinical_workflow": {
        "description": (
            "Complete clinical workflow: patient signs up -> submits symptom "
            "report -> risk classified by intelligence layer -> alert generated "
            "if HIGH risk -> clinician sees alert in dashboard -> clinician "
            "marks alert as read -> patient sees updated status."
        ),
        "steps": [
            "1. POST /auth/signup (new patient)",
            "2. POST /api/symptom-reports (submit report with SEVERE symptoms)",
            "3. GET /api/alerts (as clinician, verify alert exists)",
            "4. PATCH /api/alerts/{id}/read (clinician marks alert as read)",
            "5. GET /api/patients/me (patient verifies updated risk level)",
        ],
        "assertions": [
            "Signup returns 200 with token and patient profile is auto-created",
            "Symptom report is created with computed riskLevel and riskScore",
            "Alert is generated with correct priority and type",
            "Alert isRead status changes to true after clinician action",
            "Patient's currentRiskLevel reflects the latest classification",
        ],
    },

    "assignment_lifecycle": {
        "description": (
            "Assignment lifecycle: admin creates assignment -> clinician sees "
            "patient in their list -> admin deactivates assignment -> clinician "
            "loses access to patient data."
        ),
        "steps": [
            "1. POST /auth/login (as admin)",
            "2. POST /api/assignments (create patient-clinician assignment)",
            "3. GET /api/dashboard/prioritized-patients (as clinician, verify patient appears)",
            "4. PUT /api/assignments/{id}/status (admin sets status to INACTIVE)",
            "5. GET /api/dashboard/prioritized-patients (as clinician, verify patient is gone)",
        ],
        "assertions": [
            "Assignment is created with ACTIVE status",
            "Clinician can see assigned patient in prioritized list",
            "Assignment status transitions to INACTIVE",
            "Clinician can no longer access the patient's data",
        ],
    },

    "role_escalation_attempt": {
        "description": (
            "Role escalation attempt: a PATIENT user tries to access admin-only "
            "endpoints such as user management or assignment creation. All "
            "attempts should return 403 Forbidden."
        ),
        "steps": [
            "1. POST /auth/login (as patient)",
            "2. GET /api/users (should return 403)",
            "3. POST /api/assignments (should return 403)",
            "4. GET /api/dashboard/stats (should return patient's own stats only)",
        ],
        "assertions": [
            "Patient receives 403 for admin-only endpoints",
            "Patient dashboard stats contain only their own data",
            "No data leakage across role boundaries",
        ],
    },
}

# ─────────────────────────────────────────────────────────────────────────────
#  4. RBAC VERIFICATION MATRIX
# ─────────────────────────────────────────────────────────────────────────────

RBAC_MATRIX = [
    # Format: (role, method, endpoint, expected_status, description)
    # Patient endpoints
    ("PATIENT", "GET", "/api/patients/me", 200, "Patient views own profile"),
    ("PATIENT", "GET", "/api/patients/{other_patient_id}", 403, "Patient cannot view other patient"),
    ("PATIENT", "GET", "/api/symptom-reports", 200, "Patient views own reports"),
    ("PATIENT", "POST", "/api/symptom-reports", 200, "Patient submits own report"),
    ("PATIENT", "GET", "/api/alerts", 200, "Patient views own alerts"),
    ("PATIENT", "GET", "/api/assignments", 200, "Patient views own assignments"),
    ("PATIENT", "GET", "/api/dashboard/stats", 200, "Patient views own stats"),

    # Patient forbidden endpoints
    ("PATIENT", "GET", "/api/users", 403, "Patient cannot list all users"),
    ("PATIENT", "POST", "/api/assignments", 403, "Patient cannot create assignments"),
    ("PATIENT", "PATCH", "/api/alerts/{id}/read", 403, "Patient cannot mark alerts as read"),

    # Clinician endpoints
    ("CLINICIAN", "GET", "/api/patients/{assigned_patient_id}", 200, "Clinician views assigned patient"),
    ("CLINICIAN", "GET", "/api/patients/{unassigned_patient_id}", 403, "Clinician cannot view unassigned patient"),
    ("CLINICIAN", "GET", "/api/symptom-reports", 200, "Clinician views assigned patients' reports"),
    ("CLINICIAN", "GET", "/api/alerts", 200, "Clinician views alerts for assigned patients"),
    ("CLINICIAN", "PATCH", "/api/alerts/{assigned_alert_id}/read", 200, "Clinician marks own patient's alert as read"),
    ("CLINICIAN", "GET", "/api/dashboard/prioritized-patients", 200, "Clinician views assigned patients"),
    ("CLINICIAN", "GET", "/api/dashboard/stats", 200, "Clinician views assigned patient stats"),

    # Clinician forbidden endpoints
    ("CLINICIAN", "POST", "/api/assignments", 403, "Clinician cannot create assignments"),
    ("CLINICIAN", "GET", "/api/users", 403, "Clinician cannot list all users"),

    # Admin endpoints
    ("ADMIN", "GET", "/api/patients", 200, "Admin views all patients"),
    ("ADMIN", "GET", "/api/clinicians", 200, "Admin views all clinicians"),
    ("ADMIN", "GET", "/api/users", 200, "Admin views all users"),
    ("ADMIN", "POST", "/api/assignments", 200, "Admin creates assignment"),
    ("ADMIN", "GET", "/api/alerts", 200, "Admin views all alerts"),
    ("ADMIN", "GET", "/api/dashboard/stats", 200, "Admin views system-wide stats"),
    ("ADMIN", "GET", "/api/dashboard/prioritized-patients", 200, "Admin views all patients prioritized"),

    # Auth endpoints (unauthenticated)
    ("ANONYMOUS", "POST", "/auth/login", 200, "Unauthenticated user can login"),
    ("ANONYMOUS", "POST", "/auth/signup", 200, "Unauthenticated user can signup"),
    ("ANONYMOUS", "GET", "/api/patients", 401, "Unauthenticated user cannot access protected endpoints"),
]

# Test account credentials for RBAC matrix testing
RBAC_TEST_CREDENTIALS = {
    "PATIENT": {"email": "patient.asthma@telemed.local", "password": "Patient123!"},
    "CLINICIAN": {"email": "clinician.cardiology@telemed.local", "password": "Clinician123!"},
    "ADMIN": {"email": "admin@telemed.local", "password": "Admin123!"},
}


# ─────────────────────────────────────────────────────────────────────────────
#  HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

async def run_patient_scenario(scenario_name: str, base_url: str = "http://localhost:8000") -> dict:
    """
    Execute a predefined patient scenario against the running API.

    This function simulates the step-by-step symptom reporting defined
    in PATIENT_SCENARIOS and validates the expected outcomes.

    Args:
        scenario_name: Key from PATIENT_SCENARIOS (e.g., 'acute_asthma')
        base_url: Base URL of the running API server

    Returns:
        dict with 'passed', 'failed', 'results' keys
    """
    import httpx

    if scenario_name not in PATIENT_SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario_name}. Available: {list(PATIENT_SCENARIOS.keys())}")

    scenario = PATIENT_SCENARIOS[scenario_name]
    results = []
    passed = 0
    failed = 0

    # Login as the test patient
    patient_email = scenario["patient_email"]
    # Determine password from email domain
    if "patient" in patient_email:
        password = "Patient123!"
    else:
        password = "Patient123!"

    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        # Login
        login_resp = await client.post("/auth/login", json={"email": patient_email, "password": password})
        if login_resp.status_code != 200:
            return {"passed": 0, "failed": 1, "results": [{"step": "login", "error": f"Login failed: {login_resp.status_code}"}]}

        token = login_resp.json().get("token") or login_resp.json().get("accessToken")
        headers = {"Authorization": f"Bearer {token}"}

        for i, step in enumerate(scenario["steps"]):
            step_result = {"step": i + 1, "symptoms": step["symptoms"], "severity": step["severity"]}

            # Submit symptom report
            report_data = {
                "patientId": None,  # Let the backend determine from token
                "symptoms": json.dumps(step["symptoms"]),
                "severity": step["severity"],
                "durationDays": step["durationDays"],
                "frequency": step["frequency"],
                "notes": f"Test scenario: {scenario_name}, step {i + 1}",
                "medicationAdherent": step.get("medicationAdherent", True),
            }

            report_resp = await client.post("/api/symptom-reports", json=report_data, headers=headers)
            step_result["report_status"] = report_resp.status_code

            if report_resp.status_code in (200, 201):
                report_json = report_resp.json()

                # Check risk level
                actual_risk = report_json.get("riskLevel", "UNKNOWN")
                expected_risk = step["expected_risk"]
                risk_match = actual_risk == expected_risk
                step_result["risk_level"] = {"expected": expected_risk, "actual": actual_risk, "match": risk_match}

                if risk_match:
                    passed += 1
                else:
                    failed += 1

                # Check for alert generation
                alerts_resp = await client.get("/api/alerts", headers=headers)
                if alerts_resp.status_code == 200:
                    alerts = alerts_resp.json()
                    has_alert = len(alerts) > 0 if isinstance(alerts, list) else alerts.get("total", 0) > 0
                    alert_match = has_alert == step["expected_alert"]
                    step_result["alert"] = {"expected": step["expected_alert"], "actual": has_alert, "match": alert_match}

                    if alert_match:
                        passed += 1
                    else:
                        failed += 1
            else:
                step_result["error"] = f"Report submission failed: {report_resp.status_code}"
                failed += 1

            results.append(step_result)

    return {"passed": passed, "failed": failed, "results": results}


async def verify_rbac_matrix(base_url: str = "http://localhost:8000") -> dict:
    """
    Run the full RBAC verification matrix against the running API.

    Tests each (role, endpoint, method) combination and validates
    the expected HTTP status code is returned.

    Args:
        base_url: Base URL of the running API server

    Returns:
        dict with 'passed', 'failed', 'results' keys
    """
    import httpx

    results = []
    passed = 0
    failed = 0

    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        for role, method, endpoint, expected_status, description in RBAC_MATRIX:
            result = {"role": role, "method": method, "endpoint": endpoint, "description": description}

            if role == "ANONYMOUS":
                # No auth header
                headers = {}
            else:
                # Login as the test user for this role
                creds = RBAC_TEST_CREDENTIALS.get(role)
                if not creds:
                    result["error"] = f"No test credentials for role: {role}"
                    failed += 1
                    results.append(result)
                    continue

                login_resp = await client.post("/auth/login", json=creds)
                if login_resp.status_code != 200:
                    result["error"] = f"Login failed for {role}: {login_resp.status_code}"
                    failed += 1
                    results.append(result)
                    continue

                token = login_resp.json().get("token") or login_resp.json().get("accessToken")
                headers = {"Authorization": f"Bearer {token}"}

            # Make the request
            try:
                if method == "GET":
                    resp = await client.get(endpoint, headers=headers)
                elif method == "POST":
                    resp = await client.post(endpoint, json={}, headers=headers)
                elif method == "PATCH":
                    resp = await client.patch(endpoint, json={}, headers=headers)
                elif method == "PUT":
                    resp = await client.put(endpoint, json={}, headers=headers)
                elif method == "DELETE":
                    resp = await client.delete(endpoint, headers=headers)
                else:
                    result["error"] = f"Unsupported method: {method}"
                    failed += 1
                    results.append(result)
                    continue

                actual_status = resp.status_code
                # For POST /auth/login and /auth/signup, accept both 200 and 201
                status_match = actual_status == expected_status
                if endpoint in ("/auth/login", "/auth/signup") and actual_status in (200, 201):
                    status_match = expected_status in (200, 201)

                result["expected_status"] = expected_status
                result["actual_status"] = actual_status
                result["match"] = status_match

                if status_match:
                    passed += 1
                else:
                    failed += 1

            except Exception as e:
                result["error"] = str(e)
                failed += 1

            results.append(result)

    return {"passed": passed, "failed": failed, "results": results}


async def create_test_user(
    email: str,
    password: str,
    fullName: str,
    role: str = "PATIENT",
    specialization: Optional[str] = None,
    base_url: str = "http://localhost:8000",
) -> dict:
    """
    Helper function to create a test user via the signup API.

    Args:
        email: User email
        password: User password (must meet strength requirements)
        fullName: User's full name
        role: PATIENT or CLINICIAN
        specialization: Required if role is CLINICIAN
        base_url: Base URL of the running API server

    Returns:
        dict with the created user info and token, or error details
    """
    import httpx

    signup_data = {
        "email": email,
        "password": password,
        "fullName": fullName,
        "role": role,
    }
    if role == "CLINICIAN" and specialization:
        signup_data["specialization"] = specialization

    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        resp = await client.post("/auth/signup", json=signup_data)
        return {"status": resp.status_code, "data": resp.json() if resp.status_code in (200, 201) else None, "error": resp.json() if resp.status_code >= 400 else None}


# ─────────────────────────────────────────────────────────────────────────────
#  PRINT STRATEGIES (for documentation / reference)
# ─────────────────────────────────────────────────────────────────────────────

def print_testing_strategies():
    """Print the complete testing strategy documentation to stdout."""
    print("=" * 72)
    print("  REMOTE PATIENT MONITORING SYSTEM — TESTING STRATEGIES")
    print("=" * 72)
    print()

    print("1. SIMULATED PATIENT SCENARIOS")
    print("-" * 72)
    for name, scenario in PATIENT_SCENARIOS.items():
        print(f"\n  Scenario: {name}")
        print(f"  {scenario['description']}")
        print(f"  Steps: {len(scenario['steps'])}")
        for i, step in enumerate(scenario["steps"]):
            print(f"    Day {step['day']}: {step['symptoms']} ({step['severity']})")
            print(f"      Expected: risk={step['expected_risk']}, trend={step['expected_trend']}, alert={step['expected_alert']}")

    print()
    print("2. EDGE CASES")
    print("-" * 72)
    for name, case in EDGE_CASES.items():
        print(f"\n  Case: {name}")
        print(f"  {case['description']}")

    print()
    print("3. WORKFLOW TESTS")
    print("-" * 72)
    for name, workflow in WORKFLOW_TESTS.items():
        print(f"\n  Workflow: {name}")
        print(f"  {workflow['description']}")
        print("  Steps:")
        for step in workflow["steps"]:
            print(f"    {step}")

    print()
    print("4. RBAC VERIFICATION MATRIX")
    print("-" * 72)
    print(f"  Total test cases: {len(RBAC_MATRIX)}")
    roles = set(row[0] for row in RBAC_MATRIX)
    for role in sorted(roles):
        count = sum(1 for row in RBAC_MATRIX if row[0] == role)
        print(f"  {role}: {count} test cases")
    print()
    print("  Run with: python -c \"from app.utils.testing_strategies import verify_rbac_matrix; import asyncio; asyncio.run(verify_rbac_matrix())\"")


if __name__ == "__main__":
    print_testing_strategies()
