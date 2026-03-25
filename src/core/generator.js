/**
 * @fileoverview Type generator for JSDoc and TypeScript
 * Generates deep, recursive named types from JSON data.
 * @module core/generator
 */

/**
 * Infer JSDoc type from JavaScript value
 * @param {*} value - JavaScript value
 * @returns {string} JSDoc type string
 */
/** @type {number} Configurable array sample size */
let _arraySampleSize = 100;

/**
 * Set the array sample size for type inference
 * @param {number} size
 */
export function setArraySampleSize(size) {
  _arraySampleSize = size;
}

/**
 * Infer JSDoc type from JavaScript value
 * @param {*} value - JavaScript value
 * @returns {string} JSDoc type string
 */
export function inferType(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  const type = typeof value;

  switch (type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'function':
      return 'Function';
    case 'symbol':
      return 'symbol';
    case 'bigint':
      return 'bigint';
    case 'object':
      if (Array.isArray(value)) {
        if (value.length === 0) return 'Array<any>';
        const itemTypes = new Set(
          value.slice(0, _arraySampleSize).map(item => inferType(item))
        );
        if (itemTypes.size === 1) {
          return `Array<${[...itemTypes][0]}>`;
        }
        return `Array<${[...itemTypes].join(' | ')}>`;
      }
      if (value instanceof Date) return 'Date';
      if (value instanceof RegExp) return 'RegExp';
      if (value instanceof Map) return 'Map<any, any>';
      if (value instanceof Set) return 'Set<any>';
      return 'Object';
    default:
      return 'any';
  }
}

// ── Deep recursive type collection ──────────────────────────────────

/**
 * Collect all named types from a JSON value recursively.
 * Each nested plain object gets its own named type.
 * @param {*} value - JSON value
 * @param {string} name - PascalCase root name
 * @param {Map<string, Object>} types - Accumulator map name→properties
 */
function collectTypes(value, name, types) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return;
  }

  const properties = {};

  for (const [key, val] of Object.entries(value)) {
    if (val === null) {
      properties[key] = { type: 'null', optional: false };
    } else if (Array.isArray(val)) {
      if (val.length > 0 && typeof val[0] === 'object' && val[0] !== null && !Array.isArray(val[0])) {
        const itemName = name + capitalize(singularize(key));
        collectTypes(val[0], itemName, types);
        properties[key] = { type: `${itemName}[]`, optional: false };
      } else {
        properties[key] = { type: inferTsArrayType(val), optional: false };
      }
    } else if (typeof val === 'object') {
      const childName = name + capitalize(key);
      collectTypes(val, childName, types);
      properties[key] = { type: childName, optional: false };
    } else {
      properties[key] = { type: typeof val, optional: val === undefined };
    }
  }

  types.set(name, properties);
}

/**
 * Capitalize first letter
 * @param {string} s
 * @returns {string}
 */
function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Naive singularize: strip trailing 's' for type naming
 * @param {string} s
 * @returns {string}
 */
function singularize(s) {
  if (s.endsWith('ies')) return s.slice(0, -3) + 'y';
  if (s.endsWith('ses') || s.endsWith('xes') || s.endsWith('zes')) return s.slice(0, -2);
  if (s.endsWith('s') && !s.endsWith('ss')) return s.slice(0, -1);
  return s;
}

/**
 * Infer TS array element type for primitive arrays
 * @param {Array} arr
 * @returns {string}
 */
function inferTsArrayType(arr) {
  if (arr.length === 0) return 'any[]';
  const itemTypes = new Set(arr.slice(0, _arraySampleSize).map(v => tsScalarType(v)));
  if (itemTypes.size === 1) return `${[...itemTypes][0]}[]`;
  return `(${[...itemTypes].join(' | ')})[]`;
}

/**
 * Map a scalar JS value to its TS type keyword
 * @param {*} v
 * @returns {string}
 */
function tsScalarType(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'any[]';
  if (typeof v === 'object') return 'Record<string, any>';
  return typeof v;
}

// ── JSDoc generation ────────────────────────────────────────────────

/**
 * Generate JSDoc typedef from JSON (deep, with named sub-types)
 * @param {Object} json - JSON object
 * @param {string} name - Type name
 * @returns {string} JSDoc typedef string
 */
export function generateJSDoc(json, name) {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return `/** @type {${inferType(json)}} */`;
  }

  const types = new Map();
  collectTypes(json, name, types);

  const blocks = [];

  // Emit sub-types first, root type last
  for (const [typeName, properties] of types) {
    if (typeName === name) continue;
    blocks.push(buildJSDocBlock(typeName, properties));
  }
  blocks.push(buildJSDocBlock(name, types.get(name)));

  return blocks.join('\n\n');
}

/**
 * Build a single JSDoc @typedef block
 * @param {string} typeName
 * @param {Object} properties
 * @returns {string}
 */
function buildJSDocBlock(typeName, properties) {
  const lines = ['/**', ` * @typedef {Object} ${typeName}`];
  for (const [key, info] of Object.entries(properties)) {
    const opt = info.optional ? '?' : '';
    lines.push(` * @property {${info.type}${opt}} ${key}`);
  }
  lines.push(' */');
  return lines.join('\n');
}

// ── TypeScript generation ───────────────────────────────────────────

/**
 * Generate TypeScript interfaces from JSON (deep, with named sub-types)
 * @param {Object} json - JSON object
 * @param {string} name - Interface name
 * @returns {string} TypeScript interface string
 */
export function generateTypeScript(json, name) {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return `export type ${name} = ${tsScalarType(json)};`;
  }

  const types = new Map();
  collectTypes(json, name, types);

  const blocks = [];

  // Emit sub-types first, root type last
  for (const [typeName, properties] of types) {
    if (typeName === name) continue;
    blocks.push(buildTsInterface(typeName, properties));
  }
  blocks.push(buildTsInterface(name, types.get(name)));

  return blocks.join('\n\n');
}

/**
 * Build a single TypeScript interface block
 * @param {string} typeName
 * @param {Object} properties
 * @returns {string}
 */
function buildTsInterface(typeName, properties) {
  const lines = [`export interface ${typeName} {`];
  for (const [key, info] of Object.entries(properties)) {
    const opt = info.optional ? '?' : '';
    lines.push(`  ${key}${opt}: ${info.type};`);
  }
  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate type definition from JSON (convenience wrapper)
 * @param {Object} json - JSON object
 * @param {string} name - Type name
 * @param {string} format - Output format (jsdoc, typescript)
 * @returns {string} Type definition string
 */
export function generateType(json, name, format = 'jsdoc') {
  switch (format) {
    case 'typescript':
      return generateTypeScript(json, name);
    case 'jsdoc':
    default:
      return generateJSDoc(json, name);
  }
}
