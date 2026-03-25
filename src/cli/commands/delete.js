/**
 * @fileoverview Delete command - removes fixtures
 * @module cli/commands/delete
 */

import { deleteFixture, fixtureExists } from '../../core/fixture-store.js';

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
