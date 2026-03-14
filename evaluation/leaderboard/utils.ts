export function deterministicStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(item => deterministicStringify(item)).join(',') + ']';
  }

  const keys = Object.keys(obj).sort();
  const keyVals = keys.map(k => JSON.stringify(k) + ':' + deterministicStringify(obj[k]));
  return '{' + keyVals.join(',') + '}';
}
