/**
 * @fileoverview Init command - creates fixtures directory and config
 * @module cli/commands/init
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize a new fixtures directory with config
 * @param {Object} options - Command options
 * @param {boolean} options.force - Overwrite existing config
 * @param {boolean} options.gitignore - Update .gitignore
 * @returns {Promise<number>} Exit code
 */
export async function initCommand(options = {}) {
  const cwd = process.cwd();
  const fixturesDir = path.join(cwd, 'fixtures');
  const configFile = path.join(cwd, 'apitape.config.json');
  const gitignoreFile = path.join(cwd, '.gitignore');

  const templatePath = path.join(__dirname, '..', '..', '..', 'templates', 'config.default.json');

  try {
    // Create fixtures directory
    if (!existsSync(fixturesDir)) {
      await fs.mkdir(fixturesDir, { recursive: true });
      console.log('✓ Created fixtures/ directory');
    } else {
      console.log('  fixtures/ directory already exists');
    }

    // Create config file
    if (existsSync(configFile) && !options.force) {
      console.log('  apitape.config.json already exists (use --force to overwrite)');
    } else {
      const configTemplate = await fs.readFile(templatePath, 'utf-8');
      await fs.writeFile(configFile, configTemplate);
      console.log('✓ Created apitape.config.json');
    }

    // Update .gitignore
    if (options.gitignore !== false) {
      const gitignoreEntry = '\n# Mock API Fixtures\n/fixtures/\n';

      if (existsSync(gitignoreFile)) {
        const gitignore = await fs.readFile(gitignoreFile, 'utf-8');
        if (!gitignore.includes('/fixtures/')) {
          await fs.appendFile(gitignoreFile, gitignoreEntry);
          console.log('✓ Updated .gitignore');
        } else {
          console.log('  .gitignore already includes /fixtures/');
        }
      } else {
        await fs.writeFile(gitignoreFile, gitignoreEntry.trim() + '\n');
        console.log('✓ Created .gitignore');
      }
    }

    console.log('\n🎉 Initialization complete!');
    console.log('\nNext steps:');
    console.log('  1. Edit apitape.config.json to configure your API');
    console.log('  2. Run `apitape capture <url> --name <name>` to capture fixtures');

    return 0;
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    return 1;
  }
}
