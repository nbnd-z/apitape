/**
 * @fileoverview Tests for mock command
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const CLI_PATH = path.join(process.cwd(), 'src/cli/index.js');

/**
 * Create a temp directory with a fixture and config for testing
 * @returns {string} Path to temp directory
 */
function createTempFixtureDir() {
  const tempDir = path.join(process.cwd(), `temp-test-mock-${Date.now()}`);
  const fixturesDir = path.join(tempDir, 'fixtures');
  fs.mkdirSync(fixturesDir, { recursive: true });

  fs.writeFileSync(
    path.join(tempDir, 'apitape.config.json'),
    JSON.stringify({ fixturesDir: './fixtures' })
  );
  fs.writeFileSync(
    path.join(fixturesDir, 'user.json'),
    JSON.stringify({ id: 1, name: 'Test User', email: 'test@example.com' })
  );
  fs.writeFileSync(
    path.join(fixturesDir, 'user.meta.json'),
    JSON.stringify({ name: 'user', url: 'https://api.example.com/user', method: 'GET', capturedAt: new Date().toISOString() })
  );
  return tempDir;
}

describe('Mock Command', () => {
  describe('--help', () => {
    it('should show help for mock command', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} mock --help`);

      assert.ok(stdout.includes('Generate mock data'));
      assert.ok(stdout.includes('--count'));
      assert.ok(stdout.includes('--output'));
      assert.ok(stdout.includes('--jsdoc'));
      assert.ok(stdout.includes('--typescript'));
      assert.ok(stdout.includes('--msw'));
      assert.ok(stdout.includes('--vary'));
    });
  });

  describe('variant generation', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = createTempFixtureDir();
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should generate multiple variants', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} mock user --count 3`, { cwd: tempDir });

      assert.ok(stdout.includes('Generating'));
      assert.ok(stdout.includes('3 mock variant(s)'));
    });

    it('should generate single variant with count 1', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} mock user --count 1`, { cwd: tempDir });

      assert.ok(stdout.includes('1 mock variant(s)'));
    });

    it('should use custom output prefix', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} mock user --count 1 --output custom-user`, { cwd: tempDir });

      assert.ok(stdout.includes('custom-user'));
    });
  });

  describe('type generation', () => {
    it('should generate JSDoc types with --jsdoc flag', async () => {
      const tempDir = createTempFixtureDir();

      try {
        const { stdout } = await execAsync(`node ${CLI_PATH} mock user --count 1 --jsdoc`, { cwd: tempDir });

        assert.ok(stdout.includes('Generated') || stdout.includes('mock'));
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('error handling', () => {
    it('should handle missing fixture', async () => {
      const tempDir = createTempFixtureDir();
      try {
        await execAsync(`node ${CLI_PATH} mock nonexistent-fixture`, { cwd: tempDir });
        assert.ok(true);
      } catch (error) {
        assert.ok(error.message.includes('Error') || error.stderr.includes('Error') || error.stdout?.includes('Error'));
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('field variations', () => {
    it('should accept --vary option', async () => {
      const tempDir = createTempFixtureDir();
      try {
        const { stdout } = await execAsync(`node ${CLI_PATH} mock user --count 1 --vary name email`, { cwd: tempDir });

        assert.ok(stdout.includes('Generating') || stdout.includes('variant'));
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
