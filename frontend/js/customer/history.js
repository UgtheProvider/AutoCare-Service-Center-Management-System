/**
 * AutoCare v1.0 — Vehicle Service History Controller
 */

import { requireAuth } from '../auth-guard.js';
import { initNavigation } from '../navigation.js';
import { vehiclesAPI, serviceRequestsAPI } from '../api.js';
import {
  formatDate,
  createStatusBadge,
  createTimeline,
  createEmptyState,
  escapeHtml
} from '../utils.js';
import { showToast } from '../notifications.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = requireAuth('CUSTOMER');
  if (!currentUser) return;

  initNavigation(currentUser, 'service-history.html');

  const selectVehicle = document.getElementById('select-my-vehicle');
  const inputVehNumber = document.getElementById('input-vehicle-number');
  const form = document.getElementById('history-search-form');

  // Check URL params (e.g. ?vehicleNumber=MH12AB1234)
  const urlParams = new URLSearchParams(window.location.search);
  const paramNumber = urlParams.get('vehicleNumber');

  // 1. Populate Dropdown with customer's vehicles
  try {
    const allVehicles = await vehiclesAPI.getAll();
    const customerVehicles = (allVehicles || []).filter(
      (v) => v.owner && String(v.owner.id) === String(currentUser.id)
    );

    customerVehicles.forEach((veh) => {
      const opt = document.createElement('option');
      opt.value = veh.vehicleNumber;
      opt.textContent = `${veh.manufacturer} ${veh.model} (${veh.vehicleNumber})`;
      if (paramNumber && paramNumber.toUpperCase() === veh.vehicleNumber.toUpperCase()) {
        opt.selected = true;
      }
      selectVehicle.appendChild(opt);
    });

  } catch (err) {
    console.error('Failed to load vehicle list for history search:', err);
  }

  // When dropdown changes, update input field
  selectVehicle.addEventListener('change', () => {
    if (selectVehicle.value) {
      inputVehNumber.value = selectVehicle.value;
      fetchHistory(selectVehicle.value);
    }
  });

  // Handle Form Search Submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const plate = (inputVehNumber.value || selectVehicle.value).trim().toUpperCase();
    if (!plate) {
      showToast('Validation', 'Please enter or select a vehicle plate number.', 'warning');
      return;
    }
    fetchHistory(plate);
  });

  // Auto-search if parameter provided
  if (paramNumber) {
    inputVehNumber.value = paramNumber;
    fetchHistory(paramNumber);
  }
});

async function fetchHistory(vehicleNumber) {
  const container = document.getElementById('history-results-container');
  const submitBtn = document.getElementById('btn-fetch-history');
  const spinner = document.getElementById('spinner-history');

  submitBtn.disabled = true;
  spinner.classList.remove('hidden');

  container.innerHTML = `
    <div class="loading-container">
      <span class="spinner spinner-dark spinner-lg"></span>
      <p>Retrieving service records for <strong>${escapeHtml(vehicleNumber)}</strong>...</p>
    </div>
  `;

  try {
    const records = await serviceRequestsAPI.getVehicleHistory(vehicleNumber);

    if (!records || records.length === 0) {
      container.innerHTML = '';
      container.appendChild(
        createEmptyState(
          `No Service Records Found`,
          `There are no recorded service requests for vehicle ${vehicleNumber} yet.`,
          '+ Book First Service',
          'create-request.html'
        )
      );
      return;
    }

    // Sort by createdAt descending (most recent first)
    records.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = 'var(--space-6)';

    // Summary Header
    const summaryCard = document.createElement('div');
    summaryCard.className = 'card';
    summaryCard.innerHTML = `
      <div class="card-header">
        <div>
          <h2 class="card-title">Service Records for ${escapeHtml(vehicleNumber)}</h2>
          <p class="card-subtitle">Found ${records.length} maintenance record(s) in system</p>
        </div>
        <span class="vehicle-plate">${escapeHtml(vehicleNumber)}</span>
      </div>
    `;
    wrapper.appendChild(summaryCard);

    records.forEach((rec, index) => {
      const recCard = document.createElement('div');
      recCard.className = 'card';

      // Card Header
      const header = document.createElement('div');
      header.className = 'card-header';
      header.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="font-mono font-bold text-base">#SR-${rec.id}</span>
          <span class="text-xs text-muted">Logged: ${formatDate(rec.createdAt)}</span>
        </div>
      `;
      header.appendChild(createStatusBadge(rec.status));

      // Card Body
      const body = document.createElement('div');
      body.className = 'card-body';

      // Lifecycle Timeline
      const timelineBox = document.createElement('div');
      timelineBox.style.marginBottom = 'var(--space-4)';
      timelineBox.appendChild(createTimeline(rec.status));
      body.appendChild(timelineBox);

      // Details Grid
      const grid = document.createElement('div');
      grid.className = 'detail-grid';
      grid.innerHTML = `
        <div class="detail-item">
          <span class="detail-label">Odometer at Service</span>
          <span class="detail-value">${rec.odometerReadingKm != null ? `${rec.odometerReadingKm.toLocaleString()} km` : '—'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Assigned Technician</span>
          <span class="detail-value">${escapeHtml(rec.employee ? `${rec.employee.name} (${rec.employee.email})` : 'Unassigned')}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Service Date Logged</span>
          <span class="detail-value">${formatDate(rec.createdAt)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Service Closed Date</span>
          <span class="detail-value">${rec.closedAt ? formatDate(rec.closedAt) : 'In Progress / Open'}</span>
        </div>
      `;
      body.appendChild(grid);

      // Description Box
      const descBox = document.createElement('div');
      descBox.className = 'detail-item';
      descBox.innerHTML = `
        <span class="detail-label">Work Description & Notes</span>
        <div class="text-sm text-neutral-800" style="margin-top: 4px; white-space: pre-wrap;">${escapeHtml(rec.description || 'No notes provided')}</div>
      `;
      body.appendChild(descBox);

      recCard.appendChild(header);
      recCard.appendChild(body);
      wrapper.appendChild(recCard);
    });

    container.innerHTML = '';
    container.appendChild(wrapper);
  } catch (err) {
    console.error('Failed to load history:', err);
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to retrieve service history: ${escapeHtml(err.message)}</p></div>`;
    showToast('Search Failed', err.message || 'Could not load vehicle history.', 'error');
  } finally {
    submitBtn.disabled = false;
    spinner.classList.add('hidden');
  }
}
