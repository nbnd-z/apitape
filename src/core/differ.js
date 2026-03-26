/**
 * @fileoverview JSON diff utility for detecting API drift
 * @module core/differ
 */

import { createHash } from 'crypto';

/** @type {number} Configurable array sample size for comparison */
let _arraySampleSize = 5;

/**
 * Set the array sample size for diff comparison
 * @param {number} size
 */
export function setDiffArraySampleSize(size) {
  _arraySampleSize = size;
}

/**
 * @typedef {Object} DiffResult
 * @property {Array<{path: string, type: string}>} added - Added fields
 * @property {Array<{path: string, type: string}>} removed - Removed fields
 * @property {Array<{path: string, oldType: string, newType: string}>} typeChanged - Type changes
 * @property {Array<{path: string, oldValue: *, newValue: *}>} valueChanged - Value changes (same type)
 * @property {'fresh'|'drifted'|'breaking'} status - Overall status
 */

/**
 * Get the type of a value
 * @param {*} value
 * @returns {string} Type name
 */
function getType(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  const type = typeof value;
  if (type === 'object') return 'object';
  return type;
}

/**
 * Compute a hash of a JSON-serializable value
 * @param {*} value
 * @returns {string}
 */
export function hashValue(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

/**
 * Compare two values and detect differences
 */
function compareValues(oldObj, newObj, path, result) {
  const oldType = getType(oldObj);
  const newType = getType(newObj);

  if (oldType !== newType) {
    result.typeChanged.push({ path, oldType, newType });
    if (isBreakingChange(oldType, newType)) {
      result.status = 'breaking';
    } else if (result.status === 'fresh') {
      result.status = 'drifted';
    }
    return;
  }

  if (oldType === 'object' && newObj !== null) {
    compareObjects(oldObj, newObj, path, result);
    return;
  }

  if (oldType === 'array') {
    compareArrays(oldObj, newObj, path, result);
    return;
  }

  if (oldObj !== newObj) {
    result.valueChanged.push({ path, type: oldType, oldValue: oldObj, newValue: newObj });
    if (result.status === 'fresh') {
      result.status = 'drifted';
    }
  }
}

function isBreakingChange(oldType, newType) {
  if (newType === 'undefined' || newType === 'null') return true;
  if (oldType === 'undefined') return false;
  if ((oldType === 'array' && newType === 'object') ||
      (oldType === 'object' && newType === 'array')) {
    return true;
  }
  const primitives = ['string', 'number', 'boolean'];
  if (primitives.includes(oldType) && !primitives.includes(newType)) {
    return true;
  }
  return false;
}

function compareObjects(oldObj, newObj, path, result) {
  const oldKeys = Object.keys(oldObj || {});
  const newKeys = Object.keys(newObj || {});
  const allKeys = new Set([...oldKeys, ...newKeys]);

  for (const key of allKeys) {
    const keyPath = path ? `${path}.${key}` : key;
    const oldHas = oldKeys.includes(key);
    const newHas = newKeys.includes(key);

    if (!oldHas && newHas) {
      result.added.push({ path: keyPath, type: getType(newObj[key]) });
      if (result.status === 'fresh') result.status = 'drifted';
    } else if (oldHas && !newHas) {
      result.removed.push({ path: keyPath, type: getType(oldObj[key]) });
      result.status = 'breaking';
    } else {
      compareValues(oldObj[key], newObj[key], keyPath, result);
    }
  }
}

function compareArrays(oldArr, newArr, path, result) {
  const maxCompare = Math.min(
    Math.max(oldArr?.length || 0, newArr?.length || 0),
    _arraySampleSize
  );

  for (let i = 0; i < maxCompare; i++) {
    const itemPath = `${path}[${i}]`;
    if (i >= (oldArr?.length || 0)) {
      result.added.push({ path: itemPath, type: getType(newArr[i]) });
      if (result.status === 'fresh') result.status = 'drifted';
    } else if (i >= (newArr?.length || 0)) {
      result.removed.push({ path: itemPath, type: getType(oldArr[i]) });
      result.status = 'breaking';
    } else {
      compareValues(oldArr[i], newArr[i], itemPath, result);
    }
  }
}

/**
 * Diff two JSON objects
 * @param {Object|string} oldObj - Original JSON
 * @param {Object|string} newObj - New JSON
 * @returns {DiffResult} Diff result
 */
export function diffObjects(oldObj, newObj) {
  let oldData, newData;
  try {
    oldData = typeof oldObj === 'string' ? JSON.parse(oldObj) : oldObj;
  } catch (error) {
    throw new Error(`Failed to parse old value as JSON: ${error.message}`);
  }
  try {
    newData = typeof newObj === 'string' ? JSON.parse(newObj) : newObj;
  } catch (error) {
    throw new Error(`Failed to parse new value as JSON: ${error.message}`);
  }

  // Quick hash check for identical objects
  if (hashValue(oldData) === hashValue(newData)) {
    return { added: [], removed: [], typeChanged: [], valueChanged: [], status: 'fresh' };
  }

  const result = { added: [], removed: [], typeChanged: [], valueChanged: [], status: 'fresh' };
  compareValues(oldData, newData, '', result);
  return result;
}

/**
 * Format diff result for display
 * @param {DiffResult} diff - Diff result
 * @returns {string} Formatted output
 */
export function formatDiffResult(diff) {
  const lines = [];

  if (diff.status === 'fresh') {
    lines.push('✓ No changes detected');
  } else {
    if (diff.added.length > 0) {
      lines.push(`  Added fields (${diff.added.length}):`);
      for (const item of diff.added) {
        lines.push(`    + ${item.path}: ${item.type} (NEW)`);
      }
    }

    if (diff.removed.length > 0) {
      lines.push(`  Removed fields (${diff.removed.length}):`);
      for (const item of diff.removed) {
        lines.push(`    - ${item.path}: ${item.type} (REMOVED)`);
      }
    }

    if (diff.typeChanged.length > 0) {
      lines.push(`  Type changes (${diff.typeChanged.length}):`);
      for (const item of diff.typeChanged) {
        lines.push(`    ! ${item.path}: ${item.oldType} → ${item.newType} (TYPE_CHANGED)`);
      }
    }

    if (diff.valueChanged.length > 0) {
      lines.push(`  Value changes (${diff.valueChanged.length}):`);
      for (const item of diff.valueChanged) {
        lines.push(`    ~ ${item.path}: ${item.oldValue} → ${item.newValue} (VALUE_CHANGED)`);
      }
    }

    if (diff.status === 'breaking') {
      lines.unshift('✗ Breaking changes detected:');
    } else {
      lines.unshift('⚠ Drift detected:');
    }
  }

  return lines.join('\n');
}
