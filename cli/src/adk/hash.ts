import { createHash } from 'node:crypto';

export function hashBytes(input: Buffer | string): string {
  return createHash('sha256').update(input).digest('hex');
}
