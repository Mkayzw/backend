import { api } from './client';

export const alertsAPI = {
  getAll: ({ priority, isRead, status, ownership, limit } = {}) => {
    const params = new URLSearchParams();
    if (priority) params.set('priority', priority);
    if (isRead !== undefined && isRead !== null) params.set('isRead', isRead);
    if (status) params.set('status', status);
    if (ownership) params.set('ownership', ownership);
    if (limit) params.set('limit', limit);
    const query = params.toString();
    return api.get(`/alerts/${query ? `?${query}` : ''}`);
  },
  markRead: (alertId) => api.put(`/alerts/${alertId}/read`),
  triage: (alertId, payload) => api.patch(`/alerts/${alertId}/triage`, payload),
  getByPatient: (patientId) => api.get(`/alerts/patient/${patientId}`),
};
