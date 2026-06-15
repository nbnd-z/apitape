/**
 * @fileoverview Tests for delete command
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const CLI_PATH = path.join(process.cwd(), 'src/cli/index.js');

function createTempDir() {
  const tempDir = path.join(process.cwd(), `temp-test-delete-${Date.now()}`);
  const fixturesDir = path.join(tempDir, 'fixtures');
  fs.mkdirSync(fixturesDir, { recursive: true });

  fs.writeFileSync(
    path.join(tempDir, 'apitape.config.json'),
    JSON.stringify({ fixturesDir: './fixtures' })
  );
  fs.writeFileSync(path.join(fixturesDir, 'user.json'), JSON.stringify({ id: 1 }));
  fs.writeFileSync(path.join(fixturesDir, 'user.meta.json'), JSON.stringify({ name: 'user', url: '/user' }));
  fs.writeFileSync(path.join(fixturesDir, 'user.d.ts'), 'export interface User { id: number; }');
  fs.writeFileSync(path.join(fixturesDir, 'user.types.js'), '/** @typedef {Object} User */');
  fs.writeFileSync(path.join(fixturesDir, 'user.msw.js'), 'export default {};');
  return tempDir;
}

describe('Delete Command', () => {
  describe('--help', () => {
    it('should show help', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} delete --help`);
      assert.ok(stdout.includes('Delete a fixture'));
    });
  });

  describe('deleting fixtures', () => {
    let tempDir;

    beforeEach(() => { tempDir = createTempDir(); });
    afterEach(() => { fs.rmSync(tempDir, { recursive: true, force: true }); });

    it('should delete fixture and all associated files', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} delete user`, { cwd: tempDir });
      assert.ok(stdout.includes('Deleted fixture: user'));

      const fixturesDir = path.join(tempDir, 'fixtures');
      assert.ok(!fs.existsSync(path.join(fixturesDir, 'user.json')));
      assert.ok(!fs.existsSync(path.join(fixturesDir, 'user.meta.json')));
      assert.ok(!fs.existsSync(path.join(fixturesDir, 'user.d.ts')));
      assert.ok(!fs.existsSync(path.join(fixturesDir, 'user.types.js')));
      assert.ok(!fs.existsSync(path.join(fixturesDir, 'user.msw.js')));
    });

    it('should error on non-existent fixture', async () => {
      try {
        await execAsync(`node ${CLI_PATH} delete nonexistent`, { cwd: tempDir });
        assert.fail('Should have thrown');
      } catch (error) {
        assert.ok(error.stderr.includes('not found') || error.stdout.includes('not found'));
      }
    });
  });
});
