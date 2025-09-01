import { createHash } from 'node:crypto';
export function sha256(data: string | Uint8Array) {
  return createHash('sha256').update(data).digest('hex');
}
