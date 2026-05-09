import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

# Import the shared Prisma client from a dedicated module to avoid circular imports.
from app.db import db

# Import middleware
from app.utils.compression import CompressionMiddleware
from app.services.metrics import MetricsMiddleware
from app.utils.audit_middleware import AuditMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
   
    await db.connect()
    print("Database connected successfully! 🚀")
    
    yield 
    
  
    await db.disconnect()
    print("Database disconnected. Goodbye! 👋")

# Create the main FastAPI app instance

app = FastAPI(
    title="Remote Patient Monitoring API",
    description="""
A web-based remote patient monitoring and clinical decision-support prototype.

Helps clinicians interpret symptom reports **in context**, prioritize urgent cases,
and track care relationships in low-resource settings.

**Intelligence Layer**
- Context-aware risk classification (severity + symptoms + care context + chronic conditions)
- Sequential trend detection (IMPROVING / STABLE / WORSENING)
- Automatic alert generation with full reasoning trail

**Evaluation**
- Performance metrics tracked at /metrics
- Risk classification accuracy at /metrics/risk-accuracy
    """,
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add compression middleware for low-bandwidth optimization (
app.add_middleware(CompressionMiddleware)

# Add metrics middleware for automatic request timing 
app.add_middleware(MetricsMiddleware)

# Add audit middleware for mutating actions
app.add_middleware(AuditMiddleware)


logger = logging.getLogger(__name__)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):

    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})



# This is a simple route. The `@app.get` is a "decorator" that tells FastAPI:
# "When someone visits your-url.com/health with a GET request, run this function!"
@app.get("/health")
async def health_check():
    # You just return a Python dictionary, and FastAPI automatically turns it into JSON for the frontend!
    return {"status": "ok", "message": "API is running! You did it! 🎉"}

# -- ROUTERS --
# As your app gets bigger, you don't want 100 endpoints in this one file.
# So, we use "Routers" to split endpoints into different files (look in `app/routes/`).
from app.routes import health, users, patients, clinicians, assignments, symptom_reports, dashboard
from app.routes import alerts, metrics, auth
from app.routes import push, realtime, tasks
from app.routes import audit

# Core routes
app.include_router(health.router)
app.include_router(users.router)
app.include_router(patients.router)
app.include_router(clinicians.router)
app.include_router(assignments.router)
app.include_router(symptom_reports.router)
app.include_router(dashboard.router)

# Intelligence Layer routes
app.include_router(alerts.router)
app.include_router(metrics.router)
app.include_router(auth.router)
app.include_router(push.router)
app.include_router(realtime.router)
app.include_router(audit.router)
app.include_router(tasks.router)


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
