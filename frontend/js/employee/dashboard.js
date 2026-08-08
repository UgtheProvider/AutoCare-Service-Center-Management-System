/**
 * AutoCare v1.0 — Employee Dashboard Controller
 */

import { requireAuth } from '../auth-guard.js';
import { initNavigation } from '../navigation.js';
import { serviceRequestsAPI } from '../api.js';
import {
  formatDate,
  formatStatus,
  createStatusBadge,
  createEmptyState,
  escapeHtml
} from '../utils.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = requireAuth('EMPLOYEE');
  if (!currentUser) return;

  initNavigation(currentUser, 'dashboard.html');

  const welcomeHeading = document.getElementById('welcome-technician');
  if (welcomeHeading && currentUser.name) {
    welcomeHeading.textContent = `Technician Workspace — ${currentUser.name}`;
  }

  await loadDashboardData();
});

async function loadDashboardData() {
  const container = document.getElementById('active-jobs-preview');
  const statTotal = document.getElementById('emp-stat-total');
  const statActive = document.getElementById('emp-stat-active');
  const statCompleted = document.getElementById('emp-stat-completed');

  try {
    const [allAssigned, activeAssigned] = await Promise.all([
      serviceRequestsAPI.getByEmployee(currentUser.id),
      serviceRequestsAPI.getActiveByEmployee(currentUser.id)
    ]);

    const totalCount = allAssigned ? allAssigned.length : 0;
    const activeCount = activeAssigned ? activeAssigned.length : 0;
    const completedCount = Math.max(0, totalCount - activeCount);

    statTotal.textContent = totalCount;
    statActive.textContent = activeCount;
    statCompleted.textContent = completedCount;

    if (!activeAssigned || activeAssigned.length === 0) {
      container.innerHTML = '';
      container.appendChild(
        createEmptyState(
          'No Active Jobs in Queue',
          'You currently have no active service requests pending your action.',
          'View All Assigned Work',
          'work-queue.html'
        )
      );
      return;
    }

    // Render Preview Cards
    const previewList = document.createElement('div');
    previewList.style.display = 'flex';
    previewList.style.flexDirection = 'column';
    previewList.style.gap = 'var(--space-4)';

    activeAssigned.slice(0, 4).forEach((job) => {
      const card = document.createElement('div');
      card.className = 'work-card';
      card.style.marginBottom = '0';

      const vehTitle = job.vehicle
        ? `${job.vehicle.manufacturer} ${job.vehicle.model}`
        : 'Vehicle';
      const vehPlate = job.vehicle ? job.vehicle.vehicleNumber : '';

      card.innerHTML = `
        <div class="work-card-header">
          <div>
            <span class="font-mono font-bold text-base">#SR-${job.id}</span>
            <span class="font-semibold text-neutral-900" style="margin-left: 8px;">${escapeHtml(vehTitle)}</span>
            <span class="font-mono text-xs text-muted" style="margin-left: 4px;">(${escapeHtml(vehPlate)})</span>
          </div>
          <div id="status-badge-${job.id}"></div>
        </div>

        <div class="work-card-body">
          <div>
            <span class="text-xs text-muted">Customer Notes / Description</span>
            <div class="text-sm text-neutral-800 truncate" style="max-width: 320px;">${escapeHtml(job.description || 'No description provided')}</div>
          </div>
          <div>
            <span class="text-xs text-muted">Odometer Reading</span>
            <div class="text-sm font-semibold">${job.odometerReadingKm != null ? `${job.odometerReadingKm.toLocaleString()} km` : '—'}</div>
          </div>
          <div>
            <span class="text-xs text-muted">Intake Date</span>
            <div class="text-sm">${formatDate(job.createdAt)}</div>
          </div>
        </div>

        <div class="work-card-footer">
          <span class="text-xs text-muted">Current Stage: <strong>${formatStatus(job.status)}</strong></span>
          <a href="work-queue.html" class="btn btn-primary btn-sm">Manage in Work Queue &rarr;</a>
        </div>
      `;

      card.querySelector(`#status-badge-${job.id}`).appendChild(createStatusBadge(job.status));
      previewList.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(previewList);
  } catch (err) {
    console.error('Failed to load technician dashboard:', err);
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load active jobs: ${escapeHtml(err.message)}</p></div>`;
  }
}
