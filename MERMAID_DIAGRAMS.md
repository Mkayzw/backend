# Mermaid Diagrams for Thesis

Copy and paste each code block below into your markdown files. These diagrams match the current implementation, including follow-up responses, follow-up appointments, persistent notifications, tasks, and the expanded risk context.

---

## 1.9 Work Plan - Gantt Chart

```mermaid
gantt
    title Telemedicine Platform - Work Plan and Timeline
    dateFormat YYYY-MM-DD

    section Planning and Design
    Requirements Analysis           :des1, 2025-01-15, 30d
    Database Schema Design          :des2, after des1, 20d
    System Architecture             :des3, after des2, 20d

    section Backend Development
    API Endpoints Setup             :dev1, after des3, 25d
    Controllers Implementation      :dev2, after dev1, 25d
    Services and Business Logic     :dev3, after dev2, 30d
    Risk Classification Engine      :dev4, after dev3, 20d
    Trend Analysis Module           :dev5, after dev4, 15d
    Follow-Up and Notification Flow :dev6, after dev5, 20d

    section Frontend Development
    React Setup and Authentication  :front1, after des3, 25d
    Patient Dashboard               :front2, after front1, 20d
    Clinician Dashboard             :front3, after front2, 20d
    Admin Dashboard                 :front4, after front3, 15d
    Notification and Follow-Up UI   :front5, after front4, 15d

    section Integration and Testing
    Backend-Frontend Integration    :test1, after dev6, 20d
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
    Start([Patient submits symptom report]) --> Validate{Valid input?}
    Validate -->|No| Error[Return validation error]
    Error --> End1([Request fails])

    Validate -->|Yes| Extract[Extract symptoms, severity, duration, frequency, vitals, medication adherence]
    Extract --> Context[Read patient age, chronic conditions, and active care context]
    Context --> SymptomScore[Score symptoms using predefined weights]
    SymptomScore --> Severity[Apply severity, duration, and frequency modifiers]
    Severity --> Vitals{Vital signs abnormal?}
    Vitals -->|Yes| VitalBonus[Add vital-sign risk score]
    Vitals -->|No| Medication
    VitalBonus --> Medication{Medication non-adherence?}
    Medication -->|Yes| MedBonus[Add adherence penalty]
    Medication -->|No| Age
    MedBonus --> Age{Age risk modifier?}
    Age -->|Yes| AgeBonus[Add infant, child, or elderly risk score]
    Age -->|No| Care
    AgeBonus --> Care
    Care[Apply chronic-condition and care-context match bonuses] --> FinalScore[Calculate final risk score]

    FinalScore --> Classify{Risk threshold}
    Classify -->|Score >= 5.0| High[Risk level HIGH]
    Classify -->|Score >= 2.5| Medium[Risk level MEDIUM]
    Classify -->|Score < 2.5| Low[Risk level LOW]

    High --> Trend[Compare with recent reports]
    Medium --> Trend
    Low --> Trend

    Trend --> TrendStatus{Trend status}
    TrendStatus -->|Increasing| Worsening[Trend WORSENING]
    TrendStatus -->|Stable| Stable[Trend STABLE]
    TrendStatus -->|Improving| Improving[Trend IMPROVING]

    Worsening --> AlertCheck{Alert needed?}
    Stable --> AlertCheck
    Improving --> AlertCheck

    AlertCheck -->|HIGH risk or WORSENING trend| CreateAlert[Create alert record]
    AlertCheck -->|No alert| Store[Store report and update patient status]
    CreateAlert --> Notify[Create persistent notifications]
    Notify --> Store
    Store --> Success([Report processed successfully])
```

---

## 4.3.1 Use-Case Diagram - System Boundaries and User Roles

```mermaid
flowchart LR
    Patient[Patient]
    Clinician[Clinician]
    Admin[Administrator]

    subgraph Auth["Authentication and Access"]
        UC1(Register and Login)
        UC2(Access Role-Based Pages)
    end

    subgraph PatientFunctions["Patient Functions"]
        UC3(Submit Symptom Report)
        UC4(View Own Reports)
        UC5(View Current Risk and Trend)
        UC6(View Personal Alerts)
        UC7(View Clinician Responses)
        UC8(View Follow-Up Appointments)
        UC9(View Notifications)
    end

    subgraph ClinicianFunctions["Clinician Functions"]
        UC10(View Assigned Patients)
        UC11(Review Patient Reports)
        UC12(View Risk and Trend Status)
        UC13(View and Triage Alerts)
        UC14(Send Follow-Up Response)
        UC15(Schedule Follow-Up Appointment)
        UC16(Manage Follow-Up Tasks)
    end

    subgraph AdminFunctions["Administrator Functions"]
        UC17(Manage Users)
        UC18(Manage Assignments)
        UC19(View System Metrics)
        UC20(Create System Notifications)
    end

    subgraph SystemFunctions["System Intelligence and Workflow Functions"]
        UC21(Classify Risk)
        UC22(Analyze Trend)
        UC23(Generate Alerts)
        UC24(Store Reports and Status)
        UC25(Create Persistent Notifications)
        UC26(Store Follow-Up Responses and Appointments)
    end

    Patient --> UC1
    Patient --> UC2
    Patient --> UC3
    Patient --> UC4
    Patient --> UC5
    Patient --> UC6
    Patient --> UC7
    Patient --> UC8
    Patient --> UC9

    Clinician --> UC1
    Clinician --> UC2
    Clinician --> UC10
    Clinician --> UC11
    Clinician --> UC12
    Clinician --> UC13
    Clinician --> UC14
    Clinician --> UC15
    Clinician --> UC16

    Admin --> UC1
    Admin --> UC2
    Admin --> UC17
    Admin --> UC18
    Admin --> UC19
    Admin --> UC20

    UC3 --> UC21
    UC3 --> UC22
    UC21 --> UC23
    UC22 --> UC23
    UC3 --> UC24
    UC23 --> UC25
    UC25 --> UC6
    UC25 --> UC9
    UC25 --> UC13
    UC14 --> UC26
    UC15 --> UC26
    UC26 --> UC25
    UC26 --> UC7
    UC26 --> UC8
    UC20 --> UC25
```

---

## 4.3.2 Sequence Diagram - Symptom Report and Follow-Up Flow

```mermaid
sequenceDiagram
    actor Patient
    actor Clinician
    participant Frontend as React Frontend
    participant Route as Symptom Report Route
    participant Service as Symptom Report Service
    participant DB as Prisma and PostgreSQL
    participant Risk as Risk Classification Service
    participant Trend as Trend Analysis Service
    participant Alert as Alert Service
    participant Notify as Notification Service
    participant FollowUp as Follow-Up Services

    Patient->>Frontend: Fill in symptom form
    Frontend->>Frontend: Validate required fields
    Frontend->>Route: POST /api/symptom-reports
    Route->>Service: createSymptomReport(...)

    Service->>DB: Fetch patient context, age, conditions, and assignment
    DB-->>Service: Patient and care context

    Service->>DB: Create symptom report with default LOW risk
    DB-->>Service: New report record

    Service->>Risk: classifySymptomReport(...)
    Risk-->>Service: riskLevel, riskScore, riskFactors, explanation

    Service->>Trend: analyzeTrend(patientId, riskScore)
    Trend-->>Service: trendStatus

    Service->>DB: Update report with computed risk results
    Service->>DB: Update patient currentRiskLevel and currentTrendStatus

    alt Risk level is HIGH
        Service->>Alert: generateRiskAlert(...)
        Alert->>DB: Create HIGH_RISK alert
        Alert->>Notify: Create care-team and patient notifications
        Notify->>DB: Save notification records
        Notify-->>Frontend: Realtime notification event
    end

    alt Trend status is WORSENING
        Service->>Alert: generateTrendAlert(...)
        Alert->>DB: Create WORSENING_TREND alert
        Alert->>Notify: Create care-team and patient notifications
        Notify->>DB: Save notification records
        Notify-->>Frontend: Realtime notification event
    end

    Service-->>Route: Return created report
    Route-->>Frontend: 201 Created
    Frontend-->>Patient: Show success and updated status

    Clinician->>Frontend: Review alert or patient report
    Frontend->>FollowUp: POST /api/followup-responses or /api/followup-appointments
    FollowUp->>DB: Store response or appointment
    FollowUp->>Notify: Notify patient
    Notify->>DB: Save notification record
    Notify-->>Frontend: Realtime notification event
    Frontend-->>Patient: Show response, appointment, or notification
```

---

## 4.4.1 Context Diagram and DFD

```mermaid
flowchart LR
    Patient[Patient]
    Clinician[Clinician]
    Admin[Administrator]
    Frontend[Web Frontend]
    Backend[Backend API]
    Database[(PostgreSQL Database)]

    Patient -->|Submit reports, view status, responses, appointments, notifications| Frontend
    Clinician -->|Review patients, alerts, tasks, responses, follow-ups| Frontend
    Admin -->|Manage users, assignments, notifications, metrics| Frontend

    Frontend -->|Send API requests| Backend
    Backend -->|Return data, decisions, notifications| Frontend
    Backend -->|Store and retrieve records| Database
```

```mermaid
flowchart TD
    A[Patient enters symptoms, vitals, and medication adherence]
    B[Frontend validates form]
    C[Backend receives symptom report]
    D[Read patient context, age, chronic conditions, and active assignment]
    E[Run risk classification]
    F[Run trend analysis]
    G[Update report and patient status]
    H{Is an alert needed?}
    I[Create alert record]
    M[Create persistent notifications]
    J[Show updated status to patient]
    K[Show alert on clinician dashboard]
    N[Clinician sends response or schedules follow-up]
    O[Store response or appointment]
    P[Notify patient about clinician action]
    L[(Database)]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    C --> L
    D --> L
    G --> L
    H -->|Yes| I
    I --> M
    I --> L
    M --> L
    M --> J
    M --> K
    H -->|No| J
    I --> K
    K --> N
    N --> O
    O --> L
    O --> P
    P --> L
    P --> J
    G --> J
```

---

## 4.4.4 Database Design - Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--o| PATIENT : has
    USER ||--o| CLINICIAN : has
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ PUSH_SUBSCRIPTION : owns
    USER ||--o{ AUDIT_LOG : creates
    USER ||--o{ ALERT : acts_on

    PATIENT ||--o{ ASSIGNMENT : assigned
    CLINICIAN ||--o{ ASSIGNMENT : manages
    PATIENT ||--o{ SYMPTOM_REPORT : submits
    PATIENT ||--o{ ALERT : receives
    CLINICIAN ||--o{ ALERT : assigned
    SYMPTOM_REPORT ||--o{ ALERT : triggers

    PATIENT ||--o{ TASK : has
    CLINICIAN ||--o{ TASK : assigned
    ALERT ||--o{ TASK : creates

    SYMPTOM_REPORT ||--o{ FOLLOW_UP_RESPONSE : receives
    PATIENT ||--o{ FOLLOW_UP_RESPONSE : has
    CLINICIAN ||--o{ FOLLOW_UP_RESPONSE : writes

    PATIENT ||--o{ FOLLOW_UP_APPOINTMENT : has
    CLINICIAN ||--o{ FOLLOW_UP_APPOINTMENT : schedules

    USER {
        int id PK
        string email UK
        string password
        Role role
    }

    PATIENT {
        int id PK
        int userId FK
        string chronicConditions
        RiskLevel currentRiskLevel
        TrendStatus currentTrendStatus
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
        AssignmentStatus status
        CareContext careContext
    }

    SYMPTOM_REPORT {
        int id PK
        int patientId FK
        string symptoms
        Severity severity
        Frequency frequency
        bool medicationAdherent
        RiskLevel riskLevel
        float riskScore
    }

    ALERT {
        int id PK
        int patientId FK
        int symptomReportId FK
        int assignedToClinicianId FK
        AlertPriority priority
        string alertType
        AlertStatus status
        bool isRead
    }

    TASK {
        int id PK
        int patientId FK
        int assignedClinicianId FK
        int createdFromAlertId FK
        string title
        TaskStatus status
    }

    FOLLOW_UP_RESPONSE {
        int id PK
        int symptomReportId FK
        int clinicianId FK
        int patientId FK
        string message
        bool actionRequired
    }

    FOLLOW_UP_APPOINTMENT {
        int id PK
        int patientId FK
        int clinicianId FK
        datetime scheduledAt
        string reason
        string status
    }

    NOTIFICATION {
        int id PK
        int userId FK
        string title
        string message
        string type
        bool isRead
        string link
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
        NB["Notification Bell"]
        FU["Follow-Up UI"]
    end

    subgraph Auth["Authentication and Context"]
        AP["Auth Provider"]
        NP["Notification Provider"]
        ProtectedRoute["Protected Routes"]
    end

    subgraph API["Backend Layer (FastAPI)"]
        Routes["Routes Layer<br/>symptoms, alerts, dashboard,<br/>follow-ups, notifications"]
        Controllers["Controllers<br/>HTTP Logic"]
        Services["Services<br/>Business Logic"]
        Models["Schemas<br/>Data Validation"]
        Realtime["Realtime Broker<br/>and Web Push"]
    end

    subgraph Workflow["Clinical Workflow"]
        Risk["Risk Classification"]
        Trend["Trend Analysis"]
        Alert["Alert Service"]
        FollowUp["Follow-Up Services"]
        Notify["Notification Service"]
    end

    subgraph DB["Data Layer"]
        Prisma["Prisma ORM"]
        PostgreSQL["PostgreSQL<br/>Database"]
    end

    Client -->|HTTP Requests| Routes
    Client -->|Auth Check| Auth
    NB --> NP
    FU --> Routes
    Auth -->|Validate Token| Routes
    Routes -->|Process| Controllers
    Routes -->|Direct service routes| Services
    Controllers -->|Business Logic| Services
    Controllers -->|Validate| Models
    Services --> Risk
    Services --> Trend
    Services --> Alert
    Services --> FollowUp
    Alert --> Notify
    FollowUp --> Notify
    Notify --> Realtime
    Realtime --> NB
    Services -->|Query| Prisma
    Risk --> Prisma
    Trend --> Prisma
    Alert --> Prisma
    FollowUp --> Prisma
    Notify --> Prisma
    Prisma -->|SQL| PostgreSQL

    style Client fill:#e1f5ff
    style API fill:#f3e5f5
    style DB fill:#e8f5e9
    style Auth fill:#fff3e0
    style Workflow fill:#fff9c4
```

### Frontend Component Architecture

```mermaid
graph TB
    subgraph Pages["Pages"]
        LP["LoginPage"]
        SP["SignupPage"]
        PD["PatientDashboard<br/>reports, responses, appointments"]
        CD["ClinicianDashboard<br/>alerts, tasks, follow-ups"]
        AD["AdminDashboard"]
    end

    subgraph Layout["Layout Components"]
        Sidebar["Sidebar<br/>Navigation"]
        TopBar["TopBar<br/>Header"]
        AppLayout["AppLayout<br/>Container"]
        NB["NotificationBell"]
    end

    subgraph Core["Core Components"]
        PR["ProtectedRoute<br/>Auth Guard"]
        LS["LoadingSpinner"]
        Modal["Modal<br/>Dialog"]
        Toast["ToastContainer"]
        Empty["EmptyState"]
        Tooltip["Tooltip"]
    end

    subgraph Display["Display Components"]
        AC["AlertCard<br/>triage, task, response, schedule actions"]
        SC["StatCard"]
        RB["RiskBadge"]
        TI["TrendIndicator"]
    end

    subgraph Context["Context Providers"]
        Auth["AuthContext"]
        Toast_Ctx["ToastContext"]
        Notif["NotificationContext<br/>API + realtime stream"]
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
        TaskAPI["tasks.js"]
        FollowRespAPI["followupResponses.js"]
        FollowApptAPI["followupAppointments.js"]
        NotificationAPI["notifications.js"]
    end

    LP --> Auth
    SP --> Auth
    PD --> PR
    CD --> PR
    AD --> PR
    AppLayout --> Sidebar
    AppLayout --> TopBar
    TopBar --> NB
    NB --> Notif
    Pages --> Display
    Pages --> Core
    PD --> FollowRespAPI
    PD --> FollowApptAPI
    CD --> FollowRespAPI
    CD --> FollowApptAPI
    CD --> TaskAPI
    NB --> NotificationAPI
    Notif --> NotificationAPI

    style Pages fill:#e3f2fd
    style Layout fill:#f1f8e9
    style Core fill:#fce4ec
    style Display fill:#fff3e0
    style Context fill:#e0f2f1
    style API fill:#f3e5f5
```

---

## How to Use

1. Open VS Code.
2. Create or edit a markdown file (`.md`).
3. Find the diagram you need above.
4. Copy the entire code block between the triple backticks.
5. Paste it into your markdown file.
6. Install a Mermaid preview extension if your editor does not render Mermaid by default.
