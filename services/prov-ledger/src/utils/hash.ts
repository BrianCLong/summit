import crypto from 'crypto';

export function canonicalJSON(obj: any): string {
  if (Buffer.isBuffer(obj)) {
    return obj.toString('base64');
  }

  if (obj === undefined) return 'undefined';
  if (obj === null) return 'null';

  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalJSON(item)).join(',') + ']';
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    return (
      '{' +
      keys
        .map((key) => {
          const val = obj[key];
          return JSON.stringify(key) + ':' + canonicalJSON(val);
        })
        .join(',') +
      '}'
    );
  }

  return JSON.stringify(obj);
}

export function calculateHash(data: any): string {
  const normalized = typeof data === 'string' || Buffer.isBuffer(data) ? data : canonicalJSON(data);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
