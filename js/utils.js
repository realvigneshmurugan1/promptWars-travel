/**
 * Utility functions for security and formatting
 */

/**
 * Sanitize a string to prevent XSS
 */
export function sanitize(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Format a number as a percentage
 */
export function formatPercent(val) {
  return `${Math.round(val * 100)}%`;
}

/**
 * Debounce a function call
 */
export function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
