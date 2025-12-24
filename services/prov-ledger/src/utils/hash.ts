// @ts-nocheck
import crypto from 'crypto';

export function canonicalJSON(obj: any): string {
  if (obj === undefined) { return 'undefined'; }
  if (obj === null) { return 'null'; }

  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalJSON(item)).join(',') + ']';
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(key => {
      const val = obj[key];
      return JSON.stringify(key) + ':' + canonicalJSON(val);
    }).join(',') + '}';
  }

  return JSON.stringify(obj);
}

export function calculateHash(data: any): string {
  return crypto.createHash('sha256').update(canonicalJSON(data)).digest('hex');
}
