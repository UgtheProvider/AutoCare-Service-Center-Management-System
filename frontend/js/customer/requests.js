/**
 * AutoCare v1.0 — Customer Service Requests Controller
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

let currentUser = null;
let allRequests = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = requireAuth('CUSTOMER');
  if (!currentUser) return;

  initNavigation(currentUser, 'requests.html');
  setupFilters();
  setupModal();
  await loadRequests();
});

async function loadRequests() {
  const container = document.getElementById('requests-container');
  try {
    allRequests = await serviceRequestsAPI.getByCustomer(currentUser.id);
    renderRequests();
  } catch (err) {
    console.error('Failed to load service requests:', err);
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load requests: ${escapeHtml(err.message)}</p></div>`;
  }
}

function renderRequests() {
  const container = document.getElementById('requests-container');
  const searchVal = document.getElementById('input-search').value.toLowerCase().trim();
  const statusFilter = document.getElementById('select-status-filter').value;

  let filtered = [...allRequests];

  if (statusFilter !== 'ALL') {
    filtered = filtered.filter((r) => r.status === statusFilter);
  }

  if (searchVal) {
    filtered = filtered.filter((r) => {
      const vehStr = r.vehicle ? `${r.vehicle.manufacturer || ''} ${r.vehicle.model || ''} ${r.vehicle.vehicleNumber || ''}`.toLowerCase() : '';
      const descStr = (r.description || '').toLowerCase();
      const idStr = String(r.id);
      return vehStr.includes(searchVal) || descStr.includes(searchVal) || idStr.includes(searchVal);
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = '';
    container.appendChild(
      createEmptyState(
        'No Service Requests Found',
        allRequests.length === 0
          ? 'You have not submitted any service requests yet.'
          : 'No requests matched your search and filter criteria.',
        allRequests.length === 0 ? 'Book Service Now' : null,
        allRequests.length === 0 ? 'create-request.html' : null
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
        <th>Request ID</th>
        <th>Vehicle</th>
        <th>Description</th>
        <th>Odometer</th>
        <th>Technician</th>
        <th>Created Date</th>
        <th>Status</th>
        <th>Action</th>
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
    const vehName = req.vehicle ? `${req.vehicle.manufacturer || ''} ${req.vehicle.model || ''}` : 'Vehicle';
    const vehPlate = req.vehicle ? req.vehicle.vehicleNumber : '';
    tdVeh.innerHTML = `
      <div>
        <strong>${escapeHtml(vehName)}</strong>
        <div class="text-xs font-mono text-muted">${escapeHtml(vehPlate)}</div>
      </div>
    `;

    // Description
    const tdDesc = document.createElement('td');
    tdDesc.style.maxWidth = '200px';
    tdDesc.className = 'truncate';
    tdDesc.textContent = req.description || '—';

    // Odometer
    const tdOdo = document.createElement('td');
    tdOdo.textContent = req.odometerReadingKm != null ? `${req.odometerReadingKm.toLocaleString()} km` : '—';

    // Technician
    const tdTech = document.createElement('td');
    tdTech.textContent = req.employee ? (req.employee.name || req.employee.email) : 'Pending Assignment';
    if (!req.employee) tdTech.className = 'text-muted text-xs';

    // Created At
    const tdDate = document.createElement('td');
    tdDate.textContent = formatDate(req.createdAt);

    // Status
    const tdStatus = document.createElement('td');
    tdStatus.appendChild(createStatusBadge(req.status));

    // Action
    const tdAction = document.createElement('td');
    const trackBtn = document.createElement('button');
    trackBtn.type = 'button';
    trackBtn.className = 'btn btn-secondary btn-sm';
    trackBtn.textContent = 'Track Progress';
    trackBtn.onclick = () => openDetailModal(req);
    tdAction.appendChild(trackBtn);

    tr.appendChild(tdId);
    tr.appendChild(tdVeh);
    tr.appendChild(tdDesc);
    tr.appendChild(tdOdo);
    tr.appendChild(tdTech);
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
  document.getElementById('input-search').addEventListener('input', renderRequests);
  document.getElementById('select-status-filter').addEventListener('change', renderRequests);
}

function setupModal() {
  const modal = document.getElementById('request-detail-modal');
  const closeBtn = document.getElementById('modal-req-close');
  const dismissBtn = document.getElementById('modal-req-dismiss');

  const closeModal = () => modal.classList.remove('open');
  closeBtn.onclick = closeModal;
  dismissBtn.onclick = closeModal;
}

function openDetailModal(req) {
  const modal = document.getElementById('request-detail-modal');
  const title = document.getElementById('modal-req-title');
  const subtitle = document.getElementById('modal-req-subtitle');
  const body = document.getElementById('modal-req-body');

  title.textContent = `Service Request #SR-${req.id}`;
  const vehTitle = req.vehicle ? `${req.vehicle.manufacturer} ${req.vehicle.model} (${req.vehicle.vehicleNumber})` : 'Vehicle';
  subtitle.textContent = `${vehTitle} — Logged on ${formatDate(req.createdAt)}`;

  body.innerHTML = '';

  // 1. Current Status Banner
  const statusBanner = document.createElement('div');
  statusBanner.className = 'card';
  statusBanner.style.marginBottom = 'var(--space-6)';
  statusBanner.style.backgroundColor = 'var(--color-neutral-50)';
  statusBanner.innerHTML = `
    <div class="card-body" style="padding: var(--space-4);">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-3">
          <span class="text-sm font-semibold text-neutral-700">Current Lifecycle Stage:</span>
          <span id="modal-badge-holder"></span>
        </div>
        <span class="text-xs text-muted font-mono">Status Key: ${escapeHtml(req.status)}</span>
      </div>
      <p class="text-xs text-muted" style="margin-top: 6px;">${escapeHtml(STATUS_DESCRIPTIONS[req.status] || '')}</p>
    </div>
  `;
  statusBanner.querySelector('#modal-badge-holder').appendChild(createStatusBadge(req.status));
  body.appendChild(statusBanner);

  // 2. Timeline
  const timelineHeading = document.createElement('h4');
  timelineHeading.textContent = 'Service Progress Lifecycle';
  timelineHeading.style.marginBottom = 'var(--space-3)';
  body.appendChild(timelineHeading);

  const timelineEl = createTimeline(req.status);
  timelineEl.style.marginBottom = 'var(--space-6)';
  body.appendChild(timelineEl);

  // 3. Request Details Grid
  const detailsHeading = document.createElement('h4');
  detailsHeading.textContent = 'Service Details';
  detailsHeading.style.marginBottom = 'var(--space-3)';
  body.appendChild(detailsHeading);

  const detailGrid = document.createElement('div');
  detailGrid.className = 'detail-grid';
  detailGrid.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Vehicle Plate</span>
      <span class="detail-value font-mono">${escapeHtml(req.vehicle ? req.vehicle.vehicleNumber : '—')}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Vehicle Make & Model</span>
      <span class="detail-value">${escapeHtml(req.vehicle ? `${req.vehicle.manufacturer} ${req.vehicle.model}` : '—')}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Odometer Reading</span>
      <span class="detail-value">${req.odometerReadingKm != null ? `${req.odometerReadingKm.toLocaleString()} km` : '—'}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Fuel Type / Year</span>
      <span class="detail-value">${escapeHtml(req.vehicle ? `${req.vehicle.fuelType || '—'} / ${req.vehicle.year || '—'}` : '—')}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Assigned Technician</span>
      <span class="detail-value">${escapeHtml(req.employee ? `${req.employee.name} (${req.employee.email})` : 'Pending Manager Assignment')}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Closed Date</span>
      <span class="detail-value">${req.closedAt ? formatDate(req.closedAt) : 'In Progress'}</span>
    </div>
  `;
  body.appendChild(detailGrid);

  // 4. Description Box
  const descBox = document.createElement('div');
  descBox.className = 'detail-item';
  descBox.innerHTML = `
    <span class="detail-label">Customer Description & Complaints</span>
    <div class="text-sm text-neutral-800" style="margin-top: 4px; white-space: pre-wrap;">${escapeHtml(req.description || 'No description provided')}</div>
  `;
  body.appendChild(descBox);

  modal.classList.add('open');
}
