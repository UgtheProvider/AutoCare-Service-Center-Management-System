/**
 * AutoCare v1.0 — Centralized API Layer
 * Fetch API wrapper with JWT authentication headers and verified endpoint mapping.
 */

// Determine base API URL (supports relative if served by Spring Boot, or port 8080 if frontend is served on different port)
const API_BASE_URL = (window.location.port === '8080' || window.location.port === '')
  ? '' 
  : 'http://localhost:8080';

const TOKEN_STORAGE_KEY = 'autocare_token';
const USER_STORAGE_KEY = 'autocare_user';

/**
 * Retrieves the stored JWT token.
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Stores the JWT token.
 * @param {string} token 
 */
export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

/**
 * Clears authentication tokens and user state.
 */
export function clearAuth() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * Core HTTP Request method with JWT handling and strict error parsing.
 * @param {string} endpoint 
 * @param {RequestInit} [options={}] 
 * @returns {Promise<any>}
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, fetchOptions);

    // 1. Separate 401 Unauthorized vs 403 Forbidden handling
    if (response.status === 401) {
      // Token is expired or invalid -> clear token and redirect to login
      clearAuth();
      if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('register.html')) {
        const loginUrl = window.location.pathname.includes('/customer/') || 
                         window.location.pathname.includes('/employee/') || 
                         window.location.pathname.includes('/manager/')
          ? '../login.html?expired=true'
          : 'login.html?expired=true';
        window.location.href = loginUrl;
      }
      throw new Error('Your session has expired. Please log in again.');
    }

    if (response.status === 403) {
      // Authenticated user lacks permission -> do NOT clear JWT or logout
      throw new Error('Access Denied (403): You do not have authorization to perform this operation.');
    }

    // Parse Response Body
    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : null;
    }

    if (!response.ok) {
      const errorMessage = (data && data.message) ? data.message : `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to AutoCare backend server at ' + API_BASE_URL + '. Please ensure the Spring Boot server is running on port 8080.');
    }
    throw error;
  }
}

// ----------------------------------------------------
// AUTHENTICATION & USERS API (/api/users)
// ----------------------------------------------------
export const usersAPI = {
  /**
   * Register a new user.
   * Endpoint: POST /api/users/register
   * Body: { name, email, phone, password, role }
   */
  register: (userData) => {
    return apiRequest('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  /**
   * Log in with email or phone + password.
   * Endpoint: POST /api/users/login
   * Body: { login, password }
   * Returns: { message: "Login Successful", token: "..." }
   */
  login: (credentials) => {
    return apiRequest('/api/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  /**
   * Get all registered users (Requires JWT).
   * Endpoint: GET /api/users
   */
  getAll: () => {
    return apiRequest('/api/users', { method: 'GET' });
  },

  /**
   * Get user by ID (Requires JWT).
   * Endpoint: GET /api/users/{id}
   */
  getById: (id) => {
    return apiRequest(`/api/users/${encodeURIComponent(id)}`, { method: 'GET' });
  }
};

// ----------------------------------------------------
// VEHICLES API (/api/vehicles)
// ----------------------------------------------------
export const vehiclesAPI = {
  /**
   * Add a new vehicle.
   * Endpoint: POST /api/vehicles
   * Body: { owner: { id }, vehicleNumber, manufacturer, model, year, fuelType }
   */
  add: (vehicleData) => {
    return apiRequest('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicleData)
    });
  },

  /**
   * Get all vehicles (Requires JWT).
   * Endpoint: GET /api/vehicles
   */
  getAll: () => {
    return apiRequest('/api/vehicles', { method: 'GET' });
  },

  /**
   * Get vehicle by ID (Requires JWT).
   * Endpoint: GET /api/vehicles/{id}
   */
  getById: (id) => {
    return apiRequest(`/api/vehicles/${encodeURIComponent(id)}`, { method: 'GET' });
  },

  /**
   * Update vehicle specs.
   * Endpoint: PUT /api/vehicles/{id}
   * Body: { manufacturer, model, year, fuelType }
   */
  update: (id, vehicleData) => {
    return apiRequest(`/api/vehicles/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(vehicleData)
    });
  },

  /**
   * Delete vehicle by ID.
   * Endpoint: DELETE /api/vehicles/{id}
   */
  delete: (id) => {
    return apiRequest(`/api/vehicles/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};

// ----------------------------------------------------
// SERVICE REQUESTS API (/api/service-requests)
// ----------------------------------------------------
export const serviceRequestsAPI = {
  /**
   * Customer creates a service request.
   * Endpoint: POST /api/service-requests
   * Body: { vehicle: { id }, description, odometerReadingKm }
   */
  create: (requestData) => {
    return apiRequest('/api/service-requests', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  },

  /**
   * Manager views all service requests.
   * Endpoint: GET /api/service-requests
   */
  getAll: () => {
    return apiRequest('/api/service-requests', { method: 'GET' });
  },

  /**
   * Manager dashboard statistics.
   * Endpoint: GET /api/service-requests/dashboard
   * Returns: DashboardStats
   */
  getDashboardStats: () => {
    return apiRequest('/api/service-requests/dashboard', { method: 'GET' });
  },

  /**
   * Customer dashboard statistics.
   * Endpoint: GET /api/service-requests/customer/{customerId}/dashboard
   * Returns: CustomerDashboardStats
   */
  getCustomerDashboardStats: (customerId) => {
    return apiRequest(`/api/service-requests/customer/${encodeURIComponent(customerId)}/dashboard`, {
      method: 'GET'
    });
  },

  /**
   * Customer views own service requests.
   * Endpoint: GET /api/service-requests/customer/{customerId}
   */
  getByCustomer: (customerId) => {
    return apiRequest(`/api/service-requests/customer/${encodeURIComponent(customerId)}`, {
      method: 'GET'
    });
  },

  /**
   * Manager views unassigned service requests.
   * Endpoint: GET /api/service-requests/unassigned
   */
  getUnassigned: () => {
    return apiRequest('/api/service-requests/unassigned', { method: 'GET' });
  },

  /**
   * Employee views assigned service requests.
   * Endpoint: GET /api/service-requests/employee/{employeeId}
   */
  getByEmployee: (employeeId) => {
    return apiRequest(`/api/service-requests/employee/${encodeURIComponent(employeeId)}`, {
      method: 'GET'
    });
  },

  /**
   * Employee views active service requests (status != CLOSED).
   * Endpoint: GET /api/service-requests/employee/{employeeId}/active
   */
  getActiveByEmployee: (employeeId) => {
    return apiRequest(`/api/service-requests/employee/${encodeURIComponent(employeeId)}/active`, {
      method: 'GET'
    });
  },

  /**
   * View service history for a vehicle.
   * Endpoint: GET /api/service-requests/vehicle/{vehicleNumber}/history
   */
  getVehicleHistory: (vehicleNumber) => {
    return apiRequest(`/api/service-requests/vehicle/${encodeURIComponent(vehicleNumber)}/history`, {
      method: 'GET'
    });
  },

  /**
   * Manager filters service requests by status.
   * Endpoint: GET /api/service-requests/status/{status}
   */
  getByStatus: (status) => {
    return apiRequest(`/api/service-requests/status/${encodeURIComponent(status)}`, {
      method: 'GET'
    });
  },

  /**
   * View service request by ID.
   * Endpoint: GET /api/service-requests/id/{id}
   */
  getById: (id) => {
    return apiRequest(`/api/service-requests/id/${encodeURIComponent(id)}`, {
      method: 'GET'
    });
  },

  /**
   * Manager assigns employee to a service request.
   * Endpoint: PUT /api/service-requests/{requestId}/assign/{employeeId}
   */
  assignEmployee: (requestId, employeeId) => {
    return apiRequest(`/api/service-requests/${encodeURIComponent(requestId)}/assign/${encodeURIComponent(employeeId)}`, {
      method: 'PUT'
    });
  },

  /**
   * Employee updates service status.
   * Endpoint: PUT /api/service-requests/{id}/status?status={STATUS}
   */
  updateStatus: (id, newStatus) => {
    return apiRequest(`/api/service-requests/${encodeURIComponent(id)}/status?status=${encodeURIComponent(newStatus)}`, {
      method: 'PUT'
    });
  },

  /**
   * Delete service request by ID.
   * Endpoint: DELETE /api/service-requests/{id}
   */
  delete: (id) => {
    return apiRequest(`/api/service-requests/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};
