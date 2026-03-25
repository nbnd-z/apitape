/**
 * @fileoverview Tests for init command
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const CLI_PATH = path.join(process.cwd(), 'src/cli/index.js');

describe('Init Command', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = path.join(process.cwd(), `temp-test-init-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should create fixtures directory and config', async () => {
    const { stdout } = await execAsync(`node ${CLI_PATH} init`, { cwd: tempDir });

    assert.ok(stdout.includes('Created fixtures/ directory'));
    assert.ok(stdout.includes('Created apitape.config.json'));
    assert.ok(fs.existsSync(path.join(tempDir, 'fixtures')));
    assert.ok(fs.existsSync(path.join(tempDir, 'apitape.config.json')));
  });

  it('should not overwrite existing config without --force', async () => {
    fs.writeFileSync(path.join(tempDir, 'apitape.config.json'), '{"custom":true}');

    const { stdout } = await execAsync(`node ${CLI_PATH} init`, { cwd: tempDir });

    assert.ok(stdout.includes('already exists'));
    const content = JSON.parse(fs.readFileSync(path.join(tempDir, 'apitape.config.json'), 'utf-8'));
    assert.strictEqual(content.custom, true);
  });

  it('should overwrite config with --force', async () => {
    fs.writeFileSync(path.join(tempDir, 'apitape.config.json'), '{"custom":true}');

    await execAsync(`node ${CLI_PATH} init --force`, { cwd: tempDir });

    const content = JSON.parse(fs.readFileSync(path.join(tempDir, 'apitape.config.json'), 'utf-8'));
    assert.ok(!content.custom);
  });

  it('should skip gitignore with --no-gitignore', async () => {
    const { stdout } = await execAsync(`node ${CLI_PATH} init --no-gitignore`, { cwd: tempDir });

    assert.ok(!stdout.includes('Updated .gitignore'));
    assert.ok(!stdout.includes('Created .gitignore'));
  });

  it('should show help', async () => {
    const { stdout } = await execAsync(`node ${CLI_PATH} init --help`);
    assert.ok(stdout.includes('Initialize'));
  });
});
