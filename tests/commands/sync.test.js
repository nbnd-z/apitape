/**
 * @fileoverview Tests for sync command
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CLI_PATH = path.join(process.cwd(), 'src/cli/index.js');

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
    it('should show what would be synced without making changes', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} sync --dry-run`);
      
      assert.ok(stdout.includes('DRY RUN'));
      assert.ok(stdout.includes('Summary'));
    });
  });

  describe('exit codes', () => {
    it('should exit with 0 for dry run', async () => {
      try {
        await execAsync(`node ${CLI_PATH} sync --dry-run`);
        assert.ok(true);
      } catch (error) {
        assert.fail('Should not throw for dry run');
      }
    });

    it('should exit with 0 when no fixtures found', async () => {
      // Create temp directory with no fixtures
      const tempDir = path.join(process.cwd(), 'temp-test-sync');
      fs.mkdirSync(tempDir, { recursive: true });
      
      try {
        const { stdout } = await execAsync(`cd ${tempDir} && node ${CLI_PATH} sync`);
        assert.ok(stdout.includes('No fixtures found'));
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('environment resolution', () => {
    it('should use environment from config', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} sync --env staging --dry-run`);
      
      // Should mention environment in output
      assert.ok(stdout.includes('staging') || stdout.includes('default'));
    });
  });
});