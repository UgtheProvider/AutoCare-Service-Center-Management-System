/**
 * AutoCare v1.0 — Add Vehicle Controller
 */

import { requireAuth } from '../auth-guard.js';
import { initNavigation } from '../navigation.js';
import { vehiclesAPI } from '../api.js';
import { showToast } from '../notifications.js';

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = requireAuth('CUSTOMER');
  if (!currentUser) return;

  initNavigation(currentUser, 'add-vehicle.html');

  const form = document.getElementById('add-vehicle-form');
  const inputVehNumber = document.getElementById('input-veh-number');
  const inputManufacturer = document.getElementById('input-manufacturer');
  const inputModel = document.getElementById('input-model');
  const inputYear = document.getElementById('input-year');
  const selectFuel = document.getElementById('select-fuel');
  const submitBtn = document.getElementById('btn-add-submit');
  const btnText = document.getElementById('btn-add-text');
  const btnSpinner = document.getElementById('btn-add-spinner');
  const alertEl = document.getElementById('form-alert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const vehicleNumber = inputVehNumber.value.trim().toUpperCase();
    const manufacturer = inputManufacturer.value.trim();
    const model = inputModel.value.trim();
    const yearVal = inputYear.value.trim();
    const fuelType = selectFuel.value;

    let hasError = false;

    if (!vehicleNumber) {
      showFieldError('veh-number', 'Vehicle registration plate number is required.');
      hasError = true;
    }

    if (!manufacturer) {
      showFieldError('manufacturer', 'Manufacturer / Make is required.');
      hasError = true;
    }

    if (!model) {
      showFieldError('model', 'Model name is required.');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    try {
      await vehiclesAPI.add({
        owner: { id: currentUser.id },
        vehicleNumber,
        manufacturer,
        model,
        year: yearVal ? parseInt(yearVal, 10) : null,
        fuelType
      });

      showToast('Vehicle Registered', `Vehicle ${vehicleNumber} has been added successfully.`, 'success', 2500);

      setTimeout(() => {
        window.location.href = 'vehicles.html';
      }, 700);
    } catch (err) {
      setLoading(false);
      showAlert(err.message || 'Failed to register vehicle. Please check the details.', 'danger');
      showToast('Registration Error', err.message || 'Could not register vehicle', 'error');
    }
  });

  function showFieldError(field, message) {
    const group = document.getElementById(`group-${field}`);
    const errorEl = document.getElementById(`error-${field}`);
    if (group) group.classList.add('has-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'flex';
    }
  }

  function clearErrors() {
    ['veh-number', 'manufacturer', 'model', 'year', 'fuel'].forEach((f) => {
      const group = document.getElementById(`group-${f}`);
      const errorEl = document.getElementById(`error-${f}`);
      if (group) group.classList.remove('has-error');
      if (errorEl) errorEl.style.display = 'none';
    });
    if (alertEl) {
      alertEl.classList.add('hidden');
    }
  }

  function showAlert(msg, type) {
    if (!alertEl) return;
    alertEl.style.backgroundColor = type === 'danger' ? '#fef2f2' : '#f0fdf4';
    alertEl.style.color = type === 'danger' ? '#b91c1c' : '#15803d';
    alertEl.style.border = `1px solid ${type === 'danger' ? '#fecaca' : '#bbf7d0'}`;
    alertEl.textContent = msg;
    alertEl.classList.remove('hidden');
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    if (loading) {
      btnText.textContent = 'Registering...';
      btnSpinner.classList.remove('hidden');
    } else {
      btnText.textContent = 'Register Vehicle';
      btnSpinner.classList.add('hidden');
    }
  }
});
