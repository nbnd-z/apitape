/**
 * @fileoverview Tests for fixture-store module
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { saveFixture, loadFixture, listFixtures, fixtureExists, loadMetadata } from '../../src/core/fixture-store.js';

const TEST_DIR = path.join(process.cwd(), 'temp-test-fixture-store');
const originalCwd = process.cwd();

describe('FixtureStore', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(TEST_DIR, 'apitape.config.json'),
      JSON.stringify({ fixturesDir: './fixtures' })
    );
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('saveFixture and loadFixture', () => {
    it('should save and load a fixture', async () => {
      const name = 'test-fixture';
      const data = { message: 'hello', count: 42 };
      const metadata = { url: 'https://api.example.com/test' };

      await saveFixture(name, data, metadata);
      const loaded = await loadFixture(name);

      assert.deepStrictEqual(loaded, data);
    });

    it('should save and load metadata', async () => {
      const name = 'meta-test';
      const data = { id: 1 };
      const metadata = { url: 'https://api.example.com/meta', method: 'GET' };

      await saveFixture(name, data, metadata);
      const loaded = await loadMetadata(name);

      assert.ok(loaded);
      assert.strictEqual(loaded.url, 'https://api.example.com/meta');
      assert.strictEqual(loaded.method, 'GET');
      assert.ok(loaded.savedAt);
    });

    it('should throw when loading non-existent fixture', async () => {
      try {
        await loadFixture('nonexistent-fixture');
        assert.fail('Should have thrown');
      } catch (error) {
        assert.ok(error.message.includes('not found'));
      }
    });
  });

  describe('listFixtures', () => {
    it('should list saved fixtures', async () => {
      await saveFixture('fixture-a', { a: 1 }, { url: '/a' });
      await saveFixture('fixture-b', { b: 2 }, { url: '/b' });

      const fixtures = await listFixtures();

      assert.strictEqual(fixtures.length, 2);
      const names = fixtures.map(f => f.name);
      assert.ok(names.includes('fixture-a'));
      assert.ok(names.includes('fixture-b'));
    });

    it('should return empty array when no fixtures exist', async () => {
      const fixtures = await listFixtures();
      assert.strictEqual(fixtures.length, 0);
    });

    it('should ignore .json files without matching .meta.json', async () => {
      await saveFixture('real-fixture', { id: 1 }, { url: '/real' });

      // Write a stray .json file with no meta
      const fixturesDir = path.join(process.cwd(), 'fixtures');
      fs.writeFileSync(path.join(fixturesDir, 'stray-file.json'), '{}');

      const fixtures = await listFixtures();
      const names = fixtures.map(f => f.name);

      assert.ok(names.includes('real-fixture'));
      assert.ok(!names.includes('stray-file'));
    });
  });

  describe('fixtureExists', () => {
    it('should return true for existing fixture', async () => {
      await saveFixture('exists-test', { id: 1 }, {});
      const exists = await fixtureExists('exists-test');
      assert.strictEqual(exists, true);
    });

    it('should return false for non-existent fixture', async () => {
      const exists = await fixtureExists('completely-nonexistent-12345');
      assert.strictEqual(exists, false);
    });
  });
});
