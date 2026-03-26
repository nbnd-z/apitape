/**
 * @fileoverview Diff command - compares fixtures against live API
 * @module cli/commands/diff
 */

import { loadConfig, resolveEnv } from '../../core/config.js';
import { fetchWithAuth } from '../../core/http-client.js';
import { listFixtures, loadFixture, loadMetadata } from '../../core/fixture-store.js';
import { diffObjects, formatDiffResult, setDiffArraySampleSize } from '../../core/differ.js';
import { pAll } from '../../core/utils.js';

/**
 * Compare all fixtures against live API
 * @param {Object} options - Command options
 * @returns {Promise<number>} Exit code
 */
export async function diffCommand(options = {}) {
  const { env, failOnDrift = false, json = false, name: filterName, concurrency = 4 } = options;

  /** @param {string} msg */
  const log = (msg) => { if (!json) console.log(msg); };

  log(`Comparing fixtures against ${env || 'default'} environment...\n`);

  try {
    const config = await loadConfig(options.config);
    if (config.arraySampleSize) {
      setDiffArraySampleSize(config.arraySampleSize);
    }
    let fixtures = await listFixtures();

    if (filterName) {
      fixtures = fixtures.filter(f => f.name === filterName);
    }

    if (fixtures.length === 0) {
      log('No fixtures found. Run `apitape capture` first.');
      return 0;
    }

    const tasks = fixtures.map(fixture => async () => {
      const fName = fixture.name;
      const metadata = await loadMetadata(fName);
      if (!metadata || !metadata.url) {
        log(`  ? ${fName} - No metadata found, skipping`);
        return { name: fName, status: 'skipped' };
      }

      const url = resolveEnv(metadata.url, env, config);
      log(`Checking ${fName}...`);

      try {
        const response = await fetchWithAuth(url, {
          method: metadata.method || 'GET',
          headers: { ...(config.defaultHeaders || {}), ...(metadata.headers || {}) }
        });

        const capturedData = await loadFixture(fName);
        const diff = diffObjects(capturedData, response.data);

        log(formatDiffResult(diff));
        log('');

        return { name: fName, url, diff, status: diff.status };
      } catch (error) {
        log(`  ✗ ${fName} - Error: ${error.message}\n`);
        return { name: fName, url, error: error.message, status: 'error' };
      }
    });

    const results = await pAll(tasks, Number(concurrency));

    const fresh = results.filter(r => r.status === 'fresh').length;
    const drifted = results.filter(r => r.status === 'drifted').length;
    const breaking = results.filter(r => r.status === 'breaking').length;
    const errors = results.filter(r => r.status === 'error').length;
    const hasDrift = drifted > 0 || breaking > 0;

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
      log('\nDrift detected! Fixtures are out of sync with API.');
      return 1;
    }

    if (breaking > 0) {
      log('\nBreaking changes detected! Update your fixtures before tests fail.');
      return failOnDrift ? 1 : 0;
    }

    return 0;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return 1;
  }
}
