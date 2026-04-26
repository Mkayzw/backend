/**
 * API Client Module
 * 
 * Centralized HTTP request handling with JWT token management.
 * Handles authentication, error handling, and timeout management.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AUTH_TOKEN_KEY = 'authToken';
const USER_INFO_KEY = 'userInfo';
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Retrieves the JWT authentication token from localStorage
 * @returns {string|null} The JWT token or null if not found
 */
export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Stores the JWT authentication token in localStorage
 * @param {string} token - The JWT token to store
 */
export function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Removes the JWT authentication token from localStorage
 */
export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Stores user information in localStorage
 * @param {Object} user - User object {id, email, fullName, role}
 */
export function setUserInfo(user) {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
}

/**
 * Retrieves user information from localStorage
 * @returns {Object|null} User object or null if not found
 */
export function getUserInfo() {
  const userInfo = localStorage.getItem(USER_INFO_KEY);
  return userInfo ? JSON.parse(userInfo) : null;
}

/**
 * Clears all stored user information
 */
export function clearUserInfo() {
  localStorage.removeItem(USER_INFO_KEY);
  clearAuthToken();
}

/**
 * Creates an AbortController with a timeout
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {AbortController} AbortController instance
 */
function createTimeoutController(timeoutMs) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

/**
 * Makes an authenticated HTTP request with automatic token injection
 * Handles common error scenarios and redirects on authentication failure
 * 
 * @param {string} url - The API endpoint URL (relative to API_BASE_URL)
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} The parsed JSON response
 * @throws {Error} Throws error with user-friendly message for various failure scenarios
 */
export async function makeAuthenticatedRequest(url, options = {}) {
  // Get the authentication token
  const token = getAuthToken();
  
  // Create timeout controller
  const controller = createTimeoutController(REQUEST_TIMEOUT);
  
  // Prepare the full URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  // Prepare headers with authentication
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Prepare fetch options
  const fetchOptions = {
    ...options,
    headers,
    signal: controller.signal,
  };
  
  try {
    // Make the HTTP request
    const response = await fetch(fullUrl, fetchOptions);
    
    // Handle different HTTP status codes
    if (!response.ok) {
      await handleErrorResponse(response);
    }
    
    // Parse and return JSON response
    const data = await response.json();
    return data;
    
  } catch (error) {
    // Handle timeout errors
    if (error.name === 'AbortError') {
      console.error('Request timeout:', error);
      throw new Error('Request timed out, please try again', { cause: error });
    }
    
    // Handle network errors (backend unreachable, CORS issues, etc.)
    if (error instanceof TypeError) {
      console.error('Network error:', error);
      throw new Error(
        'Unable to connect to server. Please check that the backend is running on ' + API_BASE_URL,
        { cause: error }
      );
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Handles HTTP error responses with appropriate error messages and actions
 * @param {Response} response - The fetch Response object
 * @throws {Error} Throws error with user-friendly message
 */
async function handleErrorResponse(response) {
  const status = response.status;
  
  // Try to get error details from response body
  let errorMessage;
  try {
    const errorData = await response.json();
    errorMessage = errorData.detail || errorData.message || '';
  } catch {
    // If response body is not JSON, use status text
    errorMessage = response.statusText;
  }
  
  // Log error details for debugging
  console.error(`HTTP ${status} error:`, errorMessage);
  
  // Handle specific status codes
  switch (status) {
    case 401:
      // Unauthorized - clear token and redirect to login
      clearAuthToken();
      window.location.href = '/';
      throw new Error('Session expired, please log in again');
      
    case 403:
      // Forbidden - user doesn't have permission
      throw new Error("You don't have permission to access this resource");
      
    case 404:
      // Not Found
      throw new Error('Resource not found');
      
    case 500:
    case 502:
    case 503:
    case 504:
      // Server errors
      throw new Error('Server error, please try again later');
      
    default:
      // Generic error message for other status codes
      throw new Error(errorMessage || `Request failed with status ${status}`);
  }
}

/**
 * Makes an unauthenticated HTTP request (for login, public endpoints, etc.)
 * @param {string} url - The API endpoint URL (relative to API_BASE_URL)
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} The parsed JSON response
 * @throws {Error} Throws error with user-friendly message
 */
export async function makeRequest(url, options = {}) {
  // Create timeout controller
  const controller = createTimeoutController(REQUEST_TIMEOUT);
  
  // Prepare the full URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Prepare fetch options
  const fetchOptions = {
    ...options,
    headers,
    signal: controller.signal,
  };
  
  try {
    // Make the HTTP request
    const response = await fetch(fullUrl, fetchOptions);
    
    // Handle different HTTP status codes
    if (!response.ok) {
      await handleErrorResponse(response);
    }
    
    // Parse and return JSON response
    const data = await response.json();
    return data;
    
  } catch (error) {
    // Handle timeout errors
    if (error.name === 'AbortError') {
      console.error('Request timeout:', error);
      throw new Error('Request timed out, please try again', { cause: error });
    }
    
    // Handle network errors
    if (error instanceof TypeError) {
      console.error('Network error:', error);
      throw new Error(
        'Unable to connect to server. Please check that the backend is running on ' + API_BASE_URL,
        { cause: error }
      );
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Authenticates a user with email and password
 * Stores the JWT token and user info in localStorage on successful authentication
 * 
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} Returns {accessToken, user} on success
 * @throws {Error} Throws error with user-friendly message on failure
 */
export async function login(email, password) {
  try {
    // Make POST request to /auth/login
    const response = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Store the JWT token in localStorage
    if (response.accessToken) {
      setAuthToken(response.accessToken);
    }
    
    // Store user info from response (Requirements 9.1, 9.2, 9.3)
    if (response.user) {
      const userInfo = {
        id: response.user.id,
        email: response.user.email,
        fullName: response.user.fullName,
        role: response.user.role
      };
      setUserInfo(userInfo);
    }
    
    // Return the full response (includes accessToken and user info)
    return response;
    
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

/**
 * Logs out the current user
 * Clears the JWT token and user info from localStorage and redirects to login page
 */
export function logout() {
  // Clear all stored user information (Requirement 9.5)
  clearUserInfo();
  
  // Redirect to login page (root path)
  window.location.href = '/';
}

/**
 * Fetches the current authenticated user's information
 * 
 * @returns {Promise<Object>} Returns user object {id, email, fullName, role}
 * @throws {Error} Throws error if not authenticated or request fails
 */
export async function fetchUserInfo() {
  try {
    // Make authenticated GET request to /auth/me
    const userInfo = await makeAuthenticatedRequest('/auth/me', {
      method: 'GET',
    });
    
    return userInfo;
    
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    throw error;
  }
}

/**
 * Fetches dashboard statistics including patient counts, appointments, and alerts
 * 
 * @returns {Promise<Object>} Returns dashboard stats {totalPatients, appointmentsToday, highRiskAlerts, activeAssignments, recentReports}
 * @throws {Error} Throws error if not authenticated or request fails
 */
export async function fetchDashboardStats() {
  try {
    // Make authenticated GET request to /api/dashboard/stats
    const stats = await makeAuthenticatedRequest('/api/dashboard/stats', {
      method: 'GET',
    });
    
    return stats;
    
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    throw error;
  }
}

/**
 * Fetches prioritized patients list with risk levels and trend information
 * 
 * @param {number} [clinicianId] - Optional clinician ID to filter patients by assignment
 * @returns {Promise<Array>} Returns array of patient objects with risk and trend data
 * @throws {Error} Throws error if not authenticated or request fails
 */
export async function fetchPrioritizedPatients(clinicianId) {
  try {
    // Build URL with optional clinicianId query parameter
    let url = '/api/dashboard/prioritized-patients';
    if (clinicianId !== undefined && clinicianId !== null) {
      url += `?clinicianId=${clinicianId}`;
    }
    
    // Make authenticated GET request
    const patients = await makeAuthenticatedRequest(url, {
      method: 'GET',
    });
    
    return patients;
    
  } catch (error) {
    console.error('Failed to fetch prioritized patients:', error);
    throw error;
  }
}

/**
 * Fetches trend data for a specific patient showing symptom progression over time
 * 
 * @param {number} patientId - The ID of the patient to fetch trend data for
 * @returns {Promise<Array>} Returns array of trend data points with date, riskScore, riskLevel, severity, and symptoms
 * @throws {Error} Throws error if not authenticated, patient not found, or request fails
 */
export async function fetchPatientTrend(patientId) {
  try {
    // Validate patientId parameter
    if (!patientId) {
      throw new Error('Patient ID is required');
    }
    
    // Make authenticated GET request to /api/dashboard/patient/{patientId}/trend
    const trendData = await makeAuthenticatedRequest(`/api/dashboard/patient/${patientId}/trend`, {
      method: 'GET',
    });
    
    return trendData;
    
  } catch (error) {
    console.error(`Failed to fetch patient trend for patient ${patientId}:`, error);
    throw error;
  }
}
