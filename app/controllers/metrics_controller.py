"""
Metrics Controller

Handles performance metrics HTTP requests.

"""
from fastapi import Depends
from app.services.metrics import getErrorRateStats, getLatencyStats, getRiskClassificationAccuracy
from app.services.auth import requireRole


async def getErrorRate(days: int = 7) -> dict:
    """
    Get error rate statistics.
    
    ADMIN only.
    

    """
    return await getErrorRateStats(days)


async def getLatency(days: int = 7) -> dict:
    """
    Get latency statistics.
    
    ADMIN only.
    

    """
    return await getLatencyStats(days)


async def getRiskAccuracy(
    current_user: dict = None
) -> dict:
    """
    Get risk classification accuracy metrics.
    
    ADMIN and CLINICIAN only.
    
    """
    return await getRiskClassificationAccuracy()
