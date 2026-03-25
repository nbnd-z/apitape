/**
 * @fileoverview Delete command - removes fixtures
 * @module cli/commands/delete
 */

import { createInterface } from 'readline';
import { deleteFixture, fixtureExists } from '../../core/fixture-store.js';

/**
 * Prompt user for confirmation
 * @param {string} message
 * @returns {Promise<boolean>}
 */
function confirm(message) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${message} (y/N) `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Delete a fixture by name
 * @param {string} name - Fixture name
 * @param {Object} options - Command options
 * @returns {Promise<number>} Exit code
 */
export async function deleteCommand(name, options = {}) {
  try {
    const exists = await fixtureExists(name);

    if (!exists) {
      console.error(`Fixture not found: ${name}`);
      return 1;
    }

    if (!options.force && process.stdin.isTTY) {
      const ok = await confirm(`Delete fixture "${name}" and all associated files?`);
      if (!ok) {
        console.log('Aborted.');
        return 0;
      }
    }

    const deleted = await deleteFixture(name);

    if (deleted) {
      console.log(`✓ Deleted fixture: ${name}`);
      return 0;
    } else {
      console.error(`✗ Failed to delete fixture: ${name}`);
      return 1;
    }
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    return 1;
  }
}
