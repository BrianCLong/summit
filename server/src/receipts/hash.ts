import { createHash } from 'crypto';
import { canonicalize } from './canonicalize.js';

export const RECEIPT_HASH_ENABLED = false;

/**
 * Calculates a SHA-256 hash of the canonical representation of a receipt.
 * @param receipt The receipt object.
 * @returns The hex string of the SHA-256 hash.
 */
export function calculateReceiptHash(receipt: any): string {
  const canonical = canonicalize(receipt);
  return createHash('sha256').update(canonical).digest('hex');
}
