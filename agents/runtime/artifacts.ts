import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { createHash } from 'crypto';

export function writeDeterministicJson(path: string, obj: any) {
  mkdirSync(dirname(path), { recursive: true });
  // JSON.stringify doesn't inherently sort keys, but we can do a replacer or sort at object construction time.
  // We'll use a replacer that sorts object keys recursively for determinism.
  const json = JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((sorted: any, k) => {
        sorted[k] = value[k];
        return sorted;
      }, {});
    }
    return value;
  }, 2);
  writeFileSync(path, json, 'utf8');
}

export function hashObject(obj: any): string {
  const json = JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((sorted: any, k) => {
        sorted[k] = value[k];
        return sorted;
      }, {});
    }
    return value;
  });
  return createHash('sha256').update(json).digest('hex');
}
