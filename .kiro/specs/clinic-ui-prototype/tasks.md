# Implementation Plan: Clinic UI Prototype

## Overview

This implementation plan breaks down the clinic UI prototype into discrete coding tasks. The prototype is a React application that integrates with the existing FastAPI backend to display patient monitoring data, risk levels, trends, and clinical statistics. The implementation follows a bottom-up approach: build foundational modules first, then compose them into the complete dashboard.

**Implementation Language:** JavaScript (React)

**Key Technologies:**
- React 18+ (functional components with hooks)
- Plain CSS (no frameworks)
- Recharts (for data visualizations)
- Vite (for development tooling)
- Native Fetch API (for HTTP requests)

**Backend Integration:**
- FastAPI backend running on http://localhost:8000
- JWT authentication with Bearer tokens
- Endpoints: /auth/login, /auth/me, /api/dashboard/stats, /api/dashboard/prioritized-patients, /api/dashboard/patient/{id}/trend

## Tasks

- [x] 1. Set up project structure and development environment
  - Create React app with Vite: `npm create vite@latest clinic-ui -- --template react`
  - Install Recharts dependency: `npm install recharts`
  - Create folder structure: `src/components/`, `src/styles/`, `src/api/`
  - Create `.env` file with `VITE_API_URL=http://localhost:8000`
  - Create `.env.example` template file
  - Update README.md with setup instructions and backend requirements
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 2. Implement API client module with authentication
  - [x] 2.1 Create `src/api/client.js` with core HTTP functions
    - Implement `getAuthToken()` to retrieve JWT from localStorage
    - Implement `makeAuthenticatedRequest(url, options)` with Authorization header
    - Add error handling for 401 (redirect to login), 403, 404, 500, network errors
    - Add 10-second timeout handling
    - _Requirements: 12.1, 12.5, 17.1, 17.2, 17.3, 18.1, 18.2, 18.3, 21.1, 21.4_
  
  - [x] 2.2 Implement authentication functions
    - Implement `login(email, password)` - POST /auth/login
    - Implement `logout()` - clear token and redirect
    - Implement `fetchUserInfo()` - GET /auth/me
    - Store JWT token in localStorage with key "authToken"
    - _Requirements: 16.1, 16.2, 16.3, 17.4, 20.1, 20.4_
  
  - [x] 2.3 Implement dashboard data fetching functions
    - Implement `fetchDashboardStats()` - GET /api/dashboard/stats
    - Implement `fetchPrioritizedPatients(clinicianId?)` - GET /api/dashboard/prioritized-patients
    - Implement `fetchPatientTrend(patientId)` - GET /api/dashboard/patient/{patientId}/trend
    - _Requirements: 12.2, 12.4, 19.1, 19.4_
  
  - [ ]* 2.4 Write unit tests for API client functions
    - Test login with valid credentials (mock successful response)
    - Test login with invalid credentials (mock 401 response)
    - Test fetchDashboardStats with mock data
    - Test fetchPrioritizedPatients with mock patient array
    - Test token storage and retrieval
    - Test 401 handling (should clear token and redirect)
    - Test network error handling

- [x] 3. Checkpoint - Verify API client works with backend
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Build Login component and authentication flow
  - [x] 4.1 Create `src/components/Login.jsx`
    - Create functional component with email and password state
    - Add form with email input, password input, submit button
    - Implement form submission handler calling `login()` from API client
    - Add error state and display error messages below form
    - Add loading state and disable button during authentication
    - Clear error when user starts typing
    - Redirect to /dashboard on successful login
    - _Requirements: 16.1, 16.4, 16.5, 1.1, 1.4_
  
  - [x] 4.2 Create `src/styles/Login.css`
    - Style login form with medical theme colors (primary blue #2563eb)
    - Center form on page with white card background
    - Style input fields with borders and focus states
    - Style submit button with hover effects
    - Style error message area in danger red (#ef4444)
    - Add medical-themed background or logo
    - _Requirements: 2.1, 2.5, 3.1, 3.2, 14.1, 14.2, 14.3, 14.4_
  
  - [ ]* 4.3 Write unit tests for Login component
    - Test component renders form elements
    - Test error message displays on failed login
    - Test loading state during authentication
    - Test redirect on successful login

- [x] 5. Build StatsCard component
  - [x] 5.1 Create `src/components/StatsCard.jsx`
    - Create functional component accepting props: label, value, icon, color
    - Render icon or emoji
    - Render large numeric value
    - Render descriptive label
    - _Requirements: 6.2, 6.3, 6.5, 1.1, 1.4_
  
  - [x] 5.2 Create `src/styles/StatsCard.css`
    - Style card with white background and subtle shadow
    - Add colored left border based on color prop
    - Style icon with colored background circle
    - Style value with large font size
    - Add hover effect for depth
    - Use consistent spacing and alignment
    - _Requirements: 2.1, 2.5, 6.4, 14.1, 14.2, 14.4_
  
  - [ ]* 5.3 Write unit tests for StatsCard component
    - Test component renders with provided props
    - Test different color variations
    - Test with different value types (number, string)

- [x] 6. Build Navigation component
  - [x] 6.1 Create `src/components/Navigation.jsx`
    - Create functional component accepting userInfo prop
    - Render app logo/title
    - Render navigation links: Dashboard, Patients, Appointments, Reports
    - Highlight active section (Dashboard by default)
    - Display user full name and role badge
    - Add logout button calling `logout()` from API client
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 20.2, 20.3, 17.4, 1.1, 1.4_
  
  - [x] 6.2 Create `src/styles/Navigation.css`
    - Style as sidebar or topbar (visually distinct from content)
    - Style navigation links with hover effects
    - Style active link with primary blue background
    - Style user info section with role badge
    - Style logout button
    - Use medical theme colors
    - _Requirements: 2.1, 2.5, 3.1, 14.1, 14.2, 14.3_
  
  - [ ]* 6.3 Write unit tests for Navigation component
    - Test component displays user info
    - Test logout button calls logout function
    - Test active link highlighting

- [x] 7. Build PatientList component
  - [x] 7.1 Create `src/components/PatientList.jsx`
    - Create functional component accepting patients array and onPatientClick callback
    - Render scrollable list of patient cards
    - For each patient, display: name, risk level badge, trend status indicator, last report time, chronic conditions
    - Color-code risk level badges: red=HIGH, yellow=MEDIUM, green=LOW
    - Display trend indicators: ↑=IMPROVING, →=STABLE, ↓=WORSENING
    - Format last report time as relative time ("2 hours ago")
    - Parse chronicConditions from JSON array
    - Highlight selected patient
    - Call onPatientClick when patient card is clicked
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 1.1, 1.4_
  
  - [x] 7.2 Create `src/styles/PatientList.css`
    - Style scrollable container
    - Style patient cards with white background and borders
    - Style risk level badges with appropriate colors
    - Style trend indicators with arrows and colors
    - Add hover effect on patient cards
    - Highlight selected patient with border or background
    - Use consistent spacing
    - _Requirements: 2.1, 2.5, 3.1, 14.1, 14.2, 14.4_
  
  - [ ]* 7.3 Write unit tests for PatientList component
    - Test component renders patient cards
    - Test onPatientClick callback is called when patient clicked
    - Test risk level badge colors
    - Test trend status indicators

- [x] 8. Build TrendChart component with Recharts
  - [x] 8.1 Create `src/components/TrendChart.jsx`
    - Create functional component accepting patientId and patientName props
    - Add state for trendData, loading, and error
    - Fetch trend data from `fetchPatientTrend(patientId)` on mount or patientId change
    - Render Recharts LineChart with trend data
    - Configure X-axis with date/time labels
    - Configure Y-axis with risk score (0-100)
    - Use line color gradient based on risk level (green → yellow → red)
    - Add tooltip showing date, risk score, severity, symptoms
    - Add chart title with patient name
    - Display loading spinner while fetching
    - Display error message if fetch fails
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 1.1, 1.4, 18.5_
  
  - [x] 8.2 Create `src/styles/TrendChart.css`
    - Style chart container with white background
    - Style chart title
    - Style legend explaining risk levels
    - Style loading spinner
    - Style error message area
    - Use medical theme colors
    - _Requirements: 2.1, 2.5, 3.1, 14.1, 14.4_
  
  - [ ]* 8.3 Write unit tests for TrendChart component
    - Test component fetches data on mount
    - Test loading state displays correctly
    - Test error state displays correctly
    - Test chart renders with mock data

- [x] 9. Build Dashboard component and integrate all pieces
  - [x] 9.1 Create `src/components/Dashboard.jsx`
    - Create functional component with state for: stats, patients, userInfo, selectedPatient, loading, error
    - Fetch dashboard stats, prioritized patients, and user info on mount
    - Render Navigation component with userInfo
    - Render 3+ StatsCard components with stats data (totalPatients, appointmentsToday, highRiskAlerts)
    - Render PatientList component with patients data
    - Render TrendChart component when patient is selected
    - Handle loading state with spinner or skeleton UI
    - Handle error state with error message and retry button
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 19.1, 19.2, 19.3, 19.4, 19.5, 20.1, 1.1, 1.4, 18.5_
  
  - [x] 9.2 Create `src/styles/Dashboard.css`
    - Use CSS Grid for main dashboard layout
    - Position Navigation component (sidebar or topbar)
    - Create grid areas for stats cards, patient list, and chart section
    - Use flexible layouts (avoid fixed pixel widths)
    - Add consistent spacing between sections
    - Use background color #f8fafc (light gray)
    - _Requirements: 2.1, 2.5, 3.1, 13.1, 13.2, 13.4, 14.1_
  
  - [ ]* 9.3 Write integration tests for Dashboard component
    - Test dashboard fetches all data on mount
    - Test stats cards display correct values
    - Test patient list displays patients
    - Test patient selection triggers trend chart
    - Test error handling for failed data fetches

- [x] 10. Create main App component with routing logic
  - [x] 10.1 Create or update `src/App.jsx`
    - Add state for authentication status (check for token in localStorage)
    - Implement simple routing: show Login if not authenticated, show Dashboard if authenticated
    - Verify token presence before rendering Dashboard
    - _Requirements: 16.5, 17.5, 1.1, 1.4_
  
  - [x] 10.2 Create `src/styles/App.css`
    - Add global styles (reset, fonts, base colors)
    - Define CSS variables for color palette (primary blue, success green, warning yellow, danger red, neutral grays)
    - Set base font family and sizes
    - _Requirements: 2.1, 2.5, 3.1, 14.3_

- [x] 11. Checkpoint - Test complete authentication and dashboard flow
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Add error handling and loading states
  - [x] 12.1 Add error boundary component
    - Create error boundary wrapper for App component
    - Display fallback UI: "Something went wrong. Please refresh the page."
    - Log errors to console
    - _Requirements: 18.1, 18.3_
  
  - [x] 12.2 Enhance error messages throughout application
    - Add specific error messages for network errors: "Unable to connect to server. Please check that the backend is running on http://localhost:8000"
    - Add specific error messages for 401: "Session expired, please log in again"
    - Add specific error messages for 403: "You don't have permission to access this resource"
    - Add specific error messages for 404: "Resource not found"
    - Add specific error messages for 500: "Server error, please try again later"
    - Add specific error messages for timeout: "Request timed out, please try again"
    - Add specific error messages for CORS: "Connection blocked. Please check backend CORS settings."
    - _Requirements: 18.1, 18.2, 21.1, 21.2, 21.3, 21.4, 21.5_
  
  - [x] 12.3 Add loading states to all async operations
    - Add loading spinner to Login component during authentication
    - Add loading spinner to Dashboard component during initial data fetch
    - Add loading spinner to TrendChart component during trend data fetch
    - Disable interactive elements during loading
    - _Requirements: 18.5_

- [x] 13. Visual polish and final styling
  - [x] 13.1 Add smooth transitions and hover effects
    - Add hover effects to all interactive elements (buttons, cards, links)
    - Add smooth transitions for state changes
    - Add subtle shadows for depth
    - _Requirements: 14.2, 14.4_
  
  - [x] 13.2 Ensure consistent spacing and alignment
    - Review all components for consistent padding and margins
    - Ensure all text is properly aligned
    - Ensure all cards and sections have consistent spacing
    - _Requirements: 14.1_
  
  - [x] 13.3 Verify color palette consistency
    - Ensure all components use colors from defined palette
    - Verify risk level colors are consistent (red=HIGH, yellow=MEDIUM, green=LOW)
    - Verify medical theme is consistent throughout
    - _Requirements: 3.1, 3.2, 14.3_
  
  - [x] 13.4 Add medical iconography
    - Add icons or symbols to stats cards
    - Add medical-themed logo or branding
    - Ensure icons are consistent with medical aesthetic
    - _Requirements: 3.3, 6.5_

- [x] 14. Final testing with real backend
  - [x] 14.1 Test authentication flow with real backend
    - Test login with valid clinician credentials
    - Test login with invalid credentials
    - Test logout functionality
    - Test token expiration handling
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 17.3, 17.4_
  
  - [x] 14.2 Test dashboard data integration with real backend
    - Verify stats cards display real data from /api/dashboard/stats
    - Verify patient list displays real data from /api/dashboard/prioritized-patients
    - Verify trend chart displays real data from /api/dashboard/patient/{id}/trend
    - Verify user info displays correctly from /auth/me
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 19.1, 19.2, 19.3, 19.4, 20.1, 20.2, 20.3_
  
  - [x] 14.3 Test error scenarios
    - Test with backend server stopped (should show connection error)
    - Test with invalid token (should redirect to login)
    - Test with network timeout
    - Test with CORS errors (if applicable)
    - _Requirements: 18.1, 18.2, 18.3, 21.1, 21.2, 21.3, 21.4_
  
  - [x] 14.4 Test visual design and responsiveness
    - Verify layout looks good on desktop (1280px and above)
    - Verify layout is usable on tablet (768px - 1279px)
    - Verify all colors match medical theme
    - Verify all spacing and alignment is consistent
    - Verify all hover effects work smoothly
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 13.1, 13.2, 13.4, 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 15. Final checkpoint - Complete prototype ready for demonstration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The implementation follows a bottom-up approach: build foundational modules first (API client), then individual components, then compose into complete dashboard
- All components use React functional components with minimal hooks (useState, useEffect only)
- All styling uses plain CSS files (no frameworks, preprocessors, or CSS-in-JS)
- Backend integration assumes FastAPI server running on http://localhost:8000
- JWT tokens are stored in localStorage with key "authToken"
- Error handling is comprehensive with specific messages for different error types
- Visual design follows medical/clinical theme with professional color palette
- Testing strategy focuses on integration tests and manual testing (property-based testing not applicable for UI rendering)

## Backend Setup Requirements

Before starting implementation, ensure the FastAPI backend is running:

1. Backend server must be running on http://localhost:8000
2. Backend must have CORS configured to allow http://localhost:5173 (Vite default port)
3. Backend must have the following endpoints available:
   - POST /auth/login
   - GET /auth/me
   - GET /api/dashboard/stats
   - GET /api/dashboard/prioritized-patients
   - GET /api/dashboard/patient/{patientId}/trend
4. Backend must support JWT authentication with Bearer tokens
5. Test credentials should be available (e.g., clinician@example.com)

## Development Workflow

1. Start backend server: `cd <backend-directory> && uvicorn main:app --reload`
2. Start frontend dev server: `cd clinic-ui && npm run dev`
3. Open browser to http://localhost:5173
4. Log in with test credentials
5. Verify all dashboard features work with real backend data

## Success Criteria

The implementation is complete when:

- ✅ User can log in with valid credentials
- ✅ Dashboard displays real statistics from backend
- ✅ Patient list shows prioritized patients with risk levels and trends
- ✅ Clicking a patient displays their trend chart
- ✅ All components use React functional components only
- ✅ All styling uses plain CSS files only
- ✅ Visual design follows medical/clinical theme
- ✅ Error handling provides clear feedback for all failure scenarios
- ✅ Backend integration works seamlessly with JWT authentication
- ✅ Code is simple, readable, and beginner-friendly
