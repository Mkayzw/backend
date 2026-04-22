# Requirements Document

## Introduction

This feature completes the Healthcare Platform Backend API by fixing existing bugs, implementing missing functionality, and adding an Intelligence Layer for telemedicine follow-up and remote symptom monitoring. The platform manages patients, clinicians, assignments, and symptom reports using FastAPI with Prisma ORM (PostgreSQL database).

The system is designed for resource-constrained healthcare environments where it must function without specialized hardware and under poor network conditions. The Intelligence Layer (Risk Classification + Trend Analysis + Alerts) is the core research contribution.

## Glossary

- **Healthcare_Platform**: The FastAPI backend application managing healthcare data
- **User**: A person in the system with a role (PATIENT, CLINICIAN, or ADMIN)
- **Patient**: A user with PATIENT role who has an associated patient profile containing medical information
- **Clinician**: A user with CLINICIAN role who has an associated clinician profile containing professional information
- **Assignment**: A relationship linking a patient to a clinician for care management
- **Symptom_Report**: A record submitted by a patient describing their symptoms
- **Dashboard**: An API endpoint providing summary statistics and recent activity
- **Risk_Classification_Engine**: A system component that computes risk scores and classifies patients into risk levels
- **Trend_Analysis_Engine**: A system component that analyzes historical symptom reports to detect health trends
- **Alert_Generation_System**: A system component that generates alerts based on risk levels and trends
- **Risk_Level**: A classification of patient risk: LOW, MEDIUM, or HIGH
- **Trend_Status**: A classification of patient health trajectory: IMPROVING, STABLE, or WORSENING
- **Alert**: A notification generated when specific conditions are met (HIGH risk or WORSENING trend)
- **Alert_Priority**: A classification of alert urgency: LOW, MEDIUM, or HIGH

---

## Phase 1: Foundation Requirements (Bug Fixes and Basic CRUD)

---

### Requirement 1: Fix Patient Service Bugs

**User Story:** As a developer, I want the patient service to work correctly, so that patient profiles can be managed without errors.

#### Acceptance Criteria

1. WHEN a patient is retrieved by ID, THE Patient_Service SHALL query the Patient table (not the User table)
2. WHEN a patient profile is created, THE Patient_Service SHALL accept userId as an integer (not string)
3. WHEN a patient profile is updated, THE Patient_Service SHALL use the correct field name "dateOfBirth" (without trailing space)
4. WHEN a patient profile is updated, THE Patient_Service SHALL return the updated patient record
5. THE Patient_Service SHALL include the related User record when returning patient data

### Requirement 2: Fix Clinician Service Bugs

**User Story:** As a developer, I want the clinician service to work correctly, so that clinician profiles can be managed without errors.

#### Acceptance Criteria

1. WHEN a clinician is retrieved by ID, THE Clinician_Service SHALL await the database query result
2. WHEN a clinician is retrieved by user ID, THE Clinician_Service SHALL query by userId field (not id field)
3. WHEN a clinician profile is created, THE Clinician_Service SHALL use field names matching the Prisma schema (Fullname, Specialization - not credentials)
4. WHEN a clinician profile is updated, THE Clinician_Service SHALL accept keyword arguments correctly (not positional arguments with asterisk)
5. WHEN a clinician is deleted, THE Clinician_Service SHALL use the correct function name "deleteClinician" (not deleteClininian)
6. THE Clinician_Service SHALL include the related User record when returning clinician data

### Requirement 3: Complete Patient Management Routes

**User Story:** As a frontend developer, I want complete REST API endpoints for patients, so that I can build patient management features.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/patients with valid data, THE Healthcare_Platform SHALL create a new patient profile and return 201 status
2. WHEN a GET request is made to /api/patients, THE Healthcare_Platform SHALL return a list of all patients with their user information
3. WHEN a GET request is made to /api/patients/{id}, THE Healthcare_Platform SHALL return the patient with the specified ID
4. WHEN a PUT request is made to /api/patients/{id} with valid data, THE Healthcare_Platform SHALL update the patient profile and return the updated record
5. WHEN a DELETE request is made to /api/patients/{id}, THE Healthcare_Platform SHALL delete the patient profile and return a success message
6. IF a patient is not found, THE Healthcare_Platform SHALL return 404 status with an appropriate error message
7. IF a user is not a PATIENT role, THE Healthcare_Platform SHALL return 400 status when creating a patient profile

### Requirement 4: Complete Clinician Management Routes

**User Story:** As a frontend developer, I want complete REST API endpoints for clinicians, so that I can build clinician management features.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/clinicians with valid data, THE Healthcare_Platform SHALL create a new clinician profile and return 201 status
2. WHEN a GET request is made to /api/clinicians, THE Healthcare_Platform SHALL return a list of all clinicians with their user information
3. WHEN a GET request is made to /api/clinicians/{id}, THE Healthcare_Platform SHALL return the clinician with the specified ID
4. WHEN a PUT request is made to /api/clinicians/{id} with valid data, THE Healthcare_Platform SHALL update the clinician profile and return the updated record
5. WHEN a DELETE request is made to /api/clinicians/{id}, THE Healthcare_Platform SHALL delete the clinician profile and return a success message
6. IF a clinician is not found, THE Healthcare_Platform SHALL return 404 status with an appropriate error message
7. IF a user is not a CLINICIAN role, THE Healthcare_Platform SHALL return 400 status when creating a clinician profile

### Requirement 5: Implement Assignments System

**User Story:** As a healthcare administrator, I want to assign patients to clinicians, so that care relationships can be tracked.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/assignments with patientId and clinicianId, THE Healthcare_Platform SHALL create a new assignment with ACTIVE status
2. WHEN a GET request is made to /api/assignments, THE Healthcare_Platform SHALL return a list of all assignments with patient and clinician details
3. WHEN a GET request is made to /api/assignments/{id}, THE Healthcare_Platform SHALL return the assignment with the specified ID
4. WHEN a PUT request is made to /api/assignments/{id}/status with a new status, THE Healthcare_Platform SHALL update the assignment status
5. WHEN a DELETE request is made to /api/assignments/{id}, THE Healthcare_Platform SHALL delete the assignment
6. IF the patient or clinician does not exist, THE Healthcare_Platform SHALL return 404 status
7. IF an assignment already exists between the same patient and clinician, THE Healthcare_Platform SHALL return 409 conflict status
8. WHEN an assignment is created, THE Healthcare_Platform SHALL set the assignedAt timestamp to the current time

### Requirement 6: Implement Symptom Reports

**User Story:** As a patient, I want to submit symptom reports, so that my clinicians can review my health status.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/symptom-reports with patientId and notes, THE Healthcare_Platform SHALL create a new symptom report
2. WHEN a GET request is made to /api/symptom-reports, THE Healthcare_Platform SHALL return a list of all symptom reports
3. WHEN a GET request is made to /api/symptom-reports/{id}, THE Healthcare_Platform SHALL return the symptom report with the specified ID
4. WHEN a GET request is made to /api/symptom-reports/patient/{patientId}, THE Healthcare_Platform SHALL return all symptom reports for that patient
5. WHEN a DELETE request is made to /api/symptom-reports/{id}, THE Healthcare_Platform SHALL delete the symptom report
6. IF the patient does not exist, THE Healthcare_Platform SHALL return 404 status when creating a symptom report
7. WHEN a symptom report is created, THE Healthcare_Platform SHALL set the createdAt timestamp to the current time

### Requirement 7: Implement Dashboard Statistics

**User Story:** As a healthcare administrator, I want to see dashboard statistics, so that I can monitor platform activity at a glance.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/dashboard/stats, THE Healthcare_Platform SHALL return total counts of users, patients, clinicians, and assignments
2. WHEN a GET request is made to /api/dashboard/stats, THE Healthcare_Platform SHALL return the count of active assignments
3. WHEN a GET request is made to /api/dashboard/recent-activity, THE Healthcare_Platform SHALL return the 5 most recent symptom reports
4. WHEN a GET request is made to /api/dashboard/recent-activity, THE Healthcare_Platform SHALL return the 5 most recent assignments
5. WHEN a GET request is made to /api/dashboard/recent-activity, THE Healthcare_Platform SHALL return the 5 most recently registered users

### Requirement 8: Fix Schema and Data Model Issues

**User Story:** As a developer, I want the Prisma schema to be consistent and correct, so that the database operations work reliably.

#### Acceptance Criteria

1. THE Prisma_Schema SHALL use consistent naming conventions (camelCase for fields)
2. THE Patient_Model SHALL have correctly spelled field "emergencyContact" (not "emergerncyContact")
3. THE Clinician_Model SHALL use consistent field naming (fullname, specialization - matching typical conventions)
4. THE Assignments_Model SHALL use standard naming (id not Id, camelCase for relations)
5. THE SymptomReport_Model SHALL support multiple reports per patient (remove @unique constraint on patientId)
6. THE Assignments_Model SHALL allow multiple assignments by removing unique constraints on clinicianId and patientId if needed, or use a composite unique constraint

### Requirement 9: Fix Patient Controller Bugs

**User Story:** As a developer, I want the patient controller to work correctly, so that API requests are handled properly.

#### Acceptance Criteria

1. WHEN creating a patient, THE Patient_Controller SHALL check if a patient profile already exists using userId (not patientId)
2. WHEN creating a patient, THE Patient_Controller SHALL use the correct error message "patient profile already exists" (not "clinician profile")
3. WHEN updating a patient, THE Patient_Controller SHALL call the service correctly (not use comma instead of dot)
4. WHEN updating a patient, THE Patient_Controller SHALL pass the patientId parameter to the service
5. THE Patient_Controller SHALL import UpdatePatient schema correctly (with correct case)

### Requirement 10: Fix Clinician Controller Implementation

**User Story:** As a developer, I want the clinician controller to be complete, so that clinician API endpoints work correctly.

#### Acceptance Criteria

1. WHEN creating a clinician, THE Clinician_Controller SHALL await the service call
2. THE Clinician_Controller SHALL implement getClinician, updateClinician, and deleteClinician functions
3. THE Clinician_Controller SHALL not include unused clinicianId parameter in createClinician function
4. WHEN a clinician is not found, THE Clinician_Controller SHALL return 404 status

---

## Phase 2: Intelligence Layer Requirements (Core Innovation)

---

### Requirement 11: Risk Classification Engine

**User Story:** As a clinician, I want patients to be automatically classified by risk level when they submit symptom reports, so that I can prioritize care for those who need it most.

#### Acceptance Criteria

1. WHEN a symptom report is submitted, THE Risk_Classification_Engine SHALL compute a risk score based on symptom combinations
2. WHEN a risk score is computed, THE Risk_Classification_Engine SHALL classify the patient into exactly one of: LOW, MEDIUM, or HIGH risk level
3. WHEN determining risk level, THE Risk_Classification_Engine SHALL consider symptom combinations that indicate severe conditions
4. WHEN determining risk level, THE Risk_Classification_Engine SHALL consider report frequency (number of reports within a time window)
5. WHEN determining risk level, THE Risk_Classification_Engine SHALL consider duration of symptoms (time since first report with similar symptoms)
6. WHEN a risk level is determined, THE Healthcare_Platform SHALL store the computed risk level with the symptom report
7. THE Risk_Classification_Engine SHALL use a deterministic algorithm that produces consistent results for identical inputs
8. FOR ALL symptom reports, THE Risk_Classification_Engine SHALL complete risk computation within 500 milliseconds

### Requirement 12: Trend Analysis Engine

**User Story:** As a clinician, I want to see health trends for my patients based on their symptom history, so that I can identify patients who are improving or deteriorating.

#### Acceptance Criteria

1. WHEN a symptom report is submitted, THE Trend_Analysis_Engine SHALL analyze the patient's historical reports
2. WHEN analyzing trends, THE Trend_Analysis_Engine SHALL compare the current report with at least the 3 most recent previous reports for that patient
3. WHEN a trend is determined, THE Trend_Analysis_Engine SHALL assign exactly one of: IMPROVING, STABLE, or WORSENING status
4. WHEN a trend status is determined, THE Healthcare_Platform SHALL update the patient's trend status dynamically
5. WHEN fewer than 3 historical reports exist, THE Trend_Analysis_Engine SHALL assign a STABLE trend status
6. WHEN trend data is requested, THE Healthcare_Platform SHALL make trend status available through the dashboard API
7. THE Trend_Analysis_Engine SHALL consider symptom severity changes over time when determining trend status
8. THE Trend_Analysis_Engine SHALL consider report frequency changes when determining trend status

### Requirement 13: Alert Generation System

**User Story:** As a clinician, I want to receive alerts when patients have high-risk conditions or worsening trends, so that I can intervene promptly.

#### Acceptance Criteria

1. WHEN a symptom report is classified as HIGH risk, THE Alert_Generation_System SHALL generate an alert
2. WHEN a patient's trend status changes to WORSENING, THE Alert_Generation_System SHALL generate an alert
3. WHEN an alert is generated, THE Alert_Generation_System SHALL tag the alert with a priority level
4. WHEN an alert is generated for HIGH risk, THE Alert_Generation_System SHALL assign HIGH priority
5. WHEN an alert is generated for WORSENING trend, THE Alert_Generation_System SHALL assign MEDIUM priority
6. WHEN an alert is generated, THE Healthcare_Platform SHALL log the alert timestamp
7. WHEN an alert is generated, THE Healthcare_Platform SHALL associate the alert with the relevant patient and symptom report
8. THE Healthcare_Platform SHALL provide an API endpoint to retrieve alerts
9. WHEN alerts are retrieved, THE Healthcare_Platform SHALL return alerts sorted by priority (highest first) and then by timestamp (most recent first)

### Requirement 14: Dashboard Prioritization System

**User Story:** As a clinician, I want the dashboard to show patients sorted by urgency, so that I can focus on the most critical cases first.

#### Acceptance Criteria

1. WHEN a clinician views their dashboard, THE Healthcare_Platform SHALL display patients sorted by risk level with HIGH risk first
2. WHEN multiple patients have the same risk level, THE Healthcare_Platform SHALL sort by trend status with WORSENING first
3. WHEN multiple patients have the same risk level and trend status, THE Healthcare_Platform SHALL sort by submission time with most recent first
4. WHEN displaying the dashboard, THE Healthcare_Platform SHALL visually highlight patients with HIGH risk level
5. WHEN displaying the dashboard, THE Healthcare_Platform SHALL show recent activity summaries for each patient
6. THE Dashboard_Prioritization_System SHALL provide an API endpoint that returns the prioritized patient list
7. THE Dashboard_Prioritization_System SHALL filter patients to show only those assigned to the requesting clinician

### Requirement 15: Low-Bandwidth Optimization

**User Story:** As a patient in an area with poor network connectivity, I want the system to work efficiently on slow connections, so that I can submit my symptom reports reliably.

#### Acceptance Criteria

1. WHEN an API response is returned, THE Healthcare_Platform SHALL minimize payload sizes by excluding unnecessary data
2. WHEN a patient submits a symptom report, THE Healthcare_Platform SHALL accept lightweight text-based input without requiring attachments
3. WHEN an API request is processed, THE Healthcare_Platform SHALL complete the request within 5 seconds under simulated low-bandwidth conditions
4. THE Healthcare_Platform SHALL NOT require external hardware devices for symptom reporting
5. THE Healthcare_Platform SHALL support JSON payload compression for responses exceeding 1 kilobyte
6. WHEN a symptom report is submitted, THE Healthcare_Platform SHALL return a minimal confirmation response (under 500 bytes)

### Requirement 16: Security and Access Control

**User Story:** As a healthcare administrator, I want role-based access control, so that users can only access data appropriate to their role.

#### Acceptance Criteria

1. WHEN a user logs in, THE Healthcare_Platform SHALL authenticate the user using secure credentials
2. WHEN a user is authenticated, THE Healthcare_Platform SHALL assign permissions based on the user's role (PATIENT, CLINICIAN, or ADMIN)
3. WHEN a patient requests data, THE Healthcare_Platform SHALL restrict access to only that patient's own records
4. WHEN a clinician requests data, THE Healthcare_Platform SHALL restrict access to only patients assigned to that clinician
5. WHEN an admin requests data, THE Healthcare_Platform SHALL allow access to all records
6. WHEN an unauthenticated user attempts to access protected endpoints, THE Healthcare_Platform SHALL return 401 unauthorized status
7. WHEN an authenticated user attempts to access data outside their scope, THE Healthcare_Platform SHALL return 403 forbidden status
8. THE Healthcare_Platform SHALL use JWT tokens for authentication with an expiration time of 24 hours or less

### Requirement 17: System Performance and Evaluation

**User Story:** As a system administrator, I want to measure system performance and correctness, so that I can ensure the platform meets quality standards.

#### Acceptance Criteria

1. WHEN an API request is processed, THE Healthcare_Platform SHALL measure and log response latency
2. WHEN an error occurs, THE Healthcare_Platform SHALL log the error with timestamp and error details
3. THE Healthcare_Platform SHALL provide an API endpoint to retrieve error rate statistics
4. THE Healthcare_Platform SHALL provide an API endpoint to retrieve average response latency statistics
5. WHEN risk classification is performed, THE Healthcare_Platform SHALL validate correctness against a test dataset with known classifications
6. THE Healthcare_Platform SHALL support usability testing scenarios by providing test data endpoints
7. WHEN performance metrics are collected, THE Healthcare_Platform SHALL store metrics for at least 30 days
8. THE Healthcare_Platform SHALL provide an API endpoint to retrieve risk classification accuracy metrics
