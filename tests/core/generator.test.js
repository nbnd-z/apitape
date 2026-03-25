/**
 * @fileoverview Tests for http-client module
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { inferType, generateJSDoc, generateTypeScript } from '../../src/core/generator.js';

describe('Generator', () => {
  describe('inferType', () => {
    it('should infer string type', () => {
      assert.strictEqual(inferType('hello'), 'string');
    });

    it('should infer number type', () => {
      assert.strictEqual(inferType(42), 'number');
    });

    it('should infer boolean type', () => {
      assert.strictEqual(inferType(true), 'boolean');
    });

    it('should infer null type', () => {
      assert.strictEqual(inferType(null), 'null');
    });

    it('should infer array type', () => {
      assert.strictEqual(inferType([1, 2, 3]), 'Array<number>');
    });

    it('should infer object type', () => {
      assert.strictEqual(inferType({}), 'Object');
    });
  });

  describe('generateJSDoc', () => {
    it('should generate JSDoc for simple object', () => {
      const result = generateJSDoc({ name: 'test', count: 5 }, 'TestType');
      assert.ok(result.includes('@typedef'));
      assert.ok(result.includes('TestType'));
    });
  });

  describe('generateTypeScript', () => {
    it('should generate TypeScript interface', () => {
      const result = generateTypeScript({ name: 'test', count: 5 }, 'TestType');
      assert.ok(result.includes('interface TestType'));
      assert.ok(result.includes('name: string'));
      assert.ok(result.includes('count: number'));
    });

    it('should generate named sub-interfaces for nested objects', () => {
      const data = {
        id: 1,
        address: {
          street: '123 Main St',
          city: 'Springfield'
        }
      };
      const result = generateTypeScript(data, 'User');

      assert.ok(result.includes('export interface UserAddress {'));
      assert.ok(result.includes('street: string'));
      assert.ok(result.includes('city: string'));
      assert.ok(result.includes('export interface User {'));
      assert.ok(result.includes('address: UserAddress'));
    });

    it('should generate named types for array item objects', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice' }
        ]
      };
      const result = generateTypeScript(data, 'Response');

      assert.ok(result.includes('export interface ResponseUser {'));
      assert.ok(result.includes('users: ResponseUser[]'));
    });

    it('should handle deeply nested structures', () => {
      const data = {
        company: {
          ceo: {
            name: 'Jane',
            contact: {
              email: 'jane@co.com'
            }
          }
        }
      };
      const result = generateTypeScript(data, 'Root');

      assert.ok(result.includes('export interface RootCompanyCeoContact {'));
      assert.ok(result.includes('export interface RootCompanyCeo {'));
      assert.ok(result.includes('export interface RootCompany {'));
      assert.ok(result.includes('export interface Root {'));
    });
  });

  describe('generateJSDoc deep', () => {
    it('should generate named sub-typedefs for nested objects', () => {
      const data = {
        id: 1,
        profile: {
          bio: 'hello',
          avatar: { url: 'https://img.com/a.png' }
        }
      };
      const result = generateJSDoc(data, 'User');

      assert.ok(result.includes('@typedef {Object} UserProfileAvatar'));
      assert.ok(result.includes('@typedef {Object} UserProfile'));
      assert.ok(result.includes('@typedef {Object} User'));
      assert.ok(result.includes('@property {UserProfile} profile'));
    });
  });
});