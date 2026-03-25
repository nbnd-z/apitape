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
    const resolvedUrl = resolveEnv(url, options.env, config);
    console.log(`Capturing: ${resolvedUrl}`);

    const customHeaders = parseHeaders(options.header);
    const mergedHeaders = { ...config.defaultHeaders, ...customHeaders };
    const authOptions = buildAuth(options, config);
    const method = options.method || 'GET';

    // Parse --data body
    let body = null;
    if (options.data) {
      try {
        body = JSON.parse(options.data);
      } catch {
        body = options.data;
      }
    }

    const response = await fetchWithAuth(resolvedUrl, {
      method,
      headers: mergedHeaders,
      auth: authOptions,
      body
    });

    if (response.status >= 400 && !options.allowError) {
      console.error(`✗ HTTP ${response.status} — use --allow-error to capture error responses`);
      return 1;
    }

    if (!options.name) {
      console.error('✗ Missing required option: --name <name>');
      return 1;
    }

    const fixtureName = options.name;
    const metadata = {
      url: resolvedUrl,
      method,
      capturedAt: new Date().toISOString(),
      headers: mergedHeaders,
      status: response.status
    };

    await saveFixture(fixtureName, response.data, metadata);
    console.log(`✓ Saved fixture: ${fixtureName} (HTTP ${response.status})`);

    const fixturesDir = await getFixturesDir();
    const generated = await generateArtifacts(
      fixtureName,
      response.data,
      { jsdoc: options.jsdoc, typescript: options.typescript, msw: options.msw },
      { url: resolvedUrl, method },
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

function buildAuth(options, config) {
  if (options.auth && options.authToken) {
    return { type: options.auth, token: options.authToken };
  }
  if (config.auth && config.auth.type && config.auth.token) {
    return { type: config.auth.type, token: config.auth.token };
  }
  return {};
}
