/**
 * @fileoverview Diff command - compares fixtures against live API
 * @module cli/commands/diff
 */

import { loadConfig, resolveEnv } from '../../core/config.js';
import { fetchWithAuth } from '../../core/http-client.js';
import { listFixtures, loadFixture, loadMetadata } from '../../core/fixture-store.js';
import { diffObjects, formatDiffResult } from '../../core/differ.js';

/**
 * Compare all fixtures against live API
 * @param {Object} options - Command options
 * @param {string} options.env - Environment name to compare against
 * @param {string} options.config - Config file path
 * @param {boolean} options.failOnDrift - Exit with error code on drift
 * @param {boolean} options.json - Output as JSON
 * @returns {Promise<number>} Exit code
 */
export async function diffCommand(options = {}) {
  const { env, failOnDrift = false, json = false } = options;

  if (!json) {
    console.log(`Comparing fixtures against ${env || 'default'} environment...\n`);
  }

  try {
    const config = await loadConfig(options.config);
    const fixtures = await listFixtures();

    if (fixtures.length === 0) {
      console.log('No fixtures found. Run `apitape capture` first.');
      return 0;
    }

    const results = [];
    let hasDrift = false;
    let hasBreaking = false;

    for (const fixture of fixtures) {
      const name = fixture.name;
      const metadata = await loadMetadata(name);
      if (!metadata || !metadata.url) {
        console.log(`  ? ${name} - No metadata found, skipping`);
        continue;
      }

      // Use the shared resolveEnv for consistent URL resolution
      const url = resolveEnv(metadata.url, env, config);

      console.log(`Checking ${name}...`);

      try {
        const response = await fetchWithAuth(url, {
          method: metadata.method || 'GET',
          headers: {
            ...(config.defaultHeaders || {}),
            ...(metadata.headers || {})
          }
        });

        const capturedData = await loadFixture(name);
        const diff = diffObjects(capturedData, response.data);

        if (diff.status !== 'fresh') {
          hasDrift = true;
          if (diff.status === 'breaking') {
            hasBreaking = true;
          }
        }

        results.push({ name, url, diff, status: diff.status });

        console.log(formatDiffResult(diff));
        console.log();

      } catch (error) {
        console.log(`  ✗ ${name} - Error: ${error.message}\n`);
        results.push({ name, url, error: error.message, status: 'error' });
      }
    }

    const fresh = results.filter(r => r.status === 'fresh').length;
    const drifted = results.filter(r => r.status === 'drifted').length;
    const breaking = results.filter(r => r.status === 'breaking').length;
    const errors = results.filter(r => r.status === 'error').length;

    if (json) {
      console.log(JSON.stringify({ results, summary: { fresh, drifted, breaking, errors } }, null, 2));
    } else {
      console.log('Summary:');
      console.log(`  Fresh: ${fresh}`);
      console.log(`  Drifted: ${drifted}`);
      console.log(`  Breaking: ${breaking}`);
      console.log(`  Errors: ${errors}`);
    }

    if (failOnDrift && hasDrift) {
      console.log('\nDrift detected! Fixtures are out of sync with API.');
      return 1;
    }

    if (hasBreaking) {
      console.log('\nBreaking changes detected! Update your fixtures before tests fail.');
      return failOnDrift ? 1 : 0;
    }

    return 0;

  } catch (error) {
    console.error(`Error: ${error.message}`);
    return 1;
  }
}
