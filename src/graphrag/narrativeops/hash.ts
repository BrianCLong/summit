import crypto from 'node:crypto';

/**
 * Deterministic SHA-256 hex hash.
 * Never include timestamps or nondeterministic fields in inputs.
 */
export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}
