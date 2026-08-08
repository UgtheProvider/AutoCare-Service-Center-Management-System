/**
 * AutoCare v1.0 — Customer Vehicles Controller
 */

import { requireAuth } from '../auth-guard.js';
import { initNavigation } from '../navigation.js';
import { vehiclesAPI } from '../api.js';
import { createEmptyState, escapeHtml } from '../utils.js';
import { showToast, showConfirmDialog } from '../notifications.js';

let currentUser = null;
let currentVehicles = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = requireAuth('CUSTOMER');
  if (!currentUser) return;

  initNavigation(currentUser, 'vehicles.html');
  await loadVehicles();
  setupEditModal();
});

async function loadVehicles() {
  const container = document.getElementById('vehicles-container');
  try {
    const allVehicles = await vehiclesAPI.getAll();
    currentVehicles = (allVehicles || []).filter(
      (v) => v.owner && String(v.owner.id) === String(currentUser.id)
    );

    if (currentVehicles.length === 0) {
      container.innerHTML = '';
      container.appendChild(
        createEmptyState(
          'No Vehicles Registered Yet',
          'Register your vehicle with plate number and model details to easily request service appointments.',
          '+ Register Your First Vehicle',
          'add-vehicle.html'
        )
      );
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'vehicles-grid';

    currentVehicles.forEach((veh) => {
      const card = document.createElement('div');
      card.className = 'vehicle-card';

      // Header
      const header = document.createElement('div');
      header.className = 'vehicle-card-header';
      header.innerHTML = `
        <span class="vehicle-plate">${escapeHtml(veh.vehicleNumber)}</span>
        <span class="vehicle-fuel-badge">${escapeHtml(veh.fuelType || 'Standard')}</span>
      `;

      // Body
      const body = document.createElement('div');
      body.className = 'vehicle-card-body';
      body.innerHTML = `
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
      `;

      // Footer Actions
      const footer = document.createElement('div');
      footer.className = 'vehicle-card-footer';

      const leftActions = document.createElement('div');
      leftActions.className = 'flex items-center gap-2';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.textContent = 'Edit Specs';
      editBtn.onclick = () => openEditModal(veh);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-outline-danger btn-sm';
      deleteBtn.textContent = 'Delete';
      deleteBtn.onclick = () => handleDeleteVehicle(veh);

      leftActions.appendChild(editBtn);
      leftActions.appendChild(deleteBtn);

      const rightActions = document.createElement('div');
      rightActions.className = 'flex items-center gap-2';

      const histBtn = document.createElement('a');
      histBtn.className = 'btn btn-secondary btn-sm';
      histBtn.href = `service-history.html?vehicleNumber=${encodeURIComponent(veh.vehicleNumber)}`;
      histBtn.textContent = 'History';

      const bookBtn = document.createElement('a');
      bookBtn.className = 'btn btn-primary btn-sm';
      bookBtn.href = `create-request.html?vehicleId=${encodeURIComponent(veh.id)}`;
      bookBtn.textContent = 'Book Service';

      rightActions.appendChild(histBtn);
      rightActions.appendChild(bookBtn);

      footer.appendChild(leftActions);
      footer.appendChild(rightActions);

      card.appendChild(header);
      card.appendChild(body);
      card.appendChild(footer);

      grid.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(grid);
  } catch (err) {
    console.error('Failed to load vehicles:', err);
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load vehicles: ${escapeHtml(err.message)}</p></div>`;
  }
}

function setupEditModal() {
  const modal = document.getElementById('edit-vehicle-modal');
  const closeBtn = document.getElementById('modal-edit-close');
  const cancelBtn = document.getElementById('modal-edit-cancel');
  const form = document.getElementById('edit-vehicle-form');
  const saveBtn = document.getElementById('btn-save-vehicle');
  const spinner = document.getElementById('spinner-save-vehicle');

  const closeModal = () => modal.classList.remove('open');

  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;

  form.onsubmit = async (e) => {
    e.preventDefault();

    const id = document.getElementById('edit-vehicle-id').value;
    const manufacturer = document.getElementById('edit-manufacturer').value.trim();
    const model = document.getElementById('edit-model').value.trim();
    const yearVal = document.getElementById('edit-year').value;
    const fuelType = document.getElementById('edit-fuel').value;

    if (!manufacturer || !model) {
      showToast('Validation Error', 'Manufacturer and model are required.', 'warning');
      return;
    }

    saveBtn.disabled = true;
    spinner.classList.remove('hidden');

    try {
      await vehiclesAPI.update(id, {
        manufacturer,
        model,
        year: yearVal ? parseInt(yearVal, 10) : null,
        fuelType
      });

      showToast('Vehicle Updated', 'Vehicle specifications updated successfully.', 'success');
      closeModal();
      await loadVehicles();
    } catch (err) {
      showToast('Update Failed', err.message || 'Could not update vehicle.', 'error');
    } finally {
      saveBtn.disabled = false;
      spinner.classList.add('hidden');
    }
  };
}

function openEditModal(veh) {
  const modal = document.getElementById('edit-vehicle-modal');
  document.getElementById('edit-vehicle-id').value = veh.id;
  document.getElementById('edit-vehicle-number').value = veh.vehicleNumber;
  document.getElementById('edit-manufacturer').value = veh.manufacturer || '';
  document.getElementById('edit-model').value = veh.model || '';
  document.getElementById('edit-year').value = veh.year || '';
  document.getElementById('edit-fuel').value = veh.fuelType || 'Petrol';

  modal.classList.add('open');
}

async function handleDeleteVehicle(veh) {
  const confirmed = await showConfirmDialog({
    title: 'Delete Vehicle Record',
    message: `Are you sure you want to delete vehicle ${veh.vehicleNumber} (${veh.manufacturer} ${veh.model})?`,
    confirmText: 'Delete Vehicle',
    danger: true
  });

  if (!confirmed) return;

  try {
    await vehiclesAPI.delete(veh.id);
    showToast('Vehicle Deleted', `Vehicle ${veh.vehicleNumber} was removed.`, 'success');
    await loadVehicles();
  } catch (err) {
    showToast('Delete Failed', err.message || 'Could not delete vehicle.', 'error');
  }
}
