"""
Metrics Routes

Requirements: 17.3, 17.4, 17.8
"""
from fastapi import APIRouter, Depends, Query
from app.controllers.metrics_controller import getErrorRate, getLatency, getRiskAccuracy
from app.services.auth import requireRole

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/errors")
async def get_error_rate(
    days: int = Query(7, ge=1, le=30, description="Number of days to analyze"),
    current_user: dict = Depends(requireRole(["ADMIN"]))
) -> dict:
    """
    Get error rate statistics.
    
    ADMIN only.
    
    Requirements: 17.3
    """
    return await getErrorRate(days)


@router.get("/latency")
async def get_latency_stats(
    days: int = Query(7, ge=1, le=30, description="Number of days to analyze"),
    current_user: dict = Depends(requireRole(["ADMIN"]))
) -> dict:
    """
    Get latency statistics including percentiles.
    
    ADMIN only.
    
    Requirements: 17.4
    """
    return await getLatency(days)


@router.get("/risk-accuracy")
async def get_risk_accuracy(current_user: dict = Depends(requireRole(["ADMIN", "CLINICIAN"]))) -> dict:
    """
    Get risk classification accuracy metrics.
    
    ADMIN and CLINICIAN only.
    
    Requirements: 17.8
    """
    return await getRiskAccuracy(current_user)
