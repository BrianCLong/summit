import crypto from 'crypto';

export type Lineage = { source: string; steps: string[]; sha256: string };

export function lineageFor(buf: Buffer, steps: string[], source: string): Lineage {
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  return { source, steps, sha256: sha };
}
