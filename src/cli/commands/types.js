/**
 * @fileoverview Types command - generates types from fixtures
 * @module cli/commands/types
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { loadConfig } from '../../core/config.js';
import { listFixtures, loadFixture } from '../../core/fixture-store.js';
import { generateJSDoc, generateTypeScript } from '../../core/generator.js';
import { toPascalCase } from '../../core/utils.js';

/**
 * Generate types from all fixtures
 * @param {Object} options - Command options
 * @param {string} options.format - Output format (jsdoc, typescript)
 * @param {string} options.output - Output directory
 * @returns {Promise<number>} Exit code
 */
export async function typesCommand(options = {}) {
  console.log('Generating types from fixtures...');

  try {
    const config = await loadConfig();
    const format = options.format || config.typesFormat || 'jsdoc';
    const outputDir = options.output || config.typesOutput || './fixtures';

    const fixtures = await listFixtures();

    if (fixtures.length === 0) {
      console.log('No fixtures found.');
      return 0;
    }

    const typeContents = [];

    for (const fixture of fixtures) {
      const data = await loadFixture(fixture.name);
      const typeName = toPascalCase(fixture.name);

      if (format === 'typescript') {
        typeContents.push(generateTypeScript(data, typeName));
      } else {
        typeContents.push(generateJSDoc(data, typeName));
      }
    }

    const typeFileName = format === 'typescript' ? 'fixtures.d.ts' : 'fixtures.jsdoc.js';
    const outputPath = path.join(outputDir, typeFileName);

    if (!existsSync(outputDir)) {
      await fs.mkdir(outputDir, { recursive: true });
    }

    await fs.writeFile(outputPath, typeContents.join('\n\n'));
    console.log(`✓ Generated types: ${outputPath}`);
    console.log(`  (${fixtures.length} fixtures processed)`);

    return 0;
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    return 1;
  }
}
