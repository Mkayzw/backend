"""
Dashboard Controller with Patient Prioritization


"""
from fastapi import Depends, HTTPException, status
from typing import Optional
from app.services import dashboard as dashboardService
from app.services.auth import getCurrentUser, requireRole, checkDataAccess


async def getStats(current_user: dict):
    """
    Get platform statistics.
    

    """
    if current_user["role"] == "CLINICIAN":
        from app.db import db
        clinician = await db.clinician.find_unique(where={"userId": current_user["id"]})
        if clinician:
            return await dashboardService.getStats(clinicianId=clinician.id)

    return await dashboardService.getStats()


async def getRecentActivity(current_user: dict):
    """
    Get recent platform activity.
    
   .5
    """
    if current_user["role"] == "CLINICIAN":
        from app.db import db
        clinician = await db.clinician.find_unique(where={"userId": current_user["id"]})
        if clinician:
            return await dashboardService.getRecentActivity(clinicianId=clinician.id)

    return await dashboardService.getRecentActivity()


async def getPrioritizedPatients(
    clinicianId: Optional[int],
    current_user: dict
) -> list:
    """
    Get patients sorted by risk level, trend status, and submission time.
    

    """
    # If user is a clinician, filter to only their assigned patients
    if current_user["role"] == "CLINICIAN":
        # Get clinician ID for this user
        from app.db import db
        clinician = await db.clinician.find_unique(
            where={"userId": current_user["id"]}
        )
        if clinician:
            clinicianId = clinician.id
    
    return await dashboardService.getPrioritizedPatients(clinicianId)


async def getPatientTrendData(
    patientId: int,
    current_user: dict
) -> dict:
    """
    Get trend data for a specific patient.
    

    """
    # Check access
    has_access = await checkDataAccess(current_user, "patient", patientId)
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this patient's data"
        )
    
    result = await dashboardService.getPatientTrendData(patientId)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with id {patientId} not found"
        )
    
    return result
