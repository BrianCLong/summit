/**
 * Canonical JSON Serialization for Deterministic Output
 * Ensures consistent, reproducible JSON serialization across platforms and runs
 */

/**
 * Recursively sort object keys for canonical representation
 * @param {object} obj - Object to sort
 * @returns {object} - Object with keys sorted deterministically
 */
export function canonicalJsonSerialize(obj) {
  if (obj === null) return 'null';
  
  if (Array.isArray(obj)) {
    // For arrays, serialize each element using canonical serialization
    return '[' + obj.map(canonicalJsonSerialize).join(',') + ']';
  }
  
  if (typeof obj === 'object') {
    // Sort keys deterministically using codepoint comparison (not locale)
    const sortedKeys = Object.keys(obj).sort((a, b) => compareStringsCodepoint(a, b));
    const pairs = sortedKeys.map(key => {
      const value = canonicalJsonSerialize(obj[key]);
      // Quote the key and separate with colon without space for canonical format
      return `"${escapeJsonString(key)}":${value}`;
    });
    return '{' + pairs.join(',') + '}';
  }
  
  // For primitive types, use standard JSON serialization
  return JSON.stringify(obj);
}

/**
 * Deterministic string comparison using codepoint ordering (not locale-dependent)
 * Provides total order for cross-platform determinism
 * @param {string} a - First string 
 * @param {string} b - Second string
 * @returns {number} -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareStringsCodepoint(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Sort array of objects deterministically by a specific key
 * @param {Array} arr - Array of objects to sort
 * @param {string} key - Key to sort by
 * @returns {Array} - Sorted array
 */
export function sortArrayByKey(arr, key) {
  return [...arr].sort((a, b) => {
    const valA = a[key] !== undefined ? a[key] : '';
    const valB = b[key] !== undefined ? b[key] : '';
    return compareStringsCodepoint(String(valA), String(valB));
  });
}

/**
 * Escape string for JSON serialization
 * @param {string} str - String to escape
 * @returns {string} - JSON-escaped string
 */
function escapeJsonString(str) {
  if (typeof str !== 'string') {
    str = String(str);
  }
  return str
    .replace(/[\\]/g, '\\\\')
    .replace(/["]/g, '\\"')
    .replace(/[\b]/g, '\\b')
    .replace(/[\f]/g, '\\f') 
    .replace(/[\n]/g, '\\n')
    .replace(/[\r]/g, '\\r')
    .replace(/[\t]/g, '\\t');
}

/**
 * Stabilize object structure by applying canonical ordering recursively
 * @param {object} obj - Object to stabilize
 * @returns {object} - Stabilized object with canonical ordering
 */
export function stabilizeObjectStructure(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(stabilizeObjectStructure);
  }
  
  // Create new object with sorted keys
  const sorted = {};
  const keys = Object.keys(obj).sort(compareStringsCodepoint);
  
  for (const key of keys) {
    sorted[key] = stabilizeObjectStructure(obj[key]);
  }
  
  return sorted;
}