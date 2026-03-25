/**
 * @fileoverview Tests for cli/utils module
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseHeader, parseHeaders, formatBytes, isValidFixtureName, slugify, toPascalCase, sanitizeName } from '../../src/cli/utils.js';

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

  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      assert.strictEqual(formatBytes(0), '0 B');
    });

    it('should format KB', () => {
      assert.strictEqual(formatBytes(1024), '1 KB');
    });

    it('should format MB', () => {
      assert.strictEqual(formatBytes(1048576), '1 MB');
    });
  });

  describe('isValidFixtureName', () => {
    it('should accept valid names', () => {
      assert.ok(isValidFixtureName('my-fixture'));
      assert.ok(isValidFixtureName('fixture_123'));
    });

    it('should reject invalid names', () => {
      assert.ok(!isValidFixtureName('has spaces'));
      assert.ok(!isValidFixtureName('has/slash'));
    });
  });

  describe('slugify', () => {
    it('should slugify strings', () => {
      assert.strictEqual(slugify('Hello World'), 'hello-world');
      assert.strictEqual(slugify('foo_bar!baz'), 'foo-bar-baz');
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
  });
});
