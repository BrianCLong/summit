import { ProvenanceEntry } from './types.js';

/**
 * Validates local integrity invariants for a provenance entry.
 * Enforces existence of required fields:
 * - event_type (actionType)
 * - occurred_at (timestamp)
 * - actor (actorId)
 * - subject (resourceId)
 * - correlation_id (metadata.correlationId)
 *
 * @param entry The entry candidate to validate
 * @throws Error if any invariant is violated
 */
export function validateInvariants(entry: Partial<ProvenanceEntry>): void {
  // 1. event_type maps to actionType
  if (!entry.actionType) {
    throw new Error('Invariant violation: event_type (actionType) is required');
  }

  // 2. occurred_at maps to timestamp
  if (!entry.timestamp) {
    throw new Error('Invariant violation: occurred_at (timestamp) is required');
  }

  // 3. actor maps to actorId
  if (!entry.actorId) {
    throw new Error('Invariant violation: actor (actorId) is required');
  }

  // 4. subject maps to resourceId
  if (!entry.resourceId) {
    throw new Error('Invariant violation: subject (resourceId) is required');
  }

  // 5. correlation_id maps to metadata.correlationId
  // Note: metadata object itself must exist, and contain correlationId
  if (!entry.metadata || !entry.metadata.correlationId) {
    throw new Error('Invariant violation: correlation_id is required in metadata');
  }
}
