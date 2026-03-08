"use strict";
/**
 * Ingestion Contract v1
 * Switchboard → IntelGraph data ingestion API contracts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchIngestionStatusResponseV1 = exports.BatchIngestionStatusRequestV1 = exports.IngestPersonResponseV1 = exports.IngestResponseV1 = exports.IngestErrorV1 = exports.IngestOrganizationRequestV1 = exports.IngestPersonRequestV1 = exports.IngestRequestV1 = void 0;
const zod_1 = require("zod");
const entities_js_1 = require("./entities.js");
const edges_js_1 = require("./edges.js");
const provenance_js_1 = require("./provenance.js");
/**
 * Generic Ingestion Request
 */
exports.IngestRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    correlationId: zod_1.z.string().uuid().describe('Correlation ID for tracing and idempotency'),
    source: provenance_js_1.SourceMetadataV1.describe('Data source metadata'),
    provenance: provenance_js_1.ProvenanceV1.describe('Provenance tracking metadata'),
    payload: zod_1.z.object({
        entities: zod_1.z.array(entities_js_1.EntityV1).describe('Entities to ingest'),
        edges: zod_1.z.array(edges_js_1.EdgeV1).optional().describe('Edges/relationships to ingest'),
    }),
});
/**
 * Person-specific Ingestion Request
 */
exports.IngestPersonRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    correlationId: zod_1.z.string().uuid().describe('Correlation ID for tracing and idempotency'),
    source: provenance_js_1.SourceMetadataV1.describe('Data source metadata'),
    provenance: provenance_js_1.ProvenanceV1.describe('Provenance tracking metadata'),
    payload: zod_1.z.object({
        persons: zod_1.z.array(entities_js_1.PersonEntityV1).describe('Person entities to ingest'),
        associations: zod_1.z.array(edges_js_1.AssociatedWithEdgeV1).optional().describe('Person associations'),
        employments: zod_1.z.array(edges_js_1.WorksForEdgeV1).optional().describe('Employment relationships'),
    }),
});
/**
 * Organization-specific Ingestion Request
 */
exports.IngestOrganizationRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    correlationId: zod_1.z.string().uuid().describe('Correlation ID for tracing and idempotency'),
    source: provenance_js_1.SourceMetadataV1.describe('Data source metadata'),
    provenance: provenance_js_1.ProvenanceV1.describe('Provenance tracking metadata'),
    payload: zod_1.z.object({
        organizations: zod_1.z.array(entities_js_1.OrganizationEntityV1).describe('Organization entities to ingest'),
        ownerships: zod_1.z.array(edges_js_1.OwnsEdgeV1).optional().describe('Ownership relationships'),
    }),
});
/**
 * Ingestion Error
 */
exports.IngestErrorV1 = zod_1.z.object({
    entityId: zod_1.z.string().optional().describe('Entity ID that failed (if applicable)'),
    field: zod_1.z.string().optional().describe('Field that caused the error'),
    error: zod_1.z.string().describe('Error message'),
    code: zod_1.z
        .enum([
        'VALIDATION_ERROR',
        'DUPLICATE_ENTITY',
        'MISSING_DEPENDENCY',
        'CONSTRAINT_VIOLATION',
        'INTERNAL_ERROR',
    ])
        .describe('Error code'),
});
/**
 * Generic Ingestion Response
 */
exports.IngestResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    correlationId: zod_1.z.string().uuid().describe('Correlation ID from request'),
    result: zod_1.z.object({
        success: zod_1.z.boolean().describe('Overall success status'),
        entitiesCreated: zod_1.z.number().int().nonnegative().describe('Number of new entities created'),
        entitiesUpdated: zod_1.z.number().int().nonnegative().describe('Number of existing entities updated'),
        edgesCreated: zod_1.z.number().int().nonnegative().describe('Number of new edges created'),
        edgesUpdated: zod_1.z.number().int().nonnegative().optional().describe('Number of edges updated'),
        errors: zod_1.z.array(exports.IngestErrorV1).optional().describe('Errors encountered during ingestion'),
        skipped: zod_1.z.number().int().nonnegative().optional().describe('Number of entities skipped'),
    }),
    metadata: zod_1.z
        .object({
        processingTimeMs: zod_1.z.number().nonnegative().optional().describe('Processing time in milliseconds'),
        idempotencyKey: zod_1.z.string().optional().describe('Idempotency key for replay protection'),
    })
        .optional(),
});
/**
 * Person-specific Ingestion Response
 */
exports.IngestPersonResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    correlationId: zod_1.z.string().uuid().describe('Correlation ID from request'),
    result: zod_1.z.object({
        success: zod_1.z.boolean().describe('Overall success status'),
        personsCreated: zod_1.z.number().int().nonnegative().describe('Number of new persons created'),
        personsUpdated: zod_1.z.number().int().nonnegative().describe('Number of existing persons updated'),
        associationsCreated: zod_1.z.number().int().nonnegative().describe('Number of associations created'),
        employmentsCreated: zod_1.z.number().int().nonnegative().optional().describe('Number of employments created'),
        errors: zod_1.z.array(exports.IngestErrorV1).optional().describe('Errors encountered during ingestion'),
    }),
    metadata: zod_1.z
        .object({
        processingTimeMs: zod_1.z.number().nonnegative().optional().describe('Processing time in milliseconds'),
        idempotencyKey: zod_1.z.string().optional().describe('Idempotency key for replay protection'),
    })
        .optional(),
});
/**
 * Batch Ingestion Status Request
 */
exports.BatchIngestionStatusRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    batchId: zod_1.z.string().uuid().describe('Batch ID to query'),
});
/**
 * Batch Ingestion Status Response
 */
exports.BatchIngestionStatusResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    batchId: zod_1.z.string().uuid().describe('Batch ID'),
    status: zod_1.z.enum(['pending', 'processing', 'completed', 'failed', 'partial']).describe('Batch status'),
    progress: zod_1.z
        .object({
        total: zod_1.z.number().int().nonnegative().describe('Total items in batch'),
        processed: zod_1.z.number().int().nonnegative().describe('Items processed'),
        successful: zod_1.z.number().int().nonnegative().describe('Items successfully ingested'),
        failed: zod_1.z.number().int().nonnegative().describe('Items that failed'),
    })
        .optional(),
    startedAt: zod_1.z.string().datetime().optional().describe('When processing started'),
    completedAt: zod_1.z.string().datetime().optional().describe('When processing completed'),
});
