import { createHash } from 'crypto';

export type EvidenceId = string; // ev:<kind>:<hash12>

export function evId(kind: string, stable: string): EvidenceId {
  const hash = createHash('sha256').update(stable).digest('hex');
  return `ev:${kind}:${hash.substring(0, 12)}`;
}
