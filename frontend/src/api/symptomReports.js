import { api } from './client';

export const symptomReportsAPI = {
  getAll: () => api.get('/api/symptom-reports'),
  getById: (id) => api.get(`/api/symptom-reports/${id}`),
  getByPatient: (patientId) => api.get(`/api/symptom-reports/patient/${patientId}`),
  create: (data) => api.post('/api/symptom-reports', data),
  delete: (id) => api.delete(`/api/symptom-reports/${id}`),
};
