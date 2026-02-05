import crypto from 'crypto';
import { stableStringify } from './stableJson';

export function hashObject(value: unknown): string {
  const serialized = stableStringify(value, 0);
  return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
}

export function hashString(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}
