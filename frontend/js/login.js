/**
 * AutoCare v1.0 — Login Controller
 */

import { loginUser, isTokenValid, getCurrentUser, getDashboardUrl } from './auth.js';
import { showToast } from './notifications.js';

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to dashboard
  if (isTokenValid()) {
    const user = getCurrentUser();
    if (user && user.role) {
      window.location.href = getDashboardUrl(user.role);
      return;
    }
  }

  // Handle URL params for feedback (e.g. ?expired=true or ?registered=true)
  const urlParams = new URLSearchParams(window.location.search);
  const alertEl = document.getElementById('login-alert');

  if (urlParams.get('expired') === 'true') {
    showAlert('Your session expired. Please sign in again.', 'warning');
  } else if (urlParams.get('registered') === 'true') {
    showAlert('Account created successfully! Please sign in with your credentials.', 'success');
  } else if (urlParams.get('auth') === 'required') {
    showAlert('Please sign in to access this feature.', 'info');
  }

  const form = document.getElementById('login-form');
  const inputLogin = document.getElementById('input-login');
  const inputPassword = document.getElementById('input-password');
  const submitBtn = document.getElementById('btn-login-submit');
  const btnText = document.getElementById('btn-login-text');
  const btnSpinner = document.getElementById('btn-login-spinner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const loginVal = inputLogin.value.trim();
    const passVal = inputPassword.value;

    let hasError = false;

    if (!loginVal) {
      showFieldError('login', 'Please enter your email or phone number.');
      hasError = true;
    }

    if (!passVal) {
      showFieldError('password', 'Please enter your password.');
      hasError = true;
    }

    if (hasError) return;

    // Set Loading State
    setLoading(true);

    try {
      const user = await loginUser(loginVal, passVal);
      showToast('Login Successful', `Welcome back, ${user.name || user.email}!`, 'success', 2000);
      
      setTimeout(() => {
        window.location.href = getDashboardUrl(user.role);
      }, 600);
    } catch (err) {
      setLoading(false);
      showAlert(err.message || 'Login failed. Please check your credentials.', 'danger');
      showToast('Authentication Error', err.message || 'Invalid credentials', 'error');
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
    ['login', 'password'].forEach((f) => {
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
    alertEl.className = '';
    alertEl.classList.add(`badge-role-${type === 'danger' ? 'CUSTOMER' : 'EMPLOYEE'}`);
    if (type === 'danger') {
      alertEl.style.backgroundColor = '#fef2f2';
      alertEl.style.color = '#b91c1c';
      alertEl.style.border = '1px solid #fecaca';
    } else if (type === 'success') {
      alertEl.style.backgroundColor = '#f0fdf4';
      alertEl.style.color = '#15803d';
      alertEl.style.border = '1px solid #bbf7d0';
    } else if (type === 'warning') {
      alertEl.style.backgroundColor = '#fffbeb';
      alertEl.style.color = '#b45309';
      alertEl.style.border = '1px solid #fde68a';
    } else {
      alertEl.style.backgroundColor = '#f0f9ff';
      alertEl.style.color = '#0369a1';
      alertEl.style.border = '1px solid #bae6fd';
    }
    alertEl.textContent = msg;
    alertEl.classList.remove('hidden');
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    if (loading) {
      btnText.textContent = 'Authenticating...';
      btnSpinner.classList.remove('hidden');
    } else {
      btnText.textContent = 'Sign In';
      btnSpinner.classList.add('hidden');
    }
  }
});
