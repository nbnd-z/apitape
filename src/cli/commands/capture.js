/**
 * @fileoverview Capture command - captures API responses as fixtures
 * @module cli/commands/capture
 */

import { loadConfig, resolveEnv } from '../../core/config.js';
import { fetchWithAuth } from '../../core/http-client.js';
import { saveFixture, getFixturesDir, fixtureExists } from '../../core/fixture-store.js';
import { generateArtifacts } from '../../core/artifacts.js';
import { parseHeaders } from '../utils.js';
import { sanitizeName } from '../../core/utils.js';
import fs from 'fs/promises';

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
      if (options.data.startsWith('@')) {
        const filePath = options.data.slice(1);
        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          body = JSON.parse(fileContent);
        } catch (err) {
          console.error(`✗ Failed to read/parse data file "${filePath}": ${err.message}`);
          return 1;
        }
      } else {
        try {
          body = JSON.parse(options.data);
        } catch {
          body = options.data;
        }
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

    const fixtureName = options.name || nameFromUrl(resolvedUrl, method);
    const isOverwrite = await fixtureExists(fixtureName);

    const metadata = {
      url: resolvedUrl,
      method,
      capturedAt: new Date().toISOString(),
      headers: mergedHeaders,
      status: response.status,
      ...(options.tag ? { tags: Array.isArray(options.tag) ? options.tag : [options.tag] } : {})
    };

    await saveFixture(fixtureName, response.data, metadata);
    console.log(`✓ ${isOverwrite ? 'Updated' : 'Saved'} fixture: ${fixtureName} (HTTP ${response.status})`);

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

/**
 * Derive a fixture name from URL and method
 * @param {string} url - Request URL
 * @param {string} method - HTTP method
 * @returns {string} Sanitized fixture name
 */
function nameFromUrl(url, method) {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split('/').filter(Boolean);
    const base = segments.length > 0 ? segments.join('-') : 'fixture';
    const prefix = method.toLowerCase() !== 'get' ? `${method.toLowerCase()}-` : '';
    return sanitizeName(`${prefix}${base}`);
  } catch {
    return sanitizeName(url.replace(/[^a-z0-9]/gi, '-'));
  }
}
