import { api } from './client';

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  signup: (data) => api.post('/auth/signup', data),
  getMe: () => api.get('/auth/me'),
};
