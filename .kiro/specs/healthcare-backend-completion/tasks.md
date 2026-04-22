# Implementation Plan: Healthcare Backend Completion

## Overview

This implementation fixes existing bugs and adds missing functionality to the Healthcare Platform Backend API. The work is organized in logical phases: schema fixes (foundation), bug fixes in existing code, then new features.

## Tasks

- [x] 1. Fix Prisma schema issues
  - Fix `Patient.emergerncyContact` typo → `emergencyContact`
  - Fix `Clinician.Fullname` → `fullname` (lowercase)
  - Fix `Clinician.Specialization` → `specialization` (lowercase)
  - Fix `Assignments.Id` → `id` (lowercase)
  - Remove `@unique` from `Assignments.clinicianId` and `Assignments.patientId`
  - Add `@@unique([patientId, clinicianId])` composite constraint to Assignments
  - Remove `@unique` from `SymptomReport.patientId` to allow multiple reports
  - Run `npx prisma migrate dev --name fix_schema_issues`
  - Run `npx prisma generate`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 2. Fix patient service bugs
  - Fix `getPatientbyId` to query Patient table (not User table)
  - Fix `createPatient` to accept `userId` as int (not string)
  - Fix `updatePatient` field name `dateOfBirth` (remove trailing space)
  - Fix `updatePatient` to return the updated patient record
  - Add `include={"user": True}` to all patient queries
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Fix clinician service bugs
  - Add `await` to `getClinicianById` database query
  - Fix `getClinicianByUserId` to query by `userId` field (not `id`)
  - Fix `createClinician` to use `fullname` and `specialization` fields
  - Fix `updateClinician` to use keyword arguments (not `*args`)
  - Fix `deleteClinician` function name (was `deleteClininian`)
  - Add `include={"user": True}` to all clinician queries
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4. Fix patient controller bugs
  - Fix `createPatient` to check existing profile by `userId` (not `patientId`)
  - Fix error message to say "patient profile" (not "clinician profile")
  - Fix `updatePatient` service call syntax (comma vs dot issue)
  - Fix `updatePatient` to pass `patientId` parameter to service
  - Fix `UpdatePatient` schema import (correct case)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 5. Fix clinician controller implementation
  - Add `await` to `createClinician` service call
  - Implement `getClinician` function
  - Implement `updateClinician` function
  - Implement `deleteClinician` function
  - Remove unused `clinicianId` parameter from `createClinician`
  - Add 404 handling for not found clinicians
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 6. Fix patient and clinician schemas
  - Update `PatientResponse` to match fixed schema field names
  - Update `ClinicianResponse` to use `fullname` and `specialization`
  - Ensure `populate_by_name=True` for field name mapping
  - _Requirements: 8.2, 8.3_

- [x] 7. Create assignment service
  - Create `app/services/assignment.py`
  - Implement `createAssignment(patientId, clinicianId)`
  - Implement `getAssignmentById(assignmentId)`
  - Implement `getAllAssignments()`
  - Implement `updateAssignmentStatus(assignmentId, status)`
  - Implement `deleteAssignment(assignmentId)`
  - Implement `checkAssignmentExists(patientId, clinicianId)`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8_

- [x] 8. Create assignment controller
  - Create `app/controllers/assignment_controller.py`
  - Implement `createAssignment` with patient/clinician validation
  - Implement `getAssignment` with 404 handling
  - Implement `getAllAssignments`
  - Implement `updateAssignmentStatus`
  - Implement `deleteAssignment`
  - Add duplicate assignment check (409 conflict)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 9. Create assignment schema and routes
  - Create `app/schemas/assignment_schema.py` with `CreateAssignment`, `UpdateAssignmentStatus`, `AssignmentResponse`
  - Create `app/routes/assignments.py` with full CRUD endpoints
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Create symptom report service
  - Create `app/services/symptom_report.py`
  - Implement `createSymptomReport(patientId, notes)`
  - Implement `getSymptomReportById(reportId)`
  - Implement `getAllSymptomReports()`
  - Implement `getSymptomReportsByPatient(patientId)`
  - Implement `deleteSymptomReport(reportId)`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_

- [x] 11. Create symptom report controller
  - Create `app/controllers/symptom_report_controller.py`
  - Implement `createSymptomReport` with patient validation
  - Implement `getSymptomReport` with 404 handling
  - Implement `getAllSymptomReports`
  - Implement `getSymptomReportsByPatient`
  - Implement `deleteSymptomReport`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 12. Create symptom report schema and routes
  - Create `app/schemas/symptom_report_schema.py` with `CreateSymptomReport`, `SymptomReportResponse`
  - Create `app/routes/symptom_reports.py` with CRUD endpoints
  - Include `/patient/{patientId}` endpoint for patient-specific reports
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 13. Create dashboard service
  - Create `app/services/dashboard.py`
  - Implement `getStats()` returning user, patient, clinician, assignment counts
  - Implement `getRecentActivity()` returning recent reports, assignments, users
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 14. Create dashboard controller
  - Create `app/controllers/dashboard_controller.py`
  - Implement `getStats()`
  - Implement `getRecentActivity()`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 15. Create dashboard schema and routes
  - Create `app/schemas/dashboard_schema.py` with `StatsResponse`, `RecentActivityResponse`
  - Create `app/routes/dashboard.py` with `/stats` and `/recent-activity` endpoints
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 16. Create patient and clinician routes
  - Create `app/routes/patients.py` with full CRUD endpoints
  - Create `app/routes/clinicians.py` with full CRUD endpoints
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 17. Wire up all routes in main.py
  - Import all new routers (patients, clinicians, assignments, symptom_reports, dashboard)
  - Add `app.include_router()` for each router
  - _Requirements: 3.1, 4.1, 5.1, 6.1, 7.1_

- [x] 18. Checkpoint - Verify all endpoints work
  - Run the FastAPI server and test each endpoint group
  - Verify schema fixes didn't break existing data
  - Ask the user if questions arise

- [ ]* 19. Write unit tests for services
  - Create `tests/test_services/` directory structure
  - Write tests for patient service bug fixes
  - Write tests for clinician service bug fixes
  - Write tests for new services (assignment, symptom_report, dashboard)
  - _Requirements: 1.1-1.5, 2.1-2.6_

- [ ]* 20. Write integration tests for routes
  - Create `tests/test_routes/` directory structure
  - Write tests for patient CRUD endpoints
  - Write tests for clinician CRUD endpoints
  - Write tests for assignment endpoints
  - Write tests for symptom report endpoints
  - Write tests for dashboard endpoints
  - Test error cases (404, 409, 400)
  - _Requirements: 3.1-3.7, 4.1-4.7, 5.1-5.8, 6.1-6.7, 7.1-7.5_

---

## Phase 2: Intelligence Layer

---

- [x] 21. Extend database schema for Intelligence Layer
  - Add `RiskLevel` enum (LOW, MEDIUM, HIGH)
  - Add `TrendStatus` enum (IMPROVING, STABLE, WORSENING)
  - Add `AlertPriority` enum (LOW, MEDIUM, HIGH)
  - Extend `Patient` model with `currentRiskLevel`, `currentTrendStatus`, `lastRiskUpdate`, `lastTrendUpdate` fields
  - Extend `SymptomReport` model with `riskLevel`, `riskScore`, `riskFactors` fields
  - Create `Alert` model with `patientId`, `symptomReportId`, `priority`, `alertType`, `message`, `isRead`, `createdAt`
  - Create `PerformanceMetric` model with `endpoint`, `method`, `responseTimeMs`, `statusCode`, `errorType`, `errorMessage`, `timestamp`, `userId`
  - Run `npx prisma migrate dev --name add_intelligence_layer`
  - Run `npx prisma generate`
  - _Requirements: 11.6, 12.4, 13.7, 17.7_

- [x] 22. Create risk classification service
  - [x] 22.1 Implement risk classification engine
    - Create `app/services/risk_classification.py`
    - Implement `computeRiskScore(patientId, notes)` with symptom combination analysis
    - Implement `_analyzeSymptomCombinations(notes)` with severity keyword matching
    - Implement `_analyzeReportFrequency(patientId)` for 7-day window analysis
    - Implement `_analyzeSymptomDuration(patientId, notes)` for 30-day window analysis
    - Implement `classifyRiskLevel(risk_score)` returning LOW/MEDIUM/HIGH
    - Implement `classifySymptomReport(patientId, notes)` as main entry point
    - Ensure completion within 500ms (Requirement 11.8)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.7, 11.8_

  - [ ]* 22.2 Write property tests for risk classification
    - **Property 1: Risk Classification Determinism** - identical inputs produce identical outputs
    - **Validates: Requirements 11.7**
    - **Property 2: Risk Level Classification** - returns exactly one of LOW/MEDIUM/HIGH
    - **Validates: Requirements 11.2**
    - **Property 3: Risk Score Factors** - severe symptoms produce higher scores
    - **Validates: Requirements 11.3, 11.4, 11.5**
    - **Property 4: Risk Classification Performance** - completes within 500ms
    - **Validates: Requirements 11.8**

- [x] 23. Create trend analysis service
  - [x] 23.1 Implement trend analysis engine
    - Create `app/services/trend_analysis.py`
    - Implement `_calculateSeverityScore(notes)` for symptom severity scoring
    - Implement `getHistoricalReports(patientId, limit)` to fetch recent reports
    - Implement `analyzeTrend(patientId, currentNotes)` returning IMPROVING/STABLE/WORSENING
    - Implement `updatePatientTrendStatus(patientId, trendStatus)` to update patient record
    - Require at least 3 historical reports for trend analysis (Requirement 12.2)
    - Return STABLE when fewer than 3 historical reports exist (Requirement 12.5)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.7, 12.8_

  - [ ]* 23.2 Write property tests for trend analysis
    - **Property 5: Trend Status Classification** - returns exactly one of IMPROVING/STABLE/WORSENING
    - **Validates: Requirements 12.3**
    - **Property 6: Trend Status Default for Insufficient History** - returns STABLE for < 3 reports
    - **Validates: Requirements 12.5**
    - **Property 7: Trend Reflects Severity Changes** - increasing severity = WORSENING, decreasing = IMPROVING
    - **Validates: Requirements 12.7, 12.8**

- [x] 24. Create alert service
  - [x] 24.1 Implement alert generation system
    - Create `app/services/alert_service.py`
    - Implement `generateAlert(patientId, symptomReportId, alertType, priority, message)`
    - Implement `generateRiskAlert(patientId, symptomReportId, riskLevel)` for HIGH risk alerts
    - Implement `generateTrendAlert(patientId, symptomReportId, trendStatus)` for WORSENING trend alerts
    - Implement `getAlerts(priority, isRead, limit)` with sorting by priority and timestamp
    - Implement `markAlertAsRead(alertId)`
    - Implement `getAlertsByPatient(patientId)`
    - Assign HIGH priority for HIGH risk alerts (Requirement 13.4)
    - Assign MEDIUM priority for WORSENING trend alerts (Requirement 13.5)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.9_

  - [ ]* 24.2 Write property tests for alert generation
    - **Property 8: HIGH Risk Alert Generation** - HIGH risk creates HIGH priority alert
    - **Validates: Requirements 13.1, 13.4**
    - **Property 9: WORSENING Trend Alert Generation** - WORSENING trend creates MEDIUM priority alert
    - **Validates: Requirements 13.2, 13.5**
    - **Property 10: Alert Sorting** - alerts sorted by priority desc, then timestamp desc
    - **Validates: Requirements 13.9**

- [x] 25. Integrate Intelligence Layer into symptom report flow
  - [x] 25.1 Update symptom report service with intelligence integration
    - Update `app/services/symptom_report.py` to import risk_classification, trend_analysis, alert_service
    - Modify `createSymptomReport` to call risk classification after report creation
    - Modify `createSymptomReport` to call trend analysis after risk classification
    - Update patient record with risk level and trend status
    - Generate alerts for HIGH risk and WORSENING trend conditions
    - Store risk level, risk score, and risk factors on symptom report
    - _Requirements: 11.6, 12.4, 13.1, 13.2_

- [x] 26. Update dashboard service for prioritization
  - [x] 26.1 Implement dashboard prioritization system
    - Update `app/services/dashboard.py` with `getPrioritizedPatients(clinicianId)` function
    - Sort patients by risk level (HIGH first) - Requirement 14.1
    - Secondary sort by trend status (WORSENING first) - Requirement 14.2
    - Tertiary sort by submission time (most recent first) - Requirement 14.3
    - Filter patients by assigned clinician when clinicianId provided - Requirement 14.7
    - Implement `getPatientTrendData(patientId)` for trend data API - Requirement 12.6
    - _Requirements: 14.1, 14.2, 14.3, 14.6, 14.7, 12.6_

  - [ ]* 26.2 Write property tests for dashboard prioritization
    - **Property 11: Dashboard Patient Sorting** - patients sorted by risk, trend, time
    - **Validates: Requirements 14.1, 14.2, 14.3**
    - **Property 12: Clinician Patient Filtering** - only assigned patients returned
    - **Validates: Requirements 14.7**

- [x] 27. Implement low-bandwidth optimization
  - [x] 27.1 Create compression utilities
    - Create `app/utils/compression.py`
    - Implement `createMinimalResponse(message, status)` returning < 500 bytes (Requirement 15.6)
    - Implement `compressResponse(data, accept_encoding)` for gzip compression (Requirement 15.5)
    - Implement `CompressionMiddleware` class for automatic response compression
    - Apply compression for responses exceeding 1KB (Requirement 15.5)
    - _Requirements: 15.1, 15.5, 15.6_

- [x] 28. Create authentication service
  - [x] 28.1 Implement JWT authentication and authorization
    - Create `app/services/auth.py`
    - Implement `hashPassword(password)` and `verifyPassword(plain, hashed)` using bcrypt
    - Implement `createAccessToken(user_id, role)` with 24h expiration (Requirement 16.8)
    - Implement `decodeAccessToken(token)` with validation
    - Implement `authenticateUser(email, password)` returning user with token
    - Implement `getCurrentUser(credentials)` FastAPI dependency
    - Implement `requireRole(allowed_roles)` dependency factory for role-based access
    - Implement `checkDataAccess(current_user, resource_type, resource_id)` for data scope restrictions
    - Enforce PATIENT can only access own records (Requirement 16.3)
    - Enforce CLINICIAN can only access assigned patients' records (Requirement 16.4)
    - Enforce ADMIN can access all records (Requirement 16.5)
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_

  - [ ]* 28.2 Write property tests for authentication
    - **Property 16: Role-Based Data Access** - access restricted by role
    - **Validates: Requirements 16.3, 16.4, 16.5**
    - **Property 17: JWT Token Expiration** - tokens expire within 24 hours
    - **Validates: Requirements 16.8**

- [x] 29. Create performance metrics service
  - [x] 29.1 Implement metrics collection and reporting
    - Create `app/services/metrics.py`
    - Implement `logRequestMetrics(endpoint, method, response_time_ms, status_code, ...)` (Requirement 17.1)
    - Implement `logError(endpoint, method, error_type, error_message, ...)` (Requirement 17.2)
    - Implement `getErrorRateStats(days)` returning error rate statistics (Requirement 17.3)
    - Implement `getLatencyStats(days)` returning latency percentiles (Requirement 17.4)
    - Implement `getRiskClassificationAccuracy()` for accuracy metrics (Requirement 17.8)
    - Implement `cleanupOldMetrics()` to delete metrics older than 30 days (Requirement 17.7)
    - Implement `MetricsMiddleware` class for automatic request timing
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.7, 17.8_

- [x] 30. Create alert API endpoints
  - [x] 30.1 Create alert controller and routes
    - Create `app/controllers/alert_controller.py`
    - Implement `getAlerts(priority, isRead)` with role check (CLINICIAN, ADMIN only)
    - Implement `markAlertAsRead(alertId)` with 404 handling
    - Create `app/routes/alerts.py` with GET `/` and PUT `/{alertId}/read` endpoints
    - _Requirements: 13.8, 13.9_

- [x] 31. Create metrics API endpoints
  - [x] 31.1 Create metrics controller and routes
    - Create `app/controllers/metrics_controller.py`
    - Implement `getErrorRate(days)` - ADMIN only (Requirement 17.3)
    - Implement `getLatencyStats(days)` - ADMIN only (Requirement 17.4)
    - Implement `getRiskAccuracy()` - ADMIN and CLINICIAN (Requirement 17.8)
    - Create `app/routes/metrics.py` with GET `/errors`, `/latency`, `/risk-accuracy` endpoints
    - _Requirements: 17.3, 17.4, 17.8_

- [x] 32. Create authentication API endpoints
  - [x] 32.1 Create auth controller and routes
    - Create `app/controllers/auth_controller.py`
    - Implement `login(payload)` returning user with token or 401 for invalid credentials
    - Implement `getCurrentUserInfo(current_user)` returning current user info
    - Create `app/routes/auth.py` with POST `/login` and GET `/me` endpoints
    - _Requirements: 16.1, 16.6, 16.7_

- [x] 33. Update schemas for Intelligence Layer
  - [x] 33.1 Create new schemas and update existing schemas
    - Create `app/schemas/alert_schema.py` with `AlertResponse`, `AlertListResponse`, `MarkAlertRead`
    - Create `app/schemas/metrics_schema.py` with `ErrorRateResponse`, `LatencyStatsResponse`, `RiskAccuracyResponse`
    - Create `app/schemas/auth_schema.py` with `LoginRequest`, `LoginResponse`, `TokenPayload`
    - Update `app/schemas/symptom_report_schema.py` with `riskLevel`, `riskScore`, `riskFactors` fields
    - Update `app/schemas/patient_schema.py` with `currentRiskLevel`, `currentTrendStatus`, `lastRiskUpdate`, `lastTrendUpdate` fields
    - Add `PatientWithTrendResponse` and `SymptomReportWithRiskResponse` extended schemas
    - _Requirements: 11.6, 12.4, 13.7, 16.1, 17.3, 17.4_

- [x] 34. Update dashboard controller and routes
  - [x] 34.1 Add Intelligence Layer endpoints to dashboard
    - Update `app/controllers/dashboard_controller.py`
    - Add `getPrioritizedPatients(clinicianId, current_user)` with role-based filtering
    - Add `getPatientTrendData(patientId, current_user)` with access control check
    - Update `app/routes/dashboard.py` with GET `/prioritized-patients` and GET `/patient/{patientId}/trend`
    - _Requirements: 14.6, 14.7, 12.6_

- [x] 35. Wire up new routes in main.py
  - Import alert, metrics, and auth routers
  - Add `app.include_router()` for alerts, metrics, and auth routes
  - Add CompressionMiddleware for automatic response compression
  - Add MetricsMiddleware for automatic request timing
  - _Requirements: 13.8, 16.1, 17.1, 15.5_

- [x] 36. Checkpoint - Verify Intelligence Layer integration
  - Test risk classification on symptom report submission
  - Test trend analysis with multiple reports
  - Test alert generation for HIGH risk and WORSENING trends
  - Test dashboard prioritization sorting
  - Test authentication flow (login, token validation, role restrictions)
  - Test metrics collection
  - Verify response compression works
  - Ask the user if questions arise

- [ ]* 37. Write property tests for low-bandwidth optimization
  - **Property 13: Response Compression** - responses > 1KB are gzip compressed when accepted
  - **Validates: Requirements 15.5**
  - **Property 14: Minimal Confirmation Response** - confirmation responses < 500 bytes
  - **Validates: Requirements 15.6**
  - **Property 15: API Response Time** - all responses under 5 seconds
  - **Validates: Requirements 15.3**

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Schema fixes (Task 1) must be done first as they affect all other components
- Bug fixes (Tasks 2-6) should be completed before new features
- Checkpoint at Task 18 ensures everything is wired correctly before optional testing
- Phase 2 tasks (21-37) implement the Intelligence Layer features
- Database schema extension (Task 21) must be completed before Intelligence Layer services
- Property tests validate correctness properties defined in the design document
