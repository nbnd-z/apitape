/**
 * @fileoverview CLI utility functions
 * @module cli/utils
 */

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
