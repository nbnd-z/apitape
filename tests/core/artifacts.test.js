/**
 * @fileoverview Tests for artifacts module
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { generateArtifacts, regenerateExistingArtifacts } from '../../src/core/artifacts.js';

const TEST_DIR = path.join(process.cwd(), 'temp-test-artifacts');
const FIXTURES_DIR = path.join(TEST_DIR, 'fixtures');
const originalCwd = process.cwd();

describe('Artifacts', () => {
  beforeEach(() => {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    fs.writeFileSync(path.join(TEST_DIR, 'apitape.config.json'), JSON.stringify({ fixturesDir: './fixtures' }));
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('generateArtifacts', () => {
    it('should generate TypeScript file', async () => {
      const generated = await generateArtifacts('test', { id: 1, name: 'foo' }, { typescript: true }, {}, FIXTURES_DIR);
      assert.strictEqual(generated.length, 1);
      assert.ok(fs.existsSync(path.join(FIXTURES_DIR, 'test.d.ts')));
    });

    it('should generate JSDoc file', async () => {
      const generated = await generateArtifacts('test', { id: 1 }, { jsdoc: true }, {}, FIXTURES_DIR);
      assert.strictEqual(generated.length, 1);
      assert.ok(fs.existsSync(path.join(FIXTURES_DIR, 'test.types.js')));
    });

    it('should generate MSW file', async () => {
      const generated = await generateArtifacts('test', { id: 1 }, { msw: true }, { url: '/test', method: 'GET' }, FIXTURES_DIR);
      assert.strictEqual(generated.length, 1);
      assert.ok(fs.existsSync(path.join(FIXTURES_DIR, 'test.msw.js')));
    });

    it('should generate multiple artifacts', async () => {
      const generated = await generateArtifacts('test', { id: 1 }, { typescript: true, msw: true }, { url: '/test', method: 'GET' }, FIXTURES_DIR);
      assert.strictEqual(generated.length, 2);
    });

    it('should return empty array when no options set', async () => {
      const generated = await generateArtifacts('test', { id: 1 }, {}, {}, FIXTURES_DIR);
      assert.strictEqual(generated.length, 0);
    });
  });

  describe('regenerateExistingArtifacts', () => {
    it('should only regenerate existing files', async () => {
      // Create only a .d.ts file
      fs.writeFileSync(path.join(FIXTURES_DIR, 'test.d.ts'), 'old');

      await regenerateExistingArtifacts('test', { id: 2, name: 'bar' }, {}, FIXTURES_DIR);

      const content = fs.readFileSync(path.join(FIXTURES_DIR, 'test.d.ts'), 'utf-8');
      assert.ok(content.includes('interface Test'));
      // MSW should not be created
      assert.ok(!fs.existsSync(path.join(FIXTURES_DIR, 'test.msw.js')));
    });
  });
});
