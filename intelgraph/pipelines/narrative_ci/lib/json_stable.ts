export function stableStringify(obj: any): string {
  if (typeof obj !== 'object' || obj === null) {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const parts = keys.map(key => JSON.stringify(key) + ':' + stableStringify(obj[key]));
  return '{' + parts.join(',') + '}';
}
