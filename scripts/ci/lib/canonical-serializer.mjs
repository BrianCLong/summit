/**
 * Canonical JSON Serializer
 * Ensures deterministic JSON output across platforms and runs
 */

/**
 * Recursively sort object keys for canonical output
 */
export function canonicalJsonStringify(obj) {
  if (obj === null) return 'null';
  
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  
  if (typeof obj === 'object') {
    // Sort keys in deterministic order
    const sortedKeys = Object.keys(obj).sort(compareStringsCodepoint);
    const pairs = sortedKeys.map(key => {
      const value = canonicalJsonStringify(obj[key]);
      return `"${key}":${value}`;
    });
    return '{' + pairs.join(',') + '}';
  }
  
  // Primitive types can be stringified normally
  return JSON.stringify(obj);
}

/**
 * Check if an object contains timestamp-like keys (but not values)
 */
export function hasTimestampKeys(obj) {
  if (obj === null || typeof obj !== 'object') return false;
  
  if (Array.isArray(obj)) {
    return obj.some(item => hasTimestampKeys(item));
  }
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('timestamp') || 
        lowerKey.includes('_time') || 
        lowerKey.includes('time_') ||
        lowerKey.includes('date') ||
        lowerKey.includes('created') ||
        lowerKey.includes('updated') ||
        lowerKey.includes('last_update') ||
        lowerKey === 'generated_at') {
      return true;
    }
    if (typeof value === 'object' && value !== null) {
      if (hasTimestampKeys(value)) return true;
    }
  }
  
  return false;
}

/**
 * Canonical array sorter with platform-stable ordering
 */
export function canonicalSort(arr, compareFn = compareStringsCodepoint) {
  return [...arr].sort(compareFn);
}

/**
 * Platform-stable path comparer
 */
export function stablePathCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new Error('Arguments must be strings');
  }
  
  // Use codepoint comparison for stability across locales
  return a === b ? 0 : a < b ? -1 : 1;
}

/**
 * Platform-stable string comparer for deterministic sorting.
 */
export function compareStringsCodepoint(a, b) {
  const left = String(a);
  const right = String(b);
  return left === right ? 0 : left < right ? -1 : 1;
}
