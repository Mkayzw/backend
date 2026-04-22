# WELCOME to FastAPI!
# This file (`main.py`) is the entry point of your entire application. Think of it as the central hub.
# When you start the server, this file is the first thing that runs.

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

# The "lifespan" context manager handles what happens when your server starts up and shuts down.
# You MUST connect to your database on startup and disconnect on shutdown.
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    # Put code here that needs to run before the server starts accepting requests
    await db.connect()
    print("Database connected successfully! 🚀")
    
    yield # The app runs here while the server is active
    
    # --- SHUTDOWN ---
    # Put code here to clean up when the server stops
    await db.disconnect()
    print("Database disconnected. Goodbye! 👋")

# Create the main FastAPI app instance
# You can customize the name, description, and version shown in your automatic documentation (/docs)
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

# Configure CORS (Cross-Origin Resource Sharing)
# Browsers block requests from a frontend (e.g., localhost:5173) to a backend on a different port (e.g., localhost:8000) for security.
# This middleware tells the browser: "It's okay, let these specific frontends talk to me!"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Add your exact frontend URLs here
    allow_credentials=True,
    allow_methods=["*"], # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"], # Allow all headers
)

# Add compression middleware for low-bandwidth optimization (Requirement 15.5)
app.add_middleware(CompressionMiddleware)

# Add metrics middleware for automatic request timing (Requirement 17.1)
app.add_middleware(MetricsMiddleware)


logger = logging.getLogger(__name__)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Last-resort safety net: if anything bubbles up that we didn't anticipate,
    # return a consistent 500 response and log the traceback server-side.
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# ---------------------------------------------------------
# ROUTES (Endpoints)
# ---------------------------------------------------------

# This is a simple route. The `@app.get` is a "decorator" that tells FastAPI:
# "When someone visits your-url.com/health with a GET request, run this function!"
@app.get("/health")
async def health_check():
    # You just return a Python dictionary, and FastAPI automatically turns it into JSON for the frontend!
    return {"status": "ok", "message": "API is running! You did it! 🎉"}

# -- ROUTERS --
# As your app gets bigger, you don't want 100 endpoints in this one file.
# So, we use "Routers" to split endpoints into different files (look in `app/routes/`).
# Below, we are "including" (registering) those external routers.

from app.routes import health, users, patients, clinicians, assignments, symptom_reports, dashboard
from app.routes import alerts, metrics, auth

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

# ---------------------------------------------------------
# RUNNING THE SERVER (For development)
# ---------------------------------------------------------
# This block only runs if you execute THIS file directly (e.g., `python main.py`)
if __name__ == "__main__":
    import uvicorn
    # `reload=True` means the server will automatically restart anytime you save a file change!
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
