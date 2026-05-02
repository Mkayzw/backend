import { api } from './client';

export const metricsAPI = {
  getErrorRate: (days = 7) => api.get(`/metrics/errors?days=${days}`),
  getLatency: (days = 7) => api.get(`/metrics/latency?days=${days}`),
  getRiskAccuracy: () => api.get('/metrics/risk-accuracy'),
};
