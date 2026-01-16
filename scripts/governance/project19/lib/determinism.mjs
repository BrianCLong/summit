/**
 * Determinism Utilities
 * Provides stable, reproducible operations that produce the same results across runs
 */

import crypto from 'crypto';

/**
 * Stable sort an array by a specific property
 */
function stableSort(array, compareFn) {
  // Add original index to maintain stability
  const indexedArray = array.map((item, index) => ({ item, index }));
  
  indexedArray.sort((a, b) => {
    const comparison = compareFn(a.item, b.item);
    if (comparison !== 0) return comparison;
    // If items are equal, maintain original order
    return a.index - b.index;
  });
  
  return indexedArray.map(({ item }) => item);
}

/**
 * Sort strings in lexicographic order (stable)
 */
function sortStrings(strings) {
  return stableSort(strings, (a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
}

/**
 * Sort objects by multiple properties (stable)
 */
function sortByMultipleProperties(array, properties) {
  return stableSort(array, (a, b) => {
    for (const propDesc of properties) {
      const [prop, direction] = Array.isArray(propDesc) ? propDesc : [propDesc, 'asc'];
      const aVal = a[prop];
      const bVal = b[prop];
      
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      
      if (direction === 'desc') comparison = -comparison;
      if (comparison !== 0) return comparison;
    }
    return 0;
  });
}

/**
 * Generate stable hash for an object (order-independent but deterministic)
 */
function stableHash(obj) {
  const canonicalStr = stringifyCanonical(obj);
  return crypto.createHash('sha256').update(canonicalStr).digest('hex');
}

/**
 * Stringify an object in canonical (sorted) order
 */
function stringifyCanonical(obj) {
  if (obj === null) return 'null';
  if (typeof obj === 'undefined') return 'undefined';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  
  if (Array.isArray(obj)) {
    return '[' + obj.map(stringifyCanonical).join(',') + ']';
  }
  
  const sortedKeys = Object.keys(obj).sort();
  const keyValuePairs = sortedKeys.map(key => 
    JSON.stringify(key) + ':' + stringifyCanonical(obj[key])
  );
  
  return '{' + keyValuePairs.join(',') + '}';
}

/**
 * Sort object keys (to ensure consistent order for hashing/stringification)
 */
function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  
  const sortedObj = {};
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    sortedObj[key] = sortObjectKeys(obj[key]);
  }
  
  return sortedObj;
}

/**
 * Create a stable ID from components
 */
function stableId(components) {
  const canonicalStr = components.map(c => String(c)).sort().join('|');
  return crypto.createHash('sha256').update(canonicalStr).digest('hex').slice(0, 16);
}

/**
 * Deep equals with consistent ordering
 */
function deepEquals(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEquals(a[i], b[i])) return false;
      }
      return true;
    }
    
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    
    if (aKeys.length !== bKeys.length) return false;
    
    for (let i = 0; i < aKeys.length; i++) {
      const key = aKeys[i];
      if (key !== bKeys[i]) return false;
      if (!deepEquals(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false; // Different primitive values
}

export {
  stableSort,
  sortStrings,
  sortByMultipleProperties,
  stableHash,
  stableId,
  sortObjectKeys,
  deepEquals,
  stringifyCanonical
};