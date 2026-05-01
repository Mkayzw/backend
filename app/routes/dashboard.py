"""
Dashboard Routes with Patient Prioritization

"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.controllers import dashboard_controller as controller
from app.schemas.dashboard_schema import StatsResponse, RecentActivityResponse
from app.services.auth import getCurrentUser

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=StatsResponse)
async def getStats():
    """
    Get platform statistics.
    
    """
    return await controller.getStats()


@router.get("/recent-activity", response_model=RecentActivityResponse)
async def getRecentActivity():
    """
    Get recent platform activity.
    
    
    """
    return await controller.getRecentActivity()


@router.get("/prioritized-patients")
async def getPrioritizedPatients(
    clinicianId: Optional[int] = Query(None, description="Filter by clinician ID"),
    current_user: dict = Depends(getCurrentUser)
):
    """
    Get patients sorted by risk level, trend status, and submission time.
    
    Sorting priority:
    1. Risk level (HIGH first)
    2. Trend status (WORSENING first)
    3. Submission time (most recent first)
    """
    return await controller.getPrioritizedPatients(clinicianId, current_user)


@router.get("/patient/{patientId}/trend")
async def getPatientTrendData(
    patientId: int,
    current_user: dict = Depends(getCurrentUser)
):
    """
    Get trend data for a specific patient.
    
    """
    return await controller.getPatientTrendData(patientId, current_user)
