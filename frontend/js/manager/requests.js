/**
 * AutoCare v1.0 — Manager Requests Controller
 */

import { requireAuth } from '../auth-guard.js';
import { initNavigation } from '../navigation.js';
import { serviceRequestsAPI } from '../api.js';
import {
  formatDate,
  formatStatus,
  createStatusBadge,
  createTimeline,
  createEmptyState,
  escapeHtml,
  STATUS_DESCRIPTIONS
} from '../utils.js';
import { showToast, showConfirmDialog } from '../notifications.js';

let currentUser = null;
let allServiceRequests = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = requireAuth('MANAGER');
  if (!currentUser) return;

  initNavigation(currentUser, 'requests.html');
  setupFilters();
  setupModal();
  await loadRequests();
});

async function loadRequests() {
  const container = document.getElementById('mgr-requests-container');
  const statusFilter = document.getElementById('select-mgr-status').value;

  try {
    if (statusFilter && statusFilter !== 'ALL') {
      allServiceRequests = await serviceRequestsAPI.getByStatus(statusFilter);
    } else {
      allServiceRequests = await serviceRequestsAPI.getAll();
    }
    renderTable();
  } catch (err) {
    console.error('Failed to load manager service requests:', err);
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load requests: ${escapeHtml(err.message)}</p></div>`;
  }
}

function renderTable() {
  const container = document.getElementById('mgr-requests-container');
  const searchVal = document.getElementById('input-mgr-search').value.toLowerCase().trim();

  let filtered = [...allServiceRequests];

  if (searchVal) {
    filtered = filtered.filter((r) => {
      const vehStr = r.vehicle ? `${r.vehicle.manufacturer || ''} ${r.vehicle.model || ''} ${r.vehicle.vehicleNumber || ''}`.toLowerCase() : '';
      const custStr = r.vehicle && r.vehicle.owner ? `${r.vehicle.owner.name || ''} ${r.vehicle.owner.email || ''} ${r.vehicle.owner.phone || ''}`.toLowerCase() : '';
      const empStr = r.employee ? `${r.employee.name || ''} ${r.employee.email || ''}`.toLowerCase() : '';
      const descStr = (r.description || '').toLowerCase();
      const idStr = String(r.id);

      return vehStr.includes(searchVal) || custStr.includes(searchVal) || empStr.includes(searchVal) || descStr.includes(searchVal) || idStr.includes(searchVal);
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = '';
    container.appendChild(
      createEmptyState(
        'No Service Requests Found',
        allServiceRequests.length === 0
          ? 'No service requests are currently registered in the system.'
          : 'No service requests match the search / filter criteria.'
      )
    );
    return;
  }

  // Sort by createdAt descending
  filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'table-responsive';

  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>ID</th>
        <th>Vehicle</th>
        <th>Customer</th>
        <th>Technician</th>
        <th>Description</th>
        <th>Odometer</th>
        <th>Date Logged</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');

  filtered.forEach((req) => {
    const tr = document.createElement('tr');

    // ID
    const tdId = document.createElement('td');
    tdId.className = 'font-mono font-semibold';
    tdId.textContent = `#SR-${req.id}`;

    // Vehicle
    const tdVeh = document.createElement('td');
    const vehName = req.vehicle ? `${req.vehicle.manufacturer} ${req.vehicle.model}` : 'Vehicle';
    const vehPlate = req.vehicle ? req.vehicle.vehicleNumber : '—';
    tdVeh.innerHTML = `<div><strong>${escapeHtml(vehName)}</strong><div class="text-xs font-mono text-muted">${escapeHtml(vehPlate)}</div></div>`;

    // Customer
    const tdCust = document.createElement('td');
    const custName = req.vehicle && req.vehicle.owner ? req.vehicle.owner.name : '—';
    const custPhone = req.vehicle && req.vehicle.owner ? req.vehicle.owner.phone : '';
    tdCust.innerHTML = `<div>${escapeHtml(custName)}<div class="text-xs text-muted">${escapeHtml(custPhone)}</div></div>`;

    // Technician
    const tdEmp = document.createElement('td');
    if (req.employee) {
      tdEmp.innerHTML = `<span class="badge badge-role-EMPLOYEE">${escapeHtml(req.employee.name)}</span>`;
    } else {
      tdEmp.innerHTML = `<span class="badge" style="background:#fef2f2; color:#dc2626; border-color:#fecaca;">Unassigned</span>`;
    }

    // Description
    const tdDesc = document.createElement('td');
    tdDesc.style.maxWidth = '180px';
    tdDesc.className = 'truncate';
    tdDesc.textContent = req.description || '—';

    // Odometer
    const tdOdo = document.createElement('td');
    tdOdo.textContent = req.odometerReadingKm != null ? `${req.odometerReadingKm.toLocaleString()} km` : '—';

    // Date
    const tdDate = document.createElement('td');
    tdDate.textContent = formatDate(req.createdAt);

    // Status
    const tdStatus = document.createElement('td');
    tdStatus.appendChild(createStatusBadge(req.status));

    // Actions
    const tdAction = document.createElement('td');
    tdAction.style.whiteSpace = 'nowrap';

    const inspectBtn = document.createElement('button');
    inspectBtn.type = 'button';
    inspectBtn.className = 'btn btn-secondary btn-sm';
    inspectBtn.style.marginRight = '6px';
    inspectBtn.textContent = 'Details';
    inspectBtn.onclick = () => openInspectorModal(req);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-outline-danger btn-sm';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => handleDeleteRequest(req);

    tdAction.appendChild(inspectBtn);
    tdAction.appendChild(deleteBtn);

    tr.appendChild(tdId);
    tr.appendChild(tdVeh);
    tr.appendChild(tdCust);
    tr.appendChild(tdEmp);
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
}

function setupFilters() {
  document.getElementById('input-mgr-search').addEventListener('input', renderTable);
  document.getElementById('select-mgr-status').addEventListener('change', async () => {
    await loadRequests();
  });
}

function setupModal() {
  const modal = document.getElementById('mgr-request-modal');
  const closeBtn = document.getElementById('mgr-modal-close');
  const dismissBtn = document.getElementById('mgr-modal-dismiss');

  const closeModal = () => modal.classList.remove('open');
  closeBtn.onclick = closeModal;
  dismissBtn.onclick = closeModal;
}

function openInspectorModal(req) {
  const modal = document.getElementById('mgr-request-modal');
  const title = document.getElementById('mgr-modal-title');
  const subtitle = document.getElementById('mgr-modal-subtitle');
  const body = document.getElementById('mgr-modal-body');

  title.textContent = `Service Request Details — #SR-${req.id}`;
  const vehTitle = req.vehicle ? `${req.vehicle.manufacturer} ${req.vehicle.model} (${req.vehicle.vehicleNumber})` : 'Vehicle';
  subtitle.textContent = `${vehTitle} — Status: ${formatStatus(req.status)}`;

  body.innerHTML = '';

  // 1. Timeline
  const timelineHeading = document.createElement('h4');
  timelineHeading.textContent = 'Service Lifecycle Progression';
  timelineHeading.style.marginBottom = 'var(--space-3)';
  body.appendChild(timelineHeading);

  const timelineEl = createTimeline(req.status);
  timelineEl.style.marginBottom = 'var(--space-6)';
  body.appendChild(timelineEl);

  // 2. Info Grid
  const detailsHeading = document.createElement('h4');
  detailsHeading.textContent = 'Request Information';
  detailsHeading.style.marginBottom = 'var(--space-3)';
  body.appendChild(detailsHeading);

  const grid = document.createElement('div');
  grid.className = 'detail-grid';
  grid.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Vehicle Plate & Specs</span>
      <span class="detail-value font-mono">${escapeHtml(req.vehicle ? `${req.vehicle.vehicleNumber} — ${req.vehicle.manufacturer} ${req.vehicle.model} (${req.vehicle.fuelType || 'Standard'}, ${req.vehicle.year || '—'})` : '—')}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Odometer Reading</span>
      <span class="detail-value font-mono">${req.odometerReadingKm != null ? `${req.odometerReadingKm.toLocaleString()} km` : '—'}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Customer Name & Contact</span>
      <span class="detail-value">${escapeHtml(req.vehicle && req.vehicle.owner ? `${req.vehicle.owner.name} (${req.vehicle.owner.phone})` : '—')}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Customer Email</span>
      <span class="detail-value">${escapeHtml(req.vehicle && req.vehicle.owner ? req.vehicle.owner.email : '—')}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Assigned Technician</span>
      <span class="detail-value">${escapeHtml(req.employee ? `${req.employee.name} (${req.employee.email})` : 'Unassigned')}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Intake & Closed Timestamps</span>
      <span class="detail-value">${formatDate(req.createdAt)} &rarr; ${req.closedAt ? formatDate(req.closedAt) : 'In Progress'}</span>
    </div>
  `;
  body.appendChild(grid);

  // 3. Description
  const descBox = document.createElement('div');
  descBox.className = 'detail-item';
  descBox.innerHTML = `
    <span class="detail-label">Work Scope & Issues Logged</span>
    <div class="text-sm text-neutral-800" style="margin-top: 4px; white-space: pre-wrap;">${escapeHtml(req.description || 'No description provided')}</div>
  `;
  body.appendChild(descBox);

  modal.classList.add('open');
}

async function handleDeleteRequest(req) {
  const confirmed = await showConfirmDialog({
    title: 'Delete Service Request',
    message: `Are you sure you want to permanently delete Service Request #SR-${req.id} for vehicle ${req.vehicle ? req.vehicle.vehicleNumber : ''}?`,
    confirmText: 'Delete Request',
    danger: true
  });

  if (!confirmed) return;

  try {
    await serviceRequestsAPI.delete(req.id);
    showToast('Request Deleted', `Service Request #SR-${req.id} was deleted successfully.`, 'success');
    await loadRequests();
  } catch (err) {
    showToast('Delete Failed', err.message || 'Could not delete service request.', 'error');
  }
}
