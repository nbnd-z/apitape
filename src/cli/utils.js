/**
 * @fileoverview CLI utility functions
 * @module cli/utils
 */

// Re-export from core for backward compatibility
export { toPascalCase, sanitizeName } from '../core/utils.js';

/**
 * Parse header string into object
 * @param {string} headerStr - Header in "key: value" format
 * @returns {Object} Parsed header object
 */
export function parseHeader(headerStr) {
  const [key, ...valueParts] = headerStr.split(':');
  return { [key.trim()]: valueParts.join(':').trim() };
}

/**
 * Parse multiple headers from array
 * @param {string[]} headers - Array of header strings
 * @returns {Object} Merged headers object
 */
export function parseHeaders(headers) {
  if (!headers || !Array.isArray(headers)) return {};
  return headers.reduce((acc, h) => ({ ...acc, ...parseHeader(h) }), {});
}

/**
 * Format bytes to human readable size
 * @param {number} bytes - Size in bytes
 * @returns {string} Human readable size
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Validate fixture name
 * @param {string} name - Fixture name
 * @returns {boolean} True if valid
 */
export function isValidFixtureName(name) {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Slugify a string for use as fixture name
 * @param {string} str - Input string
 * @returns {string} Slugified string
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
