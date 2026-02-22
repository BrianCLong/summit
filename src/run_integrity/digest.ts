import { createHash } from 'crypto';
import { createCanonicalString } from './canonicalize';

/**
 * Computes the SHA-256 digest of a sanity card item.
 */
export function computeItemDigest(id: string, payload: any, metadata: any): string {
  const canonical = createCanonicalString(id, payload, metadata);
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Computes the aggregate digest of a list of item digests.
 * The list is sorted, joined, and hashed.
 */
export function computeAggregateDigest(digests: string[]): string {
  // Sort digests to ensure order independence of the input list
  const sorted = [...digests].sort();
  const joined = sorted.join('');
  return createHash('sha256').update(joined).digest('hex');
}
