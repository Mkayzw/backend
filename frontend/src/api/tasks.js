import { api } from './client';

export const tasksAPI = {
  getAll: ({ status, due } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (due) params.set('due', due);
    const query = params.toString();
    return api.get(`/api/tasks/${query ? `?${query}` : ''}`);
  },
  create: (payload) => api.post('/api/tasks/', payload),
  update: (taskId, payload) => api.patch(`/api/tasks/${taskId}`, payload),
};
