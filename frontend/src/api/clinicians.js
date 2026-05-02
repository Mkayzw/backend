import { api } from './client';

export const cliniciansAPI = {
  getAll: () => api.get('/api/clinicians'),
  getById: (id) => api.get(`/api/clinicians/${id}`),
  create: (data) => api.post('/api/clinicians', data),
  update: (id, data) => api.put(`/api/clinicians/${id}`, data),
  delete: (id) => api.delete(`/api/clinicians/${id}`),
};
