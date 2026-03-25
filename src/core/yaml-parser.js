/**
 * @fileoverview Lightweight YAML parser for OpenAPI specifications.
 * Supports the subset of YAML commonly used in OpenAPI specs:
 * block mappings, block sequences, flow sequences, flow mappings,
 * quoted/unquoted scalars, multi-line folded/literal strings, and comments.
 *
 * Does NOT support: anchors/aliases, tags, multi-document streams,
 * complex mapping keys, or merge keys.
 * @module core/yaml-parser
 */

/**
 * Parse a YAML string into a JavaScript value.
 * @param {string} text - YAML source text
 * @returns {*} Parsed value
 */
export function parseYaml(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const ctx = { lines, pos: 0 };
  return parseNode(ctx, -1);
}

/**
 * Parse the next YAML node at or above the given indent level.
 * @param {Object} ctx - Parser context
 * @param {number} parentIndent - Parent indentation level
 * @returns {*} Parsed value
 */
function parseNode(ctx, parentIndent) {
  skipBlanks(ctx);
  if (ctx.pos >= ctx.lines.length) return null;

  const line = ctx.lines[ctx.pos];
  const trimmed = stripComment(line).trim();

  // Flow mapping or sequence on the value side
  if (trimmed.startsWith('{')) return parseFlowMapping(trimmed);
  if (trimmed.startsWith('[')) return parseFlowSequence(trimmed);

  const indent = lineIndent(line);

  // Block sequence
  if (trimmed.startsWith('- ') || trimmed === '-') {
    return parseBlockSequence(ctx, indent);
  }

  // Block mapping (contains a colon)
  if (trimmed.includes(':')) {
    return parseBlockMapping(ctx, indent);
  }

  // Scalar
  ctx.pos++;
  return parseScalar(trimmed);
}

/**
 * Parse a block mapping (object).
 * @param {Object} ctx - Parser context
 * @param {number} indent - Expected indentation
 * @returns {Object} Parsed object
 */
function parseBlockMapping(ctx, indent) {
  const result = {};

  while (ctx.pos < ctx.lines.length) {
    skipBlanks(ctx);
    if (ctx.pos >= ctx.lines.length) break;

    const line = ctx.lines[ctx.pos];
    const curIndent = lineIndent(line);
    if (curIndent < indent) break;
    if (curIndent > indent && indent >= 0) break;

    const trimmed = stripComment(line).trim();
    if (!trimmed) { ctx.pos++; continue; }

    // Must be a key: value line
    const colonIdx = findMappingColon(trimmed);
    if (colonIdx === -1) break;

    const key = trimmed.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '');
    const rawValue = trimmed.slice(colonIdx + 1).trim();

    if (rawValue === '' || rawValue === '|' || rawValue === '>') {
      // Multi-line block scalar or nested structure
      ctx.pos++;
      if (rawValue === '|') {
        result[key] = parseLiteralBlock(ctx, curIndent);
      } else if (rawValue === '>') {
        result[key] = parseFoldedBlock(ctx, curIndent);
      } else {
        result[key] = parseNode(ctx, curIndent);
      }
    } else if (rawValue.startsWith('{')) {
      result[key] = parseFlowMapping(rawValue);
      ctx.pos++;
    } else if (rawValue.startsWith('[')) {
      result[key] = parseFlowSequence(rawValue);
      ctx.pos++;
    } else {
      result[key] = parseScalar(rawValue);
      ctx.pos++;
    }
  }

  return result;
}

/**
 * Parse a block sequence (array).
 * @param {Object} ctx - Parser context
 * @param {number} indent - Expected indentation
 * @returns {Array} Parsed array
 */
function parseBlockSequence(ctx, indent) {
  const result = [];

  while (ctx.pos < ctx.lines.length) {
    skipBlanks(ctx);
    if (ctx.pos >= ctx.lines.length) break;

    const line = ctx.lines[ctx.pos];
    const curIndent = lineIndent(line);
    if (curIndent < indent) break;
    if (curIndent > indent) break;

    const trimmed = stripComment(line).trim();
    if (!trimmed.startsWith('-')) break;

    const after = trimmed.slice(1).trim();

    if (after === '' || after === '|' || after === '>') {
      ctx.pos++;
      if (after === '|') {
        result.push(parseLiteralBlock(ctx, curIndent));
      } else if (after === '>') {
        result.push(parseFoldedBlock(ctx, curIndent));
      } else {
        result.push(parseNode(ctx, curIndent));
      }
    } else if (after.includes(':')) {
      // Inline mapping as sequence item: "- key: value"
      // Rewrite the line without the dash and parse as mapping
      const itemIndent = curIndent + 2;
      const saved = ctx.lines[ctx.pos];
      ctx.lines[ctx.pos] = ' '.repeat(itemIndent) + after;
      result.push(parseBlockMapping(ctx, itemIndent));
      // Restore in case we need to re-read (shouldn't, but safe)
      if (ctx.pos < ctx.lines.length) {
        // no-op, pos already advanced
      }
    } else if (after.startsWith('{')) {
      result.push(parseFlowMapping(after));
      ctx.pos++;
    } else if (after.startsWith('[')) {
      result.push(parseFlowSequence(after));
      ctx.pos++;
    } else {
      result.push(parseScalar(after));
      ctx.pos++;
    }
  }

  return result;
}

/**
 * Parse a flow mapping: { key: value, key2: value2 }
 * @param {string} str - Flow mapping string
 * @returns {Object} Parsed object
 */
function parseFlowMapping(str) {
  const inner = str.slice(1, str.lastIndexOf('}')).trim();
  if (!inner) return {};
  const result = {};
  for (const pair of splitFlow(inner)) {
    const colonIdx = pair.indexOf(':');
    if (colonIdx === -1) continue;
    const key = pair.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '');
    const val = pair.slice(colonIdx + 1).trim();
    result[key] = parseScalar(val);
  }
  return result;
}

/**
 * Parse a flow sequence: [ val1, val2, val3 ]
 * @param {string} str - Flow sequence string
 * @returns {Array} Parsed array
 */
function parseFlowSequence(str) {
  const inner = str.slice(1, str.lastIndexOf(']')).trim();
  if (!inner) return [];
  return splitFlow(inner).map(item => parseScalar(item.trim()));
}

/**
 * Split flow collection items respecting nested braces/brackets.
 * @param {string} str - Inner content of flow collection
 * @returns {string[]} Split items
 */
function splitFlow(str) {
  const items = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
    if ((ch === '{' || ch === '[') ) depth++;
    if ((ch === '}' || ch === ']') ) depth--;
    if (ch === ',' && depth === 0) {
      items.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) items.push(current);
  return items;
}

/**
 * Parse a literal block scalar (|).
 * @param {Object} ctx - Parser context
 * @param {number} parentIndent - Parent indentation
 * @returns {string} Block content
 */
function parseLiteralBlock(ctx, parentIndent) {
  const lines = [];
  let blockIndent = -1;
  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos];
    const curIndent = lineIndent(line);
    const trimmed = line.trim();
    if (trimmed === '') {
      lines.push('');
      ctx.pos++;
      continue;
    }
    if (curIndent <= parentIndent) break;
    if (blockIndent === -1) blockIndent = curIndent;
    lines.push(line.slice(blockIndent));
    ctx.pos++;
  }
  // Trim trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n') + '\n';
}

/**
 * Parse a folded block scalar (>).
 * @param {Object} ctx - Parser context
 * @param {number} parentIndent - Parent indentation
 * @returns {string} Folded content
 */
function parseFoldedBlock(ctx, parentIndent) {
  const lines = [];
  let blockIndent = -1;
  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos];
    const curIndent = lineIndent(line);
    const trimmed = line.trim();
    if (trimmed === '') {
      lines.push('');
      ctx.pos++;
      continue;
    }
    if (curIndent <= parentIndent) break;
    if (blockIndent === -1) blockIndent = curIndent;
    lines.push(line.slice(blockIndent));
    ctx.pos++;
  }
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join(' ').replace(/  +/g, ' ').trim() + '\n';
}

/**
 * Parse a scalar value string into a JS value.
 * @param {string} str - Raw scalar string
 * @returns {*} Parsed value
 */
function parseScalar(str) {
  if (str === '' || str === '~' || str === 'null' || str === 'Null' || str === 'NULL') return null;
  if (str === 'true' || str === 'True' || str === 'TRUE') return true;
  if (str === 'false' || str === 'False' || str === 'FALSE') return false;

  // Quoted string
  if ((str.startsWith('"') && str.endsWith('"')) ||
      (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }

  // Number
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    const n = Number(str);
    if (!Number.isNaN(n)) return n;
  }

  // Hex, octal, infinity
  if (/^0x[0-9a-fA-F]+$/.test(str)) return parseInt(str, 16);
  if (/^0o[0-7]+$/.test(str)) return parseInt(str.slice(2), 8);
  if (str === '.inf' || str === '.Inf') return Infinity;
  if (str === '-.inf' || str === '-.Inf') return -Infinity;
  if (str === '.nan' || str === '.NaN') return NaN;

  return str;
}

/**
 * Get indentation level of a line.
 * @param {string} line - Source line
 * @returns {number} Number of leading spaces
 */
function lineIndent(line) {
  const match = line.match(/^( *)/);
  return match ? match[1].length : 0;
}

/**
 * Strip inline comment from a line (respecting quoted strings).
 * @param {string} line - Source line
 * @returns {string} Line without comment
 */
function stripComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (ch === '#' && !inSingle && !inDouble) {
      // Must be preceded by whitespace to be a comment
      if (i === 0 || line[i - 1] === ' ' || line[i - 1] === '\t') {
        return line.slice(0, i);
      }
    }
  }
  return line;
}

/**
 * Skip blank and comment-only lines.
 * @param {Object} ctx - Parser context
 */
function skipBlanks(ctx) {
  while (ctx.pos < ctx.lines.length) {
    const trimmed = ctx.lines[ctx.pos].trim();
    if (trimmed === '' || trimmed.startsWith('#') || trimmed === '---' || trimmed === '...') {
      ctx.pos++;
    } else {
      break;
    }
  }
}

/**
 * Find the colon that separates key from value in a mapping line.
 * Skips colons inside quoted strings and colons that are part of values
 * (e.g., "http://example.com").
 * @param {string} line - Trimmed line
 * @returns {number} Index of mapping colon, or -1
 */
function findMappingColon(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (ch === ':' && !inSingle && !inDouble) {
      // Mapping colon must be followed by space, newline, or end of string
      if (i + 1 >= line.length || line[i + 1] === ' ' || line[i + 1] === '\t') {
        return i;
      }
    }
  }
  return -1;
}
