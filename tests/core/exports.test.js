/**
 * @fileoverview Tests that all public API exports are accessible
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Public API exports', () => {
  it('should export all documented functions', async () => {
    const api = await import('../../src/index.js');

    // Config
    assert.strictEqual(typeof api.loadConfig, 'function');
    assert.strictEqual(typeof api.resolveEnv, 'function');
    assert.strictEqual(typeof api.saveConfig, 'function');
    assert.strictEqual(typeof api.clearConfigCache, 'function');

    // HTTP
    assert.strictEqual(typeof api.fetchWithAuth, 'function');

    // Fixtures
    assert.strictEqual(typeof api.saveFixture, 'function');
    assert.strictEqual(typeof api.loadFixture, 'function');
    assert.strictEqual(typeof api.loadMetadata, 'function');
    assert.strictEqual(typeof api.listFixtures, 'function');
    assert.strictEqual(typeof api.deleteFixture, 'function');
    assert.strictEqual(typeof api.fixtureExists, 'function');

    // Type generation
    assert.strictEqual(typeof api.inferType, 'function');
    assert.strictEqual(typeof api.generateJSDoc, 'function');
    assert.strictEqual(typeof api.generateTypeScript, 'function');
    assert.strictEqual(typeof api.generateType, 'function');
    assert.strictEqual(typeof api.setArraySampleSize, 'function');

    // Diff
    assert.strictEqual(typeof api.diffObjects, 'function');
    assert.strictEqual(typeof api.formatDiffResult, 'function');
    assert.strictEqual(typeof api.hashValue, 'function');
    assert.strictEqual(typeof api.setDiffArraySampleSize, 'function');

    // Mock generation
    assert.strictEqual(typeof api.generateMockData, 'function');
    assert.strictEqual(typeof api.generateVariants, 'function');
    assert.strictEqual(typeof api.createRng, 'function');

    // MSW
    assert.strictEqual(typeof api.generateMSW, 'function');
    assert.strictEqual(typeof api.generateMSWHandlers, 'function');

    // Artifacts
    assert.strictEqual(typeof api.generateArtifacts, 'function');
    assert.strictEqual(typeof api.regenerateExistingArtifacts, 'function');

    // Errors
    assert.strictEqual(typeof api.ApitapeError, 'function');
    assert.strictEqual(typeof api.FixtureNotFoundError, 'function');
    assert.strictEqual(typeof api.ConfigError, 'function');
    assert.strictEqual(typeof api.FixtureSizeError, 'function');
    assert.strictEqual(typeof api.HttpRequestError, 'function');

    // Core utils
    assert.strictEqual(typeof api.sanitizeName, 'function');
    assert.strictEqual(typeof api.toPascalCase, 'function');
  });
});
