/**
 * Provenance Metadata Schema v1
 * Tracks data lineage, source attribution, and confidence scores
 * for the Summit integration critical path.
 */
/* eslint-disable no-redeclare */

import { z } from 'zod'

/**
 * Source types for data ingestion
 */
export const SourceTypeV1 = z.enum([
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
])

export type SourceTypeV1 = z.infer<typeof SourceTypeV1>

/**
 * Source metadata for provenance tracking
 */
export const SourceMetadataV1 = z.object({
  id: z.string().min(1).describe('Unique identifier for the data source'),
  name: z.string().min(1).describe('Human-readable source name'),
  type: SourceTypeV1.describe('Type of data source'),
  url: z.string().url().optional().describe('Source URL if applicable'),
  version: z.string().optional().describe('Source data version or API version'),
})

export type SourceMetadataV1 = z.infer<typeof SourceMetadataV1>

/**
 * Provenance record for data lineage tracking
 */
export const ProvenanceV1 = z.object({
  ingestedAt: z.string().datetime().describe('ISO 8601 timestamp of ingestion'),
  ingestedBy: z.string().optional().describe('User or service that ingested the data'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score (0.0 = no confidence, 1.0 = full confidence)'),
  correlationId: z.string().uuid().optional().describe('Correlation ID for tracing'),
  batchId: z.string().optional().describe('Batch identifier for bulk ingestion'),
})

export type ProvenanceV1 = z.infer<typeof ProvenanceV1>

/**
 * Entity metadata for tracking lifecycle
 */
export const EntityMetadataV1 = z.object({
  createdAt: z.string().datetime().describe('ISO 8601 timestamp of creation'),
  updatedAt: z.string().datetime().describe('ISO 8601 timestamp of last update'),
  source: z.string().min(1).describe('Source identifier'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score (0.0 = no confidence, 1.0 = full confidence)'),
  version: z.number().int().positive().default(1).describe('Entity version number'),
  tags: z.array(z.string()).optional().describe('User-defined tags for categorization'),
})

export type EntityMetadataV1 = z.infer<typeof EntityMetadataV1>

/**
 * Edge metadata for relationship tracking
 */
export const EdgeMetadataV1 = z.object({
  createdAt: z.string().datetime().describe('ISO 8601 timestamp of creation'),
  source: z.string().min(1).describe('Source identifier'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score for this relationship'),
  weight: z.number().min(0).max(1).optional().describe('Relationship strength (0.0-1.0)'),
})

export type EdgeMetadataV1 = z.infer<typeof EdgeMetadataV1>
