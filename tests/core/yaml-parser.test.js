/**
 * @fileoverview Tests for the lightweight YAML parser
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseYaml } from '../../src/core/yaml-parser.js';

describe('YAML Parser', () => {
  describe('scalars', () => {
    it('should parse strings', () => {
      assert.strictEqual(parseYaml('hello'), 'hello');
    });

    it('should parse quoted strings', () => {
      assert.strictEqual(parseYaml('"hello world"'), 'hello world');
      assert.strictEqual(parseYaml("'hello world'"), 'hello world');
    });

    it('should parse integers', () => {
      assert.strictEqual(parseYaml('42'), 42);
      assert.strictEqual(parseYaml('-7'), -7);
    });

    it('should parse floats', () => {
      assert.strictEqual(parseYaml('3.14'), 3.14);
    });

    it('should parse booleans', () => {
      assert.strictEqual(parseYaml('true'), true);
      assert.strictEqual(parseYaml('false'), false);
      assert.strictEqual(parseYaml('True'), true);
      assert.strictEqual(parseYaml('False'), false);
    });

    it('should parse null', () => {
      assert.strictEqual(parseYaml('null'), null);
      assert.strictEqual(parseYaml('~'), null);
    });
  });

  describe('block mappings', () => {
    it('should parse simple mapping', () => {
      const result = parseYaml('name: John\nage: 30');
      assert.deepStrictEqual(result, { name: 'John', age: 30 });
    });

    it('should parse nested mapping', () => {
      const yaml = `
person:
  name: John
  age: 30
`;
      const result = parseYaml(yaml);
      assert.deepStrictEqual(result, { person: { name: 'John', age: 30 } });
    });

    it('should parse deeply nested mapping', () => {
      const yaml = `
a:
  b:
    c:
      d: value
`;
      const result = parseYaml(yaml);
      assert.deepStrictEqual(result, { a: { b: { c: { d: 'value' } } } });
    });

    it('should handle quoted keys', () => {
      const yaml = `"200":\n  description: OK`;
      const result = parseYaml(yaml);
      assert.deepStrictEqual(result, { '200': { description: 'OK' } });
    });
  });

  describe('block sequences', () => {
    it('should parse simple sequence', () => {
      const yaml = `- one\n- two\n- three`;
      const result = parseYaml(yaml);
      assert.deepStrictEqual(result, ['one', 'two', 'three']);
    });

    it('should parse sequence of numbers', () => {
      const yaml = `- 1\n- 2\n- 3`;
      const result = parseYaml(yaml);
      assert.deepStrictEqual(result, [1, 2, 3]);
    });

    it('should parse sequence of mappings', () => {
      const yaml = `
- name: Alice
  age: 25
- name: Bob
  age: 30
`;
      const result = parseYaml(yaml);
      assert.deepStrictEqual(result, [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 }
      ]);
    });
  });

  describe('flow collections', () => {
    it('should parse flow mapping', () => {
      const yaml = `obj: {a: 1, b: 2}`;
      const result = parseYaml(yaml);
      assert.deepStrictEqual(result, { obj: { a: 1, b: 2 } });
    });

    it('should parse flow sequence', () => {
      const yaml = `arr: [1, 2, 3]`;
      const result = parseYaml(yaml);
      assert.deepStrictEqual(result, { arr: [1, 2, 3] });
    });
  });

  describe('comments', () => {
    it('should strip inline comments', () => {
      const yaml = `name: John # this is a comment\nage: 30`;
      const result = parseYaml(yaml);
      assert.deepStrictEqual(result, { name: 'John', age: 30 });
    });

    it('should skip comment-only lines', () => {
      const yaml = `# header comment\nname: John\n# middle comment\nage: 30`;
      const result = parseYaml(yaml);
      assert.deepStrictEqual(result, { name: 'John', age: 30 });
    });
  });

  describe('OpenAPI spec patterns', () => {
    it('should parse a minimal OpenAPI spec', () => {
      const yaml = `openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /users:
    get:
      operationId: getUsers
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                    name:
                      type: string
`;
      const result = parseYaml(yaml);

      assert.strictEqual(result.openapi, '3.0.0');
      assert.strictEqual(result.info.title, 'Test API');
      assert.strictEqual(result.info.version, '1.0.0');
      assert.ok(result.paths['/users']);
      assert.strictEqual(result.paths['/users'].get.operationId, 'getUsers');

      const schema = result.paths['/users'].get.responses['200'].content['application/json'].schema;
      assert.strictEqual(schema.type, 'array');
      assert.strictEqual(schema.items.type, 'object');
      assert.strictEqual(schema.items.properties.id.type, 'integer');
      assert.strictEqual(schema.items.properties.name.type, 'string');
    });

    it('should parse spec with multiple endpoints and methods', () => {
      const yaml = `openapi: "3.0.0"
info:
  title: Multi API
  version: "2.0.0"
paths:
  /items:
    get:
      operationId: listItems
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
    post:
      operationId: createItem
      responses:
        "201":
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                  name:
                    type: string
`;
      const result = parseYaml(yaml);

      assert.strictEqual(result.paths['/items'].get.operationId, 'listItems');
      assert.strictEqual(result.paths['/items'].post.operationId, 'createItem');
      const postSchema = result.paths['/items'].post.responses['201'].content['application/json'].schema;
      assert.strictEqual(postSchema.properties.name.type, 'string');
    });

    it('should handle $ref values', () => {
      const yaml = `
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
paths:
  /users:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
`;
      const result = parseYaml(yaml);
      assert.strictEqual(
        result.paths['/users'].get.responses['200'].content['application/json'].schema.$ref,
        '#/components/schemas/User'
      );
    });

    it('should handle required arrays', () => {
      const yaml = `
type: object
properties:
  id:
    type: integer
  name:
    type: string
required:
  - id
  - name
`;
      const result = parseYaml(yaml);
      assert.deepStrictEqual(result.required, ['id', 'name']);
    });

    it('should handle enum values', () => {
      const yaml = `
type: string
enum:
  - active
  - inactive
  - pending
`;
      const result = parseYaml(yaml);
      assert.deepStrictEqual(result.enum, ['active', 'inactive', 'pending']);
    });
  });

  describe('document markers', () => {
    it('should skip --- document start marker', () => {
      const yaml = `---\nname: test`;
      const result = parseYaml(yaml);
      assert.deepStrictEqual(result, { name: 'test' });
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      assert.strictEqual(parseYaml(''), null);
    });

    it('should handle URLs with colons', () => {
      const yaml = `url: https://example.com/api`;
      const result = parseYaml(yaml);
      assert.strictEqual(result.url, 'https://example.com/api');
    });

    it('should handle values with colons in quotes', () => {
      const yaml = `title: "Time: 12:00"`;
      const result = parseYaml(yaml);
      assert.strictEqual(result.title, 'Time: 12:00');
    });
  });
});
