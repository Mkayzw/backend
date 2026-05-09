# CHAPTER 4: ANALYSIS AND DESIGN

## 4.1 Introduction

This chapter explains how the telemedicine platform was analysed and designed before (and during) implementation. It describes the problem domain, the main user requirements, the system components, and the overall architecture. Diagrams are included to show how the system works from a user and technical perspective.

The system is a web-based remote symptom monitoring platform. Patients submit symptom reports through a web interface, and clinicians review patient status, trends, and alerts through a dashboard. The backend processes symptom reports using a rule-based alert engine (risk classification and trend analysis) and stores all data in a database.

## 4.2 Detailed Analysis of the Problem Domain and User Requirements

### 4.2.1 Functional Requirements

The following functional requirements describe what the system must do.

**Authentication and Access Control**

- The system must allow users to register and log in.
- The system must support role-based access (Patient, Clinician, Admin).
- The system must protect pages and endpoints so users only see what they are allowed to see.

**Patient Features**

- A patient must be able to submit a symptom report (symptoms, severity, duration, frequency, and optional vitals).
- A patient must be able to view their own submitted reports and current status (risk and trend).
- A patient must be able to view alerts related to their reports.

**Clinician Features**

- A clinician must be able to view assigned patients.
- A clinician must be able to review symptom reports submitted by assigned patients.
- A clinician must be able to view patient risk level and trend status.
- A clinician must be able to view alerts and mark alerts as read.

**Administrator Features**

- An admin must be able to manage users (basic platform administration).
- An admin must be able to manage patient-clinician assignments.
- An admin must be able to view system metrics (high level monitoring).

**Clinical Intelligence (Alert Engine)**

- The system must classify risk level for each symptom report using predefined rules.
- The system must analyse patient trends using recent report history.
- The system must generate alerts when risk is high or when trend is worsening.
- The system must store explanations (reasoning trail) with reports and alerts.

### 4.2.2 Non-functional Requirements

The following non-functional requirements describe quality and constraints.

**Usability**

- The system should be easy to use for patients and clinicians with clear dashboards and simple workflows.
- The interface should present risk/trend results clearly using badges, indicators, and alerts.

**Performance**

- The system should respond quickly to user actions such as submitting a symptom report and loading dashboards.
- Backend risk and trend processing should be fast enough to run during report submission.

**Security**

- The system should use secure authentication and role-based authorization.
- Sensitive clinical data should be processed on the server and only displayed to authorized users.

**Reliability**

- The system should store reports and alerts reliably in the database.
- The system should handle invalid input gracefully and return clear errors.

**Maintainability**

- The system should be modular (frontend components and backend services separated) so it is easier to update and extend.

## 4.3 Identification of System Components and Functionalities

The system can be understood as four main layers:

1. **Frontend layer**: Web user interface (Patient, Clinician, Admin dashboards).
2. **Backend layer**: FastAPI routes/controllers/services implementing business logic.
3. **Clinical intelligence layer**: Risk classification, trend analysis, and alert generation.
4. **Data layer**: PostgreSQL database accessed using Prisma ORM.

### 4.3.1 Use-Case Diagram/s

The use-case diagram below shows the main user roles (Patient, Clinician, Administrator) and the core system actions.

```mermaid
usecase
    actor Patient
    actor Clinician
    actor Administrator
    actor System
    
    usecase UC1 as "Register/Login"
    usecase UC2 as "Submit Symptom Report"
    usecase UC3 as "View Own Health Data"
    usecase UC4 as "Receive Alerts"
    
    usecase UC5 as "View Assigned Patients"
    usecase UC6 as "Review Symptom Reports"
    usecase UC7 as "Send Alerts"
    usecase UC8 as "Track Patient Trends"
    usecase UC9 as "View Metrics"
    
    usecase UC10 as "Manage Users"
    usecase UC11 as "Manage Assignments"
    usecase UC12 as "System Configuration"
    usecase UC13 as "View System Metrics"
    
    usecase UC14 as "Classify Risk"
    usecase UC15 as "Analyze Trends"
    usecase UC16 as "Generate Alerts"
    usecase UC17 as "Persist Data"
    
    Patient --> UC1
    Patient --> UC2
    Patient --> UC3
    Patient --> UC4
    
    Clinician --> UC1
    Clinician --> UC5
    Clinician --> UC6
    Clinician --> UC7
    Clinician --> UC8
    Clinician --> UC9
    
    Administrator --> UC1
    Administrator --> UC10
    Administrator --> UC11
    Administrator --> UC12
    Administrator --> UC13
    
    System --> UC14
    System --> UC15
    System --> UC16
    System --> UC17
    
    UC2 ..> UC14: triggers
    UC2 ..> UC15: triggers
    UC14 ..> UC16: triggers
    UC16 ..> UC4: notifies
    UC16 ..> UC7: notifies
    
    UC2 ..> UC17: persists
    UC11 ..> UC17: persists
```

### 4.3.2 Sequence Diagram

The sequence diagram below shows the typical flow when a patient submits a symptom report.

```mermaid
sequenceDiagram
    actor Patient
    participant Frontend as React Frontend
    participant Controller as SymptomReport<br/>Controller
    participant Service as SymptomReport<br/>Service
    participant RiskSvc as Risk<br/>Classification
    participant TrendSvc as Trend<br/>Analysis
    participant AlertSvc as Alert<br/>Service
    participant DB as Database<br/>Prisma/PG
    participant Clinician
    
    Patient->>Frontend: Fill & Submit<br/>Symptom Form
    Frontend->>Frontend: Validate Input
    Frontend->>Controller: POST /symptom-reports<br/>(symptoms, vitals, etc.)
    
    Controller->>Service: processSymptomReport(data)
    
    Service->>DB: Query Patient<br/>Chronic Conditions
    DB-->>Service: Patient Data
    
    Service->>RiskSvc: calculateRisk(symptoms,<br/>severity, vitals,<br/>chronic_conditions)
    
    RiskSvc->>RiskSvc: Apply Rules
    RiskSvc-->>Service: riskScore, riskLevel
    
    Service->>DB: Query Previous<br/>Reports
    DB-->>Service: Last Reports
    
    Service->>TrendSvc: analyzeTrend(current_score,<br/>previous_scores)
    
    TrendSvc->>TrendSvc: Apply Trend Rules
    TrendSvc-->>Service: trendStatus
    
    Service->>AlertSvc: shouldGenerateAlert(riskLevel,<br/>trendStatus)
    AlertSvc-->>Service: needsAlert=true/false
    
    alt Need Alert
        Service->>DB: Create SymptomReport
        Service->>DB: Create Alert Record
        Service->>DB: Update Patient Fields
        DB-->>Service: Confirmed
        Service-->>Controller: Report + Alert Created
        Controller-->>Frontend: 201 Created
        Frontend->>Patient: Display Success
        DB->>Clinician: Alert available
    else No Alert Needed
        Service->>DB: Create SymptomReport
        Service->>DB: Update Patient Fields
        DB-->>Service: Confirmed
        Service-->>Controller: Report Created
        Controller-->>Frontend: 201 Created
        Frontend->>Patient: Display Success
    end
```

## 4.4 System Architecture and Design Considerations

This section explains the high-level architecture and important design decisions.

### 4.4.1 Context Diagram and DFD Diagram

The context diagram below shows the system boundary and the main external users.

```mermaid
flowchart LR
    Patient[Patient] -->|Submit symptom report| UI[Web Frontend]
    Clinician[Clinician] -->|Review alerts & patients| UI
    Admin[Administrator] -->|Manage users/assignments| UI

    UI -->|API requests| API[Backend API]
    API -->|Read/Write| DB[(PostgreSQL Database)]

    API -->|Return risk/trend/alerts| UI
```

A simple data flow (DFD-style) view is shown below.

```mermaid
flowchart TD
    P1[Patient] --> D1[1. Submit Report Form]
    D1 --> P2[2. Backend API Receives Report]
    P2 --> D2[(Database: SymptomReport)]
    P2 --> P3[3. Risk Classification Rules]
    P3 --> P4[4. Trend Analysis Rules]
    P4 --> D3[(Database: Patient Status)]
    P4 --> P5{5. Alert Needed?}
    P5 -->|Yes| D4[(Database: Alert)]
    P5 -->|No| End1[End]
    D4 --> C1[Clinician Dashboard Shows Alert]
```

### 4.4.2 Architectural Design

The platform uses a typical web architecture with a separate frontend and backend:

- The **frontend** is a React application with pages for each role.
- The **backend** is a FastAPI application that exposes REST endpoints.
- The **service layer** contains the business logic and clinical rules.
- The **database** stores users, patients, clinicians, assignments, symptom reports, alerts, and metrics.

High-level architecture overview:

```mermaid
graph TB
    subgraph Client["Frontend Layer (React)"]
        LP["Login Page"]
        SP["Signup Page"]
        PD["Patient Dashboard"]
        CD["Clinician Dashboard"]
        AD["Admin Dashboard"]
    end

    subgraph API["Backend Layer (FastAPI)"]
        Routes["Routes Layer"]
        Controllers["Controllers"]
        Services["Services"]
        Schemas["Schemas"]
    end

    subgraph DB["Data Layer"]
        Prisma["Prisma ORM"]
        PostgreSQL["PostgreSQL"]
    end

    Client -->|HTTP| Routes
    Routes --> Controllers
    Controllers --> Services
    Controllers --> Schemas
    Services --> Prisma
    Prisma --> PostgreSQL
```

### 4.4.3 Physical Design

The physical design describes where the system runs:

- The frontend runs in a web browser on the user device (patient/clinician/admin).
- The backend runs on a server (or local machine during development).
- The database runs as a PostgreSQL instance.

In development, the frontend typically runs on a local dev server and sends requests to the backend API address (for example `http://localhost:8000`).

### 4.4.4 Database Design

The database design is defined using Prisma in `schema.prisma`. The main entities are:

- `User`: login identity and role (PATIENT, CLINICIAN, ADMIN)
- `Patient`: patient profile and current monitoring status
- `Clinician`: clinician profile
- `Assignment`: links a clinician to a patient and stores care context
- `SymptomReport`: structured symptom report plus computed risk results
- `Alert`: alert records triggered by high risk or worsening trends
- `PerformanceMetric`: system performance logs

Entity Relationship Diagram (based on `schema.prisma`):

```mermaid
erDiagram
    USER ||--o| PATIENT : has
    USER ||--o| CLINICIAN : has
    PATIENT ||--o{ ASSIGNMENT : assigned
    CLINICIAN ||--o{ ASSIGNMENT : manages
    PATIENT ||--o{ SYMPTOM_REPORT : submits
    PATIENT ||--o{ ALERT : receives
    SYMPTOM_REPORT ||--o{ ALERT : triggers

    USER {
        Int id PK
        String email UK
        String password
        Role role
    }

    PATIENT {
        Int id PK
        Int userId FK
        String emergencyContact
        String chronicConditions
        RiskLevel currentRiskLevel
        TrendStatus currentTrendStatus
    }

    CLINICIAN {
        Int id PK
        Int userId FK
        String fullName
        String specialization
    }

    ASSIGNMENT {
        Int id PK
        Int clinicianId FK
        Int patientId FK
        AssignmentStatus status
        CareContext careContext
    }

    SYMPTOM_REPORT {
        Int id PK
        Int patientId FK
        Severity severity
        Frequency frequency
        RiskLevel riskLevel
        Float riskScore
    }

    ALERT {
        Int id PK
        Int patientId FK
        Int symptomReportId FK
        AlertPriority priority
        String alertType
        Boolean isRead
    }
```

### 4.4.5 Interface Design

#### 4.4.5.1 Menu Design

The frontend uses a sidebar navigation layout. Menu items change based on the user role:

- Patients see options related to submitting reports and viewing their status.
- Clinicians see options related to patients, alerts, and trends.
- Admins see options related to user management, assignments, and system monitoring.

#### 4.4.5.2 Input Design

Main inputs in the system include:

- Signup/login forms (email, password, role information).
- Symptom report form (symptoms, severity, duration, frequency, and optional vitals).
- Clinician/admin forms for creating assignments or updating user records.

Input validation is done on both sides:

- frontend performs basic checks before sending data,
- backend validates using schemas and returns errors when input is invalid.

#### 4.4.5.3 Output Design

Main outputs in the system include:

- Dashboards showing patient risk level and trend status.
- Alerts list showing priority, type, and clinical explanation.
- Charts/visuals for risk score over time.
- Basic metrics for system monitoring.

### 4.4.6 Security Design (If applicable)

The platform includes basic security design considerations.

#### 4.4.6.1 Physical Security

- In a real deployment, the server and database should run on secured infrastructure with limited physical access.

#### 4.4.6.2 Network Security

- The system should use HTTPS in production to protect data in transit.
- The backend should restrict cross-origin access to trusted frontend origins in production.

#### 4.4.6.3 Operational Security

- Authentication tokens should be managed securely and invalid sessions should be handled correctly.
- Access control should be enforced consistently for each role (patient/clinician/admin).
- Logs and metrics should not expose sensitive patient data.

## 4.5 Conclusion

This chapter presented the analysis and design of the telemedicine platform. It described the main requirements, system components, and the full-stack architecture used to implement remote symptom monitoring. The included diagrams show how user actions flow through the frontend and backend, how the clinical intelligence layer produces risk and trend results, and how alerts are generated and stored. The next phase of the project (implementation and results) builds directly on this design.

