/**
 * AutoCare v1.0 — Create Service Request Controller
 */

import { requireAuth } from '../auth-guard.js';
import { initNavigation } from '../navigation.js';
import { vehiclesAPI, serviceRequestsAPI } from '../api.js';
import { showToast } from '../notifications.js';

document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = requireAuth('CUSTOMER');
  if (!currentUser) return;

  initNavigation(currentUser, 'create-request.html');

  const selectVehicle = document.getElementById('select-vehicle');
  const inputOdometer = document.getElementById('input-odometer');
  const inputDescription = document.getElementById('input-description');
  const form = document.getElementById('create-request-form');
  const submitBtn = document.getElementById('btn-submit-request');
  const btnText = document.getElementById('btn-submit-text');
  const btnSpinner = document.getElementById('btn-submit-spinner');
  const alertEl = document.getElementById('form-alert');

  // Check URL params for preselected vehicle ID
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedVehId = urlParams.get('vehicleId');

  // Load customer's vehicles
  try {
    const allVehicles = await vehiclesAPI.getAll();
    const customerVehicles = (allVehicles || []).filter(
      (v) => v.owner && String(v.owner.id) === String(currentUser.id)
    );

    selectVehicle.innerHTML = '';

    if (customerVehicles.length === 0) {
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '-- No registered vehicles found --';
      selectVehicle.appendChild(defaultOpt);
      selectVehicle.disabled = true;

      showAlert('You have no registered vehicles. Please register a vehicle before booking service.', 'warning');
      submitBtn.disabled = true;
      return;
    }

    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    placeholderOpt.textContent = '-- Choose a vehicle --';
    selectVehicle.appendChild(placeholderOpt);

    customerVehicles.forEach((veh) => {
      const opt = document.createElement('option');
      opt.value = veh.id;
      opt.textContent = `${veh.manufacturer} ${veh.model} — ${veh.vehicleNumber} (${veh.fuelType || 'Standard'})`;
      if (preselectedVehId && String(veh.id) === String(preselectedVehId)) {
        opt.selected = true;
      }
      selectVehicle.appendChild(opt);
    });

  } catch (err) {
    console.error('Failed to load vehicles:', err);
    selectVehicle.innerHTML = '<option value="">Error loading vehicles</option>';
    showAlert('Failed to connect to backend to retrieve vehicles.', 'danger');
  }

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const vehicleId = selectVehicle.value;
    const odometerVal = inputOdometer.value.trim();
    const description = inputDescription.value.trim();

    let hasError = false;

    if (!vehicleId) {
      showFieldError('vehicle', 'Please select a vehicle.');
      hasError = true;
    }

    if (!odometerVal || isNaN(Number(odometerVal)) || Number(odometerVal) < 0) {
      showFieldError('odometer', 'Please enter a valid non-negative odometer reading.');
      hasError = true;
    }

    if (!description) {
      showFieldError('description', 'Please describe the service requirements.');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    try {
      const createdRequest = await serviceRequestsAPI.create({
        vehicle: { id: parseInt(vehicleId, 10) },
        odometerReadingKm: parseInt(odometerVal, 10),
        description
      });

      showToast(
        'Request Created',
        `Service Request #SR-${createdRequest.id} created with initial status CREATED.`,
        'success',
        2500
      );

      setTimeout(() => {
        window.location.href = 'requests.html';
      }, 800);
    } catch (err) {
      setLoading(false);
      showAlert(err.message || 'Failed to create service request.', 'danger');
      showToast('Booking Error', err.message || 'Could not submit service request', 'error');
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
    ['vehicle', 'odometer', 'description'].forEach((f) => {
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
    alertEl.style.backgroundColor = type === 'danger' ? '#fef2f2' : type === 'warning' ? '#fffbeb' : '#f0fdf4';
    alertEl.style.color = type === 'danger' ? '#b91c1c' : type === 'warning' ? '#b45309' : '#15803d';
    alertEl.style.border = `1px solid ${type === 'danger' ? '#fecaca' : type === 'warning' ? '#fde68a' : '#bbf7d0'}`;
    alertEl.textContent = msg;
    alertEl.classList.remove('hidden');
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    if (loading) {
      btnText.textContent = 'Submitting Request...';
      btnSpinner.classList.remove('hidden');
    } else {
      btnText.textContent = 'Submit Service Request';
      btnSpinner.classList.add('hidden');
    }
  }
});
