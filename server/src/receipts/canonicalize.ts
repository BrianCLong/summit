
/**
 * Prepares a value for canonicalization by normalizing whitespace in strings.
 */
function prepare(value: any): any {
  if (value === null) return null;
  if (value instanceof Date) return value; // Pass through Date objects
  if (typeof value === 'string') return value.trim();
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(prepare);

  const newObj: Record<string, any> = {};
  for (const key of Object.keys(value)) {
    // Also trim keys for consistency
    newObj[key.trim()] = prepare(value[key]);
  }
  return newObj;
}

/**
 * Deterministically stringifies a value.
 * - Sorts object keys.
 * - Uses JSON.stringify for strings (to handle escaping).
 * - Recursively processes arrays and objects.
 */
function stableStringify(value: any): string {
  if (value === null) return 'null';
  if (typeof value === 'undefined') return '';
  if (typeof value === 'number') return isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  // Date objects should be treated as strings if possible, or ISO string.
  // Standard JSON.stringify converts dates to strings.
  if (value instanceof Date) return JSON.stringify(value);

  if (Array.isArray(value)) {
    const items = value.map((item) => stableStringify(item) || 'null');
    return '[' + items.join(',') + ']';
  }

  if (typeof value === 'object') {
    // ToJSON support? Standard JSON.stringify checks for toJSON.
    if (typeof value.toJSON === 'function') {
        return stableStringify(value.toJSON());
    }

    const keys = Object.keys(value).sort();
    const parts: string[] = [];
    for (const key of keys) {
      const val = value[key];
      // JSON.stringify skips undefined values in objects
      if (val !== undefined) {
        const strVal = stableStringify(val);
        if (strVal) {
          parts.push(JSON.stringify(key) + ':' + strVal);
        }
      }
    }
    return '{' + parts.join(',') + '}';
  }

  return '';
}

/**
 * Canonicalizes a receipt object for deterministic hashing.
 *
 * 1. Normalizes whitespace in strings (trims).
 * 2. Sorts keys.
 * 3. Deterministically serializes to JSON.
 */
export function canonicalize(obj: any): string {
  return stableStringify(prepare(obj));
}
