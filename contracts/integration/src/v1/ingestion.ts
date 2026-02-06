/**
 * Ingestion Contract v1
 * Switchboard → IntelGraph data ingestion API contracts
 */
/* eslint-disable no-redeclare */

import { z } from 'zod'
import { EntityV1, PersonEntityV1, OrganizationEntityV1 } from './entities.js'
import { EdgeV1, AssociatedWithEdgeV1, WorksForEdgeV1, OwnsEdgeV1 } from './edges.js'
import { SourceMetadataV1, ProvenanceV1 } from './provenance.js'

/**
 * Generic Ingestion Request
 */
export const IngestRequestV1 = z.object({
  version: z.literal('v1').describe('API version'),
  correlationId: z.string().uuid().describe('Correlation ID for tracing and idempotency'),
  source: SourceMetadataV1.describe('Data source metadata'),
  provenance: ProvenanceV1.describe('Provenance tracking metadata'),
  payload: z.object({
    entities: z.array(EntityV1).describe('Entities to ingest'),
    edges: z.array(EdgeV1).optional().describe('Edges/relationships to ingest'),
  }),
})

export type IngestRequestV1 = z.infer<typeof IngestRequestV1>

/**
 * Person-specific Ingestion Request
 */
export const IngestPersonRequestV1 = z.object({
  version: z.literal('v1').describe('API version'),
  correlationId: z.string().uuid().describe('Correlation ID for tracing and idempotency'),
  source: SourceMetadataV1.describe('Data source metadata'),
  provenance: ProvenanceV1.describe('Provenance tracking metadata'),
  payload: z.object({
    persons: z.array(PersonEntityV1).describe('Person entities to ingest'),
    associations: z.array(AssociatedWithEdgeV1).optional().describe('Person associations'),
    employments: z.array(WorksForEdgeV1).optional().describe('Employment relationships'),
  }),
})

export type IngestPersonRequestV1 = z.infer<typeof IngestPersonRequestV1>

/**
 * Organization-specific Ingestion Request
 */
export const IngestOrganizationRequestV1 = z.object({
  version: z.literal('v1').describe('API version'),
  correlationId: z.string().uuid().describe('Correlation ID for tracing and idempotency'),
  source: SourceMetadataV1.describe('Data source metadata'),
  provenance: ProvenanceV1.describe('Provenance tracking metadata'),
  payload: z.object({
    organizations: z.array(OrganizationEntityV1).describe('Organization entities to ingest'),
    ownerships: z.array(OwnsEdgeV1).optional().describe('Ownership relationships'),
  }),
})

export type IngestOrganizationRequestV1 = z.infer<typeof IngestOrganizationRequestV1>

/**
 * Ingestion Error
 */
export const IngestErrorV1 = z.object({
  entityId: z.string().optional().describe('Entity ID that failed (if applicable)'),
  field: z.string().optional().describe('Field that caused the error'),
  error: z.string().describe('Error message'),
  code: z
    .enum([
      'VALIDATION_ERROR',
      'DUPLICATE_ENTITY',
      'MISSING_DEPENDENCY',
      'CONSTRAINT_VIOLATION',
      'INTERNAL_ERROR',
    ])
    .describe('Error code'),
})

export type IngestErrorV1 = z.infer<typeof IngestErrorV1>

/**
 * Generic Ingestion Response
 */
export const IngestResponseV1 = z.object({
  version: z.literal('v1').describe('API version'),
  correlationId: z.string().uuid().describe('Correlation ID from request'),
  result: z.object({
    success: z.boolean().describe('Overall success status'),
    entitiesCreated: z.number().int().nonnegative().describe('Number of new entities created'),
    entitiesUpdated: z.number().int().nonnegative().describe('Number of existing entities updated'),
    edgesCreated: z.number().int().nonnegative().describe('Number of new edges created'),
    edgesUpdated: z.number().int().nonnegative().optional().describe('Number of edges updated'),
    errors: z.array(IngestErrorV1).optional().describe('Errors encountered during ingestion'),
    skipped: z.number().int().nonnegative().optional().describe('Number of entities skipped'),
  }),
  metadata: z
    .object({
      processingTimeMs: z.number().nonnegative().optional().describe('Processing time in milliseconds'),
      idempotencyKey: z.string().optional().describe('Idempotency key for replay protection'),
    })
    .optional(),
})

export type IngestResponseV1 = z.infer<typeof IngestResponseV1>

/**
 * Person-specific Ingestion Response
 */
export const IngestPersonResponseV1 = z.object({
  version: z.literal('v1').describe('API version'),
  correlationId: z.string().uuid().describe('Correlation ID from request'),
  result: z.object({
    success: z.boolean().describe('Overall success status'),
    personsCreated: z.number().int().nonnegative().describe('Number of new persons created'),
    personsUpdated: z.number().int().nonnegative().describe('Number of existing persons updated'),
    associationsCreated: z.number().int().nonnegative().describe('Number of associations created'),
    employmentsCreated: z.number().int().nonnegative().optional().describe('Number of employments created'),
    errors: z.array(IngestErrorV1).optional().describe('Errors encountered during ingestion'),
  }),
  metadata: z
    .object({
      processingTimeMs: z.number().nonnegative().optional().describe('Processing time in milliseconds'),
      idempotencyKey: z.string().optional().describe('Idempotency key for replay protection'),
    })
    .optional(),
})

export type IngestPersonResponseV1 = z.infer<typeof IngestPersonResponseV1>

/**
 * Batch Ingestion Status Request
 */
export const BatchIngestionStatusRequestV1 = z.object({
  version: z.literal('v1').describe('API version'),
  batchId: z.string().uuid().describe('Batch ID to query'),
})

export type BatchIngestionStatusRequestV1 = z.infer<typeof BatchIngestionStatusRequestV1>

/**
 * Batch Ingestion Status Response
 */
export const BatchIngestionStatusResponseV1 = z.object({
  version: z.literal('v1').describe('API version'),
  batchId: z.string().uuid().describe('Batch ID'),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'partial']).describe('Batch status'),
  progress: z
    .object({
      total: z.number().int().nonnegative().describe('Total items in batch'),
      processed: z.number().int().nonnegative().describe('Items processed'),
      successful: z.number().int().nonnegative().describe('Items successfully ingested'),
      failed: z.number().int().nonnegative().describe('Items that failed'),
    })
    .optional(),
  startedAt: z.string().datetime().optional().describe('When processing started'),
  completedAt: z.string().datetime().optional().describe('When processing completed'),
})

export type BatchIngestionStatusResponseV1 = z.infer<typeof BatchIngestionStatusResponseV1>
