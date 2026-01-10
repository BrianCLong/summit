import { createHash } from 'node:crypto';

export function stableHash(buffers: Buffer[]): string {
  const h = createHash('sha256');
  buffers.forEach(b => h.update(b));
  return `sha256:${h.digest('hex')}`;
}

export function hashString(str: string): string {
  return stableHash([Buffer.from(str)]);
}
