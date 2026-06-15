/**
 * @fileoverview Tests for sync command
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
 * Create a temp directory with fixtures for sync testing
 * @returns {string} Path to temp directory
 */
function createTempSyncDir() {
  const tempDir = path.join(process.cwd(), `temp-test-sync-${Date.now()}`);
  const fixturesDir = path.join(tempDir, 'fixtures');
  fs.mkdirSync(fixturesDir, { recursive: true });

  fs.writeFileSync(
    path.join(tempDir, 'apitape.config.json'),
    JSON.stringify({ fixturesDir: './fixtures' })
  );
  fs.writeFileSync(
    path.join(fixturesDir, 'user.json'),
    JSON.stringify({ id: 1, name: 'Test' })
  );
  fs.writeFileSync(
    path.join(fixturesDir, 'user.meta.json'),
    JSON.stringify({ name: 'user', url: 'https://api.example.com/user', method: 'GET', capturedAt: new Date().toISOString() })
  );
  return tempDir;
}

describe('Sync Command', () => {
  describe('--help', () => {
    it('should show help for sync command', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} sync --help`);

      assert.ok(stdout.includes('Re-capture all fixtures'));
      assert.ok(stdout.includes('--dry-run'));
      assert.ok(stdout.includes('--force'));
      assert.ok(stdout.includes('--env'));
    });
  });

  describe('--dry-run', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = createTempSyncDir();
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should show what would be synced without making changes', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} sync --dry-run`, { cwd: tempDir });

      assert.ok(stdout.includes('DRY RUN'));
    });
  });

  describe('exit codes', () => {
    it('should exit with 0 for dry run', async () => {
      const tempDir = createTempSyncDir();
      try {
        await execAsync(`node ${CLI_PATH} sync --dry-run`, { cwd: tempDir });
        assert.ok(true);
      } catch (error) {
        assert.fail('Should not throw for dry run');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should exit with 0 when no fixtures found', async () => {
      const tempDir = path.join(process.cwd(), `temp-test-sync-empty-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });

      try {
        const { stdout } = await execAsync(`node ${CLI_PATH} sync`, { cwd: tempDir });
        assert.ok(stdout.includes('No fixtures found'));
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('environment resolution', () => {
    it('should use environment from config', async () => {
      const tempDir = createTempSyncDir();
      try {
        const { stdout } = await execAsync(`node ${CLI_PATH} sync --env staging --dry-run`, { cwd: tempDir });

        assert.ok(stdout.includes('staging') || stdout.includes('default'));
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
