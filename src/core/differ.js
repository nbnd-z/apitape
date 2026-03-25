/**
 * @fileoverview JSON diff utility for detecting API drift
 * @module core/differ
 */

/**
 * @typedef {Object} DiffResult
 * @property {Array<{path: string, type: string}>} added - Added fields
 * @property {Array<{path: string, type: string}>} removed - Removed fields
 * @property {Array<{path: string, oldType: string, newType: string}>} changed - Type changes
 * @property {'fresh'|'drifted'|'breaking'} status - Overall status
 */

/**
 * Get the type of a value
 * @param {*} value - Value to check
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
 * Compare two values and detect differences
 * @param {*} oldObj - Original value
 * @param {*} newObj - New value
 * @param {string} path - Current path
 * @param {DiffResult} result - Result accumulator
 */
function compareValues(oldObj, newObj, path, result) {
  const oldType = getType(oldObj);
  const newType = getType(newObj);

  // Type changed
  if (oldType !== newType) {
    result.changed.push({
      path,
      oldType,
      newType
    });
    if (isBreakingChange(oldType, newType)) {
      result.status = 'breaking';
    } else if (result.status === 'fresh') {
      result.status = 'drifted';
    }
    return;
  }

  // Both are objects - compare recursively
  if (oldType === 'object' && newObj !== null) {
    compareObjects(oldObj, newObj, path, result);
    return;
  }

  // Both are arrays - compare items
  if (oldType === 'array') {
    compareArrays(oldObj, newObj, path, result);
    return;
  }

  // Primitive types - check for value changes
  if (oldObj !== newObj) {
    result.changed.push({
      path,
      oldType,
      newType,
      oldValue: oldObj,
      newValue: newObj
    });
    // Value changes are not breaking, just drifted
    if (result.status === 'fresh') {
      result.status = 'drifted';
    }
  }
}

/**
 * Check if a type change is breaking
 * @param {string} oldType - Old type
 * @param {string} newType - New type
 * @returns {boolean} Whether the change is breaking
 */
function isBreakingChange(oldType, newType) {
  // Removing or changing to null is breaking
  if (newType === 'undefined' || newType === 'null') return true;
  if (oldType === 'undefined') return false; // Adding new field is not breaking
  
  // Changing from array to object or vice versa is breaking
  if ((oldType === 'array' && newType === 'object') ||
      (oldType === 'object' && newType === 'array')) {
    return true;
  }
  
  // Changing primitive types
  const primitives = ['string', 'number', 'boolean'];
  if (primitives.includes(oldType) && !primitives.includes(newType)) {
    return true;
  }
  
  return false;
}

/**
 * Compare two objects recursively
 * @param {Object} oldObj - Original object
 * @param {Object} newObj - New object
 * @param {string} path - Current path
 * @param {DiffResult} result - Result accumulator
 */
function compareObjects(oldObj, newObj, path, result) {
  const oldKeys = Object.keys(oldObj || {});
  const newKeys = Object.keys(newObj || {});
  const allKeys = new Set([...oldKeys, ...newKeys]);

  for (const key of allKeys) {
    const keyPath = path ? `${path}.${key}` : key;
    const oldHas = oldKeys.includes(key);
    const newHas = newKeys.includes(key);

    if (!oldHas && newHas) {
      // Added field
      result.added.push({
        path: keyPath,
        type: getType(newObj[key])
      });
      if (result.status === 'fresh') {
        result.status = 'drifted';
      }
    } else if (oldHas && !newHas) {
      // Removed field
      result.removed.push({
        path: keyPath,
        type: getType(oldObj[key])
      });
      result.status = 'breaking';
    } else {
      // Compare values
      compareValues(oldObj[key], newObj[key], keyPath, result);
    }
  }
}

/**
 * Compare two arrays
 * @param {Array} oldArr - Original array
 * @param {Array} newArr - New array
 * @param {string} path - Current path
 * @param {DiffResult} result - Result accumulator
 */
function compareArrays(oldArr, newArr, path, result) {
  // Compare first few items for structure
  const maxCompare = Math.min(
    Math.max(oldArr?.length || 0, newArr?.length || 0),
    5
  );

  for (let i = 0; i < maxCompare; i++) {
    const itemPath = `${path}[${i}]`;
    if (i >= (oldArr?.length || 0)) {
      // New item added
      result.added.push({
        path: itemPath,
        type: getType(newArr[i])
      });
      if (result.status === 'fresh') {
        result.status = 'drifted';
      }
    } else if (i >= (newArr?.length || 0)) {
      // Item removed
      result.removed.push({
        path: itemPath,
        type: getType(oldArr[i])
      });
      result.status = 'breaking';
    } else {
      compareValues(oldArr[i], newArr[i], itemPath, result);
    }
  }
}

/**
 * Diff two JSON objects
 * @param {Object|string} oldObj - Original JSON (object or string)
 * @param {Object|string} newObj - New JSON (object or string)
 * @returns {DiffResult} Diff result
 */
export function diffObjects(oldObj, newObj) {
  // Parse if strings
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

  const result = {
    added: [],
    removed: [],
    changed: [],
    status: 'fresh'
  };

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

    if (diff.changed.length > 0) {
      lines.push(`  Type changes (${diff.changed.length}):`);
      for (const item of diff.changed) {
        lines.push(`    ! ${item.path}: ${item.oldType} → ${item.newType} (TYPE_CHANGED)`);
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