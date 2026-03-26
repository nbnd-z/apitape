/**
 * @fileoverview Export command - bundle fixtures into a single handlers file
 * @module cli/commands/export
 */

import fs from 'fs/promises';
import path from 'path';
import { listFixtures, loadMetadata, getFixturesDir } from '../../core/fixture-store.js';
import { generateMSWHandlers } from '../../formatters/msw.js';

/**
 * Export fixtures as a bundled handlers file
 * @param {Object} options - Command options
 * @returns {Promise<number>} Exit code
 */
export async function exportCommand(options = {}) {
  const { format = 'msw', output, tag } = options;

  try {
    let fixtures = await listFixtures();

    if (tag) {
      fixtures = fixtures.filter(f => f.tags && f.tags.includes(tag));
    }

    if (fixtures.length === 0) {
      console.log(tag ? `No fixtures found with tag "${tag}".` : 'No fixtures found.');
      return 0;
    }

    // Collect metadata for each fixture
    const fixturesMeta = [];
    for (const fixture of fixtures) {
      const meta = await loadMetadata(fixture.name);
      fixturesMeta.push({
        name: fixture.name,
        url: meta?.url || `/${fixture.name}`,
        method: meta?.method || 'GET'
      });
    }

    if (format === 'msw') {
      const content = generateMSWHandlers(fixturesMeta);
      const outputDir = output || await getFixturesDir();
      const outputPath = path.join(outputDir, 'handlers.js');

      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(outputPath, content);
      console.log(`✓ Exported ${fixturesMeta.length} handler(s) to ${outputPath}`);
    } else {
      console.error(`✗ Unknown export format: ${format}. Supported: msw`);
      return 1;
    }

    return 0;
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    return 1;
  }
}
