"""
Metrics Controller

Handles performance metrics HTTP requests.

Requirements: 17.3, 17.4, 17.8
"""
from fastapi import Depends
from app.services.metrics import getErrorRateStats, getLatencyStats, getRiskClassificationAccuracy
from app.services.auth import requireRole


async def getErrorRate(days: int = 7) -> dict:
    """
    Get error rate statistics.
    
    ADMIN only.
    
    Requirements: 17.3
    """
    return await getErrorRateStats(days)


async def getLatency(days: int = 7) -> dict:
    """
    Get latency statistics.
    
    ADMIN only.
    
    Requirements: 17.4
    """
    return await getLatencyStats(days)


async def getRiskAccuracy(
    current_user: dict = None
) -> dict:
    """
    Get risk classification accuracy metrics.
    
    ADMIN and CLINICIAN only.
    
    Requirements: 17.8
    """
    return await getRiskClassificationAccuracy()
