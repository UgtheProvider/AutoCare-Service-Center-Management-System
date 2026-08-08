/**
 * AutoCare v1.0 — Utilities & Helpers
 * Pure Vanilla JavaScript functions for formatting, DOM helpers, and workflow transitions.
 */

// Service Status Enum ordered strictly according to backend lifecycle
export const SERVICE_STATUSES = [
  'CREATED',
  'RECEIVED',
  'INSPECTION',
  'AWAITING_APPROVAL',
  'IN_PROGRESS',
  'QUALITY_CHECK',
  'READY_FOR_PICKUP',
  'CLOSED'
];

// Exact backend status transition map (ServiceRequestService.java isValidTransition)
export const SERVICE_TRANSITIONS = {
  CREATED: 'RECEIVED',
  RECEIVED: 'INSPECTION',
  INSPECTION: 'AWAITING_APPROVAL',
  AWAITING_APPROVAL: 'IN_PROGRESS',
  IN_PROGRESS: 'QUALITY_CHECK',
  QUALITY_CHECK: 'READY_FOR_PICKUP',
  READY_FOR_PICKUP: 'CLOSED',
  CLOSED: null
};

// Human-readable labels for ServiceStatus
export const STATUS_LABELS = {
  CREATED: 'Created',
  RECEIVED: 'Received',
  INSPECTION: 'Inspection',
  AWAITING_APPROVAL: 'Awaiting Approval',
  IN_PROGRESS: 'In Progress',
  QUALITY_CHECK: 'Quality Check',
  READY_FOR_PICKUP: 'Ready for Pickup',
  CLOSED: 'Closed'
};

// Descriptions for each workflow step
export const STATUS_DESCRIPTIONS = {
  CREATED: 'Service request created by customer',
  RECEIVED: 'Vehicle received at service center',
  INSPECTION: 'Initial vehicle diagnostic and inspection',
  AWAITING_APPROVAL: 'Estimate prepared, awaiting customer approval',
  IN_PROGRESS: 'Technician actively performing service/repairs',
  QUALITY_CHECK: 'Post-service quality inspection',
  READY_FOR_PICKUP: 'Service complete, vehicle ready for customer pickup',
  CLOSED: 'Vehicle delivered, service request closed'
};

/**
 * Escapes HTML characters to prevent XSS attacks when rendering dynamic data.
 * @param {string|any} str 
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats an ISO date string to a user-friendly locale format.
 * @param {string} dateString 
 * @returns {string}
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return String(dateString);
  }
}

/**
 * Returns formatted label for a service status.
 * @param {string} status 
 * @returns {string}
 */
export function formatStatus(status) {
  return STATUS_LABELS[status] || status || 'Unknown';
}

/**
 * Returns the exact next valid status according to backend rules.
 * @param {string} currentStatus 
 * @returns {string|null}
 */
export function getNextStatus(currentStatus) {
  return SERVICE_TRANSITIONS[currentStatus] || null;
}

/**
 * Creates a status badge DOM element safely.
 * @param {string} status 
 * @returns {HTMLElement}
 */
export function createStatusBadge(status) {
  const badge = document.createElement('span');
  const sanitizedStatus = status ? String(status).toUpperCase() : 'CREATED';
  badge.className = `badge badge-status-${escapeHtml(sanitizedStatus)}`;
  
  const dot = document.createElement('span');
  dot.className = 'badge-dot';
  badge.appendChild(dot);

  const textNode = document.createTextNode(formatStatus(sanitizedStatus));
  badge.appendChild(textNode);

  return badge;
}

/**
 * Creates a role badge DOM element safely.
 * @param {string} role 
 * @returns {HTMLElement}
 */
export function createRoleBadge(role) {
  const badge = document.createElement('span');
  const sanitizedRole = role ? String(role).toUpperCase() : 'CUSTOMER';
  badge.className = `badge badge-role-${escapeHtml(sanitizedRole)}`;
  badge.textContent = sanitizedRole;
  return badge;
}

/**
 * Generates an 8-step horizontal service timeline DOM element representing real backend status.
 * @param {string} currentStatus 
 * @returns {HTMLElement}
 */
export function createTimeline(currentStatus) {
  const container = document.createElement('div');
  container.className = 'timeline-horizontal';

  const currentIndex = SERVICE_STATUSES.indexOf(currentStatus);

  SERVICE_STATUSES.forEach((status, idx) => {
    const item = document.createElement('div');
    item.className = 'h-timeline-item';

    if (idx < currentIndex) {
      item.classList.add('completed');
    } else if (idx === currentIndex) {
      item.classList.add('active');
    }

    const marker = document.createElement('div');
    marker.className = 'h-timeline-marker';
    if (idx < currentIndex) {
      marker.innerHTML = '&#10003;'; // Checkmark
    } else {
      marker.textContent = String(idx + 1);
    }

    const label = document.createElement('div');
    label.className = 'h-timeline-label';
    label.textContent = STATUS_LABELS[status];

    item.appendChild(marker);
    item.appendChild(label);
    container.appendChild(item);
  });

  return container;
}

/**
 * Helper to build empty state DOM safely.
 * @param {string} title 
 * @param {string} description 
 * @param {string} [actionText] 
 * @param {string} [actionHref] 
 * @returns {HTMLElement}
 */
export function createEmptyState(title, description, actionText = null, actionHref = null) {
  const wrapper = document.createElement('div');
  wrapper.className = 'empty-state';

  const icon = document.createElement('div');
  icon.className = 'empty-state-icon';
  icon.textContent = '📋';

  const h3 = document.createElement('h3');
  h3.className = 'empty-state-title';
  h3.textContent = title;

  const p = document.createElement('p');
  p.className = 'empty-state-desc';
  p.textContent = description;

  wrapper.appendChild(icon);
  wrapper.appendChild(h3);
  wrapper.appendChild(p);

  if (actionText && actionHref) {
    const btn = document.createElement('a');
    btn.className = 'btn btn-primary';
    btn.href = actionHref;
    btn.textContent = actionText;
    wrapper.appendChild(btn);
  }

  return wrapper;
}
