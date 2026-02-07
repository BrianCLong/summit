/**
 * Insights API Contract v1
 * CompanyOS product-facing API contracts for insights generation
 */

import { z } from 'zod'
import { PersonEntityV1Schema } from './entities.js'
import { PersonAssociationV1Schema } from './queries.js'

/**
 * Insight types
 */
export const InsightTypeV1Schema = z.enum([
  'person-network',
  'organization-network',
  'relationship-analysis',
  'risk-assessment',
  'entity-summary',
])

export type InsightTypeV1 = z.infer<typeof InsightTypeV1Schema>

/**
 * Insight status
 */
export const InsightStatusV1Schema = z.enum(['pending', 'generating', 'completed', 'failed'])

export type InsightStatusV1 = z.infer<typeof InsightStatusV1Schema>

/**
 * Create Person Network Insight Request
 */
export const CreatePersonNetworkInsightRequestV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  personId: z.string().uuid().describe('Person entity ID'),
  depth: z.number().int().min(1).max(3).default(2).describe('Network analysis depth'),
  options: z
    .object({
      includeAnalysis: z.boolean().default(true).describe('Generate AI analysis'),
      maxNetworkSize: z.number().int().positive().max(1000).optional().describe('Maximum network size'),
      relationshipTypes: z
        .array(z.enum(['colleague', 'family', 'business', 'friend', 'mentor', 'advisor', 'partner', 'unknown']))
        .optional()
        .describe('Filter by relationship types'),
    })
    .optional(),
  metadata: z
    .object({
      requestedBy: z.string().optional().describe('User who requested the insight'),
      correlationId: z.string().uuid().optional().describe('Correlation ID for tracing'),
    })
    .optional(),
})

export type CreatePersonNetworkInsightRequestV1 = z.infer<
  typeof CreatePersonNetworkInsightRequestV1Schema
>

/**
 * Person Network Insight Data
 */
export const PersonNetworkInsightDataV1Schema = z.object({
  person: PersonEntityV1Schema.describe('Root person entity'),
  network: z.object({
    size: z.number().int().nonnegative().describe('Total network size'),
    associations: z.array(PersonAssociationV1Schema).describe('Person associations'),
    clusters: z
      .array(
        z.object({
          id: z.string().describe('Cluster identifier'),
          size: z.number().int().positive().describe('Number of persons in cluster'),
          dominantRelationshipType: z.string().optional().describe('Most common relationship type in cluster'),
        })
      )
      .optional()
      .describe('Network clusters'),
  }),
  summary: z.string().describe('Human-readable summary of the network'),
  insights: z
    .object({
      strongConnections: z.number().int().nonnegative().optional().describe('Count of strong connections'),
      weakConnections: z.number().int().nonnegative().optional().describe('Count of weak connections'),
      keyConnectors: z
        .array(
          z.object({
            personId: z.string().uuid().describe('Person ID'),
            personName: z.string().describe('Person name'),
            connectionCount: z.number().int().positive().describe('Number of connections'),
          })
        )
        .optional()
        .describe('Key network connectors'),
      riskFactors: z.array(z.string()).optional().describe('Identified risk factors'),
    })
    .optional(),
})

export type PersonNetworkInsightDataV1 = z.infer<typeof PersonNetworkInsightDataV1Schema>

/**
 * Create Person Network Insight Response
 */
export const CreatePersonNetworkInsightResponseV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  insightId: z.string().uuid().describe('Unique insight identifier'),
  type: z.literal('person-network').describe('Insight type'),
  status: InsightStatusV1Schema.describe('Insight generation status'),
  data: PersonNetworkInsightDataV1Schema.optional().describe('Insight data (if completed)'),
  error: z.string().optional().describe('Error message if failed'),
  metadata: z.object({
    generatedAt: z.string().datetime().describe('When the insight was generated'),
    maestroRunId: z.string().uuid().describe('Maestro workflow run ID'),
    processingTimeMs: z.number().nonnegative().optional().describe('Processing time in milliseconds'),
    requestedBy: z.string().optional().describe('User who requested the insight'),
  }),
})

export type CreatePersonNetworkInsightResponseV1 = z.infer<
  typeof CreatePersonNetworkInsightResponseV1Schema
>

/**
 * Get Insight Request
 */
export const GetInsightRequestV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  insightId: z.string().uuid().describe('Insight ID'),
})

export type GetInsightRequestV1 = z.infer<typeof GetInsightRequestV1Schema>

/**
 * Get Insight Response (generic)
 */
export const GetInsightResponseV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  insightId: z.string().uuid().describe('Insight ID'),
  type: InsightTypeV1Schema.describe('Insight type'),
  status: InsightStatusV1Schema.describe('Insight status'),
  data: z.unknown().optional().describe('Insight data (type-specific)'),
  error: z.string().optional().describe('Error message if failed'),
  metadata: z.object({
    createdAt: z.string().datetime().describe('When the insight was created'),
    updatedAt: z.string().datetime().describe('When the insight was last updated'),
    completedAt: z.string().datetime().optional().describe('When the insight completed'),
    requestedBy: z.string().optional().describe('User who requested the insight'),
  }),
})

export type GetInsightResponseV1 = z.infer<typeof GetInsightResponseV1Schema>

/**
 * Get Person Network Insight Response
 */
export const GetPersonNetworkInsightResponseV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  insightId: z.string().uuid().describe('Insight ID'),
  type: z.literal('person-network').describe('Insight type'),
  status: InsightStatusV1Schema.describe('Insight status'),
  data: PersonNetworkInsightDataV1Schema.optional().describe('Insight data (if completed)'),
  error: z.string().optional().describe('Error message if failed'),
  metadata: z.object({
    createdAt: z.string().datetime().describe('When the insight was created'),
    updatedAt: z.string().datetime().describe('When the insight was last updated'),
    completedAt: z.string().datetime().optional().describe('When the insight completed'),
    maestroRunId: z.string().uuid().optional().describe('Maestro workflow run ID'),
    requestedBy: z.string().optional().describe('User who requested the insight'),
  }),
})

export type GetPersonNetworkInsightResponseV1 = z.infer<
  typeof GetPersonNetworkInsightResponseV1Schema
>

/**
 * List Insights Request
 */
export const ListInsightsRequestV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  filters: z
    .object({
      type: InsightTypeV1Schema.optional().describe('Filter by insight type'),
      status: InsightStatusV1Schema.optional().describe('Filter by status'),
      requestedBy: z.string().optional().describe('Filter by requestor'),
      createdAfter: z.string().datetime().optional().describe('Filter by creation time'),
      createdBefore: z.string().datetime().optional().describe('Filter by creation time'),
    })
    .optional(),
  pagination: z
    .object({
      limit: z.number().int().positive().max(100).default(20).describe('Maximum results per page'),
      offset: z.number().int().nonnegative().default(0).describe('Pagination offset'),
    })
    .optional(),
})

export type ListInsightsRequestV1 = z.infer<typeof ListInsightsRequestV1Schema>

/**
 * Insight summary (for list responses)
 */
export const InsightSummaryV1Schema = z.object({
  insightId: z.string().uuid().describe('Insight ID'),
  type: InsightTypeV1Schema.describe('Insight type'),
  status: InsightStatusV1Schema.describe('Insight status'),
  createdAt: z.string().datetime().describe('When the insight was created'),
  completedAt: z.string().datetime().optional().describe('When the insight completed'),
})

export type InsightSummaryV1 = z.infer<typeof InsightSummaryV1Schema>

/**
 * List Insights Response
 */
export const ListInsightsResponseV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  insights: z.array(InsightSummaryV1Schema).describe('Insight summaries'),
  pagination: z.object({
    total: z.number().int().nonnegative().describe('Total matching insights'),
    limit: z.number().int().positive().describe('Results per page'),
    offset: z.number().int().nonnegative().describe('Current offset'),
    hasMore: z.boolean().describe('Whether more results are available'),
  }),
})

export type ListInsightsResponseV1 = z.infer<typeof ListInsightsResponseV1Schema>

/**
 * Delete Insight Request
 */
export const DeleteInsightRequestV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  insightId: z.string().uuid().describe('Insight ID to delete'),
})

export type DeleteInsightRequestV1 = z.infer<typeof DeleteInsightRequestV1Schema>

/**
 * Delete Insight Response
 */
export const DeleteInsightResponseV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  insightId: z.string().uuid().describe('Deleted insight ID'),
  deleted: z.boolean().describe('Whether the insight was deleted'),
  deletedAt: z.string().datetime().describe('When the insight was deleted'),
})

export type DeleteInsightResponseV1 = z.infer<typeof DeleteInsightResponseV1Schema>
