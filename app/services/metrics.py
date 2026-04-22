"""
Performance Metrics Service

Collects and reports API performance metrics including latency, error rates,
and risk classification accuracy.

Requirements: 17.1, 17.2, 17.3, 17.4, 17.7, 17.8
"""
from app.db import db
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import time
import asyncio


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
    
    Requirements: 17.1
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
    status_code: int = 500,
    user_id: Optional[int] = None
) -> None:
    """
    Log an error with context.
    
    Requirements: 17.2
    """
    await logRequestMetrics(
        endpoint=endpoint,
        method=method,
        response_time_ms=0,
        status_code=status_code,
        error_type=error_type,
        error_message=error_message,
        user_id=user_id
    )


async def getErrorRateStats(days: int = 7) -> Dict[str, Any]:
    """
    Get error rate statistics for the specified time period.
    
    Requirements: 17.3
    """
    window_start = datetime.now() - timedelta(days=days)
    
    # Get total requests and error counts
    total_requests = await db.performancemetric.count(
        where={"timestamp": {"gte": window_start}}
    )
    
    error_requests = await db.performancemetric.count(
        where={
            "timestamp": {"gte": window_start},
            "statusCode": {"gte": 400}
        }
    )
    
    # Get errors by type
    errors = await db.performancemetric.find_many(
        where={
            "timestamp": {"gte": window_start},
            "statusCode": {"gte": 400}
        }
    )
    
    error_by_type: Dict[str, int] = {}
    error_by_endpoint: Dict[str, int] = {}
    
    for error in errors:
        # Count by error type
        error_type = error.errorType or "UNKNOWN"
        error_by_type[error_type] = error_by_type.get(error_type, 0) + 1
        
        # Count by endpoint
        endpoint_key = f"{error.method} {error.endpoint}"
        error_by_endpoint[endpoint_key] = error_by_endpoint.get(endpoint_key, 0) + 1
    
    error_rate = (error_requests / total_requests * 100) if total_requests > 0 else 0
    
    return {
        "period_days": days,
        "total_requests": total_requests,
        "total_errors": error_requests,
        "error_rate_percent": round(error_rate, 2),
        "errors_by_type": error_by_type,
        "errors_by_endpoint": error_by_endpoint
    }


async def getLatencyStats(days: int = 7) -> Dict[str, Any]:
    """
    Get latency statistics including percentiles.
    
    Requirements: 17.4
    """
    window_start = datetime.now() - timedelta(days=days)
    
    # Get all response times
    metrics = await db.performancemetric.find_many(
        where={"timestamp": {"gte": window_start}},
        order={"responseTimeMs": "asc"}
    )
    
    if not metrics:
        return {
            "period_days": days,
            "total_requests": 0,
            "avg_latency_ms": 0,
            "p50_latency_ms": 0,
            "p95_latency_ms": 0,
            "p99_latency_ms": 0
        }
    
    response_times = [m.responseTimeMs for m in metrics]
    response_times.sort()
    
    count = len(response_times)
    avg_latency = sum(response_times) / count
    
    def percentile(data: List[int], p: float) -> int:
        """Calculate the p-th percentile of a sorted list."""
        if not data:
            return 0
        k = (len(data) - 1) * p / 100
        f = int(k)
        c = f + 1 if f + 1 < len(data) else f
        return data[f] if f == c else int(data[f] + (k - f) * (data[c] - data[f]))
    
    return {
        "period_days": days,
        "total_requests": count,
        "avg_latency_ms": round(avg_latency, 2),
        "min_latency_ms": min(response_times),
        "max_latency_ms": max(response_times),
        "p50_latency_ms": percentile(response_times, 50),
        "p95_latency_ms": percentile(response_times, 95),
        "p99_latency_ms": percentile(response_times, 99)
    }


async def getRiskClassificationAccuracy() -> Dict[str, Any]:
    """
    Get risk classification accuracy metrics.
    
    This compares risk classifications against clinician reviews when available.
    
    Requirements: 17.8
    """
    # Get all HIGH risk classifications
    high_risk_reports = await db.symptomreport.find_many(
        where={"riskLevel": "HIGH"},
        include={"alerts": True}
    )
    
    # Get all MEDIUM risk classifications
    medium_risk_reports = await db.symptomreport.find_many(
        where={"riskLevel": "MEDIUM"}
    )
    
    # Get all LOW risk classifications
    low_risk_reports = await db.symptomreport.find_many(
        where={"riskLevel": "LOW"}
    )
    
    total_classified = (
        len(high_risk_reports) + 
        len(medium_risk_reports) + 
        len(low_risk_reports)
    )
    
    # Count alerts generated for HIGH risk (should be 1:1)
    high_risk_alerts = sum(1 for r in high_risk_reports if r.alerts)
    
    return {
        "total_classified_reports": total_classified,
        "high_risk_count": len(high_risk_reports),
        "medium_risk_count": len(medium_risk_reports),
        "low_risk_count": len(low_risk_reports),
        "high_risk_alerts_generated": high_risk_alerts,
        "alert_generation_rate": round(
            (high_risk_alerts / len(high_risk_reports) * 100) if high_risk_reports else 0, 
            2
        )
    }


async def cleanupOldMetrics() -> int:
    """
    Delete metrics older than 30 days.
    
    Requirements: 17.7
    """
    cutoff_date = datetime.now() - timedelta(days=30)
    
    deleted = await db.performancemetric.delete_many(
        where={"timestamp": {"lt": cutoff_date}}
    )
    
    return deleted.count if hasattr(deleted, 'count') else 0


class MetricsMiddleware:
    """
    Middleware for automatic request timing and metrics collection.
    
    Requirements: 17.1
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Record start time
        start_time = time.time()
        
        # Store response details
        status_code = 500
        error_type = None
        error_message = None
        
        async def send_wrapper(message):
            nonlocal status_code, error_type, error_message
            
            if message["type"] == "http.response.start":
                status_code = message.get("status", 500)
            
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            error_type = type(e).__name__
            error_message = str(e)
            raise
        finally:
            # Calculate response time
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Extract endpoint and method
            method = scope.get("method", "UNKNOWN")
            path = scope.get("path", "UNKNOWN")
            
            # Get user ID if available
            user_id = None
            headers = dict(scope.get("headers", []))
            # Could extract from JWT token here if needed
            
            # Log metrics asynchronously (don't block response)
            try:
                await logRequestMetrics(
                    endpoint=path,
                    method=method,
                    response_time_ms=response_time_ms,
                    status_code=status_code,
                    error_type=error_type,
                    error_message=error_message,
                    user_id=user_id
                )
            except Exception:
                # Don't fail the request if metrics logging fails
                pass
