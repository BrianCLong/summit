/**
 * Deterministically stringify a JSON object by sorting keys.
 * Essential for cryptographic signing of payloads.
 */
export function stableStringify(obj: any): string {
  if (obj === undefined) return '';
  if (obj === null) return 'null';

  // Primitives
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  // Arrays: recurse but don't sort
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }

  // Objects: sort keys
  const sortedKeys = Object.keys(obj).sort();
  const parts = sortedKeys.map(key => {
    const val = obj[key];
    // JSON.stringify omits undefined values in objects
    if (val === undefined) return null;
    return JSON.stringify(key) + ':' + stableStringify(val);
  }).filter(part => part !== null);

  return '{' + parts.join(',') + '}';
}
