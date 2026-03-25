/**
 * @fileoverview Capture command - captures API responses as fixtures
 * @module cli/commands/capture
 */

import { loadConfig, resolveEnv } from '../../core/config.js';
import { fetchWithAuth } from '../../core/http-client.js';
import { saveFixture, getFixturesDir } from '../../core/fixture-store.js';
import { generateArtifacts } from '../../core/artifacts.js';
import { parseHeaders } from '../utils.js';

/**
 * Capture an API response as a fixture
 * @param {string} url - URL to capture
 * @param {Object} options - Command options
 * @returns {Promise<number>} Exit code
 */
export async function captureCommand(url, options = {}) {
  try {
    const config = await loadConfig();

    // Resolve URL with environment
    const resolvedUrl = resolveEnv(url, options.env, config);
    console.log(`Capturing: ${resolvedUrl}`);

    // Parse headers
    const customHeaders = parseHeaders(options.header);
    const mergedHeaders = { ...config.defaultHeaders, ...customHeaders };

    // Build auth: CLI flags override config
    const authOptions = buildAuth(options, config);

    // Fetch the API
    const response = await fetchWithAuth(resolvedUrl, {
      method: options.method || 'GET',
      headers: mergedHeaders,
      auth: authOptions
    });

    // Reject non-2xx unless --allow-error is set
    if (response.status >= 400 && !options.allowError) {
      console.error(`✗ HTTP ${response.status} — use --allow-error to capture error responses`);
      return 1;
    }

    // Validate fixture name
    if (!options.name) {
      console.error('✗ Missing required option: --name <name>');
      return 1;
    }

    // Save fixture
    const fixtureName = options.name;
    const metadata = {
      url: resolvedUrl,
      method: options.method || 'GET',
      capturedAt: new Date().toISOString(),
      headers: mergedHeaders,
      status: response.status
    };

    await saveFixture(fixtureName, response.data, metadata);
    console.log(`✓ Saved fixture: ${fixtureName} (HTTP ${response.status})`);

    // Generate artifacts if requested
    const fixturesDir = await getFixturesDir();
    const generated = await generateArtifacts(
      fixtureName,
      response.data,
      { jsdoc: options.jsdoc, typescript: options.typescript, msw: options.msw },
      { url: resolvedUrl, method: options.method || 'GET' },
      fixturesDir
    );

    for (const filePath of generated) {
      console.log(`✓ Generated: ${filePath}`);
    }

    return 0;
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    return 1;
  }
}

/**
 * Build auth options — CLI flags take priority, then config
 * @param {Object} options - CLI options
 * @param {Object} config - Loaded config
 * @returns {Object} Auth options for fetchWithAuth
 */
function buildAuth(options, config) {
  if (options.auth && options.authToken) {
    return { type: options.auth, token: options.authToken };
  }
  if (config.auth && config.auth.type && config.auth.token) {
    return { type: config.auth.type, token: config.auth.token };
  }
  return {};
}
