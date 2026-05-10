# CHAPTER 4: ANALYSIS AND DESIGN

## 4.1 Introduction

This chapter explains how the telemedicine platform was analysed and designed before and during implementation. It describes the problem domain, the main user requirements, the system components, and the overall architecture. Diagrams are included to show how the system works from a user and technical perspective.

The system is a web-based remote symptom monitoring platform. Patients submit symptom reports through a web interface, and clinicians review patient status, trends, alerts, follow-up appointments, and responses through a dashboard. The backend processes symptom reports using a rule-based alert engine, stores the results in a database, creates alerts when needed, and supports persistent in-app notifications.

## 4.2 Detailed Analysis of the Problem Domain and User Requirements

### 4.2.1 Functional Requirements

The following functional requirements describe what the system must do.

**Authentication and Access Control**

- The system must allow users to register and log in.
- The system must support role-based access (Patient, Clinician, Admin).
- The system must protect pages and endpoints so users only see what they are allowed to see.

**Patient Features**

- A patient must be able to submit a symptom report (symptoms, severity, duration, frequency, medication adherence, and optional vitals).
- A patient must be able to view their own submitted reports and current status (risk and trend).
- A patient must be able to view alerts related to their reports.
- A patient must be able to view clinician responses and scheduled follow-up appointments.
- A patient must be able to view in-app notifications.

**Clinician Features**

- A clinician must be able to view assigned patients.
- A clinician must be able to review symptom reports submitted by assigned patients.
- A clinician must be able to view patient risk level and trend status.
- A clinician must be able to view alerts and mark or triage alerts.
- A clinician must be able to send follow-up responses to patients.
- A clinician must be able to schedule and update follow-up appointments.
- A clinician must be able to create or manage follow-up tasks.

**Administrator Features**

- An admin must be able to manage users.
- An admin must be able to manage patient-clinician assignments.
- An admin must be able to view system metrics.
- An admin must be able to create system notifications when needed.

**Clinical Intelligence and Workflow**

- The system must classify risk level for each symptom report using predefined rules.
- The system must analyse patient trends using recent report history.
- The system must use patient age, chronic conditions, care context, symptom severity, duration, frequency, vitals, and medication adherence when calculating risk.
- The system must generate alerts when risk is high or when trend is worsening.
- The system must store explanations with reports and alerts.
- The system must store notifications, follow-up responses, and follow-up appointments so patient care can continue after the first alert.

### 4.2.2 Non-functional Requirements

The following non-functional requirements describe quality and constraints.

**Usability**

- The system should be easy to use for patients and clinicians with clear dashboards and simple workflows.
- The interface should present risk/trend results clearly using badges, indicators, alerts, and notifications.

**Performance**

- The system should respond quickly to user actions such as submitting a symptom report and loading dashboards.
- Backend risk and trend processing should be fast enough to run during report submission.

**Security**

- The system should use secure authentication and role-based authorization.
- Sensitive clinical data should be processed on the server and only displayed to authorized users.

**Reliability**

- The system should store reports, alerts, follow-up records, appointments, notifications, and metrics reliably in the database.
- The system should handle invalid input gracefully and return clear errors.

**Maintainability**

- The system should be modular, with frontend components and backend services separated, so it is easier to update and extend.

## 4.3 Identification of System Components and Functionalities

The system can be understood as four main layers:

1. **Frontend layer**: Web user interface (Patient, Clinician, Admin dashboards, notification bell, and follow-up screens).
2. **Backend layer**: FastAPI routes, controllers, schemas, and services implementing business logic.
3. **Clinical intelligence and workflow layer**: Risk classification, trend analysis, alert generation, notification handling, and follow-up workflow.
4. **Data layer**: PostgreSQL database accessed using Prisma ORM.

### 4.3.1 Use-Case Diagram/s

The use-case diagram below shows the main user roles (Patient, Clinician, Administrator) and the core system actions.

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

### 4.3.2 Sequence Diagram

The sequence diagram below shows the typical flow when a patient submits a symptom report and the follow-up workflow continues after an alert.

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

## 4.4 System Architecture and Design Considerations

This section explains the high-level architecture and important design decisions.

### 4.4.1 Context Diagram and DFD Diagram

The context diagram below shows the system boundary and the main external users.

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

A simple data flow (DFD-style) view is shown below.

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

### 4.4.2 Architectural Design

The platform uses a typical web architecture with a separate frontend and backend:

- The **frontend** is a React application with pages for each role, shared components, a notification bell, and follow-up UI.
- The **backend** is a FastAPI application that exposes REST endpoints.
- The **service layer** contains the business logic, clinical rules, notification handling, and follow-up workflow.
- The **database** stores users, patients, clinicians, assignments, symptom reports, alerts, tasks, follow-up responses, follow-up appointments, notifications, push subscriptions, audit logs, and metrics.

High-level architecture overview:

```mermaid
flowchart TB
    subgraph ClientLayer["Frontend Layer - React"]
        Login[Login and Signup Pages]
        Dashboards[Patient, Clinician, and Admin Dashboards]
        FollowUpUI[Follow-Up and Response UI]
        NotificationUI[Notification Bell and Realtime Updates]
        UIComponents[Shared UI Components]
        Contexts[Auth, Toast, and Notification Contexts]
    end

    subgraph APILayer["Backend Layer - FastAPI"]
        Routes[Routes]
        Controllers[Controllers]
        Schemas[Schemas]
        Services[Services]
        Realtime[Realtime and Push Delivery]
    end

    subgraph IntelligenceLayer["Clinical Intelligence Layer"]
        RiskService[Risk Classification]
        TrendService[Trend Analysis]
        AlertService[Alert Generation]
        FollowUpService[Follow-Up Response and Appointment Services]
        NotificationService[Notification Service]
    end

    subgraph DataLayer["Data Layer"]
        Prisma[Prisma ORM]
        Database[(PostgreSQL Database)]
    end

    Login --> Contexts
    Dashboards --> UIComponents
    Dashboards --> Contexts
    FollowUpUI --> Contexts
    NotificationUI --> Contexts

    Contexts --> Routes
    UIComponents --> Routes
    FollowUpUI --> Routes
    NotificationUI --> Routes

    Routes --> Controllers
    Routes --> Services
    Controllers --> Schemas
    Controllers --> Services

    Services --> RiskService
    Services --> TrendService
    Services --> AlertService
    Services --> FollowUpService
    Services --> NotificationService
    NotificationService --> Realtime

    Services --> Prisma
    RiskService --> Prisma
    TrendService --> Prisma
    AlertService --> Prisma
    FollowUpService --> Prisma
    NotificationService --> Prisma
    Prisma --> Database
```

### 4.4.3 Physical Design

The physical design describes where the system runs:

- The frontend runs in a web browser on the user device (patient/clinician/admin).
- The backend runs on a server or local machine during development.
- The database runs as a PostgreSQL instance.

In development, the frontend typically runs on a local dev server and sends requests to the backend API address, for example `http://localhost:8000`.

### 4.4.4 Database Design

The database design is defined using Prisma in `schema.prisma`. The main entities are:

- `User`: login identity and role (PATIENT, CLINICIAN, ADMIN)
- `Patient`: patient profile and current monitoring status
- `Clinician`: clinician profile
- `Assignment`: links a clinician to a patient and stores care context
- `SymptomReport`: structured symptom report plus computed risk results
- `Alert`: alert records triggered by high risk or worsening trends
- `Task`: follow-up work item, often created from an alert
- `FollowUpResponse`: clinician guidance linked to a symptom report
- `FollowUpAppointment`: scheduled patient-clinician follow-up
- `Notification`: persistent in-app notification record
- `PushSubscription`: browser push subscription data
- `AuditLog`: user activity record
- `PerformanceMetric`: system performance logs

Entity Relationship Diagram (based on `schema.prisma`):

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
        Int id PK
        String email UK
        String password
        Role role
    }

    PATIENT {
        Int id PK
        Int userId FK
        String chronicConditions
        RiskLevel currentRiskLevel
        TrendStatus currentTrendStatus
        DateTime lastReportTime
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
        String symptoms
        Severity severity
        Frequency frequency
        Boolean medicationAdherent
        RiskLevel riskLevel
        Float riskScore
    }

    ALERT {
        Int id PK
        Int patientId FK
        Int symptomReportId FK
        Int assignedToClinicianId FK
        AlertPriority priority
        String alertType
        AlertStatus status
        Boolean isRead
    }

    TASK {
        Int id PK
        Int patientId FK
        Int assignedClinicianId FK
        Int createdFromAlertId FK
        String title
        TaskStatus status
    }

    FOLLOW_UP_RESPONSE {
        Int id PK
        Int symptomReportId FK
        Int clinicianId FK
        Int patientId FK
        String message
        Boolean actionRequired
    }

    FOLLOW_UP_APPOINTMENT {
        Int id PK
        Int patientId FK
        Int clinicianId FK
        DateTime scheduledAt
        String reason
        String status
    }

    NOTIFICATION {
        Int id PK
        Int userId FK
        String title
        String message
        String type
        Boolean isRead
        String link
    }
```

### 4.4.5 Interface Design

#### 4.4.5.1 Menu Design

The frontend uses a sidebar navigation layout. Menu items change based on the user role:

- Patients see options related to submitting reports, viewing their status, viewing clinician responses, and viewing scheduled follow-ups.
- Clinicians see options related to patients, alerts, trends, tasks, responses, and follow-up appointments.
- Admins see options related to user management, assignments, alerts, and system monitoring.

#### 4.4.5.2 Input Design

Main inputs in the system include:

- Signup/login forms (email, password, role information).
- Symptom report form (symptoms, severity, duration, frequency, medication adherence, and optional vitals).
- Clinician/admin forms for creating assignments or updating user records.
- Clinician response forms for sending follow-up guidance.
- Follow-up appointment forms for scheduling patient appointments.

Input validation is done on both sides:

- frontend performs basic checks before sending data,
- backend validates using schemas and returns errors when input is invalid.

#### 4.4.5.3 Output Design

Main outputs in the system include:

- Dashboards showing patient risk level and trend status.
- Alerts list showing priority, type, workflow status, and clinical explanation.
- Follow-up cards showing appointments and clinician responses.
- In-app notifications shown through the notification bell.
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
- Notifications and follow-up records should only be visible to the correct patient, clinician, or administrator.

## 4.5 Conclusion

This chapter presented the analysis and design of the telemedicine platform. It described the main requirements, system components, and the full-stack architecture used to implement remote symptom monitoring. The included diagrams show how user actions flow through the frontend and backend, how the clinical intelligence layer produces risk and trend results, how alerts are generated and stored, and how clinician follow-up actions and notifications continue the care workflow after a report has been reviewed. The next phase of the project (implementation and results) builds directly on this design.
