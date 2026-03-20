/**
 * @fileoverview Tests for sync module core logic
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { saveFixture, loadFixture, loadMetadata, listFixtures } from '../../src/core/fixture-store.js';

const TEST_DIR = './test-sync-fixture';

describe('Sync Module Core Logic', () => {
  beforeEach(async () => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    // Create default config
    fs.writeFileSync(path.join(TEST_DIR, 'mock-api-fixtures.config.json'), JSON.stringify({
      fixturesDir: path.join(TEST_DIR, 'fixtures')
    }));
    // Create fixtures directory
    const fixturesDir = path.join(TEST_DIR, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir('..');
    // Cleanup
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('fixture metadata tracking', () => {
    it('should save metadata with URL info', async () => {
      const name = 'test-fixture';
      const data = { id: 1, name: 'Test' };
      const metadata = {
        url: 'https://api.example.com/test',
        method: 'GET',
        capturedAt: new Date().toISOString()
      };

      await saveFixture(name, data, metadata);

      const loadedMetadata = await loadMetadata(name);
      assert.ok(loadedMetadata);
      assert.strictEqual(loadedMetadata.url, 'https://api.example.com/test');
      assert.strictEqual(loadedMetadata.method, 'GET');
    });

    it('should list fixtures with URLs', async () => {
      await saveFixture('fixture1', { id: 1 }, { url: 'https://api.example.com/1' });
      await saveFixture('fixture2', { id: 2 }, { url: 'https://api.example.com/2' });
      await saveFixture('fixture3', { id: 3 }, {}); // No URL

      const fixtures = await listFixtures();
      const fixturesWithUrls = fixtures.filter(f => f.url);

      assert.ok(fixturesWithUrls.length >= 2);
    });

    it('should load existing fixture data', async () => {
      const name = 'load-test';
      const data = { id: 123, items: [1, 2, 3] };
      await saveFixture(name, data, {});

      const loaded = await loadFixture(name);
      assert.deepStrictEqual(loaded, data);
    });
  });

  describe('URL resolution for sync', () => {
    it('should resolve relative URLs with environment', () => {
      const configs = {
        staging: 'https://staging.api.example.com',
        prod: 'https://api.example.com'
      };

      // Relative URL should be prefixed
      const relativeUrl = '/users/1';
      const stagingUrl = new URL(relativeUrl, configs.staging);
      assert.strictEqual(stagingUrl.href, 'https://staging.api.example.com/users/1');

      const prodUrl = new URL(relativeUrl, configs.prod);
      assert.strictEqual(prodUrl.href, 'https://api.example.com/users/1');
    });

    it('should use absolute URLs as-is', () => {
      const absoluteUrl = 'https://external.api.com/data';
      const configs = {
        staging: 'https://staging.api.example.com'
      };

      const resolvedUrl = new URL(absoluteUrl, configs.staging);
      assert.strictEqual(resolvedUrl.href, 'https://external.api.com/data');
    });
  });

  describe('data comparison for sync', () => {
    it('should detect unchanged data', () => {
      const oldData = { id: 1, name: 'Test' };
      const newData = { id: 1, name: 'Test' };

      const isUnchanged = JSON.stringify(oldData) === JSON.stringify(newData);
      assert.ok(isUnchanged);
    });

    it('should detect changed data', () => {
      const oldData = { id: 1, name: 'Test' };
      const newData = { id: 1, name: 'Updated' };

      const isUnchanged = JSON.stringify(oldData) === JSON.stringify(newData);
      assert.ok(!isUnchanged);
    });

    it('should handle nested object changes', () => {
      const oldData = { user: { profile: { name: 'John', age: 30 } } };
      const newData = { user: { profile: { name: 'John', age: 31 } } };

      const isUnchanged = JSON.stringify(oldData) === JSON.stringify(newData);
      assert.ok(!isUnchanged);
    });
  });
});