# Design Document: Healthcare Backend Completion

## Overview

This design document describes the technical implementation for completing the Healthcare Platform Backend API. The implementation consists of two phases:

**Phase 1: Foundation Layer** - Fixes existing bugs in services, controllers, and schemas, and adds new features for assignments, symptom reports, and dashboard statistics.

**Phase 2: Intelligence Layer** - Adds risk classification, trend analysis, alert generation, dashboard prioritization, low-bandwidth optimization, security, and performance monitoring.

The approach uses standard FastAPI patterns with a layered architecture:
- **Routes** - Define HTTP endpoints and map to controllers
- **Controllers** - Handle request validation and call services
- **Services** - Business logic and database operations
- **Schemas** - Pydantic models for request/response validation

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FastAPI Application                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Routes Layer                                                                │
│  ├── /api/auth              → auth_controller (Phase 2)                     │
│  ├── /api/patients          → patient_controller                            │
│  ├── /api/clinicians        → clinician_controller                          │
│  ├── /api/assignments       → assignment_controller                         │
│  ├── /api/symptom-reports   → symptom_report_controller                     │
│  ├── /api/alerts            → alert_controller (Phase 2)                    │
│  ├── /api/dashboard         → dashboard_controller                          │
│  └── /api/metrics           → metrics_controller (Phase 2)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Controllers Layer                                                           │
│  ├── Validate request data                                                   │
│  ├── Enforce access control (Phase 2)                                        │
│  ├── Call appropriate service                                                │
│  └── Return HTTP responses                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Services Layer                                                              │
│  ├── Foundation Services                                                     │
│  │   ├── patient, clinician, assignment, symptom_report, dashboard          │
│  │   └── CRUD operations, data validation                                   │
│  └── Intelligence Layer Services (Phase 2)                                   │
│      ├── risk_classification  - Compute risk scores and levels              │
│      ├── trend_analysis        - Analyze historical symptom trends          │
│      ├── alert                 - Generate and manage alerts                 │
│      ├── auth                  - Authentication and authorization           │
│      └── metrics               - Performance and error tracking             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL via Prisma)                                            │
│  ├── User, Patient, Clinician                                                │
│  ├── Assignments, SymptomReport                                              │
│  └── Alert, PerformanceMetric (Phase 2)                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Intelligence Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Symptom Report Submission Flow                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  POST /api/symptom-reports                                                   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────┐                                                        │
│  │ Symptom Report  │                                                        │
│  │ Controller      │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Create Report   │────►│ Risk            │────►│ Trend           │       │
│  │ (Database)      │     │ Classification  │     │ Analysis        │       │
│  └─────────────────┘     │ Service         │     │ Service         │       │
│                          └────────┬────────┘     └────────┬────────┘       │
│                                   │                       │                 │
│                                   ▼                       ▼                 │
│                          ┌─────────────────┐     ┌─────────────────┐       │
│                          │ Store Risk      │     │ Update Patient  │       │
│                          │ Level on Report │     │ Trend Status    │       │
│                          └─────────────────┘     └─────────────────┘       │
│                                   │                       │                 │
│                                   └───────────┬───────────┘                 │
│                                               ▼                             │
│                                   ┌─────────────────┐                       │
│                                   │ Alert           │                       │
│                                   │ Generation      │                       │
│                                   │ (if HIGH/WORSENING)                     │
│                                   └─────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
HTTP Request → Route → Controller → Service → Prisma → Database
                    ↓
              HTTP Response (JSON)
```

---

## Phase 1: Foundation Layer

---

## Components and Interfaces

### 1. Schema Fixes (schema.prisma)

The Prisma schema has several issues that need fixing:

**Current Issues:**
- `Patient.emergerncyContact` - typo (should be `emergencyContact`)
- `Clinician.Fullname`, `Clinician.Specialization` - inconsistent capitalization
- `Assignments.Id` - should be lowercase `id`
- `Assignments` has `@unique` on `clinicianId` and `patientId` - prevents multiple assignments
- `SymptomReport.patientId` has `@unique` - prevents multiple reports per patient

**Fixed Schema:**

```prisma
model Patient {
  id Int @id @default(autoincrement())
  userId Int @unique
  emergencyContact String  // Fixed: was "emergerncyContact"
  dateOfBirth DateTime
  gender String
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id])
  assignments Assignments[]
}
```

### 2. Service Layer

#### 2.1 Patient Service (app/services/patient.py)

**Bug Fixes:**

```python
from app.db import db

async def getPatientbyId(patientId: int):
    # FIX: Query patient table, not user table
    return await db.patient.find_unique(
        where={"id": patientId},
        include={"user": True}
    )

async def getPatientbyUserId(userId: int):
    # FIX: Query by userId field correctly
    return await db.patient.find_unique(
        where={"userId": userId},
        include={"user": True}
    )

async def createPatient(
    userId: int,           # FIX: was str, should be int
    emergencyContact: str,
    dateOfBirth,
    gender: str
):
    return await db.patient.create(
        data={
            "userId": userId,
            "emergencyContact": emergencyContact,
            "dateOfBirth": dateOfBirth,
            "gender": gender,
        },
        include={"user": True}
    )

async def updatePatient(
    patientId: int,
    emergencyContact: str | None = None,
    dateOfBirth=None,
    gender: str | None = None
):
    data = {}
    if emergencyContact is not None:
        data["emergencyContact"] = emergencyContact
    if dateOfBirth is not None:
        data["dateOfBirth"] = dateOfBirth  # FIX: removed trailing space
    if gender is not None:
        data["gender"] = gender
    return await db.patient.update(
        where={"id": patientId},
        data=data,
        include={"user": True}
    )

async def deletePatient(patientId: int):
    return await db.patient.delete(where={"id": patientId})

async def getAllPatients():
    return await db.patient.find_many(
        include={"user": True}
    )
```

#### 2.2 Clinician Service (app/services/clinician.py)

**Bug Fixes:**

```python
from app.db import db

async def getClinicianById(clinicianId: int):
    # FIX: Add await
    return await db.clinician.find_unique(
        where={"id": clinicianId},
        include={"user": True}
    )

async def getClinicianByUserId(userId: int):
    # FIX: Query by userId, not id
    return await db.clinician.find_unique(
        where={"userId": userId},
        include={"user": True}
    )

async def createClinician(
    userId: int,
    fullname: str,          # FIX: was "credentials"
    specialization: str
):
    return await db.clinician.create(
        data={
            "userId": userId,
            "fullname": fullname,
            "specialization": specialization,
        },
        include={"user": True}
    )

async def updateClinician(
    clinicianId: int,
    fullname: str | None = None,      # FIX: use **kwargs, not *args
    specialization: str | None = None
):
    data = {}
    if fullname is not None:
        data["fullname"] = fullname
    if specialization is not None:
        data["specialization"] = specialization
    return await db.clinician.update(
        where={"id": clinicianId},
        data=data,
        include={"user": True}
    )

async def deleteClinician(clinicianId: int):  # FIX: was "deleteClininian"
    return await db.clinician.delete(where={"id": clinicianId})

async def getAllClinicians():
    return await db.clinician.find_many(
        include={"user": True}
    )
```

#### 2.3 Assignment Service (app/services/assignment.py) - NEW

```python
from app.db import db
from datetime import datetime

async def createAssignment(patientId: int, clinicianId: int):
    return await db.assignments.create(
        data={
            "patientId": patientId,
            "clinicianId": clinicianId,
            "status": "ACTIVE",
            "assignedAt": datetime.now()
        },
        include={"patient": {"include": {"user": True}}, "clinician": {"include": {"user": True}}}
    )

async def getAssignmentById(assignmentId: int):
    return await db.assignments.find_unique(
        where={"id": assignmentId},
        include={"patient": {"include": {"user": True}}, "clinician": {"include": {"user": True}}}
    )

async def getAllAssignments():
    return await db.assignments.find_many(
        include={"patient": {"include": {"user": True}}, "clinician": {"include": {"user": True}}}
    )

async def updateAssignmentStatus(assignmentId: int, status: str):
    return await db.assignments.update(
        where={"id": assignmentId},
        data={"status": status},
        include={"patient": {"include": {"user": True}}, "clinician": {"include": {"user": True}}}
    )

async def deleteAssignment(assignmentId: int):
    return await db.assignments.delete(where={"id": assignmentId})

async def checkAssignmentExists(patientId: int, clinicianId: int):
    return await db.assignments.find_first(
        where={
            "patientId": patientId,
            "clinicianId": clinicianId
        }
    )
```

#### 2.4 Symptom Report Service (app/services/symptom_report.py) - NEW

```python
from app.db import db
from datetime import datetime

async def createSymptomReport(patientId: int, notes: str):
    return await db.symptomreport.create(
        data={
            "patientId": patientId,
            "notes": notes,
            "createdAt": datetime.now()
        }
    )

async def getSymptomReportById(reportId: int):
    return await db.symptomreport.find_unique(where={"id": reportId})

async def getAllSymptomReports():
    return await db.symptomreport.find_many(
        order={"createdAt": "desc"}
    )

async def getSymptomReportsByPatient(patientId: int):
    return await db.symptomreport.find_many(
        where={"patientId": patientId},
        order={"createdAt": "desc"}
    )

async def deleteSymptomReport(reportId: int):
    return await db.symptomreport.delete(where={"id": reportId})
```

#### 2.5 Dashboard Service (app/services/dashboard.py) - NEW

```python
from app.db import db

async def getStats():
    users = await db.user.count()
    patients = await db.patient.count()
    clinicians = await db.clinician.count()
    assignments = await db.assignments.count()
    active_assignments = await db.assignments.count(where={"status": "ACTIVE"})
    
    return {
        "totalUsers": users,
        "totalPatients": patients,
        "totalClinicians": clinicians,
        "totalAssignments": assignments,
        "activeAssignments": active_assignments
    }

async def getRecentActivity():
    recent_reports = await db.symptomreport.find_many(
        take=5,
        order={"createdAt": "desc"}
    )
    
    recent_assignments = await db.assignments.find_many(
        take=5,
        order={"assignedAt": "desc"},
        include={"patient": {"include": {"user": True}}, "clinician": {"include": {"user": True}}}
    )
    
    recent_users = await db.user.find_many(
        take=5,
        order={"createdAt": "desc"}
    )
    
    return {
        "recentSymptomReports": recent_reports,
        "recentAssignments": recent_assignments,
        "recentUsers": recent_users
    }
```

### 3. Controller Layer

#### 3.1 Patient Controller (app/controllers/patient_controller.py)

**Bug Fixes:**

```python
from fastapi import HTTPException
from app.services import patient as patientService
from app.services import user as userService
from app.schemas.patient_schema import CreatePatient, UpdatePatient, PatientResponse

async def createPatient(payload: CreatePatient):
    # Check user exists
    user = await userService.getUserById(payload.userId)
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")
    
    # Check user is PATIENT role
    if str(user.role).upper() != "PATIENT":
        raise HTTPException(status_code=400, detail="User must have PATIENT role")
    
    # FIX: Check by userId, not patientId
    existing = await patientService.getPatientbyUserId(payload.userId)
    if existing:
        # FIX: Correct error message
        raise HTTPException(status_code=409, detail="Patient profile already exists")
    
    return await patientService.createPatient(
        userId=payload.userId,
        emergencyContact=payload.emergencyContact,
        dateOfBirth=payload.dateOfBirth,
        gender=payload.gender
    )

async def getPatient(patientId: int):
    patient = await patientService.getPatientbyId(patientId)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

async def getAllPatients():
    return await patientService.getAllPatients()

async def updatePatient(patientId: int, payload: UpdatePatient):
    existing = await patientService.getPatientbyId(patientId)
    if not existing:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # FIX: Call service correctly with patientId
    return await patientService.updatePatient(
        patientId=patientId,
        emergencyContact=payload.emergencyContact,
        dateOfBirth=payload.dateOfBirth,
        gender=payload.gender
    )

async def deletePatient(patientId: int):
    existing = await patientService.getPatientbyId(patientId)
    if not existing:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    await patientService.deletePatient(patientId)
    return {"message": "Patient profile deleted successfully"}
```

### 4. Route Definitions

#### 4.1 Patient Routes (app/routes/patients.py)

```python
from fastapi import APIRouter
from typing import List
from app.controllers import patient_controller as controller
from app.schemas.patient_schema import CreatePatient, UpdatePatient, PatientResponse

router = APIRouter(prefix="/api/patients", tags=["patients"])

@router.post("/", response_model=PatientResponse, status_code=201)
async def createPatient(payload: CreatePatient):
    return await controller.createPatient(payload)

@router.get("/", response_model=List[PatientResponse])
async def getAllPatients():
    return await controller.getAllPatients()

@router.get("/{patientId}", response_model=PatientResponse)
async def getPatient(patientId: int):
    return await controller.getPatient(patientId)

@router.put("/{patientId}", response_model=PatientResponse)
async def updatePatient(patientId: int, payload: UpdatePatient):
    return await controller.updatePatient(patientId, payload)

@router.delete("/{patientId}")
async def deletePatient(patientId: int):
    return await controller.deletePatient(patientId)
```

### 5. Response Schemas

#### 5.1 Patient Schema (app/schemas/patient_schema.py)

```python
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.user_schemas import UserResponse

class CreatePatient(BaseModel):
    userId: int
    emergencyContact: str
    dateOfBirth: datetime
    gender: str

class UpdatePatient(BaseModel):
    emergencyContact: str | None = None
    dateOfBirth: datetime | None = None
    gender: str | None = None

class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    userId: int
    emergencyContact: str | None = None
    dateOfBirth: datetime | None = None
    gender: str
    updatedAt: datetime
    user: UserResponse | None = None
```

#### 5.2 Clinician Schema (app/schemas/clinician_schema.py)

```python
from pydantic import BaseModel, ConfigDict
from app.schemas.user_schemas import UserResponse

class CreateClinician(BaseModel):
    userId: int
    fullname: str
    specialization: str

class UpdateClinician(BaseModel):
    fullname: str | None = None
    specialization: str | None = None

class ClinicianResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    userId: int
    fullname: str
    specialization: str
    user: UserResponse | None = None
```

#### 5.3 Assignment Schema (app/schemas/assignment_schema.py) - NEW

```python
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.patient_schema import PatientResponse
from app.schemas.clinician_schema import ClinicianResponse

class CreateAssignment(BaseModel):
    patientId: int
    clinicianId: int

class UpdateAssignmentStatus(BaseModel):
    status: str  # "ACTIVE" or "INACTIVE"

class AssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    patientId: int
    clinicianId: int
    assignedAt: datetime
    status: str
    patient: PatientResponse | None = None
    clinician: ClinicianResponse | None = None
```

#### 5.4 Symptom Report Schema (app/schemas/symptom_report_schema.py) - NEW

```python
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CreateSymptomReport(BaseModel):
    patientId: int
    notes: str

class SymptomReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    patientId: int
    notes: str
    createdAt: datetime
```

#### 5.5 Dashboard Schema (app/schemas/dashboard_schema.py) - NEW

```python
from pydantic import BaseModel, ConfigDict
from app.schemas.symptom_report_schema import SymptomReportResponse
from app.schemas.assignment_schema import AssignmentResponse
from app.schemas.user_schemas import UserResponse

class StatsResponse(BaseModel):
    totalUsers: int
    totalPatients: int
    totalClinicians: int
    totalAssignments: int
    activeAssignments: int

class RecentActivityResponse(BaseModel):
    recentSymptomReports: list[SymptomReportResponse]
    recentAssignments: list[AssignmentResponse]
    recentUsers: list[UserResponse]
```

---

## Phase 2: Intelligence Layer

---

## Intelligence Layer Components

### 1. Database Schema Extensions

The Intelligence Layer requires new database models to support risk classification, trend analysis, alerts, and performance metrics.

#### 1.1 Updated Prisma Schema

```prisma
// Add to existing schema.prisma

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
}

enum TrendStatus {
  IMPROVING
  STABLE
  WORSENING
}

enum AlertPriority {
  LOW
  MEDIUM
  HIGH
}

model Patient {
  id Int @id @default(autoincrement())
  userId Int @unique
  emergencyContact String
  dateOfBirth DateTime
  gender String
  updatedAt DateTime @updatedAt
  
  // Intelligence Layer fields
  currentRiskLevel RiskLevel @default(LOW)
  currentTrendStatus TrendStatus @default(STABLE)
  lastRiskUpdate DateTime?
  lastTrendUpdate DateTime?
  
  user User @relation(fields: [userId], references: [id])
  assignments Assignments[]
  symptomReports SymptomReport[]
}

model SymptomReport {
  id Int @id @default(autoincrement())
  patientId Int
  notes String
  createdAt DateTime @default(now())
  
  // Intelligence Layer fields
  riskLevel RiskLevel @default(LOW)
  riskScore Float @default(0.0)
  riskFactors String? // JSON string of contributing factors
  
  patient Patient @relation(fields: [patientId], references: [id])
  alerts Alert[]
}

model Alert {
  id Int @id @default(autoincrement())
  patientId Int
  symptomReportId Int
  priority AlertPriority
  alertType String // "HIGH_RISK" or "WORSENING_TREND"
  message String
  isRead Boolean @default(false)
  createdAt DateTime @default(now())
  
  patient Patient @relation(fields: [patientId], references: [id])
  symptomReport SymptomReport @relation(fields: [symptomReportId], references: [id])
}

model PerformanceMetric {
  id Int @id @default(autoincrement())
  endpoint String
  method String
  responseTimeMs Int
  statusCode Int
  errorType String?
  errorMessage String?
  timestamp DateTime @default(now())
  userId Int?
}
```

### 2. Risk Classification Service

The Risk Classification Engine computes risk scores using a deterministic, rule-based algorithm.

**Design Decisions:**
- Rule-based (not ML) for deterministic, explainable results
- Symptom keywords mapped to severity weights
- Frequency scoring based on reports per time window
- Duration scoring based on time since first similar symptom
- Must complete within 500ms (Requirement 11.8)

#### 2.1 Risk Classification Service (app/services/risk_classification.py) - NEW

```python
"""
Risk Classification Engine

Computes risk scores and classifies patients into LOW, MEDIUM, or HIGH risk levels
based on symptom combinations, report frequency, and symptom duration.

Design Decisions:
- Rule-based (not ML) for deterministic, explainable results
- Symptom keywords mapped to severity weights
- Frequency scoring based on reports per time window
- Duration scoring based on time since first similar symptom
"""
from app.db import db
from datetime import datetime, timedelta
from typing import Tuple
import json
import re

# Symptom severity keywords and their weights
SEVERE_SYMPTOMS = {
    # Critical symptoms (weight: 3.0)
    r'\b(chest pain|difficulty breathing|severe bleeding|unconscious|stroke|heart attack)\\b': 3.0,
    # High severity symptoms (weight: 2.0)
    r'\b(high fever|persistent vomiting|severe pain|confusion|fainting|rapid heartbeat)\\b': 2.0,
    # Moderate symptoms (weight: 1.0)
    r'\b(fever|cough|headache|nausea|dizziness|fatigue|pain)\\b': 1.0,
}

# Risk thresholds
RISK_THRESHOLDS = {
    'LOW': 0.0,
    'MEDIUM': 2.0,
    'HIGH': 4.0,
}

# Time windows for frequency analysis
FREQUENCY_WINDOW_DAYS = 7
DURATION_WINDOW_DAYS = 30


async def computeRiskScore(patientId: int, notes: str) -> Tuple[float, dict]:
    """
    Compute a risk score for a symptom report.
    
    Returns: (risk_score, risk_factors_dict)
    """
    risk_factors = {}
    total_score = 0.0
    
    # 1. Symptom combination analysis
    symptom_score, matched_symptoms = _analyzeSymptomCombinations(notes)
    risk_factors['symptom_score'] = symptom_score
    risk_factors['matched_symptoms'] = matched_symptoms
    total_score += symptom_score
    
    # 2. Report frequency analysis
    frequency_score, report_count = await _analyzeReportFrequency(patientId)
    risk_factors['frequency_score'] = frequency_score
    risk_factors['report_count_7d'] = report_count
    total_score += frequency_score
    
    # 3. Symptom duration analysis
    duration_score, days_since_first = await _analyzeSymptomDuration(patientId, notes)
    risk_factors['duration_score'] = duration_score
    risk_factors['days_since_first_report'] = days_since_first
    total_score += duration_score
    
    return total_score, risk_factors


def _analyzeSymptomCombinations(notes: str) -> Tuple[float, list]:
    """
    Analyze symptom notes for severe symptom combinations.
    
    Returns: (score, list of matched symptoms)
    """
    notes_lower = notes.lower()
    total_score = 0.0
    matched = []
    
    for pattern, weight in SEVERE_SYMPTOMS.items():
        if re.search(pattern, notes_lower):
            total_score += weight
            matched.append(pattern)
    
    # Bonus for multiple severe symptoms (combinations indicate higher risk)
    if len(matched) >= 2:
        total_score += 1.0  # Combination bonus
    
    return total_score, matched


async def _analyzeReportFrequency(patientId: int) -> Tuple[float, int]:
    """
    Analyze report frequency within the time window.
    
    Returns: (frequency_score, report_count)
    """
    window_start = datetime.now() - timedelta(days=FREQUENCY_WINDOW_DAYS)
    
    reports = await db.symptomreport.find_many(
        where={
            "patientId": patientId,
            "createdAt": {"gte": window_start}
        }
    )
    
    report_count = len(reports)
    
    # Frequency scoring: more reports = higher risk
    if report_count >= 5:
        frequency_score = 2.0
    elif report_count >= 3:
        frequency_score = 1.0
    else:
        frequency_score = 0.0
    
    return frequency_score, report_count


async def _analyzeSymptomDuration(patientId: int, notes: str) -> Tuple[float, int]:
    """
    Analyze how long symptoms have been reported.
    
    Returns: (duration_score, days_since_first_report)
    """
    window_start = datetime.now() - timedelta(days=DURATION_WINDOW_DAYS)
    
    first_report = await db.symptomreport.find_first(
        where={
            "patientId": patientId,
            "createdAt": {"gte": window_start}
        },
        order={"createdAt": "asc"}
    )
    
    if not first_report:
        return 0.0, 0
    
    days_since_first = (datetime.now() - first_report.createdAt).days
    
    # Duration scoring: longer duration = higher risk
    if days_since_first >= 21:
        duration_score = 2.0
    elif days_since_first >= 14:
        duration_score = 1.0
    else:
        duration_score = 0.0
    
    return duration_score, days_since_first


def classifyRiskLevel(risk_score: float) -> str:
    """
    Classify risk score into LOW, MEDIUM, or HIGH.
    
    Returns: Risk level string
    """
    if risk_score >= RISK_THRESHOLDS['HIGH']:
        return 'HIGH'
    elif risk_score >= RISK_THRESHOLDS['MEDIUM']:
        return 'MEDIUM'
    else:
        return 'LOW'


async def classifySymptomReport(patientId: int, notes: str) -> Tuple[str, float, str]:
    """
    Main entry point for risk classification.
    
    Returns: (risk_level, risk_score, risk_factors_json)
    """
    import time
    start_time = time.time()
    
    risk_score, risk_factors = await computeRiskScore(patientId, notes)
    risk_level = classifyRiskLevel(risk_score)
    risk_factors_json = json.dumps(risk_factors)
    
    # Ensure completion within 500ms (Requirement 11.8)
    elapsed_ms = (time.time() - start_time) * 1000
    if elapsed_ms > 500:
        # Log warning but don't fail
        print(f"Warning: Risk classification took {elapsed_ms}ms")
    
    return risk_level, risk_score, risk_factors_json
```

### 3. Trend Analysis Service

The Trend Analysis Engine analyzes historical symptom reports to detect health trends.

**Design Decisions:**
- Compares current report with at least 3 most recent previous reports (Requirement 12.2)
- Uses symptom severity scoring to detect changes over time
- Assigns STABLE status when fewer than 3 historical reports exist (Requirement 12.5)
- Considers both severity changes and frequency changes

#### 3.1 Trend Analysis Service (app/services/trend_analysis.py) - NEW

```python
"""
Trend Analysis Engine

Analyzes historical symptom reports to detect health trends:
- IMPROVING: Symptom severity decreasing over time
- STABLE: No significant change in symptom severity
- WORSENING: Symptom severity increasing over time

Design Decisions:
- Compares current report with at least 3 most recent previous reports
- Uses symptom severity scoring to detect changes over time
- Assigns STABLE status when fewer than 3 historical reports exist
- Considers both severity changes and frequency changes
"""
from app.db import db
from datetime import datetime, timedelta
from typing import List, Tuple
import re

# Minimum number of historical reports for trend analysis
MIN_HISTORICAL_REPORTS = 3

# Severity scoring for trend comparison
SEVERITY_KEYWORDS = {
    # Critical (severity: 3)
    r'\b(chest pain|difficulty breathing|severe bleeding|unconscious|stroke|heart attack)\\b': 3,
    # High (severity: 2)
    r'\b(high fever|persistent vomiting|severe pain|confusion|fainting|rapid heartbeat)\\b': 2,
    # Moderate (severity: 1)
    r'\b(fever|cough|headache|nausea|dizziness|fatigue|pain)\\b': 1,
    # Improving indicators (negative severity)
    r'\b(better|improving|less pain|recovering|healing)\\b': -1,
}


def _calculateSeverityScore(notes: str) -> int:
    """
    Calculate a severity score for symptom notes.
    
    Returns: Integer severity score
    """
    notes_lower = notes.lower()
    total_score = 0
    
    for pattern, severity in SEVERITY_KEYWORDS.items():
        if re.search(pattern, notes_lower):
            total_score += severity
    
    return total_score


async def getHistoricalReports(patientId: int, limit: int = 4) -> List[dict]:
    """
    Get the most recent historical reports for a patient.
    
    Returns: List of symptom reports (most recent first)
    """
    reports = await db.symptomreport.find_many(
        where={"patientId": patientId},
        order={"createdAt": "desc"},
        take=limit
    )
    
    return reports


async def analyzeTrend(patientId: int, currentNotes: str) -> Tuple[str, dict]:
    """
    Analyze trend for a patient based on historical reports.
    
    Returns: (trend_status, trend_details)
    """
    # Get historical reports (excluding current report being processed)
    historical = await getHistoricalReports(patientId, limit=MIN_HISTORICAL_REPORTS + 1)
    
    # If fewer than 3 historical reports, assign STABLE (Requirement 12.5)
    if len(historical) < MIN_HISTORICAL_REPORTS:
        return 'STABLE', {
            'reason': 'insufficient_history',
            'report_count': len(historical)
        }
    
    # Calculate severity scores for historical reports
    severity_scores = []
    for report in historical[:MIN_HISTORICAL_REPORTS]:
        score = _calculateSeverityScore(report.notes)
        severity_scores.append(score)
    
    # Calculate current report severity
    current_severity = _calculateSeverityScore(currentNotes)
    
    # Calculate average historical severity
    avg_historical_severity = sum(severity_scores) / len(severity_scores)
    
    # Determine trend based on severity change
    severity_change = current_severity - avg_historical_severity
    
    trend_details = {
        'current_severity': current_severity,
        'avg_historical_severity': avg_historical_severity,
        'severity_change': severity_change,
        'historical_scores': severity_scores
    }
    
    # Trend thresholds
    IMPROVING_THRESHOLD = -1.0
    WORSENING_THRESHOLD = 1.0
    
    if severity_change <= IMPROVING_THRESHOLD:
        trend_status = 'IMPROVING'
    elif severity_change >= WORSENING_THRESHOLD:
        trend_status = 'WORSENING'
    else:
        trend_status = 'STABLE'
    
    return trend_status, trend_details


async def updatePatientTrendStatus(patientId: int, trendStatus: str) -> None:
    """
    Update the patient's current trend status.
    """
    await db.patient.update(
        where={"id": patientId},
        data={
            "currentTrendStatus": trendStatus,
            "lastTrendUpdate": datetime.now()
        }
    )
```

### 4. Alert Generation Service

The Alert Generation System creates alerts for HIGH risk and WORSENING trend conditions.

**Design Decisions:**
- Generates alerts for HIGH risk classification (Requirement 13.1)
- Generates alerts for WORSENING trend status (Requirement 13.2)
- HIGH risk alerts get HIGH priority (Requirement 13.4)
- WORSENING trend alerts get MEDIUM priority (Requirement 13.5)
- Alerts are associated with patient and symptom report (Requirement 13.7)

#### 4.1 Alert Service (app/services/alert_service.py) - NEW

```python
"""
Alert Generation System

Generates and manages alerts based on:
- HIGH risk classification
- WORSENING trend status

Design Decisions:
- HIGH risk alerts get HIGH priority
- WORSENING trend alerts get MEDIUM priority
- Alerts are stored in database with timestamps
- Alerts are associated with patient and symptom report
"""
from app.db import db
from datetime import datetime
from typing import List, Optional


async def generateAlert(
    patientId: int,
    symptomReportId: int,
    alertType: str,
    priority: str,
    message: str
) -> dict:
    """
    Generate a new alert.
    
    Returns: Created alert record
    """
    alert = await db.alert.create(
        data={
            "patientId": patientId,
            "symptomReportId": symptomReportId,
            "alertType": alertType,
            "priority": priority,
            "message": message,
            "isRead": False,
            "createdAt": datetime.now()
        },
        include={"patient": {"include": {"user": True}}}
    )
    
    return alert


async def generateRiskAlert(patientId: int, symptomReportId: int, riskLevel: str) -> Optional[dict]:
    """
    Generate alert for HIGH risk classification (Requirement 13.1).
    
    Returns: Created alert or None
    """
    if riskLevel != 'HIGH':
        return None
    
    return await generateAlert(
        patientId=patientId,
        symptomReportId=symptomReportId,
        alertType='HIGH_RISK',
        priority='HIGH',  # Requirement 13.4
        message=f"Patient has been classified as HIGH risk. Immediate attention required."
    )


async def generateTrendAlert(patientId: int, symptomReportId: int, trendStatus: str) -> Optional[dict]:
    """
    Generate alert for WORSENING trend (Requirement 13.2).
    
    Returns: Created alert or None
    """
    if trendStatus != 'WORSENING':
        return None
    
    return await generateAlert(
        patientId=patientId,
        symptomReportId=symptomReportId,
        alertType='WORSENING_TREND',
        priority='MEDIUM',  # Requirement 13.5
        message=f"Patient's condition is worsening. Review recommended."
    )


async def getAlerts(
    priority: Optional[str] = None{}
,
    isRead: Optional[bool] = None,
    limit: int = 50
) -> List[dict]:
    """
    Retrieve alerts with optional filtering.
    
    Returns alerts sorted by priority (highest first) and timestamp (most recent first).
    Requirement 13.9
    """
    where_clause = {}
    
    if priority is not None:
        where_clause["priority"] = priority
    
    if isRead is not None:
        where_clause["isRead"] = isRead
    
    alerts = await db.alert.find_many(
        where=where_clause,
        order=[
            {"priority": "desc"},
            {"createdAt": "desc"}
        ],
        take=limit,
        include={
            "patient": {"include": {"user": True}},
            "symptomReport": True
        }
    )
    
    return alerts


async def markAlertAsRead(alertId: int) -> dict:
    """
    Mark an alert as read.
    """
    return await db.alert.update(
        where={"id": alertId},
        data={"isRead": True}
    )


async def getAlertsByPatient(patientId: int) -> List[dict]:
    """
    Get all alerts for a specific patient.
    """
    return await db.alert.find_many(
        where={"patientId": patientId},
        order={"createdAt": "desc"},
        include={"symptomReport": True}
    )
```

### 5. Enhanced Symptom Report Service

The symptom report service is enhanced to integrate risk classification, trend analysis, and alert generation.

#### 5.1 Enhanced Symptom Report Service (app/services/symptom_report.py) - UPDATED

```python
"""
Enhanced Symptom Report Service

Integrates:
- Risk classification on report creation
- Trend analysis on report creation
- Alert generation for HIGH risk and WORSENING trends
"""
from app.db import db
from datetime import datetime
from app.services.risk_classification import classifySymptomReport
from app.services.trend_analysis import analyzeTrend, updatePatientTrendStatus
from app.services.alert_service import generateRiskAlert, generateTrendAlert


async def createSymptomReport(patientId: int, notes: str) -> dict:
    """
    Create a symptom report with risk classification and trend analysis.
    
    Flow:
    1. Create the report
    2. Compute risk classification
    3. Analyze trend
    4. Update patient status
    5. Generate alerts if needed
    """
    # 1. Create the base report
    report = await db.symptomreport.create(
        data={
            "patientId": patientId,
            "notes": notes,
            "createdAt": datetime.now(),
            "riskLevel": "LOW",
            "riskScore": 0.0
        }
    )
    
    # 2. Compute risk classification
    risk_level, risk_score, risk_factors = await classifySymptomReport(patientId, notes)
    
    # Update report with risk data
    report = await db.symptomreport.update(
        where={"id": report.id},
        data={
            "riskLevel": risk_level,
            "riskScore": risk_score,
            "riskFactors": risk_factors
        }
    )
    
    # 3. Analyze trend
    trend_status, trend_details = await analyzeTrend(patientId, notes)
    
    # 4. Update patient status
    await db.patient.update(
        where={"id": patientId},
        data={
            "currentRiskLevel": risk_level,
            "currentTrendStatus": trend_status,
            "lastRiskUpdate": datetime.now(),
            "lastTrendUpdate": datetime.now()
        }
    )
    
    # 5. Generate alerts
    await generateRiskAlert(patientId, report.id, risk_level)
    await generateTrendAlert(patientId, report.id, trend_status)
    
    return report


async def getSymptomReportById(reportId: int):
    return await db.symptomreport.find_unique(where={"id": reportId})


async def getAllSymptomReports():
    return await db.symptomreport.find_many(
        order={"createdAt": "desc"}
    )


async def getSymptomReportsByPatient(patientId: int):
    return await db.symptomreport.find_many(
        where={"patientId": patientId},
        order={"createdAt": "desc"}
    )


async def deleteSymptomReport(reportId: int):
    return await db.symptomreport.delete(where={"id": reportId})
```

### 6. Dashboard Prioritization Service

The Dashboard Prioritization System sorts patients by urgency for clinician review.

**Design Decisions:**
- Sort by risk level (HIGH first) - Requirement 14.1
- Secondary sort by trend status (WORSENING first) - Requirement 14.2
- Tertiary sort by submission time (most recent first) - Requirement 14.3
- Filter by assigned clinician - Requirement 14.7

#### 6.1 Enhanced Dashboard Service (app/services/dashboard.py) - UPDATED

```python
"""
Enhanced Dashboard Service

Provides:
- Basic statistics (Phase 1)
- Recent activity (Phase 1)
- Prioritized patient list (Phase 2)
- Trend data API (Phase 2)
"""
from app.db import db
from datetime import datetime
from typing import List, Optional


async def getStats():
    """Get basic platform statistics."""
    users = await db.user.count()
    patients = await db.patient.count()
    clinicians = await db.clinician.count()
    assignments = await db.assignments.count()
    active_assignments = await db.assignments.count(where={"status": "ACTIVE"})
    
    return {
        "totalUsers": users,
        "totalPatients": patients,
        "totalClinicians": clinicians,
        "totalAssignments": assignments,
        "activeAssignments": active_assignments
    }


async def getRecentActivity():
    """Get recent platform activity."""
    recent_reports = await db.symptomreport.find_many(
        take=5,
        order={"createdAt": "desc"},
        include={"patient": {"include": {"user": True}}}
    )
    
    recent_assignments = await db.assignments.find_many(
        take=5,
        order={"assignedAt": "desc"},
        include={"patient": {"include": {"user": True}}, "clinician": {"include": {"user": True}}}
    )
    
    recent_users = await db.user.find_many(
        take=5,
        order={"createdAt": "desc"}
    )
    
    return {
        "recentSymptomReports": recent_reports,
        "recentAssignments": recent_assignments,
        "recentUsers": recent_users
    }


async def getPrioritizedPatients(clinicianId: Optional[int] = None) -> List[dict]:
    """
    Get patients sorted by urgency for clinician dashboard.
    
    Sort order (Requirement 14.1-14.3):
    1. Risk level (HIGH first)
    2. Trend status (WORSENING first)
    3. Submission time (most recent first)
    
    Filter by assigned clinician if provided (Requirement 14.7).
    """
    # Build query
    where_clause = {}
    
    if clinicianId is not None:
        # Filter to patients assigned to this clinician
        where_clause["assignments"] = {
            "some": {
                "clinicianId": clinicianId,
                "status": "ACTIVE"
            }
        }
    
    patients = await db.patient.find_many(
        where=where_clause,
        include={
            "user": True,
            "symptomReports": {
                "take": 1,
                "order": {"createdAt": "desc"}
            }
        }
    )
    
    # Sort in Python for complex multi-field sorting
    # Risk level order: HIGH=3, MEDIUM=2, LOW=1
    risk_order = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
    # Trend order: WORSENING=3, STABLE=2, IMPROVING=1
    trend_order = {"WORSENING": 3, "STABLE": 2, "IMPROVING": 1}
    
    def sort_key(patient):
        risk = risk_order.get(str(patient.currentRiskLevel), 0)
        trend = trend_order.get(str(patient.currentTrendStatus), 0)
        # Use last report time or epoch
        last_report_time = patient.symptomReports[0].createdAt if patient.symptomReports else datetime.min
        return (-risk, -trend, -last_report_time.timestamp())
    
    sorted_patients = sorted(patients, key=sort_key)
    
    return sorted_patients


async def getPatientTrendData(patientId: int) -> dict:
    """
    Get trend data for a specific patient.
    Requirement 12.6
    """
    patient = await db.patient.find_unique(
        where={"id": patientId},
        include={
            "user": True,
            "symptomReports": {
                "take": 10,
                "order": {"createdAt": "desc"}
            }
        }
    )
    
    if not patient:
        return None
    
    return {
        "patientId": patientId,
        "currentRiskLevel": patient.currentRiskLevel,
        "currentTrendStatus": patient.currentTrendStatus,
        "lastRiskUpdate": patient.lastRiskUpdate,
        "lastTrendUpdate": patient.lastTrendUpdate,
        "recentReports": patient.symptomReports
    }
```

### 7. Authentication and Authorization Service

The Security and Access Control system provides role-based authentication.

**Design Decisions:**
- JWT tokens with 24h expiration (Requirement 16.8)
- Role-based permissions: PATIENT, CLINICIAN, ADMIN (Requirement 16.2)
- Data scope restrictions per role (Requirements 16.3-16.5)

#### 7.1 Auth Service (app/services/auth.py) - NEW

```python
"""
Authentication and Authorization Service

Provides:
- JWT token generation and validation
- Role-based access control
- Data scope restrictions

Design Decisions:
- JWT tokens with 24h expiration
- Role-based permissions: PATIENT, CLINICIAN, ADMIN
- Data scope restrictions per role
"""
from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db import db
from app.config.settings import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = settings.SECRET_KEY or "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24  # Requirement 16.8

# Security scheme
security = HTTPBearer()


def hashPassword(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def verifyPassword(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def createAccessToken(user_id: int, role: str) -> str:
    """Create a JWT access token with 24h expiration."""
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decodeAccessToken(token: str) -> dict:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def authenticateUser(email: str, password: str) -> Optional[dict]:
    """
    Authenticate a user by email and password.
    
    Returns: User dict with token, or None if authentication fails
    """
    user = await db.user.find_unique(where={"email": email})
    
    if not user:
        return None
    
    if not verifyPassword(password, user.password):
        return None
    
    token = createAccessToken(user.id, str(user.role))
    
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "token": token
    }


async def getCurrentUser(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    FastAPI dependency to get the current authenticated user.
    
    Returns: User dict with id, email, role
    """
    token = credentials.credentials
    payload = decodeAccessToken(token)
    
    user_id = int(payload.get("sub"))
    user = await db.user.find_unique(where={"id": user_id})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return {
        "id": user.id,
        "email": user.email,
        "role": str(user.role)
    }


def requireRole(allowed_roles: list[str]):
    """
    FastAPI dependency factory to require specific roles.
    
    Usage: @router.get("/", dependencies=[Depends(requireRole(["CLINICIAN", "ADMIN"]))])
    """
    async def role_checker(current_user: dict = Depends(getCurrentUser)) -> dict:
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    
    return role_checker


async def checkDataAccess(current_user: dict, resource_type: str, resource_id: int) -> bool:
    """
    Check if user has access to a specific resource.
    
    Implements data scope restrictions (Requirements 16.3-16.5):
    - PATIENT: Can only access their own records
    - CLINICIAN: Can only access records of assigned patients
    - ADMIN: Can access all records
    """
    role = current_user["role"]
    user_id = current_user["id"]
    
    if role == "ADMIN":
        return True
    
    if role == "PATIENT":
        # Patient can only access their own records
        if resource_type == "patient":
            patient = await db.patient.find_unique(where={"id": resource_id})
            return patient and patient.userId == user_id
        elif resource_type == "symptom_report":
            report = await db.symptomreport.find_unique(
                where={"id": resource_id},
                include={"patient": True}
            )
            return report and report.patient.userId == user_id
        return False
    
    if role == "CLINICIAN":
        # Clinician can only access records of assigned patients
        clinician = await db.clinician.find_unique(where={"userId": user_id})
        if not clinician:
            return False
        
        if resource_type == "patient":
            assignment = await db.assignments.find_first(
                where={
                    "clinicianId": clinician.id,
                    "patientId": resource_id,
                    "status": "ACTIVE"
                }
            )
            return assignment is not None
        elif resource_type == "symptom_report":
            report = await db.symptomreport.find_unique(
                where={"id": resource_id},
                include={"patient": True}
            )
            if not report:
                return False
            assignment = await db.assignments.find_first(
                where={
                    "clinicianId": clinician.id,
                    "patientId": report.patientId,
                    "status": "ACTIVE"
                }
            )
            return assignment is not None
        return False
    
    return False
```

### 8. Performance Metrics Service

The System Performance and Evaluation service tracks response latency and errors.

**Design Decisions:**
- Measures and logs response latency (Requirement 17.1)
- Logs errors with timestamps (Requirement 17.2)
- Provides API endpoints for metrics (Requirements 17.3-17.4)
- Stores metrics for 30 days (Requirement 17.7)

#### 8.1 Metrics Service (app/services/metrics.py) - NEW

```python
"""
Performance Metrics Service

Provides:
- Response latency measurement
- Error logging
- Metrics retrieval API

Design Decisions:
- Measures and logs response latency
- Logs errors with timestamps
- Stores metrics for 30 days
"""
from app.db import db
from datetime import datetime, timedelta
from typing import Optional
import time


async def logRequestMetrics(
    endpoint: str,
    method: str,
    response_time_ms: int,
    status_code: int,
    error_type: Optional[str] = None,
    error_message: Optional[str] = None,
    user_id: Optional[int] = None
) -> None:
    """
    Log request performance metrics.
    Requirement 17.1
    """
    await db.performancemetric.create(
        data={
            "endpoint": endpoint,
            "method": method,
            "responseTimeMs": response_time_ms,
            "statusCode": status_code,
            "errorType": error_type,
            "errorMessage": error_message,
            "timestamp": datetime.now(),
            "userId": user_id
        }
    )


async def logError(
    endpoint: str,
    method: str,
    error_type: str,
    error_message: str,
    user_id: Optional[int] = None
) -> None:
    """
    Log an error with timestamp.
    Requirement 17.2
    """
    await logRequestMetrics(
        endpoint=endpoint,
        method=method,
        response_time_ms=0,
        status_code=500,
        error_type=error_type,
        error_message=error_message,
        user_id=user_id
    )


async def getErrorRateStats(days: int = 7) -> dict:
    """
    Get error rate statistics.
    Requirement 17.3
    """
    window_start = datetime.now() - timedelta(days=days)
    
    total_requests = await db.performancemetric.count(
        where={"timestamp": {"gte": window_start}}
    )
    
    error_requests = await db.performancemetric.count(
        where={
            "timestamp": {"gte": window_start},
            "statusCode": {"gte": 400}
        }
    )
    
    error_rate = (error_requests / total_requests * 100) if total_requests > 0 else 0
    
    # Get error breakdown by type
    errors = await db.performancemetric.find_many(
        where={
            "timestamp": {"gte": window_start},
            "errorType": {"not": None}
        }
    )
    
    error_breakdown = {}
    for error in errors:
        error_breakdown[error.errorType] = error_breakdown.get(error.errorType, 0) + 1
    
    return {
        "period_days": days,
        "total_requests": total_requests,
        "error_requests": error_requests,
        "error_rate_percent": round(error_rate, 2),
        "error_breakdown": error_breakdown
    }


async def getLatencyStats(days: int = 7) -> dict:
    """
    Get average response latency statistics.
    Requirement 17.4
    """
    window_start = datetime.now() - timedelta(days=days)
    
    metrics = await db.performancemetric.find_many(
        where={"timestamp": {"gte": window_start}}
    )
    
    if not metrics:
        return {
            "period_days": days,
            "avg_latency_ms": 0,
            "min_latency_ms": 0,
            "max_latency_ms": 0,
            "p50_latency_ms": 0,
            "p95_latency_ms": 0,
            "p99_latency_ms": 0
        }
    
    latencies = [m.responseTimeMs for m in metrics]
    latencies.sort()
    
    def percentile(data: list, p: float) -> int:
        """Calculate percentile value."""
        if not data:
            return 0
        k = (len(data) - 1) * p / 100
        f = int(k)
        c = f + 1 if f + 1 < len(data) else f
        return data[f] if f == c else int(data[f] + (k - f) * (data[c] - data[f]))
    
    return {
        "period_days": days,
        "avg_latency_ms": round(sum(latencies) / len(latencies), 2),
        "min_latency_ms": min(latencies),
        "max_latency_ms": max(latencies),
        "p50_latency_ms": percentile(latencies, 50),
        "p95_latency_ms": percentile(latencies, 95),
        "p99_latency_ms": percentile(latencies, 99)
    }


async def getRiskClassificationAccuracy() -> dict:
    """
    Get risk classification accuracy metrics.
    Requirement 17.8
    
    Note: This requires a test dataset with known classifications.
    In production, this would compare against validated outcomes.
    """
    # Get all classified reports
    reports = await db.symptomreport.find_many(
        where={"riskLevel": {"not": None}}
    )
    
    total_classified = len(reports)
    
    # Count by risk level
    risk_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    for report in reports:
        level = str(report.riskLevel)
        if level in risk_counts:
            risk_counts[level] += 1
    
    return {
        "total_classified": total_classified,
        "distribution": risk_counts,
        "note": "Accuracy validation requires test dataset with known outcomes"
    }


async def cleanupOldMetrics() -> int:
    """
    Delete metrics older than 30 days.
    Requirement 17.7
    """
    cutoff = datetime.now() - timedelta(days=30)
    
    deleted = await db.performancemetric.delete_many(
        where={"timestamp": {"lt": cutoff}}
    )
    
    return deleted.count if hasattr(deleted, 'count') else 0


class MetricsMiddleware:
    """
    FastAPI middleware to automatically log request metrics.
    """
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        start_time = time.time()
        
        # Capture response status
        status_code = 200
        error_info = None
        
        async def send_wrapper(message):
            nonlocal status_code, error_info
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            status_code = 500
            error_info = (type(e).__name__, str(e))
            raise
        finally:
            elapsed_ms = int((time.time() - start_time) * 1000)
            
            # Log metrics asynchronously (don't block response)
            endpoint = scope.get("path", "")
            method = scope.get("method", "")
            
            await logRequestMetrics(
                endpoint=endpoint,
                method=method,
                response_time_ms=elapsed_ms,
                status_code=status_code,
                error_type=error_info[0] if error_info else None,
                error_message=error_info[1] if error_info else None
            )
```

### 9. Low-Bandwidth Optimization

The Low-Bandwidth Optimization ensures the system works on slow connections.

**Design Decisions:**
- Minimize payload sizes (Requirement 15.1)
- Support text-based inputs (Requirement 15.2)
- Complete requests within 5 seconds (Requirement 15.3)
- JSON compression for responses > 1KB (Requirement 15.5)
- Minimal confirmation response < 500 bytes (Requirement 15.6)

#### 9.1 Response Compression Middleware (app/utils/compression.py) - NEW

```python
"""
Low-Bandwidth Optimization Utilities

Provides:
- Response compression for large payloads
- Minimal response options
- Payload size optimization

Design Decisions:
- JSON compression for responses > 1KB
- Minimal confirmation responses < 500 bytes
- Support for gzip encoding
"""
import gzip
import json
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from typing import Any


COMPRESSION_THRESHOLD_BYTES = 1024  # Requirement 15.5
MINIMAL_RESPONSE_MAX_BYTES = 500    # Requirement 15.6


def createMinimalResponse(message: str, status: str = "success") -> dict:
    """
    Create a minimal confirmation response under 500 bytes.
    Requirement 15.6
    """
    response = {"status": status, "message": message}
    # Ensure response is under 500 bytes
    response_json = json.dumps(response)
    if len(response_json) > MINIMAL_RESPONSE_MAX_BYTES:
        response = {"status": status}
    return response


async def compressResponse(data: Any, accept_encoding: str = "") -> Response:
    """
    Compress response if it exceeds threshold and client accepts gzip.
    Requirement 15.5
    """
    json_data = json.dumps(data, default=str)
    
    # Check if compression is needed and accepted
    if len(json_data) > COMPRESSION_THRESHOLD_BYTES and "gzip" in accept_encoding:
        compressed = gzip.compress(json_data.encode("utf-8"))
        return Response(
            content=compressed,
            media_type="application/json",
            headers={"Content-Encoding": "gzip"}
        )
    
    return JSONResponse(content=data)


class CompressionMiddleware:
    """
    FastAPI middleware for automatic response compression.
    """
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Store original send
        original_send = send
        response_body = []
        response_headers = []
        response_status = 200
        
        async def send_wrapper(message):
            nonlocal response_body, response_headers, response_status
            
            if message["type"] == "http.response.start":
                response_status = message["status"]
                response_headers = list(message.get("headers", []))
            elif message["type"] == "http.response.body":
                if "body" in message:
                    response_body.append(message["body"])
            
            await original_send(message)
        
        await self.app(scope, receive, send_wrapper)
```

### 10. New Schemas for Intelligence Layer

#### 10.1 Alert Schema (app/schemas/alert_schema.py) - NEW

```python
"""Alert schemas for Intelligence Layer."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    patientId: int
    symptomReportId: int
    priority: str
    alertType: str
    message: str
    isRead: bool
    createdAt: datetime


class AlertListResponse(BaseModel):
    alerts: list[AlertResponse]
    total: int


class MarkAlertRead(BaseModel):
    isRead: bool = True
```

#### 10.2 Metrics Schema (app/schemas/metrics_schema.py) - NEW

```python
"""Metrics schemas for Intelligence Layer."""
from pydantic import BaseModel
from typing import Optional


class ErrorRateResponse(BaseModel):
    period_days: int
    total_requests: int
    error_requests: int
    error_rate_percent: float
    error_breakdown: dict[str, int]


class LatencyStatsResponse(BaseModel):
    period_days: int
    avg_latency_ms: float
    min_latency_ms: int
    max_latency_ms: int
    p50_latency_ms: int
    p95_latency_ms: int
    p99_latency_ms: int


class RiskAccuracyResponse(BaseModel):
    total_classified: int
    distribution: dict[str, int]
    note: str
```

#### 10.3 Auth Schema (app/schemas/auth_schema.py) - NEW

```python
"""Authentication schemas for Intelligence Layer."""
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    id: int
    email: str
    role: str
    token: str


class TokenPayload(BaseModel):
    sub: str
    role: str
    exp: int
```

#### 10.4 Enhanced Symptom Report Schema (app/schemas/symptom_report_schema.py) - UPDATED

```python
"""Enhanced Symptom Report schemas with Intelligence Layer fields."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class CreateSymptomReport(BaseModel):
    patientId: int
    notes: str


class SymptomReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    patientId: int
    notes: str
    createdAt: datetime
    # Intelligence Layer fields
    riskLevel: str = "LOW"
    riskScore: float = 0.0
    riskFactors: Optional[str] = None


class SymptomReportWithRiskResponse(SymptomReportResponse):
    """Extended response with risk factors parsed."""
    riskFactorsParsed: Optional[dict] = None
```

#### 10.5 Enhanced Patient Schema (app/schemas/patient_schema.py) - UPDATED

```python
"""Enhanced Patient schemas with Intelligence Layer fields."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.user_schemas import UserResponse
from typing import Optional


class CreatePatient(BaseModel):
    userId: int
    emergencyContact: str
    dateOfBirth: datetime
    gender: str


class UpdatePatient(BaseModel):
    emergencyContact: Optional[str] = None
    dateOfBirth: Optional[datetime] = None
    gender: Optional[str] = None


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    userId: int
    emergencyContact: str
    dateOfBirth: datetime
    gender: str
    updatedAt: datetime
    user: Optional[UserResponse] = None
    # Intelligence Layer fields
    currentRiskLevel: str = "LOW"
    currentTrendStatus: str = "STABLE"
    lastRiskUpdate: Optional[datetime] = None
    lastTrendUpdate: Optional[datetime] = None


class PatientWithTrendResponse(PatientResponse):
    """Extended response with trend data."""
    recentReports: list = []
```

### 11. New Controllers for Intelligence Layer

#### 11.1 Alert Controller (app/controllers/alert_controller.py) - NEW

```python
"""Alert controller for Intelligence Layer."""
from fastapi import HTTPException, Depends
from app.services import alert_service
from app.services.auth import getCurrentUser
from typing import Optional


async def getAlerts(
    priority: Optional[str] = None,
    isRead: Optional[bool] = None,
    current_user: dict = Depends(getCurrentUser)
):
    """Get alerts with optional filtering."""
    # Only clinicians and admins can view all alerts
    if current_user["role"] not in ["CLINICIAN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    alerts = await alert_service.getAlerts(priority=priority, isRead=isRead)
    return {"alerts": alerts, "total": len(alerts)}


async def markAlertAsRead(alertId: int, current_user: dict = Depends(getCurrentUser)):
    """Mark an alert as read."""
    if current_user["role"] not in ["CLINICIAN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    alert = await alert_service.markAlertAsRead(alertId)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
```

#### 11.2 Metrics Controller (app/controllers/metrics_controller.py) - NEW

```python
"""Metrics controller for Intelligence Layer."""
from fastapi import HTTPException, Depends
from app.services import metrics
from app.services.auth import requireRole


async def getErrorRate(days: int = 7, current_user: dict = Depends(requireRole(["ADMIN"]))):
    """Get error rate statistics. Admin only."""
    return await metrics.getErrorRateStats(days=days)


async def getLatencyStats(days: int = 7, current_user: dict = Depends(requireRole(["ADMIN"]))):
    """Get latency statistics. Admin only."""
    return await metrics.getLatencyStats(days=days)


async def getRiskAccuracy(current_user: dict = Depends(requireRole(["ADMIN", "CLINICIAN"]))):
    """Get risk classification accuracy metrics."""
    return await metrics.getRiskClassificationAccuracy()
```

#### 11.3 Auth Controller (app/controllers/auth_controller.py) - NEW

```python
"""Authentication controller."""
from fastapi import HTTPException
from app.services import auth
from app.schemas.auth_schema import LoginRequest, LoginResponse


async def login(payload: LoginRequest):
    """Authenticate user and return token."""
    result = await auth.authenticateUser(payload.email, payload.password)
    
    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return result


async def getCurrentUserInfo(current_user: dict = Depends(auth.getCurrentUser)):
    """Get current authenticated user info."""
    return current_user
```

#### 11.4 Enhanced Dashboard Controller (app/controllers/dashboard_controller.py) - UPDATED

```python
"""Enhanced Dashboard controller with Intelligence Layer features."""
from fastapi import Depends
from app.services import dashboard
from app.services.auth import getCurrentUser, requireRole
from typing import Optional


async def getStats():
    """Get basic platform statistics."""
    return await dashboard.getStats()


async def getRecentActivity():
    """Get recent platform activity."""
    return await dashboard.getRecentActivity()


async def getPrioritizedPatients(
    clinicianId: Optional[int] = None,
    current_user: dict = Depends(getCurrentUser)
):
    """
    Get patients sorted by urgency.
    
    Clinicians see only their assigned patients.
    Admins can see all patients or filter by clinicianId.
    """
    if current_user["role"] == "PATIENT":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Patients cannot view prioritized list")
    
    if current_user["role"] == "CLINICIAN":
        # Clinicians can only see their own patients
        from app.services import clinician as clinicianService
        clinician = await clinicianService.getClinicianByUserId(current_user["id"])
        if clinician:
            clinicianId = clinician.id
    
    return await dashboard.getPrioritizedPatients(clinicianId=clinicianId)


async def getPatientTrendData(
    patientId: int,
    current_user: dict = Depends(getCurrentUser)
):
    """Get trend data for a specific patient."""
    from app.services.auth import checkDataAccess
    from fastapi import HTTPException
    
    if not await checkDataAccess(current_user, "patient", patientId):
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await dashboard.getPatientTrendData(patientId)
    if not result:
        raise HTTPException(status_code=404, detail="Patient not found")
    return result
```

### 12. New Routes for Intelligence Layer

#### 12.1 Alert Routes (app/routes/alerts.py) - NEW

```python
"""Alert routes for Intelligence Layer."""
from fastapi import APIRouter, Depends
from typing import Optional
from app.controllers import alert_controller as controller
from app.schemas.alert_schema import AlertListResponse, AlertResponse, MarkAlertRead

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/", response_model=AlertListResponse)
async def getAlerts(
    priority: Optional[str] = None,
    isRead: Optional[bool] = None,
    current_user: dict = Depends(controller.getAlerts.__wrapped__.__code__.co_varnames[3])
):
    return await controller.getAlerts(priority=priority, isRead=isRead, current_user=current_user)


@router.put("/{alertId}/read", response_model=AlertResponse)
async def markAlertAsRead(alertId: int, current_user: dict = Depends(controller.markAlertAsRead.__wrapped__.__code__.co_varnames[2])):
    return await controller.markAlertAsRead(alertId, current_user=current_user)
```

#### 12.2 Metrics Routes (app/routes/metrics.py) - NEW

```python
"""Metrics routes for Intelligence Layer."""
from fastapi import APIRouter, Depends
from app.controllers import metrics_controller as controller
from app.schemas.metrics_schema import ErrorRateResponse, LatencyStatsResponse, RiskAccuracyResponse

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("/errors", response_model=ErrorRateResponse)
async def getErrorRate(days: int = 7, current_user: dict = Depends(controller.getErrorRate.__wrapped__.__code__.co_varnames[2])):
    return await controller.getErrorRate(days=days, current_user=current_user)


@router.get("/latency", response_model=LatencyStatsResponse)
async def getLatencyStats(days: int = 7, current_user: dict = Depends(controller.getLatencyStats.__wrapped__.__code__.co_varnames[2])):
    return await controller.getLatencyStats(days=days, current_user=current_user)


@router.get("/risk-accuracy", response_model=RiskAccuracyResponse)
async def getRiskAccuracy(current_user: dict = Depends(controller.getRiskAccuracy.__wrapped__.__code__.co_varnames[1])):
    return await controller.getRiskAccuracy(current_user=current_user)
```

#### 12.3 Auth Routes (app/routes/auth.py) - NEW

```python
"""Authentication routes."""
from fastapi import APIRouter, Depends
from app.controllers import auth_controller as controller
from app.schemas.auth_schema import LoginRequest, LoginResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login{}
(payload: LoginRequest):
    return await controller.login(payload)


@router.get("/me")
async def getCurrentUser{}
(current_user: dict = Depends(controller.getCurrentUserInfo.__wrapped__.__code__.co_varnames[0])):
    return await controller.getCurrentUserInfo(current_user=current_user)
```

#### 12.4 Enhanced Dashboard Routes (app/routes/dashboard.py) - UPDATED

```python
"""Enhanced Dashboard routes with Intelligence Layer features."""
from fastapi import APIRouter, Depends
from typing import Optional
from app.controllers import dashboard_controller as controller
from app.schemas.dashboard_schema import StatsResponse, RecentActivityResponse
from app.schemas.patient_schema import PatientResponse, PatientWithTrendResponse

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=StatsResponse)
async def getStats():
    return await controller.getStats()


@router.get("/recent-activity", response_model=RecentActivityResponse)
async def getRecentActivity():
    return await controller.getRecentActivity()


@router.get("/prioritized-patients", response_model=list[PatientResponse])
async def getPrioritizedPatients(
    clinicianId: Optional[int] = None,
    current_user: dict = Depends(controller.getPrioritizedPatients.__wrapped__.__code__.co_varnames[3])
):
    return await controller.getPrioritizedPatients(clinicianId=clinicianId, current_user=current_user)


@router.get("/patient/{patientId}/trend", response_model=PatientWithTrendResponse)
async def getPatientTrendData(
    patientId: int,
    current_user: dict = Depends(controller.getPatientTrendData.__wrapped__.__code__.co_varnames[2])
):
    return await controller.getPatientTrendData(patientId=patientId, current_user=current_user)
```

---

## Data Models

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Database Schema                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐              │
│  │    User     │       │   Patient   │       │  Clinician  │              │
│  ├─────────────┤       ├─────────────┤       ├─────────────┤              │
│  │ id (PK)     │◄──────│ userId (FK) │       │ userId (FK) │──────►│      │
│  │ email       │       │ id (PK)     │       │ id (PK)     │       │      │
│  │ password    │       │ emergency   │       │ fullname    │       │      │
│  │ role        │       │ dateOfBirth │       │ specializ.  │       │      │
│  │ createdAt   │       │ gender      │       └─────────────┘       │      │
│  └─────────────┘       │ riskLevel   │              │              │      │
│                        │ trendStatus │              │              │      │
│                        └─────────────┘              │              │      │
│                              │                      │              │      │
│                              │                      ▼              │      │
│                              │              ┌─────────────┐       │      │
│                              │              │ Assignments │       │      │
│                              │              ├─────────────┤       │      │
│                              └─────────────►│ id (PK)     │◄──────┘      │
│                                             │ patientId   │              │
│                                             │ clinicianId │              │
│                                             │ status      │              │
│                                             └─────────────┘              │
│                                                                              │
│  ┌─────────────────┐       ┌─────────────────┐                            │
│  │ SymptomReport   │       │     Alert       │                            │
│  ├─────────────────┤       ├─────────────────┤                            │
│  │ id (PK)         │◄──────│ symptomReportId │                            │
│  │ patientId (FK)  │       │ patientId (FK)  │                            │
│  │ notes           │       │ priority        │                            │
│  │ createdAt       │       │ alertType       │                            │
│  │ riskLevel       │       │ message         │                            │
│  │ riskScore       │       │ isRead          │                            │
│  │ riskFactors     │       │ createdAt       │                            │
│  └─────────────────┘       └─────────────────┘                            │
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │PerformanceMetric│                                                        │
│  ├─────────────────┤                                                        │
│  │ id (PK)         │                                                        │
│  │ endpoint        │                                                        │
│  │ method          │                                                        │
│  │ responseTimeMs  │                                                        │
│  │ statusCode      │                                                        │
│  │ errorType       │                                                        │
│  │ timestamp       │                                                        │
│  └─────────────────┘                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```python
{
    "detail": "Error message describing the issue",
    "status_code": 400
}
```

### HTTP Status Codes

| Status Code | Description | When Used |
|-------------|-------------|-----------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input, role mismatch |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 500 | Internal Server Error | Unexpected errors |

### Error Logging

All errors are logged with:
- Timestamp
- Error type
- Error message
- Endpoint and method
- User ID (if authenticated)

---

## Testing Strategy

### Unit Tests

Unit tests verify individual service functions in isolation.

**Test Categories:**
1. **Risk Classification Tests**
   - Symptom combination scoring
   - Frequency analysis
   - Duration analysis
   - Risk level classification
   - Performance (< 500ms)

2. **Trend Analysis Tests**
   - Severity score calculation
   - Trend detection (IMPROVING, STABLE, WORSENING)
   - Edge case: fewer than 3 historical reports

3. **Alert Generation Tests**
   - HIGH risk alert generation
   - WORSENING trend alert generation
   - Priority assignment

4. **Authentication Tests**
   - Password hashing and verification
   - Token generation and validation
   - Role-based access control

### Integration Tests

Integration tests verify API endpoints with database interactions.

**Test Categories:**
1. **Symptom Report Flow**
   - Create report triggers risk classification
   - Create report triggers trend analysis
   - Alerts generated for HIGH/WORSENING

2. **Dashboard Prioritization**
   - Patients sorted correctly
   - Clinician filtering works

3. **Authentication Flow**
   - Login returns valid token
   - Protected endpoints require token
   - Role restrictions enforced

### Performance Tests

Performance tests verify system meets latency requirements.

**Test Categories:**
1. **Risk Classification Performance**
   - Must complete within 500ms (Requirement 11.8)

2. **API Response Time**
   - Must complete within 5 seconds (Requirement 15.3)

3. **Payload Size**
   - Confirmation responses < 500 bytes (Requirement 15.6)

---

## Implementation Notes

### Migration Strategy

1. **Phase 1: Foundation Layer**
   - Fix existing bugs
   - Add basic CRUD functionality
   - Verify all endpoints work

2. **Phase 2: Intelligence Layer**
   - Add new database fields (migrations)
   - Implement risk classification service
   - Implement trend analysis service
   - Implement alert service
   - Add authentication middleware
   - Add metrics collection

### Configuration

Required environment variables:

```env
DATABASE_URL="file:./dev.db"
SECRET_KEY="your-secret-key-change-in-production"
ACCESS_TOKEN_EXPIRE_HOURS=24
```

### Dependencies

Add to requirements.txt:

```
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6
```

---

## Summary

This design document covers the complete implementation of the Healthcare Platform Backend API:

**Phase 1 (Foundation Layer):**
- Bug fixes in services, controllers, and schemas
- Complete CRUD operations for patients, clinicians, assignments, symptom reports
- Dashboard statistics and recent activity

**Phase 2 (Intelligence Layer):**
- Risk Classification Engine with deterministic rule-based scoring
- Trend Analysis Engine comparing historical reports
- Alert Generation System for HIGH risk and WORSENING trends
- Dashboard Prioritization sorting patients by urgency
- Low-Bandwidth Optimization for poor network conditions
- Security with JWT-based role authentication
- Performance Metrics collection and reporting

The architecture maintains separation of concerns with distinct layers for routes, controllers, services, and schemas. The Intelligence Layer is modular and can be developed independently from the Foundation Layer.


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Risk Classification Determinism

*For any* symptom notes string and patient ID, the risk classification function SHALL produce the same risk level and risk score when called multiple times with identical inputs.

**Validates: Requirements 11.7**

### Property 2: Risk Level Classification

*For any* computed risk score (float >= 0), the classifyRiskLevel function SHALL return exactly one of: LOW, MEDIUM, or HIGH.

**Validates: Requirements 11.2**

### Property 3: Risk Score Factors

*For any* symptom notes containing severe symptom keywords (chest pain, difficulty breathing, etc.), the computed risk score SHALL be strictly greater than the score for symptom notes without those keywords.

**Validates: Requirements 11.3, 11.4, 11.5**

### Property 4: Risk Classification Performance

*For any* symptom notes string and patient ID, the risk classification function SHALL complete within 500 milliseconds.

**Validates: Requirements 11.8**

### Property 5: Trend Status Classification

*For any* patient with at least 3 historical symptom reports, the trend analysis function SHALL return exactly one of: IMPROVING, STABLE, or WORSENING.

**Validates: Requirements 12.3**

### Property 6: Trend Status Default for Insufficient History

*For any* patient with fewer than 3 historical symptom reports, the trend analysis function SHALL return STABLE.

**Validates: Requirements 12.5**

### Property 7: Trend Reflects Severity Changes

*For any* patient whose symptom severity scores are strictly increasing over time, the trend analysis function SHALL return WORSENING. *For any* patient whose symptom severity scores are strictly decreasing over time, the trend analysis function SHALL return IMPROVING.

**Validates: Requirements 12.7, 12.8**

### Property 8: HIGH Risk Alert Generation

*For any* symptom report classified as HIGH risk, the alert generation function SHALL create an alert with HIGH priority.

**Validates: Requirements 13.1, 13.4**

### Property 9: WORSENING Trend Alert Generation

*For any* patient whose trend status changes to WORSENING, the alert generation function SHALL create an alert with MEDIUM priority.

**Validates: Requirements 13.2, 13.5**

### Property 10: Alert Sorting

*For any* set of alerts, when retrieved, they SHALL be sorted by priority (HIGH first, then MEDIUM, then LOW) and within the same priority by timestamp (most recent first).

**Validates: Requirements 13.9**

### Property 11: Dashboard Patient Sorting

*For any* list of patients, when retrieved through the prioritized dashboard, they SHALL be sorted by: (1) risk level with HIGH first, (2) within same risk level by trend status with WORSENING first, (3) within same risk and trend by most recent submission time first.

**Validates: Requirements 14.1, 14.2, 14.3**

### Property 12: Clinician Patient Filtering

*For any* clinician requesting the prioritized patient list, the returned patients SHALL only include those with an active assignment to that clinician.

**Validates: Requirements 14.7**

### Property 13: Response Compression

*For any* API response with JSON payload exceeding 1 kilobyte, when the client accepts gzip encoding, the response SHALL be compressed with gzip.

**Validates: Requirements 15.5**

### Property 14: Minimal Confirmation Response

*For any* symptom report submission, the confirmation response SHALL be under 500 bytes.

**Validates: Requirements 15.6**

### Property 15: API Response Time

*For any* API request, the response time SHALL be under 5 seconds.

**Validates: Requirements 15.3**

### Property 16: Role-Based Data Access

*For any* user requesting data, the system SHALL restrict access based on role: PATIENT users SHALL only access their own records, CLINICIAN users SHALL only access records of their assigned patients, ADMIN users SHALL access all records.

**Validates: Requirements 16.3, 16.4, 16.5**

### Property 17: JWT Token Expiration

*For any* JWT token generated by the system, the expiration time SHALL be 24 hours or less from the time of generation.

**Validates: Requirements 16.8**
