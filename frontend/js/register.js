/**
 * AutoCare v1.0 — Registration Controller
 */

import { registerUser } from './auth.js';
import { showToast } from './notifications.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const inputName = document.getElementById('input-name');
  const inputEmail = document.getElementById('input-email');
  const inputPhone = document.getElementById('input-phone');
  const inputPassword = document.getElementById('input-password');
  const selectRole = document.getElementById('select-role');
  const submitBtn = document.getElementById('btn-register-submit');
  const btnText = document.getElementById('btn-register-text');
  const btnSpinner = document.getElementById('btn-register-spinner');
  const alertEl = document.getElementById('register-alert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name = inputName.value.trim();
    const email = inputEmail.value.trim();
    const phone = inputPhone.value.trim();
    const password = inputPassword.value;
    const role = selectRole.value;

    let hasError = false;

    if (!name) {
      showFieldError('name', 'Full name is required.');
      hasError = true;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError('email', 'Please enter a valid email address.');
      hasError = true;
    }

    if (!phone || phone.length < 7) {
      showFieldError('phone', 'Please enter a valid phone number (at least 7 digits).');
      hasError = true;
    }

    if (!password || password.length < 6) {
      showFieldError('password', 'Password must be at least 6 characters.');
      hasError = true;
    }

    if (!['CUSTOMER', 'EMPLOYEE', 'MANAGER'].includes(role)) {
      showFieldError('role', 'Invalid role selected.');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    try {
      await registerUser({
        name,
        email,
        phone,
        password,
        role
      });

      showToast('Registration Successful', 'Your account has been created. Redirecting to login...', 'success', 2500);

      setTimeout(() => {
        window.location.href = 'login.html?registered=true';
      }, 1000);
    } catch (err) {
      setLoading(false);
      showAlert(err.message || 'Registration failed. Please try again.', 'danger');
      showToast('Registration Error', err.message || 'Could not register user', 'error');
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
    ['name', 'email', 'phone', 'password', 'role'].forEach((f) => {
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
      btnText.textContent = 'Creating Account...';
      btnSpinner.classList.remove('hidden');
    } else {
      btnText.textContent = 'Create Account';
      btnSpinner.classList.add('hidden');
    }
  }
});
