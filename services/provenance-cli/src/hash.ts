import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { canonicalString } from './canonicalize.js';

export function sha256(data: string | Buffer): string {
  const hash = createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

export function hashJson(value: unknown): string {
  return sha256(Buffer.from(canonicalString(value), 'utf8'));
}

export function hashFile(path: string): string {
  return sha256(readFileSync(path));
}
