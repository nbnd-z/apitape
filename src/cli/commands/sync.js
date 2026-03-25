/**
 * @fileoverview Sync command - re-capture all fixtures from original URLs
 * @module cli/commands/sync
 */

import { loadConfig, resolveEnv } from '../../core/config.js';
import { fetchWithAuth } from '../../core/http-client.js';
import { listFixtures, loadFixture, saveFixture, getFixturesDir } from '../../core/fixture-store.js';
import { regenerateExistingArtifacts } from '../../core/artifacts.js';

/**
 * Sync all fixtures from their original URLs
 * @param {Object} options - Command options
 * @param {string} options.env - Environment name
 * @param {boolean} options.dryRun - Show what would be synced without making changes
 * @param {boolean} options.force - Force re-capture even if unchanged
 * @param {string} options.config - Config file path
 * @returns {Promise<number>} Exit code
 */
export async function syncCommand(options = {}) {
  const { env, dryRun = false, force = false } = options;

  console.log(`Syncing fixtures from ${env || 'default'} environment...\n`);

  try {
    const config = await loadConfig(options.config);
    const fixtures = await listFixtures();

    if (fixtures.length === 0) {
      console.log('No fixtures found. Run `apitape capture` first.');
      return 0;
    }

    const fixturesWithUrls = fixtures.filter(f => f.url);

    if (fixturesWithUrls.length === 0) {
      console.log('No fixtures with source URLs found.');
      return 0;
    }

    console.log(`Found ${fixturesWithUrls.length} fixture(s) to sync:\n`);

    const results = [];
    let updated = 0;
    let unchanged = 0;
    let failed = 0;
    const fixturesDir = await getFixturesDir();

    for (const fixture of fixturesWithUrls) {
      const { name, url, method } = fixture;

      // Use the shared resolveEnv for consistent URL resolution
      const resolvedUrl = resolveEnv(url, env, config);

      console.log(`Syncing ${name}...`);
      console.log(`  URL: ${resolvedUrl}`);

      if (dryRun) {
        console.log(`  [DRY RUN] Would re-capture from ${resolvedUrl}\n`);
        results.push({ name, status: 'dry-run' });
        continue;
      }

      try {
        const response = await fetchWithAuth(resolvedUrl, {
          method: method || 'GET',
          headers: {
            ...(config.defaultHeaders || {}),
            ...(fixture.headers || {})
          }
        });

        // Check if changed (unless force)
        if (!force) {
          const existingData = await loadFixture(name);
          const isUnchanged = JSON.stringify(existingData) === JSON.stringify(response.data);

          if (isUnchanged) {
            console.log(`  ✓ Unchanged\n`);
            unchanged++;
            results.push({ name, status: 'unchanged' });
            continue;
          }
        }

        await saveFixture(name, response.data, {
          url,
          method: method || 'GET',
          capturedAt: new Date().toISOString(),
          headers: fixture.headers,
          status: response.status
        });

        // Regenerate only artifacts that already exist on disk
        await regenerateExistingArtifacts(
          name,
          response.data,
          { url, method: method || 'GET' },
          fixturesDir
        );

        console.log(`  ✓ Updated\n`);
        updated++;
        results.push({ name, status: 'updated' });

      } catch (error) {
        console.log(`  ✗ Error: ${error.message}\n`);
        failed++;
        results.push({ name, status: 'error', error: error.message });
      }
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
