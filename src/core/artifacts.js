/**
 * @fileoverview Shared artifact generation (types + MSW handlers)
 * @module core/artifacts
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { generateJSDoc, generateTypeScript } from './generator.js';
import { generateMSW } from '../formatters/msw.js';
import { getFixturesDir } from './fixture-store.js';
import { toPascalCase } from '../cli/utils.js';

/**
 * @typedef {Object} ArtifactOptions
 * @property {boolean} [jsdoc] - Generate JSDoc types
 * @property {boolean} [typescript] - Generate TypeScript types
 * @property {boolean} [msw] - Generate MSW handler
 */

/**
 * @typedef {Object} ArtifactMeta
 * @property {string} [url] - API URL (needed for MSW)
 * @property {string} [method] - HTTP method (needed for MSW)
 */

/**
 * Generate type and MSW artifacts for a fixture.
 * Centralises the boilerplate that was duplicated across capture, sync, import, and mock.
 *
 * @param {string} name - Fixture name
 * @param {*} data - Fixture data (JSON-serialisable)
 * @param {ArtifactOptions} options - Which artifacts to generate
 * @param {ArtifactMeta} [meta] - Metadata for MSW generation
 * @param {string} [fixturesDirOverride] - Override fixtures dir (avoids extra loadConfig)
 * @returns {Promise<string[]>} List of generated file paths
 */
export async function generateArtifacts(name, data, options = {}, meta = {}, fixturesDirOverride) {
  const fixturesDir = fixturesDirOverride || await getFixturesDir();
  const typeName = toPascalCase(name);
  const writes = [];
  const generated = [];

  if (options.typescript) {
    const typeContent = generateTypeScript(data, typeName);
    const typePath = path.join(fixturesDir, `${name}.d.ts`);
    writes.push(fs.writeFile(typePath, typeContent + '\n'));
    generated.push(typePath);
  }

  if (options.jsdoc) {
    const typeContent = generateJSDoc(data, typeName);
    const jsdocContent = `// Auto-generated JSDoc types for ${name}\n${typeContent}\n\nexport const ${name} = require('./${name}.json');\n`;
    const typePath = path.join(fixturesDir, `${name}.types.js`);
    writes.push(fs.writeFile(typePath, jsdocContent));
    generated.push(typePath);
  }

  if (options.msw) {
    const mswContent = generateMSW({
      name,
      url: meta.url || `/${name}`,
      method: meta.method || 'GET'
    });
    const mswPath = path.join(fixturesDir, `${name}.msw.js`);
    writes.push(fs.writeFile(mswPath, mswContent));
    generated.push(mswPath);
  }

  await Promise.all(writes);
  return generated;
}

/**
 * Re-generate existing artifacts for a fixture (used by sync).
 * Only regenerates files that already exist on disk.
 *
 * @param {string} name - Fixture name
 * @param {*} data - New fixture data
 * @param {ArtifactMeta} [meta] - Metadata for MSW
 * @param {string} [fixturesDirOverride] - Override fixtures dir
 * @returns {Promise<void>}
 */
export async function regenerateExistingArtifacts(name, data, meta = {}, fixturesDirOverride) {
  const fixturesDir = fixturesDirOverride || await getFixturesDir();

  const options = {
    jsdoc: existsSync(path.join(fixturesDir, `${name}.types.js`)),
    typescript: existsSync(path.join(fixturesDir, `${name}.d.ts`)),
    msw: existsSync(path.join(fixturesDir, `${name}.msw.js`))
  };

  await generateArtifacts(name, data, options, meta, fixturesDir);
}
