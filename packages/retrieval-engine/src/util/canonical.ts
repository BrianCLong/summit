import stringify from 'fast-json-stable-stringify';
import crypto from 'crypto';

export function canonicalize(obj: any): string {
  return stringify(obj);
}

export function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
