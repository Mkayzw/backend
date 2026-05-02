import { api } from './client';

export const assignmentsAPI = {
  getAll: () => api.get('/api/assignments'),
  getById: (id) => api.get(`/api/assignments/${id}`),
  create: (data) => api.post('/api/assignments', data),
  updateStatus: (id, status) => api.put(`/api/assignments/${id}/status`, { status }),
  delete: (id) => api.delete(`/api/assignments/${id}`),
};
