/**
 * @fileoverview List command - lists all fixtures
 * @module cli/commands/list
 */

import { listFixtures } from '../../core/fixture-store.js';

/**
 * List all fixtures with metadata
 * @param {Object} options - Command options
 * @param {boolean} options.json - Output as JSON
 * @returns {Promise<number>} Exit code
 */
export async function listCommand(options = {}) {
  try {
    let fixtures = await listFixtures();

    if (options.tag) {
      const filterTag = options.tag;
      fixtures = fixtures.filter(f => f.tags && f.tags.includes(filterTag));
    }

    if (fixtures.length === 0) {
      console.log(options.tag ? `No fixtures found with tag "${options.tag}".` : 'No fixtures found.');
      return 0;
    }

    if (options.json) {
      console.log(JSON.stringify(fixtures, null, 2));
      return 0;
    }

    console.log('Fixtures:\n');
    console.log('  Name'.padEnd(30) + 'Tags'.padEnd(20) + 'Captured'.padEnd(25) + 'URL');
    console.log('  '.padEnd(30, '-') + ' '.padEnd(20, '-') + ' '.padEnd(25, '-') + '---');

    for (const fixture of fixtures) {
      const name = fixture.name.substring(0, 28);
      const tags = (fixture.tags || []).join(', ') || '-';
      const capturedAt = fixture.capturedAt
        ? new Date(fixture.capturedAt).toLocaleString()
        : 'N/A';
      const url = fixture.url || 'N/A';

      console.log(`  ${name.padEnd(30)}${tags.padEnd(20)}${capturedAt.padEnd(25)}${url}`);
    }

    console.log(`\nTotal: ${fixtures.length} fixture(s)`);
    return 0;
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    return 1;
  }
}
