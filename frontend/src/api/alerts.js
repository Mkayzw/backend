import { api } from './client';

export const alertsAPI = {
  getAll: ({ priority, isRead, limit } = {}) => {
    const params = new URLSearchParams();
    if (priority) params.set('priority', priority);
    if (isRead !== undefined && isRead !== null) params.set('isRead', isRead);
    if (limit) params.set('limit', limit);
    const query = params.toString();
    return api.get(`/alerts/${query ? `?${query}` : ''}`);
  },
  markRead: (alertId) => api.put(`/alerts/${alertId}/read`),
  getByPatient: (patientId) => api.get(`/alerts/patient/${patientId}`),
};
