"use strict";
/**
 * Ingest Adapter Types
 *
 * Core type definitions for the ingest/ETL pipeline with backpressure,
 * replay, and idempotency support.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestEnvelopeSchema = exports.RecordMetadataSchema = exports.RevisionSchema = exports.EntitySchema = exports.IngestMetadataSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Ingest Envelope Schema (matches input.schema.json)
// ============================================================================
exports.IngestMetadataSchema = zod_1.z.object({
    source: zod_1.z.string().min(1).max(2048),
    source_type: zod_1.z.enum(['s3', 'gcs', 'azure_blob', 'kafka', 'webhook', 'sftp', 'api', 'file']),
    format: zod_1.z.enum(['jsonl', 'json', 'csv', 'parquet', 'avro', 'xml', 'binary']),
    batch_id: zod_1.z.string().nullable().optional(),
    batch_sequence: zod_1.z.number().int().min(0).nullable().optional(),
    batch_size: zod_1.z.number().int().min(1).nullable().optional(),
    file_path: zod_1.z.string().nullable().optional(),
    file_checksum: zod_1.z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
    byte_offset: zod_1.z.number().int().min(0).nullable().optional(),
    partition: zod_1.z.number().int().min(0).nullable().optional(),
    offset: zod_1.z.number().int().min(0).nullable().optional(),
});
exports.EntitySchema = zod_1.z.object({
    type: zod_1.z.string().min(1).max(255),
    id: zod_1.z.string().min(1).max(1024),
    external_id: zod_1.z.string().nullable().optional(),
});
exports.RevisionSchema = zod_1.z.object({
    number: zod_1.z.number().int().min(1),
    timestamp: zod_1.z.string().datetime(),
    previous_hash: zod_1.z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
});
exports.RecordMetadataSchema = zod_1.z.object({
    priority: zod_1.z.number().int().min(0).max(100).default(50),
    ttl_seconds: zod_1.z.number().int().min(1).nullable().optional(),
    legal_hold: zod_1.z.boolean().default(false),
    classification: zod_1.z.enum(['public', 'internal', 'confidential', 'restricted', 'top_secret']).nullable().optional(),
    retention_days: zod_1.z.number().int().min(1).nullable().optional(),
    tags: zod_1.z.array(zod_1.z.string().max(255)).max(50).optional(),
});
exports.IngestEnvelopeSchema = zod_1.z.object({
    event_id: zod_1.z.string().uuid(),
    event_type: zod_1.z.string().regex(/^ingest\.[a-z0-9_.]+\.v[0-9]+$/),
    event_version: zod_1.z.string().regex(/^v[0-9]+$/),
    occurred_at: zod_1.z.string().datetime(),
    recorded_at: zod_1.z.string().datetime(),
    tenant_id: zod_1.z.string().min(1).max(255),
    subject_id: zod_1.z.string().nullable().optional(),
    source_service: zod_1.z.string(),
    trace_id: zod_1.z.string().regex(/^[a-f0-9]{32}$/).nullable().optional(),
    span_id: zod_1.z.string().regex(/^[a-f0-9]{16}$/).nullable().optional(),
    correlation_id: zod_1.z.string().nullable().optional(),
    region: zod_1.z.string().nullable().optional(),
    ingest: exports.IngestMetadataSchema,
    entity: exports.EntitySchema,
    revision: exports.RevisionSchema,
    dedupe_key: zod_1.z.string().regex(/^[a-f0-9]{64}$/),
    schema_version: zod_1.z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/),
    data: zod_1.z.record(zod_1.z.unknown()),
    metadata: exports.RecordMetadataSchema.optional(),
});
