/**
 * AutoCare v1.0 — Technician Assignment Controller
 */

import { requireAuth } from '../auth-guard.js';
import { initNavigation } from '../navigation.js';
import { serviceRequestsAPI, usersAPI } from '../api.js';
import {
  formatDate,
  createStatusBadge,
  createEmptyState,
  escapeHtml
} from '../utils.js';
import { showToast } from '../notifications.js';

let currentUser = null;
let unassignedRequests = [];
let availableEmployees = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = requireAuth('MANAGER');
  if (!currentUser) return;

  initNavigation(currentUser, 'assignment.html');
  await loadAssignmentData();
});

async function loadAssignmentData() {
  const container = document.getElementById('assignment-queue-container');
  const alertEl = document.getElementById('assignment-alert');

  try {
    const [requests, allUsers] = await Promise.all([
      serviceRequestsAPI.getUnassigned(),
      usersAPI.getAll()
    ]);

    unassignedRequests = requests || [];
    availableEmployees = (allUsers || []).filter((u) => u.role === 'EMPLOYEE');

    if (availableEmployees.length === 0) {
      alertEl.style.backgroundColor = '#fffbeb';
      alertEl.style.color = '#b45309';
      alertEl.style.border = '1px solid #fde68a';
      alertEl.innerHTML = `<strong>Notice:</strong> No registered users with role <code>EMPLOYEE</code> found in the database. Please register employee accounts to enable technician assignment.`;
      alertEl.classList.remove('hidden');
    } else {
      alertEl.classList.add('hidden');
    }

    renderAssignmentQueue();
  } catch (err) {
    console.error('Failed to load assignment queue:', err);
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load assignment data: ${escapeHtml(err.message)}</p></div>`;
  }
}

function renderAssignmentQueue() {
  const container = document.getElementById('assignment-queue-container');

  if (unassignedRequests.length === 0) {
    container.innerHTML = '';
    container.appendChild(
      createEmptyState(
        'All Service Requests Allocated',
        'There are no unassigned service requests pending technician assignment at this time.',
        'View All Requests',
        'requests.html'
      )
    );
    return;
  }

  // Sort by createdAt ascending (oldest unassigned first)
  unassignedRequests.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = 'var(--space-6)';

  unassignedRequests.forEach((req) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderLeft = '4px solid var(--color-danger-500)';

    const vehName = req.vehicle ? `${req.vehicle.manufacturer} ${req.vehicle.model}` : 'Vehicle';
    const vehPlate = req.vehicle ? req.vehicle.vehicleNumber : '—';
    const customerInfo = req.vehicle && req.vehicle.owner
      ? `${req.vehicle.owner.name} (${req.vehicle.owner.phone})`
      : 'Customer Record';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <div class="flex items-center gap-3 flex-wrap">
        <span class="font-mono font-bold text-lg">#SR-${req.id}</span>
        <span class="vehicle-plate">${escapeHtml(vehPlate)}</span>
        <span class="font-bold text-neutral-900">${escapeHtml(vehName)}</span>
      </div>
      <div id="assign-badge-${req.id}"></div>
    `;
    header.querySelector(`#assign-badge-${req.id}`).appendChild(createStatusBadge(req.status));

    // Body
    const body = document.createElement('div');
    body.className = 'card-body';
    body.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Customer Contact</span>
          <span class="detail-value">${escapeHtml(customerInfo)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Odometer at Intake</span>
          <span class="detail-value font-mono">${req.odometerReadingKm != null ? `${req.odometerReadingKm.toLocaleString()} km` : '—'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Vehicle Specs</span>
          <span class="detail-value">${escapeHtml(req.vehicle ? `${req.vehicle.fuelType || '—'} / ${req.vehicle.year || '—'}` : '—')}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Date Submitted</span>
          <span class="detail-value">${formatDate(req.createdAt)}</span>
        </div>
      </div>

      <div class="detail-item" style="margin-top: var(--space-3);">
        <span class="detail-label">Customer Complaints / Service Description</span>
        <div class="text-sm text-neutral-800" style="margin-top: 4px; white-space: pre-wrap;">${escapeHtml(req.description || 'No description provided')}</div>
      </div>
    `;

    // Footer with Assignment Selector
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    footer.style.justifyContent = 'space-between';
    footer.style.flexWrap = 'wrap';

    const leftNote = document.createElement('div');
    leftNote.className = 'text-xs text-muted';
    leftNote.innerHTML = `Status: <strong>Unassigned</strong>`;

    const form = document.createElement('form');
    form.className = 'flex items-center gap-3 flex-wrap';
    form.onsubmit = async (e) => {
      e.preventDefault();
      const select = form.querySelector('select');
      const empId = select.value;
      if (!empId) {
        showToast('Selection Required', 'Please select an employee to assign.', 'warning');
        return;
      }
      await handleAssign(req.id, empId);
    };

    const select = document.createElement('select');
    select.className = 'form-control';
    select.style.minWidth = '220px';
    select.required = true;

    if (availableEmployees.length === 0) {
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = '-- No Technicians Available --';
      select.appendChild(emptyOpt);
      select.disabled = true;
    } else {
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '-- Select Technician --';
      select.appendChild(defaultOpt);

      availableEmployees.forEach((emp) => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = `${emp.name} (${emp.email})`;
        select.appendChild(opt);
      });
    }

    const assignBtn = document.createElement('button');
    assignBtn.type = 'submit';
    assignBtn.className = 'btn btn-primary';
    assignBtn.disabled = availableEmployees.length === 0;
    assignBtn.innerHTML = `<span>Assign Technician</span>`;

    form.appendChild(select);
    form.appendChild(assignBtn);

    footer.appendChild(leftNote);
    footer.appendChild(form);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);

    list.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(list);
}

async function handleAssign(requestId, employeeId) {
  try {
    const updated = await serviceRequestsAPI.assignEmployee(requestId, employeeId);
    const techName = updated.employee ? updated.employee.name : 'Technician';
    showToast('Assignment Success', `Assigned ${techName} to Service Request #SR-${requestId}.`, 'success', 3000);
    await loadAssignmentData();
  } catch (err) {
    showToast('Assignment Error', err.message || 'Could not assign employee.', 'error');
  }
}
