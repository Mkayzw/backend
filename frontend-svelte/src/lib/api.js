const BASE_URL = 'http://localhost:8000'

export function getToken() {
  return localStorage.getItem('rpm_token')
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken()
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: `Request failed (${response.status})` }))
    const err = new Error(error.detail || error.message || `HTTP ${response.status}`)
    err.status = response.status
    throw err
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  get: (url) => apiRequest(url),
  post: (url, data) => apiRequest(url, { method: 'POST', body: JSON.stringify(data) }),
  put: (url, data) => apiRequest(url, { method: 'PUT', body: data === undefined ? undefined : JSON.stringify(data) }),
  patch: (url, data) => apiRequest(url, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (url) => apiRequest(url, { method: 'DELETE' }),
}

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  signup: (data) => api.post('/auth/signup', data),
  me: () => api.get('/auth/me'),
}

export const dashboardApi = {
  stats: () => api.get('/api/dashboard/stats'),
  recent: () => api.get('/api/dashboard/recent-activity'),
  prioritizedPatients: (clinicianId) => {
    const params = new URLSearchParams()
    if (clinicianId) params.set('clinicianId', clinicianId)
    const query = params.toString()
    return api.get(`/api/dashboard/prioritized-patients${query ? `?${query}` : ''}`)
  },
  patientTrend: (patientId) => api.get(`/api/dashboard/patient/${patientId}/trend`),
}

export const alertsApi = {
  list: ({ priority, isRead, status, ownership, limit } = {}) => {
    const params = new URLSearchParams()
    if (priority) params.set('priority', priority)
    if (isRead !== undefined && isRead !== null) params.set('isRead', isRead)
    if (status) params.set('status', status)
    if (ownership) params.set('ownership', ownership)
    if (limit) params.set('limit', limit)
    const query = params.toString()
    return api.get(`/alerts/${query ? `?${query}` : ''}`)
  },
  markRead: (alertId) => api.put(`/alerts/${alertId}/read`),
  triage: (alertId, payload) => api.patch(`/alerts/${alertId}/triage`, payload),
  byPatient: (patientId) => api.get(`/alerts/patient/${patientId}`),
}

export const tasksApi = {
  list: ({ status, due } = {}) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (due) params.set('due', due)
    const query = params.toString()
    return api.get(`/api/tasks/${query ? `?${query}` : ''}`)
  },
  create: (payload) => api.post('/api/tasks/', payload),
  update: (taskId, payload) => api.patch(`/api/tasks/${taskId}`, payload),
}

export const patientsApi = {
  list: () => api.get('/api/patients'),
  get: (id) => api.get(`/api/patients/${id}`),
  create: (data) => api.post('/api/patients', data),
  update: (id, data) => api.put(`/api/patients/${id}`, data),
  delete: (id) => api.delete(`/api/patients/${id}`),
}

export const cliniciansApi = {
  list: () => api.get('/api/clinicians'),
  get: (id) => api.get(`/api/clinicians/${id}`),
  create: (data) => api.post('/api/clinicians', data),
  update: (id, data) => api.put(`/api/clinicians/${id}`, data),
  delete: (id) => api.delete(`/api/clinicians/${id}`),
}

export const assignmentsApi = {
  list: () => api.get('/api/assignments'),
  get: (id) => api.get(`/api/assignments/${id}`),
  create: (data) => api.post('/api/assignments', data),
  updateStatus: (id, status) => api.put(`/api/assignments/${id}/status`, { status }),
  delete: (id) => api.delete(`/api/assignments/${id}`),
}

export const reportsApi = {
  list: () => api.get('/api/symptom-reports'),
  get: (id) => api.get(`/api/symptom-reports/${id}`),
  byPatient: (patientId) => api.get(`/api/symptom-reports/patient/${patientId}`),
  create: (data) => api.post('/api/symptom-reports', data),
  delete: (id) => api.delete(`/api/symptom-reports/${id}`),
}

export const followupResponsesApi = {
  create: (payload) => api.post('/api/followup-responses/', payload),
  listForReport: (symptomReportId) => api.get(`/api/followup-responses/report/${symptomReportId}`),
  listForPatient: (patientId) => api.get(`/api/followup-responses/patient/${patientId}`),
}

export const followupAppointmentsApi = {
  create: (payload) => api.post('/api/followup-appointments/', payload),
  list: ({ patientId, status, upcoming } = {}) => {
    const params = new URLSearchParams()
    if (patientId != null) params.set('patientId', patientId)
    if (status) params.set('status', status)
    if (upcoming) params.set('upcoming', 'true')
    const query = params.toString()
    return api.get(`/api/followup-appointments/${query ? `?${query}` : ''}`)
  },
  update: (appointmentId, payload) => api.patch(`/api/followup-appointments/${appointmentId}`, payload),
}

export const usersApi = {
  list: () => api.get('/api/users'),
  get: (id) => api.get(`/api/users/${id}`),
  create: (data) => api.post('/api/users', data),
  update: (id, data) => api.put(`/api/users/${id}`, data),
  delete: (id) => api.delete(`/api/users/${id}`),
}

export const notificationsApi = {
  list: ({ unreadOnly = false, limit = 50 } = {}) => {
    const params = new URLSearchParams()
    if (unreadOnly) params.set('unreadOnly', 'true')
    if (limit) params.set('limit', String(limit))
    const query = params.toString()
    return api.get(`/api/notifications/${query ? `?${query}` : ''}`)
  },
  markRead: (notificationId) => api.patch(`/api/notifications/${notificationId}/read`, {}),
  markAllRead: () => api.patch('/api/notifications/read-all', {}),
}

export const auditApi = {
  logs: ({ limit = 100, action, resourceType, actorUserId } = {}) => {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    if (action) params.set('action', action)
    if (resourceType) params.set('resourceType', resourceType)
    if (actorUserId) params.set('actorUserId', actorUserId)
    return api.get(`/api/audit/logs?${params.toString()}`)
  },
}

function normalizeErrorRateMetrics(raw) {
  if (!raw || typeof raw !== 'object') return raw
  return {
    ...raw,
    error_rate: typeof raw.error_rate_percent === 'number' ? raw.error_rate_percent : raw.error_rate,
    error_count: typeof raw.total_errors === 'number' ? raw.total_errors : raw.error_count,
  }
}

function normalizeLatencyMetrics(raw) {
  if (!raw || typeof raw !== 'object') return raw
  return {
    ...raw,
    average: typeof raw.avg_latency_ms === 'number' ? raw.avg_latency_ms : raw.average,
    p50: typeof raw.p50_latency_ms === 'number' ? raw.p50_latency_ms : raw.p50,
    p95: typeof raw.p95_latency_ms === 'number' ? raw.p95_latency_ms : raw.p95,
    p99: typeof raw.p99_latency_ms === 'number' ? raw.p99_latency_ms : raw.p99,
  }
}

export const metricsApi = {
  errorRate: async (days = 7) => normalizeErrorRateMetrics(await api.get(`/metrics/errors?days=${days}`)),
  latency: async (days = 7) => normalizeLatencyMetrics(await api.get(`/metrics/latency?days=${days}`)),
  riskAccuracy: () => api.get('/metrics/risk-accuracy'),
}
