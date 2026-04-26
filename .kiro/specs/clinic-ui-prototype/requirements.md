# Requirements Document

## Introduction

This document defines the requirements for a clinic-themed UI prototype built with React and plain CSS. The prototype integrates with an existing FastAPI backend to display real patient monitoring data, including risk levels, trends, and clinical statistics. The UI implements role-based access control, rendering different dashboards and navigation options based on user role (PATIENT, CLINICIAN, ADMIN). The goal is visual impressiveness, code simplicity, and proper role-based functionality while demonstrating actual system functionality through backend integration.

## Glossary

- **UI_Prototype**: The React-based user interface application
- **Backend_API**: The existing FastAPI backend server running on localhost:8000
- **Dashboard**: The main view displaying role-appropriate statistics, charts, and data
- **Navigation_Component**: The sidebar or topbar used for navigating between sections
- **Stats_Card**: A visual component displaying a single metric (e.g., total patients, appointments today)
- **Chart_Section**: An area displaying visual data using Recharts library
- **Patient_List**: A component showing prioritized patients with risk levels and trends
- **Plain_CSS**: Standard CSS files without preprocessors, frameworks, or CSS-in-JS libraries
- **Functional_Component**: React component defined as a function (not a class)
- **Recharts**: A React charting library for displaying data visualizations
- **JWT_Token**: JSON Web Token used for authentication with the Backend_API
- **API_Client**: JavaScript module responsible for making HTTP requests to Backend_API
- **Role**: A classification determining user permissions: PATIENT, CLINICIAN, or ADMIN
- **Role_Guard**: A component that conditionally renders UI elements based on user role
- **Patient_Dashboard**: Dashboard view for PATIENT role users showing personal health data
- **Clinician_Dashboard**: Dashboard view for CLINICIAN role users showing assigned patients and alerts
- **Admin_Dashboard**: Dashboard view for ADMIN role users showing system-wide metrics and user management

## Requirements

### Requirement 1: React-Only Implementation

**User Story:** As a developer, I want the UI built with React functional components only, so that the codebase remains simple and beginner-friendly.

#### Acceptance Criteria

1. THE UI_Prototype SHALL use React functional components exclusively
2. THE UI_Prototype SHALL NOT use class components
3. THE UI_Prototype SHALL NOT use advanced React patterns (complex custom hooks, render props, HOCs)
4. THE UI_Prototype SHALL use only core React hooks (useState, useEffect) when necessary
5. THE UI_Prototype SHALL NOT include state management libraries (Redux, Zustand, Context API beyond basic usage)

### Requirement 2: Plain CSS Styling

**User Story:** As a developer, I want all styling done with plain CSS files, so that the code is easy to understand without learning additional tools.

#### Acceptance Criteria

1. THE UI_Prototype SHALL use plain CSS files for all styling
2. THE UI_Prototype SHALL NOT use CSS frameworks (Tailwind, Bootstrap, Material-UI)
3. THE UI_Prototype SHALL NOT use CSS-in-JS libraries (styled-components, emotion)
4. THE UI_Prototype SHALL NOT use CSS preprocessors (SASS, LESS)
5. THE UI_Prototype SHALL organize styles in separate .css files imported into components

### Requirement 3: Medical Dashboard Theme

**User Story:** As a stakeholder, I want a clean, modern medical dashboard interface, so that the prototype feels realistic for healthcare systems.

#### Acceptance Criteria

1. THE UI_Prototype SHALL use a medical/clinical color scheme (whites, blues, greens, subtle grays)
2. THE UI_Prototype SHALL display a professional healthcare aesthetic
3. THE UI_Prototype SHALL include medical-relevant iconography or symbols
4. THE UI_Prototype SHALL feel modern and slightly futuristic while remaining realistic
5. THE UI_Prototype SHALL NOT use overly playful or consumer-app styling

### Requirement 4: Dashboard Layout Structure

**User Story:** As a user, I want a complete dashboard layout with multiple sections appropriate to my role, so that I can see various aspects of the system relevant to me.

#### Acceptance Criteria

1. THE UI_Prototype SHALL include a Navigation_Component (sidebar or topbar)
2. THE UI_Prototype SHALL include at least three Stats_Cards displaying key metrics
3. THE UI_Prototype SHALL include a Chart_Section with at least one data visualization
4. THE UI_Prototype SHALL organize sections in a clear, scannable layout
5. THE Dashboard layout SHALL adapt based on user role (PATIENT, CLINICIAN, ADMIN)

### Requirement 5: Navigation Component

**User Story:** As a user, I want navigation options appropriate to my role, so that I can access features relevant to my responsibilities.

#### Acceptance Criteria

1. THE Navigation_Component SHALL display navigation links or menu items based on user role
2. WHEN a navigation item is clicked, THE UI_Prototype SHALL highlight the active section
3. THE Navigation_Component SHALL be visually distinct from content areas
4. THE Navigation_Component SHALL display role-appropriate navigation options:
   - PATIENT: Dashboard, My Reports, My Clinicians
   - CLINICIAN: Dashboard, My Patients, Alerts
   - ADMIN: Dashboard, Users, Assignments, All Patients
5. THE Navigation_Component SHALL remain visible while navigating between sections
6. THE Navigation_Component SHALL display the current user's name and role
7. THE Navigation_Component SHALL provide a logout button that clears authentication state

### Requirement 6: Role-Based Statistics Cards

**User Story:** As a user, I want to see key metrics at a glance relevant to my role, so that I can quickly assess the information important to me.

#### Acceptance Criteria

1. THE Dashboard SHALL display at least three Stats_Cards
2. EACH Stats_Card SHALL display a metric label and numeric value
3. THE Stats_Cards SHALL display role-appropriate metrics:
   - PATIENT: My Reports, My Risk Level, My Trend Status
   - CLINICIAN: Total Assigned Patients, High Risk Count, Recent Reports
   - ADMIN: Total Users, Total Patients, Total Clinicians, Active Assignments
4. THE Stats_Cards SHALL be visually distinct and easy to scan
5. THE Stats_Cards SHALL use appropriate icons or visual indicators

### Requirement 7: Chart Visualization

**User Story:** As a user, I want to see data trends in charts relevant to my role, so that I can understand patterns over time.

#### Acceptance Criteria

1. THE Chart_Section SHALL use the Recharts library for data visualization
2. THE Chart_Section SHALL display at least one chart (line chart, bar chart, or area chart)
3. THE Chart_Section SHALL fetch role-appropriate data from Backend_API endpoints:
   - PATIENT: Personal trend data from `/api/dashboard/patient/me/trend`
   - CLINICIAN: Aggregated patient trend data for assigned patients
   - ADMIN: System-wide metrics and trends
4. THE Chart_Section SHALL include axis labels and a title
5. THE Chart_Section SHALL use colors consistent with the medical theme

### Requirement 8: Patient Prioritization View (Clinician/Admin Only)

**User Story:** As a clinician or admin, I want to see prioritized patients with risk levels and trends, so that I can focus on those who need immediate attention.

#### Acceptance Criteria

1. THE Clinician_Dashboard and Admin_Dashboard SHALL include a Patient_List component
2. THE Patient_List SHALL fetch data from the Backend_API endpoint `/api/dashboard/prioritized-patients`
3. EACH patient entry SHALL display patient name, risk level, trend status, and last report time
4. THE Patient_List SHALL visually distinguish HIGH risk patients from MEDIUM and LOW risk patients
5. THE Patient_List SHALL visually distinguish WORSENING trend patients from STABLE and IMPROVING patients
6. FOR CLINICIAN role, THE Patient_List SHALL show only patients assigned to that clinician
7. FOR ADMIN role, THE Patient_List SHALL show all patients

### Requirement 9: Code Simplicity and Readability

**User Story:** As a developer, I want the code to be simple and readable, so that beginners can understand and reconstruct it easily.

#### Acceptance Criteria

1. THE UI_Prototype SHALL avoid unnecessary abstractions or folder structures
2. THE UI_Prototype SHALL use clear, descriptive variable and component names
3. THE UI_Prototype SHALL include comments explaining non-obvious code sections
4. THE UI_Prototype SHALL NOT split components into excessive files unless necessary for clarity
5. THE UI_Prototype SHALL prioritize code clarity over optimization

### Requirement 10: Allowed Libraries

**User Story:** As a developer, I want to use only approved libraries, so that the project remains lightweight and focused.

#### Acceptance Criteria

1. THE UI_Prototype SHALL use React (core library only)
2. THE UI_Prototype SHALL use Recharts for chart visualizations
3. THE UI_Prototype SHALL optionally use Three.js only for lightweight background decoration
4. THE UI_Prototype SHALL NOT include any other third-party UI libraries
5. THE UI_Prototype SHALL use browser's native fetch API or axios for HTTP requests

### Requirement 11: Project Structure

**User Story:** As a developer, I want a simple project structure, so that I can navigate the codebase without confusion.

#### Acceptance Criteria

1. THE UI_Prototype SHALL organize components in a single components folder or inline in App.js
2. THE UI_Prototype SHALL organize CSS files alongside their components or in a single styles folder
3. THE UI_Prototype SHALL NOT create deeply nested folder hierarchures
4. THE UI_Prototype SHALL include a clear entry point (App.js or index.js)
5. THE UI_Prototype SHALL include a package.json with minimal dependencies

### Requirement 12: Backend Integration

**User Story:** As a developer, I want the UI to fetch real data from the existing FastAPI backend, so that the prototype demonstrates actual system functionality.

#### Acceptance Criteria

1. THE UI_Prototype SHALL communicate with the Backend_API running on http://localhost:8000
2. THE UI_Prototype SHALL fetch dashboard statistics from `/api/dashboard/stats`
3. THE UI_Prototype SHALL fetch recent activity from `/api/dashboard/recent-activity`
4. THE UI_Prototype SHALL fetch prioritized patients from `/api/dashboard/prioritized-patients`
5. THE UI_Prototype SHALL include JWT_Token in Authorization header for authenticated requests

### Requirement 13: Responsive Layout (Optional)

**User Story:** As a user, I want the dashboard to look reasonable on different screen sizes, so that I can view it on various devices.

#### Acceptance Criteria

1. THE UI_Prototype SHOULD use flexible layouts (flexbox or grid) for main sections
2. THE UI_Prototype SHOULD avoid fixed pixel widths where possible
3. THE UI_Prototype MAY include basic media queries for mobile/tablet views
4. THE UI_Prototype SHALL prioritize desktop view as the primary target
5. THE UI_Prototype SHALL NOT require full mobile optimization

### Requirement 14: Visual Polish

**User Story:** As a stakeholder, I want the UI to look polished and impressive, so that it can be used for pitching or demonstrations.

#### Acceptance Criteria

1. THE UI_Prototype SHALL use consistent spacing and alignment throughout
2. THE UI_Prototype SHALL use smooth transitions or hover effects where appropriate
3. THE UI_Prototype SHALL use a cohesive color palette
4. THE UI_Prototype SHALL include subtle shadows or borders for depth
5. THE UI_Prototype SHALL feel complete and intentional, not rushed or placeholder-like

### Requirement 15: Development Setup

**User Story:** As a developer, I want a simple development setup, so that I can run the prototype quickly.

#### Acceptance Criteria

1. THE UI_Prototype SHALL be created using Create React App or Vite
2. THE UI_Prototype SHALL include a README with setup instructions
3. THE UI_Prototype SHALL run with a single command (npm start or npm run dev)
4. THE UI_Prototype SHALL include a .env file for configuring the Backend_API URL
5. THE UI_Prototype SHALL default to http://localhost:8000 for the Backend_API URL

### Requirement 16: Authentication Flow

**User Story:** As a user, I want to log in with my credentials, so that I can access the dashboard with my role-specific permissions.

#### Acceptance Criteria

1. THE UI_Prototype SHALL include a login page with email and password fields
2. WHEN valid credentials are submitted, THE UI_Prototype SHALL send a POST request to `/auth/login`
3. WHEN authentication succeeds, THE UI_Prototype SHALL store the JWT_Token in browser storage
4. WHEN authentication fails, THE UI_Prototype SHALL display an error message
5. THE UI_Prototype SHALL redirect authenticated users to the Dashboard

### Requirement 17: Token Management

**User Story:** As a developer, I want JWT tokens managed automatically, so that authenticated requests work seamlessly.

#### Acceptance Criteria

1. THE API_Client SHALL retrieve the JWT_Token from browser storage before making authenticated requests
2. THE API_Client SHALL include the JWT_Token in the Authorization header as "Bearer {token}"
3. WHEN a request returns 401 Unauthorized, THE UI_Prototype SHALL redirect to the login page
4. THE UI_Prototype SHALL include a logout function that clears the JWT_Token
5. THE UI_Prototype SHALL verify token presence before rendering protected routes

### Requirement 18: Error Handling for API Calls

**User Story:** As a user, I want clear feedback when API requests fail, so that I understand what went wrong.

#### Acceptance Criteria

1. WHEN an API request fails, THE UI_Prototype SHALL display an error message to the user
2. THE UI_Prototype SHALL distinguish between network errors and server errors
3. THE UI_Prototype SHALL log API errors to the browser console for debugging
4. THE UI_Prototype SHALL provide retry functionality for failed requests where appropriate
5. THE UI_Prototype SHALL display loading states while API requests are in progress

### Requirement 19: Dashboard Data Integration

**User Story:** As a clinician, I want the dashboard to display real-time data from the backend, so that I see accurate patient information.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE UI_Prototype SHALL fetch statistics from `/api/dashboard/stats`
2. THE Stats_Cards SHALL display values from the Backend_API response (totalPatients, appointmentsToday, highRiskAlerts, etc.)
3. THE Chart_Section SHALL fetch and display data from Backend_API endpoints
4. THE Patient_List SHALL fetch and display prioritized patients from `/api/dashboard/prioritized-patients`
5. THE UI_Prototype SHALL refresh dashboard data when the user navigates back to the Dashboard

### Requirement 20: User Info Display

**User Story:** As a user, I want to see my name and role in the UI, so that I know which account I'm logged in as.

#### Acceptance Criteria

1. WHEN authenticated, THE UI_Prototype SHALL fetch user info from `/auth/me`
2. THE Navigation_Component SHALL display the current user's full name
3. THE Navigation_Component SHALL display the current user's role (PATIENT, CLINICIAN, ADMIN)
4. THE UI_Prototype SHALL fetch user info once after login and cache it
5. THE UI_Prototype SHALL clear cached user info on logout

### Requirement 21: Backend Connectivity

**User Story:** As a developer, I want the UI to handle backend connectivity gracefully, so that users understand when the backend is unavailable.

#### Acceptance Criteria

1. WHEN the Backend_API is unreachable, THE UI_Prototype SHALL display a connection error message
2. THE UI_Prototype SHALL verify backend connectivity before attempting authentication
3. THE UI_Prototype SHALL provide clear instructions if the backend server is not running
4. THE UI_Prototype SHALL handle CORS errors gracefully with helpful error messages
5. THE UI_Prototype SHALL include backend URL configuration in the README setup instructions

