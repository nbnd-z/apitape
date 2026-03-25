/**
 * @fileoverview Fixture storage and retrieval
 * @module core/fixture-store
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { loadConfig } from './config.js';
import { sanitizeName } from '../cli/utils.js';

/**
 * @typedef {Object} FixtureMetadata
 * @property {string} url - Source URL
 * @property {string} method - HTTP method
 * @property {string} capturedAt - ISO timestamp
 * @property {Object} headers - Request headers
 * @property {number} status - Response status
 */

/**
 * @typedef {Object} Fixture
 * @property {string} name - Fixture name
 * @property {Object} data - Fixture data
 * @property {FixtureMetadata} metadata - Fixture metadata
 */

/**
 * Get fixtures directory path
 * @returns {Promise<string>} Fixtures directory path
 */
export async function getFixturesDir() {
  const config = await loadConfig();
  return path.resolve(process.cwd(), config.fixturesDir || './fixtures');
}

/**
 * Get fixture file paths
 * @param {string} name - Fixture name
 * @param {string} fixturesDir - Fixtures directory
 * @returns {Object} Object with dataPath and metaPath
 */
function getFixturePaths(name, fixturesDir) {
  const baseName = sanitizeName(name);
  return {
    dataPath: path.join(fixturesDir, `${baseName}.json`),
    metaPath: path.join(fixturesDir, `${baseName}.meta.json`)
  };
}

/**
 * Save a fixture
 * @param {string} name - Fixture name
 * @param {*} data - Fixture data
 * @param {FixtureMetadata} metadata - Fixture metadata
 * @returns {Promise<void>}
 */
export async function saveFixture(name, data, metadata = {}) {
  const fixturesDir = await getFixturesDir();

  // Ensure directory exists
  await fs.mkdir(fixturesDir, { recursive: true });

  const { dataPath, metaPath } = getFixturePaths(name, fixturesDir);

  // Save data and metadata in parallel
  const fullMetadata = {
    name,
    ...metadata,
    savedAt: new Date().toISOString()
  };

  await Promise.all([
    fs.writeFile(dataPath, JSON.stringify(data, null, 2)),
    fs.writeFile(metaPath, JSON.stringify(fullMetadata, null, 2))
  ]);
}

/**
 * Load a fixture
 * @param {string} name - Fixture name
 * @returns {Promise<Object>} Fixture data
 */
export async function loadFixture(name) {
  const fixturesDir = await getFixturesDir();
  const { dataPath } = getFixturePaths(name, fixturesDir);

  try {
    const content = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Fixture not found: ${name}`);
    }
    throw error;
  }
}

/**
 * Load fixture metadata
 * @param {string} name - Fixture name
 * @returns {Promise<FixtureMetadata|null>} Metadata or null
 */
export async function loadMetadata(name) {
  const fixturesDir = await getFixturesDir();
  const { metaPath } = getFixturePaths(name, fixturesDir);

  try {
    const content = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Delete a fixture and all associated files
 * @param {string} name - Fixture name
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteFixture(name) {
  const fixturesDir = await getFixturesDir();
  const { dataPath, metaPath } = getFixturePaths(name, fixturesDir);
  const baseName = sanitizeName(name);

  let deleted = false;

  // Collect all files to remove
  const filesToRemove = [
    dataPath,
    metaPath,
    path.join(fixturesDir, `${baseName}.d.ts`),
    path.join(fixturesDir, `${baseName}.types.js`),
    path.join(fixturesDir, `${baseName}.msw.js`)
  ];

  const results = await Promise.allSettled(
    filesToRemove.map(f => fs.unlink(f))
  );

  // If the main data file was deleted successfully, consider it deleted
  if (results[0].status === 'fulfilled') {
    deleted = true;
  }

  return deleted;
}

/**
 * List all fixtures with metadata
 * @returns {Promise<Array<FixtureMetadata>>} Array of fixture metadata
 */
export async function listFixtures() {
  const fixturesDir = await getFixturesDir();

  if (!existsSync(fixturesDir)) {
    return [];
  }

  const files = await fs.readdir(fixturesDir);
  const fixtures = [];

  // Only consider .json files that have a matching .meta.json
  const metaReadPromises = [];
  const metaBaseNames = [];

  for (const file of files) {
    if (!file.endsWith('.json') || file.endsWith('.meta.json')) continue;

    const baseName = file.replace('.json', '');
    const metaFile = `${baseName}.meta.json`;

    if (!files.includes(metaFile)) continue;

    metaBaseNames.push(baseName);
    metaReadPromises.push(
      fs.readFile(path.join(fixturesDir, metaFile), 'utf-8')
        .then(content => JSON.parse(content))
        .catch(() => ({ name: baseName, capturedAt: null, url: null }))
    );
  }

  const metaResults = await Promise.all(metaReadPromises);
  fixtures.push(...metaResults);

  // Sort by capturedAt descending
  fixtures.sort((a, b) => {
    if (!a.capturedAt) return 1;
    if (!b.capturedAt) return -1;
    return new Date(b.capturedAt) - new Date(a.capturedAt);
  });

  return fixtures;
}

/**
 * Check if fixture exists
 * @param {string} name - Fixture name
 * @returns {Promise<boolean>} True if exists
 */
export async function fixtureExists(name) {
  const fixturesDir = await getFixturesDir();
  const { dataPath } = getFixturePaths(name, fixturesDir);

  try {
    await fs.access(dataPath);
    return true;
  } catch {
    return false;
  }
}
