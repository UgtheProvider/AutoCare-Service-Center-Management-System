/**
 * AutoCare v1.0 — Navigation Component System
 * Dynamically builds responsive sidebars, top headers, and user profile badges.
 */

import { logoutUser } from './auth.js';
import { escapeHtml } from './utils.js';

// Role-based navigation schemas
const NAV_CONFIG = {
  CUSTOMER: [
    { section: 'Overview' },
    { name: 'Dashboard', icon: '📊', path: 'dashboard.html' },
    { section: 'Vehicles' },
    { name: 'My Vehicles', icon: '🚗', path: 'vehicles.html' },
    { name: 'Add Vehicle', icon: '➕', path: 'add-vehicle.html' },
    { section: 'Services' },
    { name: 'Service Requests', icon: '🔧', path: 'requests.html' },
    { name: 'Create Request', icon: '📝', path: 'create-request.html' },
    { name: 'Service History', icon: '📜', path: 'service-history.html' }
  ],
  EMPLOYEE: [
    { section: 'Work Space' },
    { name: 'Dashboard', icon: '📊', path: 'dashboard.html' },
    { name: 'Work Queue', icon: '🛠️', path: 'work-queue.html' }
  ],
  MANAGER: [
    { section: 'Management' },
    { name: 'Dashboard', icon: '📊', path: 'dashboard.html' },
    { name: 'All Requests', icon: '📋', path: 'requests.html' },
    { name: 'Assign Employees', icon: '👥', path: 'assignment.html' }
  ]
};

/**
 * Initializes the sidebar and top navbar for the current page and user.
 * @param {Object} currentUser 
 * @param {string} [activePage] 
 */
export function initNavigation(currentUser, activePage = '') {
  const role = currentUser?.role || 'CUSTOMER';
  const navItems = NAV_CONFIG[role] || NAV_CONFIG.CUSTOMER;

  // 1. Render Sidebar Content
  const sidebar = document.getElementById('app-sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-header">
        <a href="../index.html" class="sidebar-brand">
          <div class="sidebar-brand-icon">A</div>
          <div class="sidebar-brand-text">AutoCare</div>
          <span class="sidebar-brand-badge">v1.0</span>
        </a>
      </div>

      <div class="sidebar-role-indicator">
        <div class="role-badge-pill">
          <span class="role-dot"></span>
          <span>${escapeHtml(role)} PORTAL</span>
        </div>
      </div>

      <nav class="sidebar-nav" id="sidebar-nav-container">
        <!-- Injected below -->
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">${escapeHtml((currentUser?.name || 'U').charAt(0).toUpperCase())}</div>
          <div class="user-details">
            <div class="user-name">${escapeHtml(currentUser?.name || 'User')}</div>
            <div class="user-role-label">${escapeHtml(currentUser?.email || '')}</div>
          </div>
        </div>
        <button id="sidebar-logout-btn" class="sidebar-logout-btn" type="button">
          <span>Logout</span>
        </button>
      </div>
    `;

    const navContainer = document.getElementById('sidebar-nav-container');
    const currentPath = window.location.pathname.split('/').pop() || activePage;

    navItems.forEach((item) => {
      if (item.section) {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'nav-section-title';
        sectionEl.textContent = item.section;
        navContainer.appendChild(sectionEl);
      } else {
        const link = document.createElement('a');
        link.className = `nav-item ${currentPath === item.path ? 'active' : ''}`;
        link.href = item.path;

        const icon = document.createElement('span');
        icon.className = 'nav-item-icon';
        icon.textContent = item.icon;

        const text = document.createElement('span');
        text.textContent = item.name;

        link.appendChild(icon);
        link.appendChild(text);
        navContainer.appendChild(link);
      }
    });

    // Attach Logout
    const logoutBtn = document.getElementById('sidebar-logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => logoutUser();
    }
  }

  // 2. Setup Top Header
  const header = document.getElementById('app-header');
  if (header && !header.hasChildNodes()) {
    header.innerHTML = `
      <div class="header-left">
        <button id="mobile-sidebar-toggle" class="sidebar-toggle-btn" type="button" aria-label="Toggle navigation">
          ☰
        </button>
        <div class="header-title" id="header-page-title">AutoCare Service Center</div>
      </div>
      <div class="header-right">
        <span class="badge badge-role-${escapeHtml(role)}">${escapeHtml(role)}</span>
        <div class="user-avatar" style="width: 32px; height: 32px; font-size: 12px;">
          ${escapeHtml((currentUser?.name || 'U').charAt(0).toUpperCase())}
        </div>
      </div>
    `;
  }

  // 3. Mobile Sidebar Toggle & Overlay Setup
  let overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  const toggleBtn = document.getElementById('mobile-sidebar-toggle');
  if (toggleBtn && sidebar) {
    toggleBtn.onclick = () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    };

    overlay.onclick = () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    };
  }
}
