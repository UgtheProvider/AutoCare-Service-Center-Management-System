/**
 * AutoCare v1.0 — Customer Dashboard Logic
 */

import { requireAuth } from '../auth-guard.js';
import { initNavigation } from '../navigation.js';
import { serviceRequestsAPI, vehiclesAPI } from '../api.js';
import { formatDate, createStatusBadge, createEmptyState, escapeHtml } from '../utils.js';
import { showToast } from '../notifications.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('CUSTOMER');
  if (!user) return;

  initNavigation(user, 'dashboard.html');

  const welcomeHeading = document.getElementById('welcome-heading');
  if (welcomeHeading && user.name) {
    welcomeHeading.textContent = `Welcome, ${user.name}`;
  }

  // Load Dashboard Data Concurrently
  await Promise.all([
    loadStats(user.id),
    loadRecentRequests(user.id),
    loadVehiclesPreview(user.id)
  ]);
});

/**
 * Loads dedicated backend customer statistics.
 */
async function loadStats(customerId) {
  try {
    const stats = await serviceRequestsAPI.getCustomerDashboardStats(customerId);
    document.getElementById('stat-total-requests').textContent = stats.totalRequests ?? 0;
    document.getElementById('stat-active-requests').textContent = stats.activeRequests ?? 0;
    document.getElementById('stat-completed-requests').textContent = stats.completedRequests ?? 0;
  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
    showToast('Stats Unavailable', 'Could not load service statistics from backend', 'warning');
    document.getElementById('stat-total-requests').textContent = '0';
    document.getElementById('stat-active-requests').textContent = '0';
    document.getElementById('stat-completed-requests').textContent = '0';
  }
}

/**
 * Loads recent requests for this customer.
 */
async function loadRecentRequests(customerId) {
  const container = document.getElementById('recent-requests-container');
  try {
    const requests = await serviceRequestsAPI.getByCustomer(customerId);

    if (!requests || requests.length === 0) {
      container.innerHTML = '';
      container.appendChild(
        createEmptyState(
          'No Service Requests Found',
          'You have not booked any vehicle service requests yet.',
          'Book Your First Service',
          'create-request.html'
        )
      );
      return;
    }

    // Sort by createdAt descending and take top 5
    const sorted = [...requests].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const recent = sorted.slice(0, 5);

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
          <th>Assigned Technician</th>
          <th>Date Created</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    recent.forEach((req) => {
      const tr = document.createElement('tr');

      // ID
      const tdId = document.createElement('td');
      tdId.className = 'font-mono font-semibold';
      tdId.textContent = `#SR-${req.id}`;

      // Vehicle
      const tdVeh = document.createElement('td');
      const vehName = req.vehicle ? `${req.vehicle.manufacturer || ''} ${req.vehicle.model || ''}` : 'Unknown Vehicle';
      const vehPlate = req.vehicle ? req.vehicle.vehicleNumber : '';
      tdVeh.innerHTML = `<div><strong>${escapeHtml(vehName)}</strong><div class="text-xs font-mono text-muted">${escapeHtml(vehPlate)}</div></div>`;

      // Description
      const tdDesc = document.createElement('td');
      tdDesc.style.maxWidth = '240px';
      tdDesc.className = 'truncate';
      tdDesc.textContent = req.description || 'No description provided';

      // Odometer
      const tdOdo = document.createElement('td');
      tdOdo.textContent = req.odometerReadingKm != null ? `${req.odometerReadingKm.toLocaleString()} km` : '—';

      // Employee
      const tdEmp = document.createElement('td');
      tdEmp.textContent = req.employee ? (req.employee.name || req.employee.email) : 'Unassigned';

      // Date
      const tdDate = document.createElement('td');
      tdDate.textContent = formatDate(req.createdAt);

      // Status
      const tdStatus = document.createElement('td');
      tdStatus.appendChild(createStatusBadge(req.status));

      tr.appendChild(tdId);
      tr.appendChild(tdVeh);
      tr.appendChild(tdDesc);
      tr.appendChild(tdOdo);
      tr.appendChild(tdEmp);
      tr.appendChild(tdDate);
      tr.appendChild(tdStatus);

      tbody.appendChild(tr);
    });

    tableWrapper.appendChild(table);
    container.innerHTML = '';
    container.appendChild(tableWrapper);
  } catch (err) {
    console.error('Failed to load recent requests:', err);
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load recent requests: ${escapeHtml(err.message)}</p></div>`;
  }
}

/**
 * Loads preview of vehicles owned by this customer.
 */
async function loadVehiclesPreview(customerId) {
  const container = document.getElementById('vehicles-preview-container');
  const statVehicles = document.getElementById('stat-total-vehicles');
  try {
    const allVehicles = await vehiclesAPI.getAll();
    const customerVehicles = (allVehicles || []).filter(v => v.owner && String(v.owner.id) === String(customerId));

    if (statVehicles) {
      statVehicles.textContent = customerVehicles.length;
    }

    if (customerVehicles.length === 0) {
      container.innerHTML = '';
      container.appendChild(
        createEmptyState(
          'No Vehicles Registered',
          'Add your vehicle to enable service bookings and maintenance history tracking.',
          '+ Register Vehicle',
          'add-vehicle.html'
        )
      );
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'vehicles-grid';

    customerVehicles.slice(0, 3).forEach((veh) => {
      const card = document.createElement('div');
      card.className = 'vehicle-card';
      card.innerHTML = `
        <div class="vehicle-card-header">
          <span class="vehicle-plate">${escapeHtml(veh.vehicleNumber)}</span>
          <span class="vehicle-fuel-badge">${escapeHtml(veh.fuelType || 'Standard')}</span>
        </div>
        <div class="vehicle-card-body">
          <div class="vehicle-model-title">${escapeHtml(veh.manufacturer)} ${escapeHtml(veh.model)}</div>
          <div class="vehicle-specs">
            <div class="spec-item">
              <span class="spec-label">Year</span>
              <span class="spec-value">${escapeHtml(veh.year || '—')}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Fuel Type</span>
              <span class="spec-value">${escapeHtml(veh.fuelType || '—')}</span>
            </div>
          </div>
        </div>
        <div class="vehicle-card-footer">
          <a href="service-history.html?vehicleNumber=${encodeURIComponent(veh.vehicleNumber)}" class="btn btn-secondary btn-sm">
            View History
          </a>
          <a href="create-request.html?vehicleId=${encodeURIComponent(veh.id)}" class="btn btn-primary btn-sm">
            Book Service
          </a>
        </div>
      `;
      grid.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(grid);
  } catch (err) {
    console.error('Failed to load vehicles preview:', err);
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load vehicles: ${escapeHtml(err.message)}</p></div>`;
  }
}
