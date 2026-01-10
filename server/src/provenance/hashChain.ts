import * as crypto from 'crypto';
import { ProvenanceEntry } from './types.js';

export interface HashChainOptions {
  enabled?: boolean;
}

/**
 * Computes the hash of a provenance entry.
 *
 * If options.enabled is true (or env PROVENANCE_HASHCHAIN_ENABLED is true),
 * it uses the "v2" chaining:
 *   hash = sha256(previousHash + sha256(content))
 *
 * Otherwise, it uses the legacy "v1" chaining:
 *   hash = sha256(JSON.stringify({ ...entry, previousHash }))
 *
 * @param entry The entry to hash
 * @param previousHash The hash of the previous entry in the chain
 * @param options Configuration for hash generation
 */
export function computeEntryHash(
  entry: Partial<ProvenanceEntry>,
  previousHash: string,
  options: HashChainOptions = {}
): string {
  // Determine if hash chaining v2 is enabled.
  // Priority: options.enabled -> env var -> default (false)
  const isEnabled = options.enabled !== undefined
    ? options.enabled
    : process.env.PROVENANCE_HASHCHAIN_ENABLED === 'true';

  if (isEnabled) {
    // New Scheme: prev_hash + hash(entry)
    // We strictly separate the chain link from the content

    // 1. Hash the content (excluding chain fields)
    const contentToHash = { ...entry };

    // Remove fields that are part of the chain structure or generated after hashing
    delete (contentToHash as any).previousHash;
    delete (contentToHash as any).currentHash;
    delete (contentToHash as any).id;
    delete (contentToHash as any).sequenceNumber;

    // Sort keys for deterministic JSON serialization
    const contentJson = JSON.stringify(contentToHash, Object.keys(contentToHash).sort());
    const contentHash = crypto.createHash('sha256').update(contentJson).digest('hex');

    // 2. Compute final hash: hash(prevHash + contentHash)
    return crypto.createHash('sha256').update(previousHash + contentHash).digest('hex');
  } else {
    // Legacy Scheme (compatible with existing ledger.ts behavior)

    const hashData = {
      id: entry.id,
      tenantId: entry.tenantId,
      sequenceNumber: entry.sequenceNumber?.toString(),
      previousHash: previousHash, // Explicitly use the passed previousHash
      timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
      actionType: entry.actionType,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      actorId: entry.actorId,
      actorType: entry.actorType,
      payload: entry.payload,
      metadata: entry.metadata,
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashData, Object.keys(hashData).sort()))
      .digest('hex');
  }
}
