/**
 * @fileoverview HTTP client using native fetch
 * @module core/http-client
 */

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
 */

/**
 * @typedef {Object} FetchResponse
 * @property {number} status - HTTP status code
 * @property {Object} headers - Response headers
 * @property {*} data - Response data
 */

/**
 * Fetch with authentication support
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
    timeout = 30000
  } = options;

  // Build request headers
  const requestHeaders = { ...headers };

  // Add auth headers
  if (auth) {
    const authHeader = buildAuthHeader(auth);
    if (authHeader) {
      requestHeaders[authHeader.name] = authHeader.value;
    }
  }

  // Build request config
  const requestConfig = {
    method,
    headers: requestHeaders
  };

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    requestConfig.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  requestConfig.signal = controller.signal;

  try {
    const response = await fetch(url, requestConfig);
    clearTimeout(timeoutId);

    // Parse response
    const contentType = response.headers.get('content-type') || '';
    let data;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Convert headers to object
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      headers: responseHeaders,
      data
    };

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }

    throw error;
  }
}

/**
 * Sanitise a header value by stripping characters that could enable header injection.
 * @param {string} value - Raw header value
 * @returns {string} Sanitised value
 */
function sanitizeHeaderValue(value) {
  // Strip carriage returns, newlines, and null bytes
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
      return {
        name: 'Authorization',
        value: `Bearer ${token}`
      };

    case 'api-key':
      return {
        name: auth.header || 'X-API-Key',
        value: token
      };

    default:
      return null;
  }
}