import { api } from './client';

export const followupAppointmentsAPI = {
  create: (payload) => api.post('/api/followup-appointments/', payload),
  list: ({ patientId, status, upcoming } = {}) => {
    const params = new URLSearchParams();
    if (patientId != null) params.set('patientId', patientId);
    if (status) params.set('status', status);
    if (upcoming) params.set('upcoming', 'true');
    const query = params.toString();
    return api.get(`/api/followup-appointments/${query ? `?${query}` : ''}`);
  },
  update: (appointmentId, payload) =>
    api.patch(`/api/followup-appointments/${appointmentId}`, payload),
};
