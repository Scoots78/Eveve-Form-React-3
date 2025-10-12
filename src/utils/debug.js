/**
 * Debug utility functions for conditional logging
 */

/**
 * Check if debug mode is enabled via URL parameter
 * @returns {boolean} True if debug=true is in the URL
 */
export const isDebugMode = () => {
  if (typeof window === 'undefined') return false;
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('debug') === 'true';
};

/**
 * Conditional console.log that only logs when debug mode is enabled
 * @param {...any} args - Arguments to pass to console.log
 */
export const debugLog = (...args) => {
  if (isDebugMode()) {
    console.log(...args);
  }
};

/**
 * Conditional console.groupCollapsed that only logs when debug mode is enabled
 * @param {...any} args - Arguments to pass to console.groupCollapsed
 */
export const debugGroupCollapsed = (...args) => {
  if (isDebugMode()) {
    console.groupCollapsed(...args);
  }
};

/**
 * Conditional console.groupEnd that only logs when debug mode is enabled
 */
export const debugGroupEnd = () => {
  if (isDebugMode()) {
    console.groupEnd();
  }
};