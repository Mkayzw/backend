"""
Metrics Schemas

"""
from pydantic import BaseModel
from typing import Dict, Any


class ErrorRateResponse(BaseModel):
    period_days: int
    total_requests: int
    total_errors: int
    error_rate_percent: float
    errors_by_type: Dict[str, int]
    errors_by_endpoint: Dict[str, int]


class LatencyStatsResponse(BaseModel):
    period_days: int
    total_requests: int
    avg_latency_ms: float
    min_latency_ms: int
    max_latency_ms: int
    p50_latency_ms: int
    p95_latency_ms: int
    p99_latency_ms: int


class RiskAccuracyResponse(BaseModel):
    total_classified_reports: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    high_risk_alerts_generated: int
    alert_generation_rate: float
