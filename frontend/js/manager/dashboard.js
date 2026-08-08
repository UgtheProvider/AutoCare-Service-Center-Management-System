/**
 * AutoCare v1.0 — Manager Operations Dashboard Controller
 */

import { requireAuth } from '../auth-guard.js';
import { initNavigation } from '../navigation.js';
import { serviceRequestsAPI } from '../api.js';
import {
  formatDate,
  createStatusBadge,
  createEmptyState,
  escapeHtml
} from '../utils.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = requireAuth('MANAGER');
  if (!currentUser) return;

  initNavigation(currentUser, 'dashboard.html');

  const welcomeHeading = document.getElementById('welcome-manager');
  if (welcomeHeading && currentUser.name) {
    welcomeHeading.textContent = `Operations Dashboard — ${currentUser.name}`;
  }

  await Promise.all([
    loadDashboardStats(),
    loadUnassignedPreview()
  ]);
});

/**
 * Loads dedicated authoritative manager dashboard statistics from backend.
 */
async function loadDashboardStats() {
  try {
    const stats = await serviceRequestsAPI.getDashboardStats();

    // High Level KPIs
    document.getElementById('mgr-stat-total').textContent = stats.totalRequests ?? 0;
    document.getElementById('mgr-stat-unassigned').textContent = stats.unassigned ?? 0;
    document.getElementById('mgr-stat-closed').textContent = stats.closed ?? 0;

    const activeTotal = (stats.totalRequests || 0) - (stats.closed || 0);
    document.getElementById('mgr-stat-active').textContent = Math.max(0, activeTotal);

    // Stage Breakdown
    document.getElementById('stage-created').textContent = stats.created ?? 0;
    document.getElementById('stage-received').textContent = stats.received ?? 0;
    document.getElementById('stage-inspection').textContent = stats.inspection ?? 0;
    document.getElementById('stage-awaiting-approval').textContent = stats.awaitingApproval ?? 0;
    document.getElementById('stage-in-progress').textContent = stats.inProgress ?? 0;
    document.getElementById('stage-quality-check').textContent = stats.qualityCheck ?? 0;
    document.getElementById('stage-ready-for-pickup').textContent = stats.readyForPickup ?? 0;
    document.getElementById('stage-closed').textContent = stats.closed ?? 0;
  } catch (err) {
    console.error('Failed to load manager dashboard stats:', err);
  }
}

/**
 * Loads preview of unassigned service requests.
 */
async function loadUnassignedPreview() {
  const container = document.getElementById('unassigned-preview-container');
  try {
    const unassigned = await serviceRequestsAPI.getUnassigned();

    if (!unassigned || unassigned.length === 0) {
      container.innerHTML = '';
      container.appendChild(
        createEmptyState(
          'All Requests Assigned',
          'Every active service request in the center has been allocated to a technician.'
        )
      );
      return;
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-responsive';

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Request ID</th>
          <th>Vehicle</th>
          <th>Customer</th>
          <th>Description</th>
          <th>Odometer</th>
          <th>Intake Date</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    unassigned.slice(0, 5).forEach((req) => {
      const tr = document.createElement('tr');

      const tdId = document.createElement('td');
      tdId.className = 'font-mono font-semibold';
      tdId.textContent = `#SR-${req.id}`;

      const tdVeh = document.createElement('td');
      const vehTitle = req.vehicle ? `${req.vehicle.manufacturer} ${req.vehicle.model}` : 'Vehicle';
      const vehPlate = req.vehicle ? req.vehicle.vehicleNumber : '';
      tdVeh.innerHTML = `<div><strong>${escapeHtml(vehTitle)}</strong><div class="text-xs font-mono text-muted">${escapeHtml(vehPlate)}</div></div>`;

      const tdCust = document.createElement('td');
      tdCust.textContent = req.vehicle && req.vehicle.owner ? req.vehicle.owner.name : '—';

      const tdDesc = document.createElement('td');
      tdDesc.style.maxWidth = '220px';
      tdDesc.className = 'truncate';
      tdDesc.textContent = req.description || '—';

      const tdOdo = document.createElement('td');
      tdOdo.textContent = req.odometerReadingKm != null ? `${req.odometerReadingKm.toLocaleString()} km` : '—';

      const tdDate = document.createElement('td');
      tdDate.textContent = formatDate(req.createdAt);

      const tdStatus = document.createElement('td');
      tdStatus.appendChild(createStatusBadge(req.status));

      const tdAction = document.createElement('td');
      const assignLink = document.createElement('a');
      assignLink.className = 'btn btn-primary btn-sm';
      assignLink.href = `assignment.html?requestId=${req.id}`;
      assignLink.textContent = 'Assign Technician';
      tdAction.appendChild(assignLink);

      tr.appendChild(tdId);
      tr.appendChild(tdVeh);
      tr.appendChild(tdCust);
      tr.appendChild(tdDesc);
      tr.appendChild(tdOdo);
      tr.appendChild(tdDate);
      tr.appendChild(tdStatus);
      tr.appendChild(tdAction);

      tbody.appendChild(tr);
    });

    tableWrapper.appendChild(table);
    container.innerHTML = '';
    container.appendChild(tableWrapper);
  } catch (err) {
    console.error('Failed to load unassigned requests:', err);
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load unassigned requests: ${escapeHtml(err.message)}</p></div>`;
  }
}
