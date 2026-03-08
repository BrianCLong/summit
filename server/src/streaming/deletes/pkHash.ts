import { createHash } from 'crypto';

export function stablePkJson(key: Record<string, any>): string {
  // Sort keys to ensure deterministic JSON string
  const sortedKeys = Object.keys(key).sort();
  const sortedObj: Record<string, any> = {};
  for (const k of sortedKeys) {
    sortedObj[k] = key[k];
  }
  return JSON.stringify(sortedObj);
}

export function computePkHash(pkJson: string): string {
  return createHash('sha256').update(pkJson).digest('hex');
}
