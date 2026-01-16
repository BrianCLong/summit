/**
 * Determinism Utilities
 * Provides stable, repeatable operations for governance system
 */

import crypto from 'crypto';

/**
 * Stable sort an array by a property (deterministic)
 */
function stableSort(array, compareFn) {
  // Add original index to maintain stable sort
  const indexedArray = array.map((item, index) => ({ item, index }));
  
  indexedArray.sort((a, b) => {
    const comparison = compareFn(a.item, b.item);
    if (comparison !== 0) {
      return comparison;
    }
    // If comparison is equal, maintain original order by index
    return a.index - b.index;
  });
  
  return indexedArray.map(({ item }) => item);
}

/**
 * Sort strings in lexicographic order (deterministic)
 */
function sortStrings(strings) {
  return stableSort(strings, (a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
}

/**
 * Sort objects by multiple properties (deterministic)
 */
function sortByMultipleProperties(array, properties) {
  return stableSort(array, (a, b) => {
    for (const prop of properties) {
      const [propertyName, direction] = Array.isArray(prop) ? prop : [prop, 'asc'];
      const aValue = a[propertyName];
      const bValue = b[propertyName];
      
      if (aValue !== undefined && bValue !== undefined) {
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }
        
        if (direction === 'desc') comparison = -comparison;
        if (comparison !== 0) return comparison;
      }
    }
    return 0;
  });
}

/**
 * Generate a stable hash for a string (deterministic)
 */
function stableHash(str) {
  // Create a hash from string input
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Sort object keys alphabetically (deterministic)
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
 * Generate a stable ID based on multiple parts
 */
function stableId(parts) {
  if (!Array.isArray(parts)) {
    parts = [parts];
  }
  
  // Ensure parts are sorted and joined consistently
  const sortedParts = sortStrings(parts.map(p => String(p)));
  const combined = sortedParts.join('|');
  
  return stableHash(combined).substring(0, 16);
}

/**
 * Deep equals comparison (deterministic)
 */
function deepEquals(obj1, obj2) {
  if (obj1 === obj2) return true;
  
  if (obj1 === null || obj2 === null) return obj1 === obj2;
  
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2;
  }
  
  const keys1 = Object.keys(sortObjectKeys(obj1)).sort();
  const keys2 = Object.keys(sortObjectKeys(obj2)).sort();
  
  if (keys1.length !== keys2.length) return false;
  
  for (let i = 0; i < keys1.length; i++) {
    const key = keys1[i];
    if (!deepEquals(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

/**
 * Deep clone an object (deterministic)
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Stable merge objects (later objects override earlier ones, but order is preserved)
 */
function stableMerge(...objects) {
  const result = {};
  
  for (const obj of objects) {
    if (obj) {
      const sortedKeys = Object.keys(obj).sort();
      for (const key of sortedKeys) result[key] = obj[key];
    }
  }
  
  return result;
}

/**
 * Compare two objects for stable equality (with sorted key order)
 */
function stableCompare(a, b) {
  const sortedA = sortObjectKeys(a);
  const sortedB = sortObjectKeys(b);
  return JSON.stringify(sortedA) === JSON.stringify(sortedB);
}

/**
 * Normalize string for consistent comparison
 */
function normalizeString(str) {
  if (typeof str !== 'string') return str;
  return str.toLowerCase().trim();
}

/**
 * Create deterministic ID from content
 */
function contentIdFromTitleAndLabels(title, labels) {
  const normalizedTitle = normalizeString(title || '');
  const normalizedLabels = (labels || []).map(normalizeString).sort();
  const combined = [normalizedTitle, ...normalizedLabels].join('|');
  return stableHash(combined);
}

export {
  stableSort,
  sortStrings,
  sortByMultipleProperties,
  stableHash,
  sortObjectKeys,
  stableId,
  deepEquals,
  deepClone,
  stableMerge,
  stableCompare,
  normalizeString,
  contentIdFromTitleAndLabels
};