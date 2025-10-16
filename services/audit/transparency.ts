import { sha256 } from 'crypto';
export function entry(evt: any, prev: string) {
  const now = Date.now();
  const data = JSON.stringify({ evt, now });
  const hash = sha256(prev + data);
  return { now, hash, data };
}
