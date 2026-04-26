# Clinic Dashboard UI

A modern, role-based clinic dashboard built with React and Vite. The application provides different dashboard views based on user roles: **PATIENT**, **CLINICIAN**, and **ADMIN**.

## Features

### Role-Based Dashboards

#### Patient Dashboard
- Personal health statistics (current risk level, reports submitted, days tracked)
- Recent symptom reports with risk levels
- Assigned clinician information
- Personal risk trend visualization

#### Clinician Dashboard
- Overview of assigned patients
- Pending alerts and reviews
- Today's appointment schedule
- High-risk patient alerts
- Quick access to patient lists

#### Admin Dashboard
- System-wide statistics (total users, active patients, clinicians)
- User management table with role badges
- Recent activity logs
- System health monitoring (API status, database, uptime)
- Quick action buttons for common admin tasks

### Common Features
- Secure JWT authentication
- Responsive design for all screen sizes
- Real-time data fetching from backend API
- Loading and error states with retry functionality
- Consistent navigation sidebar with user info display
- Color-coded risk levels and status indicators

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Recharts** - Data visualization
- **CSS3** - Styling with responsive design

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8000` (or configure via environment variable)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file (optional, defaults to localhost:8000):
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## API Integration

The application integrates with the following backend endpoints:

### Authentication
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info

### Patient Endpoints
- `GET /api/patients/{id}/stats` - Patient statistics
- `GET /api/patients/{id}/reports` - Patient reports
- `GET /api/patients/{id}/clinician` - Assigned clinician
- `GET /api/dashboard/patient/{id}/trend` - Risk trend data

### Clinician Endpoints
- `GET /api/clinicians/{id}/stats` - Clinician statistics
- `GET /api/clinicians/{id}/patients` - Assigned patients
- `GET /api/clinicians/{id}/alerts` - Pending alerts
- `GET /api/clinicians/{id}/appointments/today` - Today's appointments

### Admin Endpoints
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - User list
- `GET /api/admin/activity-logs` - Activity logs
- `GET /api/admin/system-health` - System health status

## Project Structure

```
clinic-ui/
├── src/
│   ├── api/
│   │   └── client.js          # API client with auth handling
│   ├── components/
│   │   ├── App.jsx            # Root component with role-based routing
│   │   ├── Login.jsx          # Login page
│   │   ├── Dashboard.jsx      # Default dashboard (fallback)
│   │   ├── PatientDashboard.jsx    # Patient-specific view
│   │   ├── ClinicianDashboard.jsx  # Clinician-specific view
│   │   ├── AdminDashboard.jsx      # Admin-specific view
│   │   ├── Navigation.jsx     # Sidebar navigation
│   │   ├── StatsCard.jsx      # Statistics card component
│   │   ├── PatientList.jsx    # Patient list component
│   │   └── TrendChart.jsx     # Risk trend chart
│   ├── styles/
│   │   ├── Dashboard.css      # Base dashboard styles
│   │   ├── PatientDashboard.css
│   │   ├── ClinicianDashboard.css
│   │   ├── AdminDashboard.css
│   │   ├── Login.css
│   │   ├── Navigation.css
│   │   ├── PatientList.css
│   │   ├── StatsCard.css
│   │   └── TrendChart.css
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── public/
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## User Roles

The application supports three user types:

| Role | Dashboard | Key Features |
|------|-----------|--------------|
| **PATIENT** | PatientDashboard | View personal health data, submit reports, see assigned clinician |
| **CLINICIAN** | ClinicianDashboard | Manage assigned patients, review alerts, view appointments |
| **ADMIN** | AdminDashboard | System oversight, user management, activity monitoring |

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000` |

## License

Private - For clinic use only
