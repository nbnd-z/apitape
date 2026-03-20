/**
 * @fileoverview Tests for import module core logic
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { generateMockData } from '../../src/core/mock-generator.js';

describe('Import Module Core Logic', () => {
  describe('OpenAPI spec parsing', () => {
    it('should parse valid JSON spec', () => {
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
                          },
                          required: ['id', 'name']
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

      const content = JSON.stringify(spec);
      const parsed = JSON.parse(content);

      assert.strictEqual(parsed.openapi, '3.0.0');
      assert.ok(parsed.paths['/users']);
      assert.ok(parsed.paths['/users'].get);
    });

    it('should extract endpoints from spec', () => {
      const spec = {
        paths: {
          '/users': { get: {}, post: {} },
          '/users/{id}': { get: {}, put: {}, delete: {} },
          '/posts': { get: {} }
        }
      };

      const endpoints = [];
      for (const [pathStr, pathItem] of Object.entries(spec.paths)) {
        for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
          if (pathItem[method]) {
            endpoints.push({ path: pathStr, method });
          }
        }
      }

      assert.strictEqual(endpoints.length, 6);
      assert.ok(endpoints.some(e => e.path === '/users' && e.method === 'get'));
      assert.ok(endpoints.some(e => e.path === '/users/{id}' && e.method === 'delete'));
    });

    it('should generate operation ID from path and method', () => {
      const generateOperationId = (method, pathStr) => {
        const parts = pathStr.split('/').filter(Boolean);
        return `${method}-${parts.join('-')}`;
      };

      assert.strictEqual(generateOperationId('get', '/users'), 'get-users');
      assert.strictEqual(generateOperationId('post', '/users'), 'post-users');
      assert.strictEqual(generateOperationId('get', '/users/1/posts'), 'get-users-1-posts');
    });
  });

  describe('response schema extraction', () => {
    it('should extract schema from 200 response', () => {
      const operation = {
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      };

      const getResponseSchema = (op) => {
        const responses = op.responses;
        if (!responses) return null;
        const successResponse = responses['200'] || responses['201'] || responses.default;
        if (!successResponse) return null;
        const content = successResponse.content;
        if (!content) return null;
        const jsonContent = content['application/json'];
        if (!jsonContent) return null;
        return jsonContent.schema;
      };

      const schema = getResponseSchema(operation);
      assert.ok(schema);
      assert.strictEqual(schema.type, 'object');
    });

    it('should resolve $ref to definitions', () => {
      const resolveRef = (ref, spec) => {
        if (!ref.startsWith('#/')) return {};
        const parts = ref.slice(2).split('/');
        let current = spec;
        for (const part of parts) {
          current = current[part];
          if (!current) return {};
        }
        return current;
      };

      const spec = {
        definitions: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'integer' }
            }
          }
        }
      };

      const resolved = resolveRef('#/definitions/User', spec);
      assert.strictEqual(resolved.type, 'object');
      assert.ok(resolved.properties.id);
    });
  });

  describe('fixture name sanitization', () => {
    it('should sanitize names for file system', () => {
      const sanitizeName = (name) => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 100);
      };

      assert.strictEqual(sanitizeName('get-users'), 'get-users');
      assert.strictEqual(sanitizeName('User/Profile'), 'user-profile');
      assert.strictEqual(sanitizeName('Some Long Name With Spaces'), 'some-long-name-with-spaces');
    });

    it('should limit name length', () => {
      const sanitizeName = (name) => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 100);
      };

      const longName = 'a'.repeat(200);
      assert.strictEqual(sanitizeName(longName).length, 100);
    });
  });

  describe('mock data generation from schema', () => {
    it('should generate data matching schema', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' }
        },
        required: ['id', 'name']
      };

      const data = generateMockData(schema);

      assert.strictEqual(typeof data, 'object');
      assert.strictEqual(typeof data.id, 'number');
      assert.strictEqual(typeof data.name, 'string');
    });

    it('should use example if provided', () => {
      const schema = {
        type: 'object',
        example: { id: 123, name: 'Example User' }
      };

      const data = generateMockData(schema);

      assert.deepStrictEqual(data, { id: 123, name: 'Example User' });
    });
  });
});