import * as crypto from 'crypto';
import { stableStringify } from './json_stable.js';

export function contentHash(data: any): string {
  const str = typeof data === 'string' ? data : stableStringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}
