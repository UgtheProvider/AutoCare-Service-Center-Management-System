/**
 * AutoCare v1.0 — Authentication Module
 * Manages JWT tokens, session lifecycle, and authenticated user profile.
 */

import { usersAPI, setToken, getToken, clearAuth } from './api.js';

const USER_STORAGE_KEY = 'autocare_user';

/**
 * Decodes JWT token payload without exposing it to console.
 * @param {string} token 
 * @returns {Object|null}
 */
export function parseJwt(token) {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Checks whether the stored token is present and not expired.
 * @returns {boolean}
 */
export function isTokenValid() {
  const token = getToken();
  if (!token) return false;

  const payload = parseJwt(token);
  if (!payload || !payload.exp) return false;

  // exp is in seconds, Date.now() is in milliseconds
  const isExpired = Date.now() >= payload.exp * 1000;
  if (isExpired) {
    clearAuth();
    return false;
  }
  return true;
}

/**
 * Retrieves the currently logged-in user profile from storage.
 * @returns {Object|null}
 */
export function getCurrentUser() {
  if (!isTokenValid()) {
    return null;
  }
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Stores the user profile safely in storage.
 * @param {Object} user 
 */
export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

/**
 * Performs login, verifies token, retrieves matching user profile from backend, and stores session.
 * @param {string} login Email or Phone Number
 * @param {string} password 
 * @returns {Promise<Object>} The authenticated user object
 */
export async function loginUser(login, password) {
  // 1. Call Backend Login Endpoint
  const response = await usersAPI.login({ login: login.trim(), password });

  if (!response || !response.token) {
    throw new Error('Invalid authentication response from server.');
  }

  // 2. Save JWT
  setToken(response.token);

  // 3. Extract email from token payload
  const tokenPayload = parseJwt(response.token);
  const emailFromToken = tokenPayload ? tokenPayload.sub : null;

  // 4. Retrieve complete user entity from backend
  const allUsers = await usersAPI.getAll();
  const matchedUser = allUsers.find((u) => {
    if (emailFromToken && u.email && u.email.toLowerCase() === emailFromToken.toLowerCase()) {
      return true;
    }
    if (u.phone && u.phone === login.trim()) {
      return true;
    }
    return false;
  });

  if (!matchedUser) {
    // Fallback if users list didn't match immediately
    const partialUser = {
      email: emailFromToken || login,
      role: 'CUSTOMER'
    };
    setCurrentUser(partialUser);
    return partialUser;
  }

  // Save sanitized profile
  const userProfile = {
    id: matchedUser.id,
    name: matchedUser.name,
    email: matchedUser.email,
    phone: matchedUser.phone,
    role: matchedUser.role
  };

  setCurrentUser(userProfile);
  return userProfile;
}

/**
 * Registers a new user.
 * @param {Object} userData 
 * @param {string} userData.name
 * @param {string} userData.email
 * @param {string} userData.phone
 * @param {string} userData.password
 * @param {string} [userData.role='CUSTOMER']
 * @returns {Promise<Object>}
 */
export async function registerUser(userData) {
  return usersAPI.register(userData);
}

/**
 * Logs out the current user and redirects to login page.
 */
export function logoutUser() {
  clearAuth();
  const isInsideFolder = window.location.pathname.includes('/customer/') ||
                         window.location.pathname.includes('/employee/') ||
                         window.location.pathname.includes('/manager/');
  window.location.href = isInsideFolder ? '../login.html' : 'login.html';
}

/**
 * Returns the appropriate dashboard path for a given role.
 * @param {string} role 
 * @param {boolean} [fromSubdir=false]
 * @returns {string}
 */
export function getDashboardUrl(role, fromSubdir = false) {
  const prefix = fromSubdir ? '../' : '';
  switch (role) {
    case 'EMPLOYEE':
      return `${prefix}employee/dashboard.html`;
    case 'MANAGER':
      return `${prefix}manager/dashboard.html`;
    case 'CUSTOMER':
    default:
      return `${prefix}customer/dashboard.html`;
  }
}
