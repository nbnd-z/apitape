/**
 * @fileoverview Core utility functions
 * @module core/utils
 */

/**
 * Convert string to PascalCase
 * @param {string} str - Input string
 * @returns {string} PascalCase string
 */
export function toPascalCase(str) {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Sanitize fixture name for file system
 * @param {string} name - Original name
 * @returns {string} Sanitized name (max 100 chars)
 * @throws {Error} If name is empty or results in empty string after sanitization
 */
export function sanitizeName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Fixture name must be a non-empty string');
  }
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
  if (!sanitized) {
    throw new Error(`Fixture name "${name}" is invalid after sanitization`);
  }
  return sanitized;
}

/**
 * Concurrency-limited Promise.all
 * @param {Array<Function>} tasks - Array of () => Promise
 * @param {number} limit - Concurrency limit
 * @returns {Promise<Array>} Results in original order
 */
export async function pAll(tasks, limit) {
  const results = new Array(tasks.length);
  let idx = 0;
  async function run() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => run()));
  return results;
}
