/**
 * Query Contract v1
 * IntelGraph query API contracts
 */

import { z } from 'zod'
import { EntityV1, PersonEntityV1 } from './entities.js'
import { EdgeV1, AssociatedWithEdgeV1 } from './edges.js'

/**
 * Get Person by ID Request
 */
export const GetPersonRequestV1 = z.object({
  version: z.literal('v1').describe('API version'),
  personId: z.string().uuid().describe('Person entity ID'),
  includeMetadata: z.boolean().default(true).describe('Whether to include full metadata'),
})

export type GetPersonRequestV1 = z.infer<typeof GetPersonRequestV1>

/**
 * Get Person by ID Response
 */
export const GetPersonResponseV1 = z.object({
  version: z.literal('v1').describe('API version'),
  person: PersonEntityV1.describe('Person entity'),
  found: z.boolean().describe('Whether the person was found'),
})

export type GetPersonResponseV1 = z.infer<typeof GetPersonResponseV1>

/**
 * Association result (edge + related person)
 */
export const PersonAssociationV1 = z.object({
  edge: AssociatedWithEdgeV1.describe('Association edge'),
  relatedPerson: PersonEntityV1.describe('Related person entity'),
})

export type PersonAssociationV1 = z.infer<typeof PersonAssociationV1>

/**
 * Get Person Network Request
 */
export const GetPersonNetworkRequestV1 = z.object({
  version: z.literal('v1').describe('API version'),
  personId: z.string().uuid().describe('Person entity ID'),
  depth: z
    .number()
    .int()
    .min(1)
    .max(3)
    .default(1)
    .describe('Traversal depth (1 = direct connections, 2 = friends of friends, etc.)'),
  includeMetadata: z.boolean().default(true).describe('Whether to include full metadata'),
  maxResults: z.number().int().positive().max(1000).optional().describe('Maximum number of results'),
  relationshipTypes: z
    .array(z.enum(['colleague', 'family', 'business', 'friend', 'mentor', 'advisor', 'partner', 'unknown']))
    .optional()
    .describe('Filter by relationship types'),
})

export type GetPersonNetworkRequestV1 = z.infer<typeof GetPersonNetworkRequestV1>

/**
 * Get Person Network Response
 */
export const GetPersonNetworkResponseV1 = z.object({
  version: z.literal('v1').describe('API version'),
  person: PersonEntityV1.describe('Root person entity'),
  associations: z.array(PersonAssociationV1).describe('Person associations in the network'),
  metadata: z.object({
    queryTime: z.string().datetime().describe('When the query was executed'),
    resultCount: z.number().int().nonnegative().describe('Number of associations returned'),
    totalCount: z.number().int().nonnegative().optional().describe('Total associations (if limited by maxResults)'),
    depth: z.number().int().min(1).max(3).describe('Actual depth traversed'),
  }),
})

export type GetPersonNetworkResponseV1 = z.infer<typeof GetPersonNetworkResponseV1>

/**
 * Get Entity by ID Request (generic)
 */
export const GetEntityRequestV1 = z.object({
  version: z.literal('v1').describe('API version'),
  entityId: z.string().uuid().describe('Entity ID'),
  entityType: z.enum(['Person', 'Organization']).optional().describe('Expected entity type (for validation)'),
  includeMetadata: z.boolean().default(true).describe('Whether to include full metadata'),
})

export type GetEntityRequestV1 = z.infer<typeof GetEntityRequestV1>

/**
 * Get Entity by ID Response (generic)
 */
export const GetEntityResponseV1 = z.object({
  version: z.literal('v1').describe('API version'),
  entity: EntityV1.optional().describe('Entity (if found)'),
  found: z.boolean().describe('Whether the entity was found'),
})

export type GetEntityResponseV1 = z.infer<typeof GetEntityResponseV1>

/**
 * Search Entities Request
 */
export const SearchEntitiesRequestV1 = z.object({
  version: z.literal('v1').describe('API version'),
  query: z.string().min(1).max(500).describe('Search query string'),
  entityTypes: z.array(z.enum(['Person', 'Organization'])).optional().describe('Filter by entity types'),
  limit: z.number().int().positive().max(100).default(20).describe('Maximum number of results'),
  offset: z.number().int().nonnegative().default(0).describe('Pagination offset'),
  filters: z
    .object({
      source: z.string().optional().describe('Filter by source'),
      minConfidence: z.number().min(0).max(1).optional().describe('Minimum confidence score'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
    })
    .optional(),
})

export type SearchEntitiesRequestV1 = z.infer<typeof SearchEntitiesRequestV1>

/**
 * Search Entities Response
 */
export const SearchEntitiesResponseV1 = z.object({
  version: z.literal('v1').describe('API version'),
  results: z.array(EntityV1).describe('Matching entities'),
  metadata: z.object({
    totalCount: z.number().int().nonnegative().describe('Total matching entities'),
    limit: z.number().int().positive().describe('Result limit'),
    offset: z.number().int().nonnegative().describe('Pagination offset'),
    hasMore: z.boolean().describe('Whether more results are available'),
  }),
})

export type SearchEntitiesResponseV1 = z.infer<typeof SearchEntitiesResponseV1>

/**
 * Get Entity Context Request (full context with claims/decisions)
 */
export const GetEntityContextRequestV1 = z.object({
  version: z.literal('v1').describe('API version'),
  entityId: z.string().uuid().describe('Entity ID'),
  includeEdges: z.boolean().default(true).describe('Include connected edges'),
  includeRelatedEntities: z.boolean().default(true).describe('Include related entities'),
  maxRelated: z.number().int().positive().max(50).default(10).describe('Maximum related entities'),
})

export type GetEntityContextRequestV1 = z.infer<typeof GetEntityContextRequestV1>

/**
 * Get Entity Context Response
 */
export const GetEntityContextResponseV1 = z.object({
  version: z.literal('v1').describe('API version'),
  entity: EntityV1.describe('Root entity'),
  edges: z.array(EdgeV1).optional().describe('Connected edges'),
  relatedEntities: z.array(EntityV1).optional().describe('Related entities'),
  metadata: z.object({
    queryTime: z.string().datetime().describe('When the query was executed'),
    edgeCount: z.number().int().nonnegative().describe('Number of edges returned'),
    relatedEntityCount: z.number().int().nonnegative().describe('Number of related entities returned'),
  }),
})

export type GetEntityContextResponseV1 = z.infer<typeof GetEntityContextResponseV1>
