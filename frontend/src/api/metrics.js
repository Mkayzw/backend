import { api } from './client';

function normalizeErrorRateMetrics(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  // Backend shape (app/services/metrics.py):
  // { total_requests, total_errors, error_rate_percent, ... }
  return {
    ...raw,
    error_rate: typeof raw.error_rate_percent === 'number' ? raw.error_rate_percent : raw.error_rate,
    error_count: typeof raw.total_errors === 'number' ? raw.total_errors : raw.error_count,
  };
}

function normalizeLatencyMetrics(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  // Backend shape (app/services/metrics.py):
  // { avg_latency_ms, p50_latency_ms, p95_latency_ms, p99_latency_ms, ... }
  return {
    ...raw,
    average: typeof raw.avg_latency_ms === 'number' ? raw.avg_latency_ms : raw.average,
    p50: typeof raw.p50_latency_ms === 'number' ? raw.p50_latency_ms : raw.p50,
    p95: typeof raw.p95_latency_ms === 'number' ? raw.p95_latency_ms : raw.p95,
    p99: typeof raw.p99_latency_ms === 'number' ? raw.p99_latency_ms : raw.p99,
  };
}

export const metricsAPI = {
  getErrorRate: async (days = 7) => normalizeErrorRateMetrics(await api.get(`/metrics/errors?days=${days}`)),
  getLatency: async (days = 7) => normalizeLatencyMetrics(await api.get(`/metrics/latency?days=${days}`)),
  getRiskAccuracy: () => api.get('/metrics/risk-accuracy'),
};
