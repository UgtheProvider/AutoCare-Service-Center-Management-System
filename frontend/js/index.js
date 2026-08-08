/**
 * AutoCare v1.0 — Landing Page Logic
 */

import { getCurrentUser, isTokenValid, getDashboardUrl } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  if (isTokenValid()) {
    const user = getCurrentUser();
    if (user && user.role) {
      const dashboardUrl = getDashboardUrl(user.role);
      const navLoginLink = document.getElementById('nav-login-link');
      const heroGetStartedBtn = document.getElementById('hero-get-started-btn');
      
      if (navLoginLink) {
        navLoginLink.textContent = 'My Dashboard';
        navLoginLink.href = dashboardUrl;
        navLoginLink.className = 'btn btn-primary btn-sm';
      }

      if (heroGetStartedBtn) {
        heroGetStartedBtn.textContent = 'Go to Dashboard';
        heroGetStartedBtn.href = dashboardUrl;
      }
    }
  }
});
