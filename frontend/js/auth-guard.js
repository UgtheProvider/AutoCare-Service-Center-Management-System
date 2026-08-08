/**
 * AutoCare v1.0 — Route Protection Guard
 * Protects frontend pages by verifying JWT validity and enforcing role-based boundaries.
 */

import { getCurrentUser, isTokenValid, getDashboardUrl } from './auth.js';

/**
 * Enforces authentication and specific role access on a page.
 * @param {string|string[]} [allowedRoles] Role(s) permitted to view this page.
 * @returns {Object|null} The authenticated user object
 */
export function requireAuth(allowedRoles = null) {
  if (!isTokenValid()) {
    const isSubdir = window.location.pathname.includes('/customer/') ||
                     window.location.pathname.includes('/employee/') ||
                     window.location.pathname.includes('/manager/');
    const redirectUrl = isSubdir ? '../login.html?auth=required' : 'login.html?auth=required';
    window.location.href = redirectUrl;
    return null;
  }

  const user = getCurrentUser();
  if (!user) {
    const isSubdir = window.location.pathname.includes('/customer/') ||
                     window.location.pathname.includes('/employee/') ||
                     window.location.pathname.includes('/manager/');
    window.location.href = isSubdir ? '../login.html?auth=required' : 'login.html?auth=required';
    return null;
  }

  if (allowedRoles) {
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!rolesArray.includes(user.role)) {
      // User is authenticated but does not have permission for this portal
      console.warn(`User with role ${user.role} attempted to access restricted route for ${rolesArray.join(', ')}`);
      // Redirect to user's authorized dashboard
      const isSubdir = window.location.pathname.includes('/customer/') ||
                       window.location.pathname.includes('/employee/') ||
                       window.location.pathname.includes('/manager/');
      window.location.href = getDashboardUrl(user.role, isSubdir);
      return null;
    }
  }

  return user;
}
