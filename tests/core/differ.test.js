/**
 * @fileoverview Tests for differ module
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { diffObjects, formatDiffResult } from '../../src/core/differ.js';

describe('Differ', () => {
  describe('diffObjects', () => {
    describe('identical objects', () => {
      it('should return fresh status for identical objects', () => {
        const obj = { name: 'test', value: 123 };
        const result = diffObjects(obj, obj);
        
        assert.strictEqual(result.status, 'fresh');
        assert.strictEqual(result.added.length, 0);
        assert.strictEqual(result.removed.length, 0);
        assert.strictEqual(result.changed.length, 0);
      });
    });

    describe('added fields', () => {
      it('should detect added fields', () => {
        const oldObj = { name: 'test' };
        const newObj = { name: 'test', added: 'new' };
        const result = diffObjects(oldObj, newObj);
        
        assert.strictEqual(result.status, 'drifted');
        assert.strictEqual(result.added.length, 1);
        assert.strictEqual(result.added[0].path, 'added');
        assert.strictEqual(result.added[0].type, 'string');
      });

      it('should detect nested added fields', () => {
        const oldObj = { user: { name: 'John' } };
        const newObj = { user: { name: 'John', email: 'john@test.com' } };
        const result = diffObjects(oldObj, newObj);
        
        assert.strictEqual(result.added.length, 1);
        assert.strictEqual(result.added[0].path, 'user.email');
      });
    });

    describe('removed fields', () => {
      it('should detect removed fields as breaking', () => {
        const oldObj = { name: 'test', removed: 'old' };
        const newObj = { name: 'test' };
        const result = diffObjects(oldObj, newObj);
        
        assert.strictEqual(result.status, 'breaking');
        assert.strictEqual(result.removed.length, 1);
        assert.strictEqual(result.removed[0].path, 'removed');
      });

      it('should detect nested removed fields', () => {
        const oldObj = { user: { name: 'John', email: 'john@test.com' } };
        const newObj = { user: { name: 'John' } };
        const result = diffObjects(oldObj, newObj);
        
        assert.strictEqual(result.status, 'breaking');
        assert.strictEqual(result.removed[0].path, 'user.email');
      });
    });

    describe('type changes', () => {
      it('should detect type changes', () => {
        const oldObj = { count: 123 };
        const newObj = { count: '123' };
        const result = diffObjects(oldObj, newObj);
        
        assert.strictEqual(result.changed.length, 1);
        assert.strictEqual(result.changed[0].path, 'count');
        assert.strictEqual(result.changed[0].oldType, 'number');
        assert.strictEqual(result.changed[0].newType, 'string');
      });

      it('should detect object to array as breaking', () => {
        const oldObj = { items: {a: 1 } };
        const newObj = { items: [1, 2, 3] };
        const result = diffObjects(oldObj, newObj);
        
        assert.strictEqual(result.status, 'breaking');
      });

      it('should detect array to object as breaking', () => {
        const oldObj = { items: [1, 2, 3] };
        const newObj = { items: { a: 1 } };
        const result = diffObjects(oldObj, newObj);
        
        assert.strictEqual(result.status, 'breaking');
      });
    });

    describe('nested objects', () => {
      it('should compare deeply nested objects', () => {
        const oldObj = {
          user: {
            profile: {
              name: 'John',
              age: 30
            }
          }
        };
        const newObj = {
          user: {
            profile: {
              name: 'John',
              age: 31
            }
          }
        };
        const result = diffObjects(oldObj, newObj);
        
        // Count all changes in the result
        const totalChanges = result.changed.length;
        assert.ok(totalChanges >= 1);
      });
    });

    describe('arrays', () => {
      it('should detect added array items', () => {
        const oldObj = { items: [1, 2] };
        const newObj = { items: [1, 2, 3] };
        const result = diffObjects(oldObj, newObj);
        
        assert.strictEqual(result.status, 'drifted');
      });

      it('should detect removed array items as breaking', () => {
        const oldObj = { items: [1, 2, 3] };
        const newObj = { items: [1, 2] };
        const result = diffObjects(oldObj, newObj);
        
        assert.strictEqual(result.status, 'breaking');
      });

      it('should compare array item structures', () => {
        const oldObj = { users: [{ id: 1, name: 'John' }] };
        const newObj = { users: [{ id: 1, name: 'Jane' }] };
        const result = diffObjects(oldObj, newObj);
        
        // This detects changes within array items
        assert.strictEqual(result.status, 'drifted');
      });
    });

    describe('JSON string input', () => {
      it('should parse JSON strings', () => {
        const result = diffObjects('{"a":1}', '{"a":2}');
        
        assert.strictEqual(result.changed.length, 1);
      });
    });

    describe('null handling', () => {
      it('should handle null values', () => {
        const oldObj = { value: null };
        const newObj = { value: 'not null' };
        const result = diffObjects(oldObj, newObj);
        
        assert.strictEqual(result.changed.length, 1);
        assert.strictEqual(result.changed[0].oldType, 'null');
      });

      it('should treat null as type change', () => {
        const oldObj = { value: 'string' };
        const newObj = { value: null };
        const result = diffObjects(oldObj, newObj);
        
        assert.strictEqual(result.status, 'breaking');
      });
    });

    describe('empty objects', () => {
      it('should handle empty objects', () => {
        const result = diffObjects({}, {});
        
        assert.strictEqual(result.status, 'fresh');
      });

      it('should detect changes from empty object', () => {
        const result = diffObjects({}, { new: 'field' });
        
        assert.strictEqual(result.added.length, 1);
      });
    });
  });

  describe('formatDiffResult', () => {
    it('should format fresh result', () => {
      const result = { status: 'fresh', added: [], removed: [], changed: [] };
      const formatted = formatDiffResult(result);
      
      assert.ok(formatted.includes('✓ No changes detected'));
    });

    it('should format drifted result', () => {
      const result = {
        status: 'drifted',
        added: [{ path: 'newField', type: 'string' }],
        removed: [],
        changed: []
      };
      const formatted = formatDiffResult(result);
      
      assert.ok(formatted.includes('⚠ Drift detected:'));
      assert.ok(formatted.includes('+ newField: string (NEW)'));
    });

    it('should format breaking result', () => {
      const result = {
        status: 'breaking',
        added: [],
        removed: [{ path: 'oldField', type: 'string' }],
        changed: []
      };
      const formatted = formatDiffResult(result);
      
      assert.ok(formatted.includes('✗ Breaking changes detected:'));
      assert.ok(formatted.includes('- oldField: string (REMOVED)'));
    });

    it('should format type changes', () => {
      const result = {
        status: 'breaking',
        added: [],
        removed: [],
        changed: [{ path: 'count', oldType: 'number', newType: 'string' }]
      };
      const formatted = formatDiffResult(result);
      
      assert.ok(formatted.includes('! count: number → string (TYPE_CHANGED)'));
    });
  });
});