# Mermaid Diagrams for Thesis

Copy and paste each code block below into your markdown files.

---

## 1.9 Work Plan - Gantt Chart

```mermaid
gantt
    title Telemedicine Platform - Work Plan & Timeline
    dateFormat YYYY-MM-DD
    
    section Planning & Design
    Requirements Analysis           :des1, 2025-01-15, 30d
    Database Schema Design          :des2, after des1, 20d
    System Architecture             :des3, after des2, 20d
    
    section Backend Development
    API Endpoints Setup             :dev1, after des3, 25d
    Controllers Implementation      :dev2, after dev1, 25d
    Services & Business Logic       :dev3, after dev2, 30d
    Risk Classification Engine      :dev4, after dev3, 20d
    Trend Analysis Module           :dev5, after dev4, 15d
    
    section Frontend Development
    React Setup & Authentication    :front1, after des3, 25d
    Patient Dashboard               :front2, after front1, 20d
    Clinician Dashboard             :front3, after front2, 20d
    Admin Dashboard                 :front4, after front3, 15d
    
    section Integration & Testing
    Backend-Frontend Integration    :test1, after dev5, 20d
    System Testing                  :test2, after test1, 25d
    Clinical Logic Verification     :test3, after test2, 15d
    
    section Deployment
    Deployment Preparation          :deploy1, after test3, 10d
    Production Release              :deploy2, after deploy1, 5d
```

---

## 3.3 Methods/Techniques - Rule-Based Algorithm Flowchart

```mermaid
flowchart TD
    Start(["Patient Submits<br/>Symptom Report"]) --> Validate{Valid Input?}
    
    Validate -->|No| Error["Return<br/>Validation Error"]
    Error --> End1(["Request Fails"])
    
    Validate -->|Yes| Extract["Extract Features:<br/>• Symptoms<br/>• Severity<br/>• Frequency<br/>• Vital Signs<br/>• Medications"]
    
    Extract --> CheckChronic{Patient has<br/>Chronic<br/>Conditions?}
    
    CheckChronic -->|Yes| ApplyContext["Apply Care Context<br/>Rules"]
    CheckChronic -->|No| BaselineScore["Calculate Base Risk<br/>Score"]
    
    ApplyContext --> BaselineScore
    
    BaselineScore --> SympScore["Score Each Symptom:<br/>• Weight × Severity<br/>• Duration Bonus<br/>• Frequency Multiplier"]
    
    SympScore --> AggScore["Aggregate Symptom<br/>Score"]
    
    AggScore --> VitalCheck{Vital Signs<br/>Critical?}
    
    VitalCheck -->|Yes| VitalBonus["Add Critical<br/>Vital Bonus"]
    VitalCheck -->|No| MedCheck{Medication<br/>Non-Adherence?}
    
    VitalBonus --> MedCheck
    
    MedCheck -->|Yes| MedBonus["Add Adherence<br/>Penalty"]
    MedCheck -->|No| FinalScore["Calculate Final<br/>Risk Score"]
    
    MedBonus --> FinalScore
    
    FinalScore --> ClassifyRisk{Risk Score<br/>Threshold?}
    
    ClassifyRisk -->|Score ≤ 30| RiskLow["RISK LEVEL<br/>= LOW"]
    ClassifyRisk -->|Score 31-70| RiskMed["RISK LEVEL<br/>= MEDIUM"]
    ClassifyRisk -->|Score ≥ 71| RiskHigh["RISK LEVEL<br/>= HIGH"]
    
    RiskLow --> CompareTrend["Compare With<br/>Previous Reports"]
    RiskMed --> CompareTrend
    RiskHigh --> CompareTrend
    
    CompareTrend --> AnalyzeTrend{Trend<br/>Status?}
    
    AnalyzeTrend -->|Score Increasing| Worsening["TREND<br/>= WORSENING<br/>Priority: HIGH"]
    AnalyzeTrend -->|Score ±10%| Stable["TREND<br/>= STABLE"]
    AnalyzeTrend -->|Score Decreasing| Improving["TREND<br/>= IMPROVING"]
    
    Worsening --> AlertCheck{Generate<br/>Alert?}
    Stable --> AlertCheck
    Improving --> AlertCheck
    
    AlertCheck -->|Risk HIGH or<br/>Worsening| CreateAlert["Create Alert<br/>Priority = HIGH"]
    AlertCheck -->|Risk MEDIUM<br/>& Worsening| CreateAlert
    AlertCheck -->|Risk LOW &<br/>Stable| NoAlert["No Alert"]
    
    CreateAlert --> NotifyClinic["Notify Assigned<br/>Clinicians"]
    NoAlert --> Store["Store Report<br/>in Database"]
    NotifyClinic --> Store
    
    Store --> UpdatePatient["Update Patient:<br/>• currentRiskLevel<br/>• currentTrendStatus<br/>• lastReportTime"]
    
    UpdatePatient --> Success(["Report Processed<br/>Successfully"])
```

---

## 4.3.1 Use-Case Diagram - System Boundaries & User Roles

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

---

## 4.3.2 Sequence Diagram - Symptom Report Data Flow

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
    
    RiskSvc->>RiskSvc: Apply Symptom Weights<br/>Apply Vital Thresholds<br/>Apply Care Context Rules
    RiskSvc-->>Service: riskScore, riskLevel
    
    Service->>DB: Query Previous<br/>Reports
    DB-->>Service: Last 5 Reports
    
    Service->>TrendSvc: analyzeTrend(current_score,<br/>previous_scores)
    
    TrendSvc->>TrendSvc: Compare Trajectory<br/>Calculate Change %<br/>Apply Trend Rules
    TrendSvc-->>Service: trendStatus, explanation
    
    Service->>AlertSvc: shouldGenerateAlert(riskLevel,<br/>trendStatus)
    
    AlertSvc->>AlertSvc: Check Alert Thresholds<br/>Risk HIGH? Worsening?
    AlertSvc-->>Service: needsAlert=true/false
    
    alt Need Alert
        Service->>DB: Create Alert Record<br/>Create SymptomReport
        DB-->>Service: IDs Confirmed
        
        Service->>DB: Update Patient<br/>currentRiskLevel<br/>currentTrendStatus
        DB-->>Service: Updated
        
        Service-->>Controller: Report + Alert Created
        Controller-->>Frontend: 201 Created<br/>+ Alert Data
        
        Frontend->>Patient: Display Success<br/>+ Risk/Trend Info
        
        DB->>Clinician: Send Alert Notification
        Clinician->>Frontend: View Alert<br/>in Dashboard
    else No Alert Needed
        Service->>DB: Create SymptomReport
        Service->>DB: Update Patient Fields
        DB-->>Service: Confirmed
        
        Service-->>Controller: Report Created
        Controller-->>Frontend: 201 Created
        Frontend->>Patient: Display Success
    end
```

---

## 4.4.4 Database Design - Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--o| PATIENT : has
    USER ||--o| CLINICIAN : has
    PATIENT ||--o{ ASSIGNMENT : assigned
    CLINICIAN ||--o{ ASSIGNMENT : manages
    PATIENT ||--o{ SYMPTOM_REPORT : submits
    PATIENT ||--o{ ALERT : receives
    CLINICIAN ||--o{ ALERT : receives
    SYMPTOM_REPORT ||--o{ SYMPTOM_DETAIL : contains

    USER {
        int id PK
        string email UK
        string password
        string phone
        string fullName
        enum role
        datetime createdAt
    }

    PATIENT {
        int id PK
        int userId FK
        string emergencyContact
        string address
        datetime dateOfBirth
        string gender
        string chronicConditions
        string allergies
        string baselineStatus
        enum currentRiskLevel
        enum currentTrendStatus
        datetime lastRiskUpdate
        datetime lastTrendUpdate
        datetime lastReportTime
    }

    CLINICIAN {
        int id PK
        int userId FK
        string fullName
        string specialization
    }

    ASSIGNMENT {
        int id PK
        int clinicianId FK
        int patientId FK
        datetime assignedAt
        enum status
        datetime endedAt
        enum careContext
        string reason
    }

    SYMPTOM_REPORT {
        int id PK
        int patientId FK
        datetime reportedAt
        string overallCondition
        int painLevel
        string symptoms
        string activities
        string medications
    }

    SYMPTOM_DETAIL {
        int id PK
        int reportId FK
        string symptom
        enum severity
        enum frequency
        string description
    }

    ALERT {
        int id PK
        int patientId FK
        int clinicianId FK
        enum priority
        string message
        boolean acknowledged
        datetime createdAt
    }
```

---

## Additional System Architecture Diagrams

### System Architecture Overview

```mermaid
graph TB
    subgraph Client["Frontend Layer (React)"]
        LP["Login Page"]
        SP["Signup Page"]
        PD["Patient Dashboard"]
        CD["Clinician Dashboard"]
        AD["Admin Dashboard"]
    end

    subgraph Auth["Authentication"]
        AP["Auth Provider"]
        ProtectedRoute["Protected Routes"]
    end

    subgraph API["Backend Layer (FastAPI)"]
        Routes["Routes Layer<br/>endpoints"]
        Controllers["Controllers<br/>HTTP Logic"]
        Services["Services<br/>Business Logic"]
        Models["Schemas<br/>Data Validation"]
    end

    subgraph DB["Data Layer"]
        Prisma["Prisma ORM"]
        PostgreSQL["PostgreSQL<br/>Database"]
    end

    Client -->|HTTP Requests| Routes
    Client -->|Auth Check| Auth
    Auth -->|Validate Token| Routes
    Routes -->|Process| Controllers
    Controllers -->|Business Logic| Services
    Controllers -->|Validate| Models
    Services -->|Query| Prisma
    Prisma -->|SQL| PostgreSQL
    
    style Client fill:#e1f5ff
    style API fill:#f3e5f5
    style DB fill:#e8f5e9
    style Auth fill:#fff3e0
```

### Frontend Component Architecture

```mermaid
graph TB
    subgraph Pages["Pages"]
        LP["LoginPage"]
        SP["SignupPage"]
        PD["PatientDashboard"]
        CD["ClinicianDashboard"]
        AD["AdminDashboard"]
    end

    subgraph Layout["Layout Components"]
        Sidebar["Sidebar<br/>Navigation"]
        TopBar["TopBar<br/>Header"]
        AppLayout["AppLayout<br/>Container"]
    end

    subgraph Core["Core Components"]
        PR["ProtectedRoute<br/>Auth Guard"]
        LS["LoadingSpinner"]
        Modal["Modal<br/>Dialog"]
        Toast["ToastContainer<br/>Notifications"]
    end

    subgraph Display["Display Components"]
        AC["AlertCard"]
        SC["StatCard"]
        RB["RiskBadge"]
        TI["TrendIndicator"]
    end

    subgraph Context["Context Providers"]
        Auth["AuthContext"]
        Toast_Ctx["ToastContext"]
        Notif["NotificationContext"]
    end

    subgraph API["API Services"]
        AuthAPI["auth.js"]
        PatientAPI["patients.js"]
        ClinicianAPI["clinicians.js"]
        AlertAPI["alerts.js"]
        DashAPI["dashboard.js"]
        MetricsAPI["metrics.js"]
        SymptomAPI["symptomReports.js"]
        AssignmentAPI["assignments.js"]
    end

    LP --> Auth
    SP --> Auth
    PD --> PR
    CD --> PR
    AD --> PR
    
    AppLayout --> Sidebar
    AppLayout --> TopBar
    PD --> Toast
    CD --> Toast
    AD --> Toast
    
    Pages --> Display
    Display --> AC
    Display --> RB
    Display --> TI
    
    Pages --> API
    PR --> Auth
    Toast --> Toast_Ctx
    
    style Pages fill:#e3f2fd
    style Layout fill:#f1f8e9
    style Core fill:#fce4ec
    style Display fill:#fff3e0
    style Context fill:#e0f2f1
    style API fill:#f3e5f5
```

### Backend Architecture - MVC Pattern

```mermaid
graph LR
    subgraph Routes["Routes<br/>Endpoints"]
        R_Auth["auth.py"]
        R_Patient["patients.py"]
        R_Clinician["clinicians.py"]
        R_Alert["alerts.py"]
        R_Dashboard["dashboard.py"]
        R_Metrics["metrics.py"]
        R_Symptom["symptom_reports.py"]
        R_Assignment["assignments.py"]
        R_User["users.py"]
    end

    subgraph Controllers["Controllers<br/>HTTP Handlers"]
        C_Auth["auth_controller.py"]
        C_Patient["patient_controller.py"]
        C_Clinician["clinician_controller.py"]
        C_Alert["alert_controller.py"]
        C_Dashboard["dashboard_controller.py"]
        C_Metrics["metrics_controller.py"]
        C_Symptom["symptom_report_controller.py"]
        C_Assignment["assignment_controller.py"]
        C_User["user_controller.py"]
    end

    subgraph Services["Services<br/>Business Logic"]
        S_Auth["auth.py"]
        S_Patient["patient.py"]
        S_Clinician["clinician.py"]
        S_Alert["alert_service.py"]
        S_Dashboard["dashboard.py"]
        S_Metrics["metrics.py"]
        S_Symptom["symptom_report.py"]
        S_Assignment["assignment.py"]
        S_User["user.py"]
        S_Risk["risk_classification.py"]
        S_Trend["trend_analysis.py"]
    end

    subgraph Schemas["Schemas<br/>Validation"]
        SH_Auth["auth_schema.py"]
        SH_Patient["patient_schema.py"]
        SH_Alert["alert_schema.py"]
        SH_Metrics["metrics_schema.py"]
        SH_Symptom["symptom_report_schema.py"]
        SH_Assignment["assignment_schema.py"]
    end

    subgraph Utils["Utilities"]
        LOG["logging.py"]
        COMP["compliance.py"]
        COMPR["compression.py"]
        HTTP["http.py"]
    end

    R_Auth --> C_Auth
    R_Patient --> C_Patient
    R_Clinician --> C_Clinician
    R_Alert --> C_Alert
    R_Dashboard --> C_Dashboard
    R_Metrics --> C_Metrics
    R_Symptom --> C_Symptom
    R_Assignment --> C_Assignment
    R_User --> C_User

    C_Auth --> S_Auth
    C_Patient --> S_Patient
    C_Clinician --> S_Clinician
    C_Alert --> S_Alert
    C_Dashboard --> S_Dashboard
    C_Metrics --> S_Metrics
    C_Symptom --> S_Symptom
    C_Assignment --> S_Assignment
    C_User --> S_User

    S_Symptom --> S_Risk
    S_Symptom --> S_Trend
    S_Alert --> S_Risk
    S_Dashboard --> S_Risk
    S_Dashboard --> S_Trend

    C_Auth --> SH_Auth
    C_Patient --> SH_Patient
    C_Alert --> SH_Alert
    C_Symptom --> SH_Symptom
    C_Dashboard --> SH_Metrics
    C_Assignment --> SH_Assignment

    style Routes fill:#bbdefb
    style Controllers fill:#c8e6c9
    style Services fill:#fff9c4
    style Schemas fill:#f8bbd0
    style Utils fill:#dcedc8
```

---

## How to Use:

1. Open VS Code
2. Create or edit a markdown file (.md)
3. Find the diagram you need above
4. Copy the entire code block (between the triple backticks)
5. Paste it into your markdown file
6. Install "Markdown Preview Mermaid Support" extension
7. The diagram will render automatically in VS Code preview

