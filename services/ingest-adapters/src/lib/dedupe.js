"use strict";
/**
 * Deduplication Key Computation
 *
 * Computes deterministic dedupe keys for idempotency using SHA-256.
 * Key format: sha256(tenant_id|source|entity.type|entity.id|revision.number)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeDedupeKey = computeDedupeKey;
exports.computeDedupeKeyFromEnvelope = computeDedupeKeyFromEnvelope;
exports.validateDedupeKey = validateDedupeKey;
exports.computeContentHash = computeContentHash;
exports.computeFileChecksum = computeFileChecksum;
const crypto_1 = require("crypto");
/**
 * Compute the dedupe key for an ingest record.
 *
 * @param tenantId - Tenant identifier
 * @param source - Source identifier (e.g., s3://bucket/path)
 * @param entity - Entity identification
 * @param revision - Revision metadata
 * @returns SHA-256 hash as hex string
 */
function computeDedupeKey(tenantId, source, entity, revision) {
    const components = [
        tenantId,
        source,
        entity.type,
        entity.id,
        revision.number.toString(),
    ];
    const input = components.join('|');
    return (0, crypto_1.createHash)('sha256').update(input, 'utf8').digest('hex');
}
/**
 * Compute dedupe key from an envelope.
 */
function computeDedupeKeyFromEnvelope(envelope) {
    return computeDedupeKey(envelope.tenant_id, envelope.ingest.source, envelope.entity, envelope.revision);
}
/**
 * Validate that an envelope's dedupe_key matches computed value.
 */
function validateDedupeKey(envelope) {
    const computed = computeDedupeKeyFromEnvelope(envelope);
    return computed === envelope.dedupe_key;
}
/**
 * Compute content hash for data payload.
 * Used for detecting actual content changes vs metadata-only updates.
 */
function computeContentHash(data) {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return (0, crypto_1.createHash)('sha256').update(normalized, 'utf8').digest('hex');
}
/**
 * Compute file checksum for source file tracking.
 */
async function computeFileChecksum(content) {
    const hash = (0, crypto_1.createHash)('sha256');
    hash.update(content);
    return hash.digest('hex');
}
