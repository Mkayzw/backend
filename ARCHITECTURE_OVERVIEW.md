# System Architecture Overview

## Project Purpose
This is a **Remote Patient Monitoring and Clinical Decision-Support System** designed for low-resource healthcare settings. The system helps clinicians prioritize urgent cases by automatically analyzing symptom reports with full clinical context.

## Technology Stack

### Backend Framework: FastAPI
**Why FastAPI?**
- **Automatic API Documentation**: Generates interactive Swagger UI at `/docs` - essential for frontend developers and testing
- **Type Safety**: Uses Python type hints for automatic validation and better code reliability
- **Async Support**: Built on ASGI (Asynchronous Server Gateway Interface) for handling multiple requests efficiently
- **Performance**: One of the fastest Python frameworks, comparable to Node.js and Go

### Database: PostgreSQL + Prisma ORM
**Why Prisma?**
- **Type-Safe Database Access**: Generates Python client from schema definition
- **Migration Management**: Tracks database changes over time with `prisma migrate`
- **Developer Experience**: Visual database browser with `prisma studio`
- **Schema-First Design**: Single source of truth in `schema.prisma`

**Why PostgreSQL?**
- **Reliability**: ACID-compliant transactions ensure data integrity for medical records
- **JSON Support**: Stores complex data like symptom arrays and risk factors
- **Scalability**: Handles concurrent clinician access efficiently

### Authentication: JWT (JSON Web Tokens)
**Why JWT?**
- **Stateless**: Server doesn't need to store session data - scales better
- **Self-Contained**: Token includes user ID and role - no database lookup per request
- **Secure**: Signed with secret key, expires after 24 hours
- **Standard**: Works across web, mobile, and API clients

## Project Structure

```
backend/
├── app/
│   ├── config/          # Environment variables and settings
│   ├── controllers/     # HTTP request handlers (thin layer)
│   ├── routes/          # API endpoint definitions
│   ├── schemas/         # Request/response validation (Pydantic)
│   ├── services/        # Business logic and database operations
│   ├── utils/           # Shared utilities (compression, logging)
│   └── workers/         # Background tasks (future: email notifications)
├── migrations/          # Database schema version history
├── main.py              # Application entry point
├── schema.prisma        # Database schema definition
└── requirements.txt     # Python dependencies
```

### Architectural Pattern: Layered Architecture

**Why This Pattern?**
Separates concerns for maintainability and testability:

1. **Routes Layer** (`app/routes/`)
   - Defines URL endpoints and HTTP methods
   - Maps URLs to controller functions
   - Minimal logic - just routing

2. **Controllers Layer** (`app/controllers/`)
   - Validates incoming requests using Pydantic schemas
   - Calls service layer functions
   - Handles HTTP-specific concerns (status codes, exceptions)
   - Returns formatted responses

3. **Services Layer** (`app/services/`)
   - Contains ALL business logic
   - Performs database operations via Prisma
   - Implements algorithms (risk classification, trend analysis)
   - Reusable across different endpoints

4. **Schemas Layer** (`app/schemas/`)
   - Defines data validation rules using Pydantic
   - Ensures type safety and data integrity
   - Automatic error messages for invalid data

**Example Flow:**
```
Client Request
    ↓
Route (/api/symptom-reports)
    ↓
Controller (validates input, calls service)
    ↓
Service (business logic, database operations)
    ↓
Database (Prisma → PostgreSQL)
    ↓
Response (JSON)
```

## Key Design Decisions

### 1. Async/Await Throughout
**Why?**
- Medical systems need to handle multiple clinicians simultaneously
- Database queries don't block other requests
- Better resource utilization on limited hardware

**How?**
```python
async def createSymptomReport(patientId: int, ...):
    # Database operations use await
    patient = await db.patient.find_unique(where={"id": patientId})
    report = await db.symptomreport.create(data={...})
    return report
```

### 2. Structured Data Over Free Text
**Why?**
- Reliable risk scoring requires consistent inputs
- Free-text analysis is error-prone and slow
- Structured enums (MILD/MODERATE/SEVERE) enable deterministic algorithms

**Implementation:**
- Symptom identifiers: `["chest_pain", "difficulty_breathing"]`
- Severity enum: `MILD | MODERATE | SEVERE | CRITICAL`
- Frequency enum: `FIRST_TIME | RECURRING | CHRONIC`

### 3. Context-Aware Intelligence
**Why?**
- Same symptom has different urgency in different contexts
- "Chest pain" during asthma follow-up is more concerning than during general review
- Chronic conditions affect risk interpretation

**Implementation:**
- Care context field: `ASTHMA_FOLLOWUP | POST_SURGERY_RECOVERY | ...`
- Chronic conditions: JSON array `["asthma", "diabetes"]`
- Context bonuses in risk scoring algorithm

### 4. Denormalized Risk/Trend Fields
**Why?**
- Dashboard needs to sort patients by risk level quickly
- Computing risk on-the-fly for 100+ patients is too slow
- Trade-off: Storage space for query speed

**Implementation:**
```prisma
model Patient {
  currentRiskLevel   RiskLevel   @default(LOW)
  currentTrendStatus TrendStatus @default(STABLE)
  lastRiskUpdate     DateTime?
  lastReportTime     DateTime?
}
```

### 5. Middleware for Cross-Cutting Concerns
**Why?**
- Compression and metrics apply to ALL endpoints
- Avoids code duplication
- Centralized configuration

**Implemented Middleware:**
- **CORS**: Allows frontend on different port to access API
- **Compression**: Gzip responses >1KB for low-bandwidth environments
- **Metrics**: Automatic request timing and error logging

## Database Schema Design

### Core Entities

**User** → **Patient** / **Clinician**
- Single sign-on: One user account, role determines access
- Patient and Clinician are extensions with role-specific fields

**Assignment** (Clinician ↔ Patient)
- Many-to-many relationship with care context
- Tracks WHY a clinician monitors a patient
- Status field: ACTIVE | INACTIVE (for historical tracking)

**SymptomReport**
- Structured clinical inputs (not free text)
- Stores computed risk level and explanation
- Links to generated alerts

**Alert**
- Generated automatically by intelligence layer
- Priority: HIGH | MEDIUM | LOW
- Embeds risk explanation for quick clinician review

### Enums for Data Integrity
**Why Enums?**
- Prevents typos and invalid values
- Database-level constraint enforcement
- Clear documentation of allowed values

**Key Enums:**
- `Role`: PATIENT | CLINICIAN | ADMIN
- `RiskLevel`: LOW | MEDIUM | HIGH
- `TrendStatus`: IMPROVING | STABLE | WORSENING
- `Severity`: MILD | MODERATE | SEVERE | CRITICAL

## Security Architecture

### Authentication Flow
1. User submits email + password to `/auth/login`
2. Server verifies credentials (bcrypt password hashing)
3. Server generates JWT token with user ID and role
4. Client stores token and includes in `Authorization: Bearer <token>` header
5. Protected endpoints verify token and extract user info

### Authorization (Role-Based Access Control)

**Three Roles:**
1. **PATIENT**: Can only access own records
2. **CLINICIAN**: Can only access assigned patients' records
3. **ADMIN**: Can access all records

**Implementation:**
```python
# Dependency injection for protected routes
async def getCurrentUser(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Decode JWT, verify user exists
    return user_dict

# Role-based access
@router.get("/admin-only")
async def admin_endpoint(user: dict = Depends(requireRole(["ADMIN"]))):
    ...
```

### Data Access Control
**Function:** `checkDataAccess(current_user, resource_type, resource_id)`

**Logic:**
- ADMIN: Always returns True
- PATIENT: Checks if resource belongs to their user ID
- CLINICIAN: Checks if active assignment exists for patient

## Performance Optimizations

### 1. Response Compression (Requirement 15.5)
**Problem:** Low-bandwidth environments in rural clinics
**Solution:** Gzip compression for responses >1KB
**Impact:** 60-80% size reduction for JSON responses

### 2. Minimal Confirmation Responses (Requirement 15.6)
**Problem:** Unnecessary data in success responses
**Solution:** Return only `{status, message}` for write operations
**Impact:** <500 bytes per confirmation

### 3. Database Indexing
**Indexes on:**
- `Patient.userId` (unique)
- `Assignment.patientId, clinicianId` (composite)
- `SymptomReport.patientId` (frequent queries)
- `Alert.patientId` (dashboard filtering)

### 4. Metrics Collection (Requirement 17.1)
**Purpose:** Track API performance and identify bottlenecks
**Middleware:** Automatically logs every request
**Metrics:**
- Response time (ms)
- Status code
- Error type and message
- Endpoint and method

## Error Handling Strategy

### HTTP Status Codes
- `200 OK`: Successful GET/PUT
- `201 Created`: Successful POST
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Valid token but insufficient permissions
- `404 Not Found`: Resource doesn't exist
- `500 Internal Server Error`: Unexpected server error

### Exception Handling
```python
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
```

**Why?**
- Prevents sensitive error details from leaking to clients
- Logs full traceback server-side for debugging
- Consistent error response format

## Startup and Shutdown Lifecycle

### Lifespan Context Manager
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    await db.connect()
    print("Database connected")
    
    yield  # App runs here
    
    # SHUTDOWN
    await db.disconnect()
    print("Database disconnected")
```

**Why?**
- Ensures database connection is established before accepting requests
- Gracefully closes connections on shutdown
- Prevents connection leaks

## Development vs Production

### Development Mode
- `reload=True`: Auto-restart on file changes
- Debug logging enabled
- CORS allows localhost origins
- SQLite database (dev.db) for quick setup

### Production Considerations
- `reload=False`: Stable process
- Error logging only
- CORS restricted to production frontend URL
- PostgreSQL with connection pooling
- Environment variables for secrets (never hardcoded)
- HTTPS only
- Rate limiting middleware

## API Documentation

### Automatic Documentation (FastAPI Feature)
- **Swagger UI**: `http://localhost:8000/docs`
  - Interactive API testing
  - Request/response examples
  - Schema definitions

- **ReDoc**: `http://localhost:8000/redoc`
  - Clean, readable documentation
  - Better for sharing with stakeholders

**Why This Matters:**
- Frontend developers can test endpoints without backend code
- Automatic updates when code changes
- No manual documentation maintenance

## Scalability Considerations

### Current Architecture Supports:
- **Horizontal Scaling**: Multiple API server instances behind load balancer
- **Database Connection Pooling**: Prisma manages connections efficiently
- **Stateless Authentication**: JWT tokens don't require session storage
- **Async I/O**: Non-blocking operations for concurrent requests

### Future Enhancements:
- **Caching Layer**: Redis for frequently accessed patient data
- **Message Queue**: Celery for background tasks (email notifications)
- **Read Replicas**: Separate database for reporting queries
- **CDN**: Static asset delivery for frontend

## Testing Strategy

### Unit Tests
- Test individual service functions
- Mock database calls
- Verify business logic correctness

### Integration Tests
- Test full request/response cycle
- Use test database
- Verify endpoint behavior

### Performance Tests
- Measure response times under load
- Verify <500ms target for risk classification
- Test concurrent user scenarios

## Monitoring and Observability

### Metrics Collected (Requirement 17)
1. **Request Latency**: P50, P95, P99 percentiles
2. **Error Rate**: Percentage of failed requests
3. **Risk Classification Accuracy**: Comparison with clinician reviews
4. **Alert Generation Rate**: HIGH risk → alert conversion

### Logging Strategy
- **Info**: Successful operations, startup/shutdown
- **Warning**: Slow operations (>500ms)
- **Error**: Failed operations with stack traces
- **Critical**: System failures requiring immediate attention

## Conclusion

This architecture balances:
- **Simplicity**: Easy to understand and maintain
- **Performance**: Fast enough for real-time clinical use
- **Security**: Protects sensitive medical data
- **Scalability**: Can grow with user base
- **Reliability**: Handles errors gracefully

The layered design with clear separation of concerns makes it easy to:
- Add new features without breaking existing code
- Test components independently
- Onboard new developers quickly
- Debug issues efficiently
