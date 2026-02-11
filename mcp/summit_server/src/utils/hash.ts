import { createHash } from 'crypto';
import type { JsonValue } from './stable-json.js';
import { stableStringify } from './stable-json.js';

export const hashJson = (value: JsonValue): string => {
  const hash = createHash('sha256');
  hash.update(stableStringify(value));
  return hash.digest('hex');
};
