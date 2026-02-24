/**
 * Recursively sorts object keys to ensure deterministic serialization.
 */
export function sortKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }
  return Object.keys(obj)
    .sort()
    .reduce((result: any, key) => {
      result[key] = sortKeys(obj[key]);
      return result;
    }, {});
}

/**
 * Serializes an object to a canonical JSON string.
 * Uses JSON.stringify with sorted keys.
 * Returns empty string for null/undefined.
 */
export function canonicalJson(obj: any): string {
  if (obj === null || obj === undefined) {
    return '';
  }
  // Ensure we sort keys before stringifying
  const sorted = sortKeys(obj);
  // strict formatting? JSON.stringify is usually sufficient if keys are sorted.
  // The prompt asked for specific separators for Python (json.dumps),
  // but for Node, standard stringify on sorted object is standard.
  return JSON.stringify(sorted);
}

/**
 * Creates the canonical string for a sanity card item.
 * Format: id||payload||metadata
 */
export function createCanonicalString(id: string, payload: any, metadata: any): string {
  const p = canonicalJson(payload);
  const m = canonicalJson(metadata);
  return `${id}||${p}||${m}`;
}
