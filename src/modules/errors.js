/**
 * errors.js — Error handling & toast notification system
 * Replaces all alert() calls with elegant, themed toast notifications.
 * Also provides browser compatibility detection.
 */

// ==================== TOAST SYSTEM ====================

const TOAST_DURATION = 4000;
const TOAST_TYPES = {
  error: { icon: '⚠️', className: 'toast-error' },
  success: { icon: '✅', className: 'toast-success' },
  info: { icon: 'ℹ️', className: 'toast-info' },
  loading: { icon: '⏳', className: 'toast-loading' },
};

let toastContainer = null;
let activeToasts = [];

/**
 * Initialize the toast system. Call once on DOMContentLoaded.
 */
export function initToastSystem() {
  toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
}

/**
 * Show a toast notification.
 * @param {string} message - Message to display
 * @param {'error'|'success'|'info'|'loading'} type - Toast type
 * @param {number} [duration] - Duration in ms (0 = persistent, requires manual dismiss)
 * @returns {HTMLElement} - The toast element (for manual removal)
 */
export function showToast(message, type = 'info', duration = TOAST_DURATION) {
  if (!toastContainer) initToastSystem();

  const config = TOAST_TYPES[type] || TOAST_TYPES.info;

  const toast = document.createElement('div');
  toast.className = `toast ${config.className}`;
  toast.innerHTML = `
    <span class="toast-icon">${config.icon}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Fechar">&times;</button>
  `;

  // Close button handler
  toast.querySelector('.toast-close').addEventListener('click', () => {
    dismissToast(toast);
  });

  toastContainer.appendChild(toast);
  activeToasts.push(toast);

  // Trigger entrance animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  // Auto-dismiss (unless duration is 0 — persistent)
  if (duration > 0) {
    setTimeout(() => {
      dismissToast(toast);
    }, duration);
  }

  return toast;
}

/**
 * Dismiss a specific toast.
 * @param {HTMLElement} toast
 */
export function dismissToast(toast) {
  if (!toast || !toast.parentNode) return;

  toast.classList.remove('toast-visible');
  toast.classList.add('toast-exiting');

  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
    activeToasts = activeToasts.filter((t) => t !== toast);
  }, 350);
}

/**
 * Dismiss all active toasts.
 */
export function dismissAllToasts() {
  [...activeToasts].forEach(dismissToast);
}

// ==================== COMPATIBILITY DETECTION ====================

/**
 * Check browser compatibility for core features.
 * @returns {{ compatible: boolean, issues: string[] }}
 */
export function checkCompatibility() {
  const issues = [];

  // WebGL check
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      issues.push('WebGL não suportado — necessário para a IA de segmentação');
    }
  } catch (e) {
    issues.push('WebGL não disponível neste navegador');
  }

  // Canvas check
  if (!document.createElement('canvas').getContext) {
    issues.push('Canvas API não suportada');
  }

  // getUserMedia check (camera)
  if (!navigator.mediaDevices?.getUserMedia && !navigator.getUserMedia) {
    // Not a critical issue — user can still upload from gallery
  }

  // ES Module support (if this runs, it's already supported)

  return {
    compatible: issues.length === 0,
    issues,
  };
}

/**
 * Show the incompatible browser fallback overlay.
 * @param {string[]} issues - List of compatibility issues
 */
export function showIncompatibleOverlay(issues) {
  const overlay = document.getElementById('compat-overlay');
  if (!overlay) return;

  const issueList = overlay.querySelector('.compat-issues');
  if (issueList) {
    issueList.innerHTML = issues
      .map((issue) => `<li>${issue}</li>`)
      .join('');
  }

  overlay.classList.remove('hidden');
}

// ==================== LOADING PROGRESS ====================

let loadingToast = null;

/**
 * Show a loading toast with custom message.
 * @param {string} message
 * @returns {HTMLElement}
 */
export function showLoading(message = 'Carregando...') {
  dismissLoading();
  loadingToast = showToast(message, 'loading', 0);
  return loadingToast;
}

/**
 * Update the loading toast message.
 * @param {string} message
 */
export function updateLoading(message) {
  if (loadingToast) {
    const msgEl = loadingToast.querySelector('.toast-message');
    if (msgEl) msgEl.textContent = message;
  }
}

/**
 * Dismiss the loading toast.
 */
export function dismissLoading() {
  if (loadingToast) {
    dismissToast(loadingToast);
    loadingToast = null;
  }
}
