/**
 * @fileoverview Tests for config module
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { loadConfig, resolveEnv } from '../../src/core/config.js';

describe('Config', () => {
  describe('loadConfig', () => {
    it('should return default config when no file exists', async () => {
      const config = await loadConfig('/nonexistent/path.json');
      assert.ok(config);
      assert.strictEqual(config.typesFormat, 'jsdoc');
    });
  });

  describe('resolveEnv', () => {
    it('should return URL unchanged when no env matches', () => {
      const config = { environments: {} };
      const result = resolveEnv('https://api.example.com/users', 'staging', config);
      assert.strictEqual(result, 'https://api.example.com/users');
    });

    it('should prepend baseUrl for relative URLs', () => {
      const config = {
        environments: {
          staging: { baseUrl: 'https://staging.api.example.com' }
        }
      };
      const result = resolveEnv('/users', 'staging', config);
      assert.strictEqual(result, 'https://staging.api.example.com/users');
    });

    it('should strip trailing slash from baseUrl before prepending', () => {
      const config = {
        environments: {
          staging: { baseUrl: 'https://staging.api.example.com/' }
        }
      };
      const result = resolveEnv('/users', 'staging', config);
      assert.strictEqual(result, 'https://staging.api.example.com/users');
    });

    it('should return URL unchanged when envName is null', () => {
      const config = {
        environments: {
          staging: { baseUrl: 'https://staging.api.example.com' }
        }
      };
      const result = resolveEnv('https://api.example.com/users', null, config);
      assert.strictEqual(result, 'https://api.example.com/users');
    });

    it('should replace placeholders in URL', () => {
      const config = {
        environments: {
          staging: { baseUrl: 'https://staging.example.com', apiVersion: 'v2' }
        }
      };
      const result = resolveEnv('https://api.example.com/{apiVersion}/users', 'staging', config);
      assert.strictEqual(result, 'https://api.example.com/v2/users');
    });
  });
});