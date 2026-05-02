import { api } from './client';

export const dashboardAPI = {
  getStats: () => api.get('/api/dashboard/stats'),
  getRecentActivity: () => api.get('/api/dashboard/recent-activity'),
  getPrioritizedPatients: (clinicianId) => {
    const params = clinicianId ? `?clinicianId=${clinicianId}` : '';
    return api.get(`/api/dashboard/prioritized-patients${params}`);
  },
  getPatientTrend: (patientId) => api.get(`/api/dashboard/patient/${patientId}/trend`),
};
