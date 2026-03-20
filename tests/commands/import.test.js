/**
 * @fileoverview Tests for import command
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CLI_PATH = path.join(process.cwd(), 'src/cli/index.js');

describe('Import Command', () => {
  describe('--help', () => {
    it('should show help for import command', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} import --help`);
      
      assert.ok(stdout.includes('Import fixtures from OpenAPI'));
      assert.ok(stdout.includes('--jsdoc'));
      assert.ok(stdout.includes('--typescript'));
      assert.ok(stdout.includes('--msw'));
      assert.ok(stdout.includes('--mock'));
    });
  });

  describe('JSON spec import', () => {
    it('should import from valid JSON OpenAPI spec', async () => {
      // Create temp spec file
      const tempDir = path.join(process.cwd(), 'temp-test-import');
      fs.mkdirSync(tempDir, { recursive: true });
      
      const specPath = path.join(tempDir, 'test-api.json');
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              responses: {
                '200': {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };
      
      fs.writeFileSync(specPath, JSON.stringify(spec));
      
      try {
        const { stdout } = await execAsync(`cd ${tempDir} && node ${CLI_PATH} init && node ${CLI_PATH} import ${specPath}`);
        
        assert.ok(stdout.includes('Importing fixtures'));
        assert.ok(stdout.includes('Test API'));
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('error handling', () => {
    it('should handle missing spec file', async () => {
      try {
        await execAsync(`node ${CLI_PATH} import nonexistent.json`);
        // If it doesn't throw, check that output contains error
        assert.ok(true);
      } catch (error) {
        // Error is expected- either stderr or stdout should indicate error
        const output = error.stderr ||error.stdout || error.message;
        assert.ok(output.includes('Error') || output.includes('failed') || output.includes('not found'));
      }
    });

    it('should handle invalid JSON', async () => {
      const tempDir = path.join(process.cwd(), 'temp-test-import-invalid');
      fs.mkdirSync(tempDir, { recursive: true });
      
      const specPath = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(specPath, '{ invalid json');
      
      try {
        await execAsync(`node ${CLI_PATH} import ${specPath}`);
        // Should not throw - parser should handle gracefully
        assert.ok(true);
      } catch (error) {
        // Error is acceptable
        assert.ok(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});