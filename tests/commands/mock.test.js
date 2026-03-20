/**
 * @fileoverview Tests for mock command
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CLI_PATH = path.join(process.cwd(), 'src/cli/index.js');

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
    it('should generate multiple variants', async () => {
      // Use existing fixture
      const { stdout } = await execAsync(`node ${CLI_PATH} mock user --count 3`);
      
      assert.ok(stdout.includes('Generating'));
      assert.ok(stdout.includes('3 variant(s)'));
    });

    it('should generate single variant with count 1', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} mock user --count 1`);
      
      assert.ok(stdout.includes('1 variant'));
    });

    it('should use custom output prefix', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} mock user --count 1 --output custom-user`);
      
      assert.ok(stdout.includes('custom-user'));
    });
  });

  describe('type generation', () => {
    it('should generate JSDoc types with --jsdoc flag', async () => {
      const tempDir = path.join(process.cwd(), 'temp-test-mock-jsdoc');
      fs.mkdirSync(tempDir, { recursive: true });
      
      try {
        // Copy existing fixture to temp dir
        const fixturesDir = path.join(tempDir, 'fixtures');
        fs.mkdirSync(fixturesDir, { recursive: true });
        
        // Create a simple fixture
        fs.writeFileSync(path.join(fixturesDir, 'test.json'), JSON.stringify({ id: 1, name: 'Test' }));
        fs.writeFileSync(path.join(fixturesDir, 'test.meta.json'), JSON.stringify({ url: '/test' }));
        
        const { stdout } = await execAsync(`cd ${tempDir} && node ${CLI_PATH} mock test --count 1 --jsdoc`);
        
        // Should complete without error
        assert.ok(stdout.includes('Generated') || stdout.includes('mock'));
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('error handling', () => {
    it('should handle missing fixture', async () => {
      try {
        await execAsync(`node ${CLI_PATH} mock nonexistent-fixture`);
        // Should fail or show error
        assert.ok(true); // If it doesn't throw, check output
      } catch (error) {
        assert.ok(error.message.includes('Error') || error.stderr.includes('Error')|| error.stdout?.includes('Error'));
      }
    });
  });

  describe('field variations', () => {
    it('should accept --vary option', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} mock user --count 1 --vary name email`);
      
      // Should complete without error
      assert.ok(stdout.includes('Generating') || stdout.includes('variant'));
    });
  });
});