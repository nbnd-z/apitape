/**
 * @fileoverview Sync command - re-capture all fixtures from original URLs
 * @module cli/commands/sync
 */

import fs from 'fs/promises';
import { loadConfig, resolveEnv } from '../../core/config.js';
import { fetchWithAuth } from '../../core/http-client.js';
import { listFixtures, loadFixture, saveFixture, getFixturesDir } from '../../core/fixture-store.js';
import { regenerateExistingArtifacts } from '../../core/artifacts.js';
import { hashValue } from '../../core/differ.js';
import { sanitizeName } from '../../core/utils.js';
import path from 'path';

/**
 * Concurrency-limited Promise.all
 * @param {Array<Function>} tasks
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function pAll(tasks, limit) {
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

/**
 * Sync all fixtures from their original URLs
 * @param {Object} options - Command options
 * @returns {Promise<number>} Exit code
 */
export async function syncCommand(options = {}) {
  const { env, dryRun = false, force = false, name: filterName, concurrency = 4, backup = false } = options;

  console.log(`Syncing fixtures from ${env || 'default'} environment...\n`);

  try {
    const config = await loadConfig(options.config);
    let fixtures = await listFixtures();

    if (filterName) {
      fixtures = fixtures.filter(f => f.name === filterName);
    }

    const fixturesWithUrls = fixtures.filter(f => f.url);

    if (fixtures.length === 0) {
      console.log('No fixtures found. Run `apitape capture` first.');
      return 0;
    }

    if (fixturesWithUrls.length === 0) {
      console.log('No fixtures with source URLs found.');
      return 0;
    }

    console.log(`Found ${fixturesWithUrls.length} fixture(s) to sync:\n`);

    const fixturesDir = await getFixturesDir();
    let updated = 0;
    let unchanged = 0;
    let failed = 0;

    const tasks = fixturesWithUrls.map(fixture => async () => {
      const { name, url, method } = fixture;
      const resolvedUrl = resolveEnv(url, env, config);

      console.log(`Syncing ${name}...`);
      console.log(`  URL: ${resolvedUrl}`);

      if (dryRun) {
        console.log(`  [DRY RUN] Would re-capture from ${resolvedUrl}\n`);
        return 'dry-run';
      }

      try {
        const response = await fetchWithAuth(resolvedUrl, {
          method: method || 'GET',
          headers: { ...(config.defaultHeaders || {}), ...(fixture.headers || {}) }
        });

        if (!force) {
          const existingData = await loadFixture(name);
          if (hashValue(existingData) === hashValue(response.data)) {
            console.log(`  ✓ Unchanged\n`);
            return 'unchanged';
          }
        }

        // Backup existing fixture before overwriting
        if (backup) {
          const baseName = sanitizeName(name);
          const src = path.join(fixturesDir, `${baseName}.json`);
          const dest = path.join(fixturesDir, `${baseName}.backup.json`);
          await fs.copyFile(src, dest).catch(() => {});
        }

        await saveFixture(name, response.data, {
          url,
          method: method || 'GET',
          capturedAt: new Date().toISOString(),
          headers: fixture.headers,
          status: response.status
        });

        await regenerateExistingArtifacts(name, response.data, { url, method: method || 'GET' }, fixturesDir);

        console.log(`  ✓ Updated\n`);
        return 'updated';
      } catch (error) {
        console.log(`  ✗ Error: ${error.message}\n`);
        return 'error';
      }
    });

    const results = await pAll(tasks, Number(concurrency));

    for (const r of results) {
      if (r === 'updated') updated++;
      else if (r === 'unchanged') unchanged++;
      else if (r === 'error') failed++;
    }

    console.log('Sync Summary:');
    console.log(`  Updated: ${updated}`);
    console.log(`  Unchanged: ${unchanged}`);
    console.log(`  Failed: ${failed}`);

    if (dryRun) {
      console.log(`\n[DRY RUN] No changes were made.`);
    }

    return failed > 0 ? 1 : 0;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return 1;
  }
}
