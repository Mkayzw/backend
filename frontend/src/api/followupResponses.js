import { api } from './client';

export const followupResponsesAPI = {
  create: (payload) => api.post('/api/followup-responses/', payload),
  listForReport: (symptomReportId) =>
    api.get(`/api/followup-responses/report/${symptomReportId}`),
  listForPatient: (patientId) =>
    api.get(`/api/followup-responses/patient/${patientId}`),
};
