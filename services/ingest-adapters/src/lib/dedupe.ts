/**
 * Deduplication Key Computation
 *
 * Computes deterministic dedupe keys for idempotency using SHA-256.
 * Key format: sha256(tenant_id|source|entity.type|entity.id|revision.number)
 */

import { createHash } from 'crypto';
import type { IngestEnvelope, Entity, Revision } from '../types/index.js';

/**
 * Compute the dedupe key for an ingest record.
 *
 * @param tenantId - Tenant identifier
 * @param source - Source identifier (e.g., s3://bucket/path)
 * @param entity - Entity identification
 * @param revision - Revision metadata
 * @returns SHA-256 hash as hex string
 */
export function computeDedupeKey(
  tenantId: string,
  source: string,
  entity: Entity,
  revision: Revision
): string {
  const components = [
    tenantId,
    source,
    entity.type,
    entity.id,
    revision.number.toString(),
  ];

  const input = components.join('|');
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Compute dedupe key from an envelope.
 */
export function computeDedupeKeyFromEnvelope(envelope: Omit<IngestEnvelope, 'dedupe_key'>): string {
  return computeDedupeKey(
    envelope.tenant_id,
    envelope.ingest.source,
    envelope.entity,
    envelope.revision
  );
}

/**
 * Validate that an envelope's dedupe_key matches computed value.
 */
export function validateDedupeKey(envelope: IngestEnvelope): boolean {
  const computed = computeDedupeKeyFromEnvelope(envelope);
  return computed === envelope.dedupe_key;
}

/**
 * Compute content hash for data payload.
 * Used for detecting actual content changes vs metadata-only updates.
 */
export function computeContentHash(data: Record<string, unknown>): string {
  const normalized = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Compute file checksum for source file tracking.
 */
export async function computeFileChecksum(content: Buffer | string): Promise<string> {
  const hash = createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}
