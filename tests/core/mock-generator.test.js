/**
 * @fileoverview Tests for mock generator module
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { generateMockData, generateVariants, createRng } from '../../src/core/mock-generator.js';

describe('Mock Generator', () => {
  describe('generateMockData', () => {
    describe('primitive types', () => {
      it('should generate string from schema', () => {
        const schema = { type: 'string' };
        const result = generateMockData(schema);
        
        assert.strictEqual(typeof result, 'string');
      });

      it('should generate number from schema', () => {
        const schema = { type: 'number' };
        const result = generateMockData(schema);
        
        assert.strictEqual(typeof result, 'number');
      });

      it('should generate integer from schema', () => {
        const schema = { type: 'integer' };
        const result = generateMockData(schema);
        
        assert.strictEqual(typeof result, 'number');
        assert.strictEqual(result % 1, 0);
      });

      it('should generate boolean from schema', () => {
        const schema = { type: 'boolean' };
        const result = generateMockData(schema);
        
        assert.strictEqual(typeof result, 'boolean');
      });

      it('should generate null from schema', () => {
        const schema = { type: 'null' };
        const result = generateMockData(schema);
        
        assert.strictEqual(result, null);
      });
    });

    describe('format-based generation', () => {
      it('should generate email format', () => {
        const schema = { type: 'string', format: 'email' };
        const result = generateMockData(schema);
        
        assert.ok(result.includes('@'));
        assert.ok(result.includes('.'));
      });

      it('should generate date-time format', () => {
        const schema = { type: 'string', format: 'date-time' };
        const result = generateMockData(schema);
        
        assert.ok(result.includes('T'));
        assert.ok(result.includes('Z'));
      });

      it('should generate date format', () => {
        const schema = { type: 'string', format: 'date' };
        const result = generateMockData(schema);
        
        assert.ok(result.match(/^\d{4}-\d{2}-\d{2}$/));
      });

      it('should generate UUID format', () => {
        const schema = { type: 'string', format: 'uuid' };
        const result = generateMockData(schema);
        
        assert.ok(result.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
      });

      it('should generate URI format', () => {
        const schema = { type: 'string', format: 'uri' };
        const result = generateMockData(schema);
        
        assert.strictEqual(result, 'https://example.com');
      });
    });

    describe('enums', () => {
      it('should pick from enum values', () => {
        const schema = { enum: ['active', 'inactive', 'pending'] };
        const result = generateMockData(schema);
        
        assert.ok(['active', 'inactive', 'pending'].includes(result));
      });
    });

    describe('examples', () => {
      it('should use example if provided', () => {
        const schema = { type: 'string', example: 'exact-value' };
        const result = generateMockData(schema);
        
        assert.strictEqual(result, 'exact-value');
      });

      it('should use first example from examples array', () => {
        const schema = { type: 'string', examples: ['first', 'second', 'third'] };
        const result = generateMockData(schema);
        
        assert.strictEqual(result, 'first');
      });
    });

    describe('objects', () => {
      it('should generate object from properties', () => {
        const schema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' }
          },
          required: ['name', 'age']
        };
        const result = generateMockData(schema);
        
        assert.strictEqual(typeof result, 'object');
        assert.ok('name' in result);
        assert.ok('age' in result);
        assert.strictEqual(typeof result.name, 'string');
        assert.strictEqual(typeof result.age, 'number');
      });

      it('should include required fields', () => {
        const schema = {
          type: 'object',
          properties: {
            required: { type: 'string' },
            optional: { type: 'string' }
          },
          required: ['required']
        };
        
        // Run multiple times to ensure required is always included
        for (let i = 0; i < 10; i++) {
          const result = generateMockData(schema);
          assert.ok('required' in result);
        }
      });

      it('should handle nested objects', () => {
        const schema = {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            }
          },
          required: ['user']
        };
        const result = generateMockData(schema);
        
        assert.strictEqual(typeof result.user, 'object');
        assert.strictEqual(typeof result.user.name, 'string');
      });
    });

    describe('arrays', () => {
      it('should generate array from items schema', () => {
        const schema = {
          type: 'array',
          items: { type: 'string' }
        };
        const result = generateMockData(schema);
        
        assert.ok(Array.isArray(result));
        assert.ok(result.length > 0);
        assert.strictEqual(typeof result[0], 'string');
      });

      it('should generate array of objects with required fields', () => {
        const schema = {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' }
            },
            required: ['id', 'name']
          }
        };
        const result = generateMockData(schema);
        
        assert.ok(Array.isArray(result));
        assert.ok(result.length > 0);
        assert.strictEqual(typeof result[0].id, 'number');
        assert.strictEqual(typeof result[0].name, 'string');
      });

      it('should respect minItems', () => {
        const schema = {
          type: 'array',
          items: { type: 'number' },
          minItems: 5
        };
        const result = generateMockData(schema);
        
        assert.ok(result.length >= 5);
      });

      it('should respect maxItems', () => {
        const schema = {
          type: 'array',
          items: { type: 'number' },
          maxItems: 2
        };
        const result = generateMockData(schema);
        
        assert.ok(result.length <= 2);
      });
    });

    describe('number constraints', () => {
      it('should respect minimum', () => {
        const schema = { type: 'number', minimum: 100 };
        const result = generateMockData(schema);
        
        assert.ok(result >= 100);
      });

      it('should respect maximum', () => {
        const schema = { type: 'number', maximum: 10 };
        const result = generateMockData(schema);
        
        assert.ok(result <= 10);
      });

      it('should respect both minimum and maximum', () => {
        const schema = { type: 'number', minimum: 50, maximum: 60 };
        const result = generateMockData(schema);
        
        assert.ok(result >= 50);
        assert.ok(result <= 60);
      });
    });

    describe('$ref support', () => {
      it('should resolve $ref', () => {
        const schema = { $ref: '#/definitions/User' };
        const rootSpec = {
          definitions: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'number' }
              },
              required: ['id']
            }
          }
        };
        const result = generateMockData(schema, rootSpec);
        
        assert.strictEqual(typeof result, 'object');
        assert.ok('id' in result);
      });
    });
  });

  describe('generateVariants', () => {
    it('should generate multiple variants', () => {
      const sample = { name: 'John', age: 30 };
      const variants = generateVariants(sample, { count: 3 });
      
      assert.strictEqual(variants.length, 3);
    });

    it('should create different variants', () => {
      const sample = { name: 'John', count: 100 };
      const variants = generateVariants(sample, { count: 5 });
      
      // At least some variants should be different
      const counts = variants.map(v => v.count);
      const uniqueCounts = new Set(counts);
      assert.ok(uniqueCounts.size > 1 || variants.length === 1);
    });

    it('should preserve object structure', () => {
      const sample = { 
        user: { 
          name: 'John',
          profile: { email: 'john@test.com' }
        }
      };
      const variants = generateVariants(sample, { count: 2 });
      
      for (const variant of variants) {
        assert.ok('user' in variant);
        assert.ok('name' in variant.user);
        assert.ok('profile' in variant.user);
        assert.ok('email' in variant.user.profile);
      }
    });

    it('should handle arrays', () => {
      const sample = { items: [1, 2, 3] };
      const variants = generateVariants(sample, { count: 2 });
      
      for (const variant of variants) {
        assert.ok(Array.isArray(variant.items));
      }
    });

    it('should vary specified fields only', () => {
      const sample = { name: 'John', age: 30, city: 'NYC' };
      const variants = generateVariants(sample, { 
        count: 5, 
        variations: ['age'] 
      });
      
      // name should stay the same
      for (const variant of variants) {
        assert.strictEqual(variant.name, sample.name);
        assert.strictEqual(variant.city, sample.city);
      }
    });

    it('should generate single variant when count is 1', () => {
      const sample = { name: 'John' };
      const variants = generateVariants(sample, { count: 1 });
      
      assert.strictEqual(variants.length, 1);
    });
  });

  describe('createRng', () => {
    it('should return Math.random when no seed provided', () => {
      const rng = createRng(null);
      assert.strictEqual(rng, Math.random);
    });

    it('should return Math.random when seed is undefined', () => {
      const rng = createRng(undefined);
      assert.strictEqual(rng, Math.random);
    });

    it('should return a deterministic function when seed is provided', () => {
      const rng1 = createRng(42);
      const rng2 = createRng(42);
      const values1 = Array.from({ length: 10 }, () => rng1());
      const values2 = Array.from({ length: 10 }, () => rng2());
      assert.deepStrictEqual(values1, values2);
    });

    it('should produce different sequences for different seeds', () => {
      const rng1 = createRng(1);
      const rng2 = createRng(2);
      const values1 = Array.from({ length: 5 }, () => rng1());
      const values2 = Array.from({ length: 5 }, () => rng2());
      assert.notDeepStrictEqual(values1, values2);
    });

    it('should produce values in [0, 1)', () => {
      const rng = createRng(123);
      for (let i = 0; i < 100; i++) {
        const v = rng();
        assert.ok(v >= 0 && v < 1, `Value ${v} out of range`);
      }
    });
  });

  describe('seeded generateMockData', () => {
    it('should produce deterministic output with same seed', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer', minimum: 0, maximum: 100 },
          active: { type: 'boolean' }
        },
        required: ['name', 'age', 'active']
      };
      const rng1 = createRng(99);
      const rng2 = createRng(99);
      const result1 = generateMockData(schema, null, new Map(), rng1);
      const result2 = generateMockData(schema, null, new Map(), rng2);
      assert.deepStrictEqual(result1, result2);
    });

    it('should produce different output with different seeds', () => {
      const schema = { type: 'string' };
      const rng1 = createRng(1);
      const rng2 = createRng(2);
      const result1 = generateMockData(schema, null, new Map(), rng1);
      const result2 = generateMockData(schema, null, new Map(), rng2);
      assert.notStrictEqual(result1, result2);
    });
  });

  describe('seeded generateVariants', () => {
    it('should produce deterministic variants with same seed', () => {
      const sample = { name: 'Alice', count: 50, email: 'alice@test.com' };
      const v1 = generateVariants(sample, { count: 5, seed: 42 });
      const v2 = generateVariants(sample, { count: 5, seed: 42 });
      assert.deepStrictEqual(v1, v2);
    });

    it('should produce different variants with different seeds', () => {
      const sample = { name: 'Bob', count: 100 };
      const v1 = generateVariants(sample, { count: 3, seed: 1 });
      const v2 = generateVariants(sample, { count: 3, seed: 2 });
      assert.notDeepStrictEqual(v1, v2);
    });

    it('should be non-deterministic when no seed is provided', () => {
      const sample = { value: 1000 };
      // Run many times — at least one pair should differ
      const runs = Array.from({ length: 10 }, () =>
        generateVariants(sample, { count: 1 })
      );
      const unique = new Set(runs.map(r => JSON.stringify(r)));
      assert.ok(unique.size > 1, 'Expected non-deterministic output without seed');
    });
  });
});