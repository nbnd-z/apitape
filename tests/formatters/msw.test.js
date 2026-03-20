/**
 * @fileoverview Tests for MSW formatter
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { generateMSW, generateMSWHandlers } from '../../src/formatters/msw.js';

describe('MSW Formatter', () => {
  describe('generateMSW', () => {
    it('should generate MSW handler for GET request', () => {
      const result = generateMSW({
        name: 'user',
        url: 'https://api.example.com/users/1',
        method: 'GET'
      });
      
      assert.ok(result.includes("import { http, HttpResponse } from 'msw'"));
      assert.ok(result.includes('http.get'));
      assert.ok(result.includes("'/users/1'"));
      assert.ok(result.includes('userFixture'));
    });

    it('should generate handler for POST request', () => {
      const result = generateMSW({
        name: 'createUser',
        url: 'https://api.example.com/users',
        method: 'POST'
      });
      
      assert.ok(result.includes('http.post'));
      assert.ok(result.includes("'/users'"));
    });

    it('should generate handler for PUT request', () => {
      const result = generateMSW({
        name: 'updateUser',
        url: 'https://api.example.com/users/1',
        method: 'PUT'
      });
      
      assert.ok(result.includes('http.put'));
    });

    it('should generate handler for DELETE request', () => {
      const result = generateMSW({
        name: 'deleteUser',
        url: 'https://api.example.com/users/1',
        method: 'DELETE'
      });
      
      assert.ok(result.includes('http.delete'));
    });

    it('should generate handler for PATCH request', () => {
      const result = generateMSW({
        name: 'patchUser',
        url: 'https://api.example.com/users/1',
        method: 'PATCH'
      });
      
      assert.ok(result.includes('http.patch'));
    });

    it('should handle relative URLs', () => {
      const result = generateMSW({
        name: 'user',
        url: '/users/1',
        method: 'GET'
      });
      
      assert.ok(result.includes("'/users/1'"));
    });

    it('should handle URLs with query parameters', () => {
      const result = generateMSW({
        name: 'search',
        url: 'https://api.example.com/search?q=test',
        method: 'GET'
      });
      
      assert.ok(result.includes("'/search'"));
    });

    it('should include fixture import', () => {
      const result = generateMSW({
        name: 'user',
        url: '/users/1',
        method: 'GET'
      });
      
      assert.ok(result.includes("import userFixture from './user.json'"));
    });

    it('should export handler with correct name', () => {
      const result = generateMSW({
        name: 'user',
        url: '/users/1',
        method: 'GET'
      });
      
      assert.ok(result.includes('export const userHandler'));
      assert.ok(result.includes('export default userHandler'));
    });

    it('should return HttpResponse.json', () => {
      const result = generateMSW({
        name: 'user',
        url: '/users/1',
        method: 'GET'
      });
      
      assert.ok(result.includes('return HttpResponse.json(userFixture)'));
    });
  });

  describe('generateMSWHandlers', () => {
    it('should generate combined handlers for multiple fixtures', () => {
      const result = generateMSWHandlers([
        { name: 'user', url: '/users/1', method: 'GET' },
        { name: 'posts', url: '/posts', method: 'GET' }
      ]);
      
      assert.ok(result.includes("import { http, HttpResponse } from 'msw'"));
      assert.ok(result.includes("import userFixture from './user.json'"));
      assert.ok(result.includes("import postsFixture from './posts.json'"));
      assert.ok(result.includes('http.get'));
    });

    it('should export handlers array', () => {
      const result = generateMSWHandlers([
        { name: 'user', url: '/users/1', method: 'GET' }
      ]);
      
      assert.ok(result.includes('export const handlers = ['));
      assert.ok(result.includes('export default handlers'));
    });

    it('should handle mixed HTTP methods', () => {
      const result = generateMSWHandlers([
        { name: 'getUser', url: '/users/1', method: 'GET' },
        { name: 'createUser', url: '/users', method: 'POST' },
        { name: 'deleteUser', url: '/users/1', method: 'DELETE' }
      ]);
      
      assert.ok(result.includes('http.get'));
      assert.ok(result.includes('http.post'));
      assert.ok(result.includes('http.delete'));
    });

    it('should handle empty fixtures array', () => {
      const result = generateMSWHandlers([]);
      
      assert.ok(result.includes('export const handlers = ['));
      assert.ok(result.includes('export default handlers'));
    });
  });
});