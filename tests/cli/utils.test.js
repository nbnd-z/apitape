/**
 * @fileoverview Tests for cli/utils and core/utils modules
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseHeader, parseHeaders } from '../../src/cli/utils.js';
import { toPascalCase, sanitizeName, pAll } from '../../src/core/utils.js';

describe('CLI Utils', () => {
  describe('parseHeader', () => {
    it('should parse key: value header', () => {
      assert.deepStrictEqual(parseHeader('Content-Type: application/json'), { 'Content-Type': 'application/json' });
    });

    it('should handle values with colons', () => {
      assert.deepStrictEqual(parseHeader('Authorization: Bearer abc:def'), { 'Authorization': 'Bearer abc:def' });
    });
  });

  describe('parseHeaders', () => {
    it('should parse array of headers', () => {
      const result = parseHeaders(['Accept: text/plain', 'X-Custom: value']);
      assert.strictEqual(result['Accept'], 'text/plain');
      assert.strictEqual(result['X-Custom'], 'value');
    });

    it('should return empty object for null', () => {
      assert.deepStrictEqual(parseHeaders(null), {});
    });

    it('should return empty object for non-array', () => {
      assert.deepStrictEqual(parseHeaders('not-array'), {});
    });
  });

  describe('toPascalCase', () => {
    it('should convert to PascalCase', () => {
      assert.strictEqual(toPascalCase('my-fixture'), 'MyFixture');
      assert.strictEqual(toPascalCase('hello_world'), 'HelloWorld');
    });
  });

  describe('sanitizeName', () => {
    it('should sanitize names', () => {
      assert.strictEqual(sanitizeName('My Fixture!'), 'my-fixture');
      assert.strictEqual(sanitizeName('get-users'), 'get-users');
    });

    it('should limit length to 100', () => {
      assert.ok(sanitizeName('a'.repeat(200)).length <= 100);
    });

    it('should throw on empty input', () => {
      assert.throws(() => sanitizeName(''), /non-empty string/);
      assert.throws(() => sanitizeName(null), /non-empty string/);
    });
  });

  describe('pAll', () => {
    it('should run tasks with concurrency limit', async () => {
      const order = [];
      const tasks = [1, 2, 3, 4].map(n => async () => {
        order.push(n);
        return n * 2;
      });
      const results = await pAll(tasks, 2);
      assert.deepStrictEqual(results, [2, 4, 6, 8]);
    });

    it('should handle empty tasks', async () => {
      const results = await pAll([], 2);
      assert.deepStrictEqual(results, []);
    });
  });
});
