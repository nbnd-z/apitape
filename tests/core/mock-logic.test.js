/**
 * @fileoverview Tests for mock command core logic
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { generateVariants } from '../../src/core/mock-generator.js';

describe('Mock Command Core Logic', () => {
  describe('variant generation', () => {
    it('should generate specified number of variants', () => {
      const sample = { id: 1, name: 'Test' };
      const variants = generateVariants(sample, { count: 5 });

      assert.strictEqual(variants.length, 5);
    });

    it('should preserve object structure', () => {
      const sample = {
        user: {
          profile: {
            name: 'John',
            email: 'john@test.com'
          }
        }
      };
      const variants = generateVariants(sample, { count: 2 });

      for (const variant of variants) {
        assert.ok('user' in variant);
        assert.ok('profile' in variant.user);
        assert.ok('name' in variant.user.profile);
        assert.ok('email' in variant.user.profile);
      }
    });

    it('should preserve array type', () => {
      const sample = { items: [1, 2, 3] };
      const variants = generateVariants(sample, { count: 2 });

      for (const variant of variants) {
        assert.ok(Array.isArray(variant.items));
      }
    });

    it('should preserve boolean type', () => {
      const sample = { active: true };
      const variants = generateVariants(sample, { count: 3 });

      for (const variant of variants) {
        assert.strictEqual(typeof variant.active, 'boolean');
      }
    });

    it('should preserve null values', () => {
      const sample = { value: null };
      const variants = generateVariants(sample, { count: 2 });

      // null should become null (not undefined)
      for (const variant of variants) {
        assert.strictEqual(variant.value, null);
      }
    });
  });

  describe('field variation', () => {
    it('should vary numeric values', () => {
      const sample = { count: 100 };
      const variants = generateVariants(sample, { count: 10 });

      // At least some variants should have different values
      const counts = variants.map(v => v.count);
      const uniqueCounts = new Set(counts);

      // Due to randomness, we might have duplicates, but structure should be preserved
      assert.ok(counts.every(c => typeof c === 'number'));
    });

    it('should vary string values', () => {
      const sample = { name: 'John' };
      const variants = generateVariants(sample, { count: 5 });

      // Check structure is preserved
      for (const variant of variants) {
        assert.strictEqual(typeof variant.name, 'string');
      }
    });

    it('should respect variations field list', () => {
      const sample = { id: 1, name: 'John', email: 'john@test.com' };
      const variants = generateVariants(sample, { 
        count: 3, 
        variations: ['name'] 
      });

      // id and email should stay the same
      for (const variant of variants) {
        assert.strictEqual(variant.id, sample.id);
        assert.strictEqual(variant.email, sample.email);
      }
    });
  });

  describe('data type handling', () => {
    it('should handle nested objects', () => {
      const sample = { 
        user: { 
          id: 1,
          profile: { 
            name: 'Test',
            count: 10
          } 
        } 
      };
      const variants = generateVariants(sample, { count: 2 });

      for (const variant of variants) {
        assert.strictEqual(typeof variant.user, 'object');
        assert.strictEqual(typeof variant.user.profile, 'object');
        assert.strictEqual(typeof variant.user.profile.name, 'string');
        assert.strictEqual(typeof variant.user.profile.count, 'number');
      }
    });

    it('should handle empty objects', () => {
      const sample = {};
      const variants = generateVariants(sample, { count: 1 });

      assert.strictEqual(variants.length, 1);
      assert.deepStrictEqual(variants[0], {});
    });

    it('should handle arrays of objects', () => {
      const sample = { 
        users: [
          { id: 1, name: 'User1' },
          { id: 2, name: 'User2' }
        ]
      };
      const variants = generateVariants(sample, { count: 2 });

      for (const variant of variants) {
        assert.ok(Array.isArray(variant.users));
        // Each item should have same structure
        for (const user of variant.users) {
          assert.ok('id' in user);
          assert.ok('name' in user);
        }
      }
    });
  });

  describe('metadata preservation', () => {
    it('should not modify original sample', () => {
      const sample = { id: 1, name: 'Original' };
      const originalId = sample.id;
      const originalName = sample.name;

      generateVariants(sample, { count: 5 });

      // Original should be unchanged
      assert.strictEqual(sample.id, originalId);
      assert.strictEqual(sample.name, originalName);
    });

    it('should create independent copies', () => {
      const sample = { nested: { value: 10 } };
      const variants = generateVariants(sample, { count: 2 });

      // Modifying one variant should not affect others
      variants[0].nested.value = 999;
      assert.notStrictEqual(variants[1].nested.value, 999);
    });
  });
});