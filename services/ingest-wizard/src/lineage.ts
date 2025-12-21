import crypto from 'crypto';

export type Lineage = { source: string; steps: string[]; sha256: string };

export function lineageFor(buf: Buffer, steps: string[], source: string): Lineage {
  if (!Buffer.isBuffer(buf) || buf.length === 0) throw new Error('empty_payload');
  const normalizedSteps = Array.from(new Set(steps));
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  return { source, steps: normalizedSteps, sha256: sha };
}
