/**
 * AutoCare v1.0 — Technician Work Queue Controller
 */

import { requireAuth } from '../auth-guard.js';
import { initNavigation } from '../navigation.js';
import { serviceRequestsAPI } from '../api.js';
import {
  formatDate,
  formatStatus,
  getNextStatus,
  createStatusBadge,
  createTimeline,
  createEmptyState,
  escapeHtml,
  STATUS_DESCRIPTIONS
} from '../utils.js';
import { showToast, showConfirmDialog } from '../notifications.js';

let currentUser = null;
let assignedJobs = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = requireAuth('EMPLOYEE');
  if (!currentUser) return;

  initNavigation(currentUser, 'work-queue.html');
  setupFilters();
  setupModal();
  await loadWorkQueue();
});

async function loadWorkQueue() {
  const container = document.getElementById('work-queue-container');
  try {
    assignedJobs = await serviceRequestsAPI.getByEmployee(currentUser.id);
    renderQueue();
  } catch (err) {
    console.error('Failed to load technician work queue:', err);
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load work queue: ${escapeHtml(err.message)}</p></div>`;
  }
}

function renderQueue() {
  const container = document.getElementById('work-queue-container');
  const searchVal = document.getElementById('input-search-queue').value.toLowerCase().trim();
  const filterVal = document.getElementById('select-queue-filter').value;

  let filtered = [...assignedJobs];

  if (filterVal === 'ACTIVE') {
    filtered = filtered.filter((job) => job.status !== 'CLOSED');
  } else if (filterVal !== 'ALL') {
    filtered = filtered.filter((job) => job.status === filterVal);
  }

  if (searchVal) {
    filtered = filtered.filter((job) => {
      const vehStr = job.vehicle ? `${job.vehicle.manufacturer || ''} ${job.vehicle.model || ''} ${job.vehicle.vehicleNumber || ''}`.toLowerCase() : '';
      const descStr = (job.description || '').toLowerCase();
      const idStr = String(job.id);
      return vehStr.includes(searchVal) || descStr.includes(searchVal) || idStr.includes(searchVal);
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = '';
    container.appendChild(
      createEmptyState(
        'No Jobs Found',
        assignedJobs.length === 0
          ? 'You currently have no service requests assigned to you.'
          : 'No jobs match your current search and filter settings.'
      )
    );
    return;
  }

  // Sort: active jobs first, then by createdAt descending
  filtered.sort((a, b) => {
    if (a.status === 'CLOSED' && b.status !== 'CLOSED') return 1;
    if (a.status !== 'CLOSED' && b.status === 'CLOSED') return -1;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = 'var(--space-4)';

  filtered.forEach((job) => {
    const card = document.createElement('div');
    card.className = 'work-card';

    const nextStatus = getNextStatus(job.status);
    const vehTitle = job.vehicle ? `${job.vehicle.manufacturer} ${job.vehicle.model}` : 'Vehicle';
    const vehPlate = job.vehicle ? job.vehicle.vehicleNumber : '—';
    const customerInfo = job.vehicle && job.vehicle.owner
      ? `${job.vehicle.owner.name} (${job.vehicle.owner.phone})`
      : 'Customer Record';

    // Header
    const header = document.createElement('div');
    header.className = 'work-card-header';
    header.innerHTML = `
      <div class="flex items-center gap-3 flex-wrap">
        <span class="font-mono font-bold text-lg">#SR-${job.id}</span>
        <span class="vehicle-plate">${escapeHtml(vehPlate)}</span>
        <span class="font-bold text-neutral-900">${escapeHtml(vehTitle)}</span>
      </div>
      <div id="badge-wrap-${job.id}"></div>
    `;
    header.querySelector(`#badge-wrap-${job.id}`).appendChild(createStatusBadge(job.status));

    // Body
    const body = document.createElement('div');
    body.className = 'work-card-body';
    body.innerHTML = `
      <div>
        <span class="text-xs text-muted">Customer / Contact</span>
        <div class="text-sm font-semibold">${escapeHtml(customerInfo)}</div>
      </div>
      <div>
        <span class="text-xs text-muted">Odometer Reading</span>
        <div class="text-sm font-semibold font-mono">${job.odometerReadingKm != null ? `${job.odometerReadingKm.toLocaleString()} km` : '—'}</div>
      </div>
      <div>
        <span class="text-xs text-muted">Service Description / Problem</span>
        <div class="text-sm text-neutral-800 truncate" style="max-width: 320px;">${escapeHtml(job.description || 'No description provided')}</div>
      </div>
      <div>
        <span class="text-xs text-muted">Intake Date</span>
        <div class="text-sm">${formatDate(job.createdAt)}</div>
      </div>
    `;

    // Footer with Next Status Transition & Details
    const footer = document.createElement('div');
    footer.className = 'work-card-footer';

    const leftFooter = document.createElement('div');
    leftFooter.className = 'flex items-center gap-2';

    const inspectBtn = document.createElement('button');
    inspectBtn.type = 'button';
    inspectBtn.className = 'btn btn-secondary btn-sm';
    inspectBtn.textContent = 'View Details & Timeline';
    inspectBtn.onclick = () => openJobModal(job);
    leftFooter.appendChild(inspectBtn);

    const rightFooter = document.createElement('div');
    rightFooter.className = 'flex items-center gap-2';

    if (nextStatus) {
      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'btn btn-primary btn-sm';
      nextBtn.innerHTML = `Advance to <strong>${formatStatus(nextStatus)}</strong> &rarr;`;
      nextBtn.onclick = () => handleStatusTransition(job, nextStatus);
      rightFooter.appendChild(nextBtn);
    } else {
      const closedBadge = document.createElement('span');
      closedBadge.className = 'badge badge-status-CLOSED';
      closedBadge.textContent = 'Service Closed';
      rightFooter.appendChild(closedBadge);
    }

    footer.appendChild(leftFooter);
    footer.appendChild(rightFooter);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);

    list.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(list);
}

function setupFilters() {
  document.getElementById('input-search-queue').addEventListener('input', renderQueue);
  document.getElementById('select-queue-filter').addEventListener('change', renderQueue);
}

function setupModal() {
  const modal = document.getElementById('job-detail-modal');
  const closeBtn = document.getElementById('modal-job-close');
  const dismissBtn = document.getElementById('modal-job-dismiss');

  const closeModal = () => modal.classList.remove('open');
  closeBtn.onclick = closeModal;
  dismissBtn.onclick = closeModal;
}

function openJobModal(job) {
  const modal = document.getElementById('job-detail-modal');
  const title = document.getElementById('modal-job-title');
  const subtitle = document.getElementById('modal-job-subtitle');
  const body = document.getElementById('modal-job-body');
  const footer = document.getElementById('modal-job-footer');

  title.textContent = `Job Details — Request #SR-${job.id}`;
  const vehTitle = job.vehicle ? `${job.vehicle.manufacturer} ${job.vehicle.model} (${job.vehicle.vehicleNumber})` : 'Vehicle';
  subtitle.textContent = `${vehTitle} — Current Status: ${formatStatus(job.status)}`;

  body.innerHTML = '';

  // 1. Timeline
  const timelineHeading = document.createElement('h4');
  timelineHeading.textContent = 'Service Lifecycle Progression';
  timelineHeading.style.marginBottom = 'var(--space-3)';
  body.appendChild(timelineHeading);

  const timelineEl = createTimeline(job.status);
  timelineEl.style.marginBottom = 'var(--space-6)';
  body.appendChild(timelineEl);

  // 2. Specifications Grid
  const detailsHeading = document.createElement('h4');
  detailsHeading.textContent = 'Job Information';
  detailsHeading.style.marginBottom = 'var(--space-3)';
  body.appendChild(detailsHeading);

  const grid = document.createElement('div');
  grid.className = 'detail-grid';
  grid.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Vehicle Plate & Model</span>
      <span class="detail-value font-mono">${escapeHtml(job.vehicle ? `${job.vehicle.vehicleNumber} — ${job.vehicle.manufacturer} ${job.vehicle.model}` : '—')}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Odometer Reading</span>
      <span class="detail-value font-mono">${job.odometerReadingKm != null ? `${job.odometerReadingKm.toLocaleString()} km` : '—'}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Customer Name & Phone</span>
      <span class="detail-value">${escapeHtml(job.vehicle && job.vehicle.owner ? `${job.vehicle.owner.name} (${job.vehicle.owner.phone})` : '—')}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Customer Email</span>
      <span class="detail-value">${escapeHtml(job.vehicle && job.vehicle.owner ? job.vehicle.owner.email : '—')}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Intake Date</span>
      <span class="detail-value">${formatDate(job.createdAt)}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Closed Date</span>
      <span class="detail-value">${job.closedAt ? formatDate(job.closedAt) : 'Pending Completion'}</span>
    </div>
  `;
  body.appendChild(grid);

  // 3. Description
  const descBox = document.createElement('div');
  descBox.className = 'detail-item';
  descBox.innerHTML = `
    <span class="detail-label">Customer Complaints / Work Scope</span>
    <div class="text-sm text-neutral-800" style="margin-top: 4px; white-space: pre-wrap;">${escapeHtml(job.description || 'No description provided')}</div>
  `;
  body.appendChild(descBox);

  // Modal Actions
  footer.innerHTML = `
    <button type="button" class="btn btn-secondary" id="modal-job-dismiss-inner">Close</button>
  `;
  footer.querySelector('#modal-job-dismiss-inner').onclick = () => modal.classList.remove('open');

  const nextStatus = getNextStatus(job.status);
  if (nextStatus) {
    const modalAdvanceBtn = document.createElement('button');
    modalAdvanceBtn.type = 'button';
    modalAdvanceBtn.className = 'btn btn-primary';
    modalAdvanceBtn.innerHTML = `Advance to <strong>${formatStatus(nextStatus)}</strong> &rarr;`;
    modalAdvanceBtn.onclick = async () => {
      modal.classList.remove('open');
      await handleStatusTransition(job, nextStatus);
    };
    footer.appendChild(modalAdvanceBtn);
  }

  modal.classList.add('open');
}

async function handleStatusTransition(job, nextStatus) {
  const confirmed = await showConfirmDialog({
    title: 'Confirm Status Transition',
    message: `Are you sure you want to advance Service Request #SR-${job.id} from ${formatStatus(job.status)} to ${formatStatus(nextStatus)}?`,
    confirmText: `Advance to ${formatStatus(nextStatus)}`,
    danger: nextStatus === 'CLOSED'
  });

  if (!confirmed) return;

  try {
    await serviceRequestsAPI.updateStatus(job.id, nextStatus);
    showToast(
      'Status Updated',
      `Request #SR-${job.id} transitioned to ${formatStatus(nextStatus)}.`,
      'success',
      3000
    );
    await loadWorkQueue();
  } catch (err) {
    showToast('Transition Error', err.message || 'Server rejected this status transition.', 'error');
  }
}
