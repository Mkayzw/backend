const BASE_URL = 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('rpm_token');
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: `Request failed (${response.status})` }));
    const message = error.detail || error.message || JSON.stringify(error) || `HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.data = error;

    if (response.status === 401) {
      const isAuthEndpoint = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/signup');
      if (!isAuthEndpoint) {
        localStorage.removeItem('rpm_token');
        localStorage.removeItem('rpm_user');
        window.location.href = '/login';
      }
    }

    throw err;
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  get: (url) => apiRequest(url),
  post: (url, data) => apiRequest(url, { method: 'POST', body: JSON.stringify(data) }),
  patch: (url, data) => apiRequest(url, { method: 'PATCH', body: JSON.stringify(data) }),
  put: (url, data) => apiRequest(url, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (url) => apiRequest(url, { method: 'DELETE' }),
};
