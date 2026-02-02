export function stableStringify(obj: any): string {
  if (obj === undefined) return '';
  if (obj === null) return 'null';

  if (typeof obj !== 'object' || obj === null) {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }

  const keys = Object.keys(obj).sort();
  const parts = keys.map(key => {
    const val = stableStringify(obj[key]);
    if (val === '') return null; // JSON.stringify omits undefined properties
    return JSON.stringify(key) + ':' + val;
  }).filter(x => x !== null);

  return '{' + parts.join(',') + '}';
}
