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
    const fixtures = await listFixtures();

    if (fixtures.length === 0) {
      console.log('No fixtures found.');
      return 0;
    }

    if (options.json) {
      console.log(JSON.stringify(fixtures, null, 2));
      return 0;
    }

    console.log('Fixtures:\n');
    console.log('  Name'.padEnd(30) + 'Captured'.padEnd(25) + 'URL');
    console.log('  '.padEnd(30, '-') + ' '.padEnd(25, '-') + '---');

    for (const fixture of fixtures) {
      const name = fixture.name.substring(0, 28);
      const capturedAt = fixture.capturedAt
        ? new Date(fixture.capturedAt).toLocaleString()
        : 'N/A';
      const url = fixture.url || 'N/A';

      console.log(`  ${name.padEnd(30)}${capturedAt.padEnd(25)}${url}`);
    }

    console.log(`\nTotal: ${fixtures.length} fixture(s)`);
    return 0;
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    return 1;
  }
}
