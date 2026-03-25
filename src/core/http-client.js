/**
 * @fileoverview HTTP client using native fetch
 * @module core/http-client
 */

import { HttpRequestError } from './errors.js';

/**
 * @typedef {Object} AuthOptions
 * @property {string} type - Auth type (bearer, api-key)
 * @property {string} token - Auth token or API key
 * @property {string} [header] - Header name for API key (default: X-API-Key)
 */

/**
 * @typedef {Object} FetchOptions
 * @property {string} method - HTTP method
 * @property {Object} headers - Request headers
 * @property {AuthOptions} auth - Authentication options
 * @property {Object} body - Request body
 * @property {number} timeout - Request timeout in ms
 * @property {number} retries - Number of retries (default: 0)
 * @property {number} retryDelay - Base delay in ms between retries (default: 1000)
 */

/**
 * @typedef {Object} FetchResponse
 * @property {number} status - HTTP status code
 * @property {Object} headers - Response headers
 * @property {*} data - Response data
 */

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with authentication and retry support
 * @param {string} url - URL to fetch
 * @param {FetchOptions} options - Fetch options
 * @returns {Promise<FetchResponse>} Response object
 */
export async function fetchWithAuth(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    auth = null,
    body = null,
    timeout = 30000,
    retries = 0,
    retryDelay = 1000
  } = options;

  const requestHeaders = { ...headers };

  if (auth) {
    const authHeader = buildAuthHeader(auth);
    if (authHeader) {
      requestHeaders[authHeader.name] = authHeader.value;
    }
  }

  const requestConfig = { method, headers: requestHeaders };

  if (body && method !== 'GET') {
    requestConfig.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await sleep(retryDelay * Math.pow(2, attempt - 1));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestConfig.signal = controller.signal;

    try {
      const response = await fetch(url, requestConfig);
      clearTimeout(timeoutId);

      // Retry on 5xx
      if (response.status >= 500 && attempt < retries) {
        lastError = new HttpRequestError(`HTTP ${response.status}`, { url, status: response.status });
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return { status: response.status, headers: responseHeaders, data };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        lastError = new HttpRequestError(`Request timed out after ${timeout}ms`, { url });
      } else {
        lastError = error;
      }

      if (attempt >= retries) throw lastError;
    }
  }

  throw lastError;
}

/**
 * Sanitise a header value
 * @param {string} value - Raw header value
 * @returns {string} Sanitised value
 */
function sanitizeHeaderValue(value) {
  return String(value).replace(/[\r\n\0]/g, '');
}

/**
 * Build auth header from auth options
 * @param {AuthOptions} auth - Auth options
 * @returns {Object|null} Auth header object
 */
function buildAuthHeader(auth) {
  if (!auth || !auth.token) return null;

  const token = sanitizeHeaderValue(auth.token);

  switch (auth.type) {
    case 'bearer':
      return { name: 'Authorization', value: `Bearer ${token}` };
    case 'api-key':
      return { name: auth.header || 'X-API-Key', value: token };
    default:
      return null;
  }
}
