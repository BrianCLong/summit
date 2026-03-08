"use strict";
/**
 * Provenance Metadata Schema v1
 * Tracks data lineage, source attribution, and confidence scores
 * for the Summit integration critical path.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeMetadataV1 = exports.EntityMetadataV1 = exports.ProvenanceV1 = exports.SourceMetadataV1 = exports.SourceTypeV1 = void 0;
const zod_1 = require("zod");
/**
 * Source types for data ingestion
 */
exports.SourceTypeV1 = zod_1.z.enum([
    'csv',
    'http',
    'stix',
    'taxii',
    'rss',
    'twitter',
    'pastebin',
    'manual',
    'api',
    'webhook',
]);
/**
 * Source metadata for provenance tracking
 */
exports.SourceMetadataV1 = zod_1.z.object({
    id: zod_1.z.string().min(1).describe('Unique identifier for the data source'),
    name: zod_1.z.string().min(1).describe('Human-readable source name'),
    type: exports.SourceTypeV1.describe('Type of data source'),
    url: zod_1.z.string().url().optional().describe('Source URL if applicable'),
    version: zod_1.z.string().optional().describe('Source data version or API version'),
});
/**
 * Provenance record for data lineage tracking
 */
exports.ProvenanceV1 = zod_1.z.object({
    ingestedAt: zod_1.z.string().datetime().describe('ISO 8601 timestamp of ingestion'),
    ingestedBy: zod_1.z.string().optional().describe('User or service that ingested the data'),
    confidence: zod_1.z
        .number()
        .min(0)
        .max(1)
        .describe('Confidence score (0.0 = no confidence, 1.0 = full confidence)'),
    correlationId: zod_1.z.string().uuid().optional().describe('Correlation ID for tracing'),
    batchId: zod_1.z.string().optional().describe('Batch identifier for bulk ingestion'),
});
/**
 * Entity metadata for tracking lifecycle
 */
exports.EntityMetadataV1 = zod_1.z.object({
    createdAt: zod_1.z.string().datetime().describe('ISO 8601 timestamp of creation'),
    updatedAt: zod_1.z.string().datetime().describe('ISO 8601 timestamp of last update'),
    source: zod_1.z.string().min(1).describe('Source identifier'),
    confidence: zod_1.z
        .number()
        .min(0)
        .max(1)
        .describe('Confidence score (0.0 = no confidence, 1.0 = full confidence)'),
    version: zod_1.z.number().int().positive().default(1).describe('Entity version number'),
    tags: zod_1.z.array(zod_1.z.string()).optional().describe('User-defined tags for categorization'),
});
/**
 * Edge metadata for relationship tracking
 */
exports.EdgeMetadataV1 = zod_1.z.object({
    createdAt: zod_1.z.string().datetime().describe('ISO 8601 timestamp of creation'),
    source: zod_1.z.string().min(1).describe('Source identifier'),
    confidence: zod_1.z
        .number()
        .min(0)
        .max(1)
        .describe('Confidence score for this relationship'),
    weight: zod_1.z.number().min(0).max(1).optional().describe('Relationship strength (0.0-1.0)'),
});
