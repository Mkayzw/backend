# Implementation Plan: RBAC Role-Based UI

## Overview

This implementation plan covers Role-Based Access Control (RBAC) enforcement on the backend and Role-Based UI on the frontend for the Healthcare Platform. The implementation is organized into three phases:

- **Phase 1: Backend RBAC Enforcement** - RBAC middleware, access control for patients/clinicians/admins, and endpoint-level authorization
- **Phase 2: Frontend Role-Based UI** - Role-based authentication handling, RoleGuard component, role-specific dashboards, navigation, and routing
- **Phase 3: Integration and Testing** - End-to-end RBAC verification, frontend role switching tests, and security audit logging

The backend uses Python/FastAPI and the frontend uses React/JavaScript.

## Tasks

### Phase 1: Backend RBAC Enforcement

- [ ] 1. Create audit logging service
  - [ ] 1.1 Create app/services/audit_log.py with logging functions
    - Implement `logAccessDenial()` for access denial events
    - Implement `logAuthenticationEvent()` for login/logout events
    - Implement `logRoleChange()` for role modification events
    - Implement `getAuditLogs()` for admin retrieval
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

  - [ ]* 1.2 Write unit tests for audit logging service
    - Test each logging function creates correct records
    - Test log retrieval with pagination
    - _Requirements: 23.1, 23.2, 23.3, 23.4_

- [ ] 2. Enhance auth service with RBAC functions
  - [ ] 2.1 Add ownership and assignment checker functions to app/services/auth.py
    - Implement `requirePatientOwnership()` dependency factory
    - Implement `requireClinicianAssignment()` dependency factory
    - Implement `getPatientForUser()` helper function
    - Implement `getClinicianForUser()` helper function
    - Enhance `requireRole()` with audit logging for denials
    - _Requirements: 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 2.2 Write property test for patient self-access
    - **Property 1: Patient Self-Access**
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 2.3 Write property test for clinician assignment access
    - **Property 2: Clinician Assignment Access**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 2.4 Write property test for admin full access
    - **Property 3: Admin Full Access**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ] 3. Update patient controller with RBAC
  - [ ] 3.1 Add RBAC enforcement to app/controllers/patient_controller.py
    - Implement `getPatient()` with role-based access control
    - Implement `getMyPatientProfile()` for PATIENT role
    - Implement `getAllPatients()` for ADMIN role only
    - Add access denial logging for unauthorized attempts
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 4.1, 4.5_

  - [ ]* 3.2 Write unit tests for patient controller RBAC
    - Test patient can access own profile
    - Test patient cannot access other patient's profile
    - Test clinician can access assigned patient
    - Test clinician cannot access unassigned patient
    - Test admin can access any patient
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 4.1_

- [ ] 4. Update symptom report controller with RBAC
  - [ ] 4.1 Add RBAC enforcement to app/controllers/symptom_report_controller.py
    - Implement `createSymptomReport()` with automatic patient association
    - Implement `getSymptomReports()` with role-based filtering
    - Implement `getSymptomReport()` with access control check
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 2.4, 2.5_

  - [ ]* 4.2 Write property test for symptom report ownership
    - **Property 4: Symptom Report Ownership**
    - **Validates: Requirements 5.1, 2.5**

  - [ ]* 4.3 Write unit tests for symptom report controller RBAC
    - Test patient can create report (auto-associated)
    - Test patient can view own reports only
    - Test clinician can view reports for assigned patients
    - Test admin can view all reports
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 5. Update alert controller with RBAC
  - [ ] 5.1 Add RBAC enforcement to app/controllers/alert_controller.py
    - Implement `getAlertsList()` with role-based filtering
    - Implement `markAlertRead()` with assignment verification
    - Add helper function `getAlertsForClinician()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 5.2 Write property test for alert access consistency
    - **Property 5: Alert Access Consistency**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ]* 5.3 Write unit tests for alert controller RBAC
    - Test patient sees only own alerts
    - Test clinician sees alerts for assigned patients
    - Test admin sees all alerts
    - Test clinician can mark alert for assigned patient
    - Test clinician cannot mark alert for unassigned patient
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6. Update assignment controller with RBAC
  - [ ] 6.1 Add RBAC enforcement to app/controllers/assignment_controller.py
    - Implement `createAssignment()` for ADMIN only
    - Implement `getAssignments()` with role-based filtering
    - Implement `updateAssignmentStatus()` with party verification
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 3.7_

  - [ ]* 6.2 Write property test for assignment creation authorization
    - **Property 6: Assignment Creation Authorization**
    - **Validates: Requirements 7.1, 7.5, 7.6**

  - [ ]* 6.3 Write unit tests for assignment controller RBAC
    - Test admin can create assignment
    - Test clinician cannot create assignment
    - Test patient cannot create assignment
    - Test patient sees own assignments
    - Test clinician sees own assignments
    - Test admin sees all assignments
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 7. Update dashboard controller with RBAC
  - [ ] 7.1 Add RBAC enforcement to app/controllers/dashboard_controller.py
    - Implement `getStats()` with role-based statistics
    - Implement `getRecentActivity()` with role-based filtering
    - Implement `getPrioritizedPatients()` with role-based filtering
    - Add helper functions for patient/clinician stats
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 3.5, 4.5_

  - [ ]* 7.2 Write property test for dashboard stats filtering
    - **Property 7: Dashboard Stats Filtering**
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [ ]* 7.3 Write unit tests for dashboard controller RBAC
    - Test patient sees personal stats
    - Test clinician sees assigned patient stats
    - Test admin sees system-wide stats
    - Test clinician sees assigned patients only
    - Test admin sees all patients
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 8. Add audit log endpoint for admins
  - [ ] 8.1 Create audit log route in app/routes/admin.py or app/routes/audit.py
    - Add GET /api/audit-logs endpoint
    - Require ADMIN role
    - Support pagination (limit, offset)
    - _Requirements: 23.4_

  - [ ]* 8.2 Write unit tests for audit log endpoint
    - Test admin can retrieve logs
    - Test non-admin cannot access endpoint
    - Test pagination works correctly
    - _Requirements: 23.4_

- [ ] 9. Checkpoint - Phase 1 complete
  - Ensure all backend RBAC tests pass
  - Verify all property tests pass
  - Ask the user if questions arise

### Phase 2: Frontend Role-Based UI

- [-] 10. Enhance API client with user info storage
  - [ ] 10.1 Update clinic-ui/src/api/client.js with user info functions
    - Implement `setUserInfo()` to store user data
    - Implement `getUserInfo()` to retrieve user data
    - Implement `clearUserInfo()` to clear on logout
    - Enhance `login()` to store user info from response
    - Enhance `logout()` to clear all user info
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 10.2 Write unit tests for API client user info functions
    - Test setUserInfo stores correctly
    - Test getUserInfo retrieves correctly
    - Test clearUserInfo removes all data
    - Test login stores user info
    - Test logout clears user info
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [~] 11. Create RoleGuard component
  - [ ] 11.1 Create clinic-ui/src/components/RoleGuard.jsx
    - Implement component with allowedRoles prop
    - Implement optional fallback prop
    - Check user role against allowed roles
    - Render children or fallback based on role match
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 11.2 Write unit tests for RoleGuard component
    - Test renders children for allowed role
    - Test renders nothing for disallowed role
    - Test renders fallback for disallowed role
    - Test handles missing user info
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [~] 12. Create PatientDashboard component
  - [ ] 12.1 Create clinic-ui/src/components/PatientDashboard.jsx
    - Display patient's current risk level with visual indicator
    - Display patient's current trend status
    - Display list of patient's own symptom reports
    - Display trend chart showing risk score history
    - Add button to submit new symptom report
    - Display assigned clinicians list
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [ ] 12.2 Create clinic-ui/src/styles/PatientDashboard.css
    - Style risk level indicator
    - Style trend status indicator
    - Style reports list
    - Style clinicians list
    - _Requirements: 11.2, 11.3, 11.4, 11.7_

  - [ ]* 12.3 Write unit tests for PatientDashboard component
    - Test displays risk level correctly
    - Test displays trend status correctly
    - Test displays symptom reports list
    - Test displays assigned clinicians
    - Test submit report button exists
    - _Requirements: 11.2, 11.3, 11.4, 11.6, 11.7_

- [~] 13. Create SymptomReportForm component
  - [ ] 13.1 Create clinic-ui/src/components/SymptomReportForm.jsx
    - Create form with symptoms, severity, duration, notes fields
    - Add form validation for required fields
    - Implement POST to /api/symptom-reports
    - Display success/error messages
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ]* 13.2 Write unit tests for SymptomReportForm component
    - Test form renders all fields
    - Test validation prevents empty submission
    - Test successful submission shows success message
    - Test failed submission shows error message
    - _Requirements: 12.2, 12.4, 12.5, 12.6_

- [~] 14. Create ClinicianDashboard component
  - [ ] 14.1 Create clinic-ui/src/components/ClinicianDashboard.jsx
    - Display prioritized list of assigned patients sorted by risk
    - Display statistics for assigned patients
    - Display active alerts for assigned patients
    - Add risk level filter for patients
    - Add patient detail view on click
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [ ] 14.2 Create clinic-ui/src/styles/ClinicianDashboard.css
    - Style patient list with risk badges
    - Style alerts list with priority indicators
    - Style statistics cards
    - Style patient detail modal
    - _Requirements: 13.2, 13.3, 13.4_

  - [ ]* 14.3 Write unit tests for ClinicianDashboard component
    - Test displays assigned patients list
    - Test displays statistics correctly
    - Test displays alerts list
    - Test risk filter works correctly
    - Test patient detail view opens on click
    - _Requirements: 13.2, 13.3, 13.4, 13.5, 13.7_

- [~] 15. Create AlertManagement component for clinicians
  - [ ] 15.1 Create clinic-ui/src/components/AlertManagement.jsx
    - Display unread alerts list with priority, patient, type, timestamp
    - Sort alerts by priority (HIGH first) then timestamp
    - Implement mark as read functionality
    - Display unread high-priority alert count
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [ ]* 15.2 Write unit tests for AlertManagement component
    - Test displays alerts sorted correctly
    - Test mark as read updates alert status
    - Test displays unread count
    - _Requirements: 14.2, 14.3, 14.5, 14.6_

- [~] 16. Create AdminDashboard component
  - [ ] 16.1 Create clinic-ui/src/components/AdminDashboard.jsx
    - Display system-wide statistics
    - Add navigation tabs for overview, users, assignments
    - Display all patients list with risk levels
    - Display all clinicians list with assignment counts
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [ ] 16.2 Create clinic-ui/src/styles/AdminDashboard.css
    - Style statistics grid
    - Style data tables
    - Style navigation tabs
    - _Requirements: 15.2, 15.6, 15.7_

  - [ ]* 16.3 Write unit tests for AdminDashboard component
    - Test displays system statistics
    - Test displays all patients table
    - Test displays all clinicians table
    - Test tab navigation works
    - _Requirements: 15.2, 15.6, 15.7_

- [~] 17. Create UserManagement component for admins
  - [ ] 17.1 Create clinic-ui/src/components/UserManagement.jsx
    - Display users list with name, email, role, creation date
    - Create user creation form with name, email, password, role
    - Create user edit form for role and profile changes
    - Add delete user with confirmation prompt
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_

  - [ ]* 17.2 Write unit tests for UserManagement component
    - Test displays users list
    - Test create user form submits correctly
    - Test edit user form works
    - Test delete shows confirmation
    - _Requirements: 16.1, 16.2, 16.5, 16.8_

- [~] 18. Create AssignmentManagement component for admins
  - [ ] 18.1 Create clinic-ui/src/components/AssignmentManagement.jsx
    - Display assignments list with patient, clinician, status, date
    - Create assignment form with patient/clinician dropdowns
    - Implement status change functionality
    - Add delete assignment with confirmation
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [ ]* 18.2 Write unit tests for AssignmentManagement component
    - Test displays assignments list
    - Test create assignment form submits correctly
    - Test status change works
    - Test delete shows confirmation
    - _Requirements: 17.1, 17.2, 17.5, 17.7_

- [~] 19. Update Navigation component with role-based menu
  - [ ] 19.1 Update clinic-ui/src/components/Navigation.jsx
    - Add RoleGuard for patient menu items (My Reports, My Clinicians)
    - Add RoleGuard for clinician menu items (My Patients, Alerts)
    - Add RoleGuard for admin menu items (Users, Assignments, All Patients)
    - Display current user's name and role
    - Add logout button that clears auth state
    - Highlight active section
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [ ]* 19.2 Write unit tests for Navigation role-based rendering
    - Test patient sees patient menu items
    - Test clinician sees clinician menu items
    - Test admin sees admin menu items
    - Test user info displays correctly
    - Test logout clears auth state
    - _Requirements: 18.1, 18.2, 18.3, 18.5, 18.6_

- [~] 20. Update App component with role-based routing
  - [ ] 20.1 Update clinic-ui/src/App.jsx
    - Add authentication state check on load
    - Route PATIENT to PatientDashboard
    - Route CLINICIAN to ClinicianDashboard
    - Route ADMIN to AdminDashboard
    - Redirect unauthorized routes to role-appropriate dashboard
    - Redirect unauthenticated users to login
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ]* 20.2 Write unit tests for App role-based routing
    - Test patient routes to PatientDashboard
    - Test clinician routes to ClinicianDashboard
    - Test admin routes to AdminDashboard
    - Test unauthenticated redirects to login
    - _Requirements: 19.1, 19.2, 19.3, 19.5_

- [~] 21. Checkpoint - Phase 2 complete
  - Ensure all frontend tests pass
  - Verify role-based routing works correctly
  - Ask the user if questions arise

### Phase 3: Integration and Testing

- [ ] 22. Create end-to-end RBAC verification tests
  - [ ] 22.1 Create backend RBAC integration tests
    - Test each role can access permitted endpoints
    - Test each role is denied access to forbidden endpoints
    - Test patient cannot access another patient's data
    - Test clinician cannot access unassigned patient's data
    - Test admin can access any endpoint
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

  - [ ] 22.2 Create frontend role switching tests
    - Test login as PATIENT displays PatientDashboard
    - Test login as CLINICIAN displays ClinicianDashboard
    - Test login as ADMIN displays AdminDashboard
    - Test switching between accounts updates UI
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

- [ ] 23. Verify security audit logging
  - [ ] 23.1 Test audit logging functionality
    - Verify access denials are logged with user ID, resource, timestamp
    - Verify authentication events are logged
    - Verify role changes are logged with admin ID, target user, old/new roles
    - Verify audit logs are retained
    - _Requirements: 23.1, 23.2, 23.3, 23.5_

- [ ] 24. Final checkpoint - All phases complete
  - Ensure all tests pass (unit, property, integration)
  - Verify end-to-end RBAC enforcement
  - Verify role-based UI rendering
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties for backend RBAC
- Unit tests validate specific examples and edge cases
- Frontend tests focus on component rendering and user interactions
- The design uses Python/FastAPI for backend and React/JavaScript for frontend
