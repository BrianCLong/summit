import * as crypto from 'crypto';

export function hashObject(obj: any): string {
  const json = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('sha256').update(json).digest('hex').substring(0, 16);
}
