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
const GetPersonRequestV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  personId: z.string().uuid().describe('Person entity ID'),
  includeMetadata: z.boolean().default(true).describe('Whether to include full metadata'),
})

export const GetPersonRequestV1 = GetPersonRequestV1Schema
export type GetPersonRequestV1 = z.infer<typeof GetPersonRequestV1Schema>

/**
 * Get Person by ID Response
 */
const GetPersonResponseV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  person: PersonEntityV1.describe('Person entity'),
  found: z.boolean().describe('Whether the person was found'),
})

export const GetPersonResponseV1 = GetPersonResponseV1Schema
export type GetPersonResponseV1 = z.infer<typeof GetPersonResponseV1Schema>

/**
 * Association result (edge + related person)
 */
const PersonAssociationV1Schema = z.object({
  edge: AssociatedWithEdgeV1.describe('Association edge'),
  relatedPerson: PersonEntityV1.describe('Related person entity'),
})

export const PersonAssociationV1 = PersonAssociationV1Schema
export type PersonAssociationV1 = z.infer<typeof PersonAssociationV1Schema>

/**
 * Get Person Network Request
 */
const GetPersonNetworkRequestV1Schema = z.object({
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

export const GetPersonNetworkRequestV1 = GetPersonNetworkRequestV1Schema
export type GetPersonNetworkRequestV1 = z.infer<typeof GetPersonNetworkRequestV1Schema>

/**
 * Get Person Network Response
 */
const GetPersonNetworkResponseV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  person: PersonEntityV1.describe('Root person entity'),
  associations: z.array(PersonAssociationV1Schema).describe('Person associations in the network'),
  metadata: z.object({
    queryTime: z.string().datetime().describe('When the query was executed'),
    resultCount: z.number().int().nonnegative().describe('Number of associations returned'),
    totalCount: z.number().int().nonnegative().optional().describe('Total associations (if limited by maxResults)'),
    depth: z.number().int().min(1).max(3).describe('Actual depth traversed'),
  }),
})

export const GetPersonNetworkResponseV1 = GetPersonNetworkResponseV1Schema
export type GetPersonNetworkResponseV1 = z.infer<typeof GetPersonNetworkResponseV1Schema>

/**
 * Get Entity by ID Request (generic)
 */
const GetEntityRequestV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  entityId: z.string().uuid().describe('Entity ID'),
  entityType: z.enum(['Person', 'Organization']).optional().describe('Expected entity type (for validation)'),
  includeMetadata: z.boolean().default(true).describe('Whether to include full metadata'),
})

export const GetEntityRequestV1 = GetEntityRequestV1Schema
export type GetEntityRequestV1 = z.infer<typeof GetEntityRequestV1Schema>

/**
 * Get Entity by ID Response (generic)
 */
const GetEntityResponseV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  entity: EntityV1.optional().describe('Entity (if found)'),
  found: z.boolean().describe('Whether the entity was found'),
})

export const GetEntityResponseV1 = GetEntityResponseV1Schema
export type GetEntityResponseV1 = z.infer<typeof GetEntityResponseV1Schema>

/**
 * Search Entities Request
 */
const SearchEntitiesRequestV1Schema = z.object({
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

export const SearchEntitiesRequestV1 = SearchEntitiesRequestV1Schema
export type SearchEntitiesRequestV1 = z.infer<typeof SearchEntitiesRequestV1Schema>

/**
 * Search Entities Response
 */
const SearchEntitiesResponseV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  results: z.array(EntityV1).describe('Matching entities'),
  metadata: z.object({
    totalCount: z.number().int().nonnegative().describe('Total matching entities'),
    limit: z.number().int().positive().describe('Result limit'),
    offset: z.number().int().nonnegative().describe('Pagination offset'),
    hasMore: z.boolean().describe('Whether more results are available'),
  }),
})

export const SearchEntitiesResponseV1 = SearchEntitiesResponseV1Schema
export type SearchEntitiesResponseV1 = z.infer<typeof SearchEntitiesResponseV1Schema>

/**
 * Get Entity Context Request (full context with claims/decisions)
 */
const GetEntityContextRequestV1Schema = z.object({
  version: z.literal('v1').describe('API version'),
  entityId: z.string().uuid().describe('Entity ID'),
  includeEdges: z.boolean().default(true).describe('Include connected edges'),
  includeRelatedEntities: z.boolean().default(true).describe('Include related entities'),
  maxRelated: z.number().int().positive().max(50).default(10).describe('Maximum related entities'),
})

export const GetEntityContextRequestV1 = GetEntityContextRequestV1Schema
export type GetEntityContextRequestV1 = z.infer<typeof GetEntityContextRequestV1Schema>

/**
 * Get Entity Context Response
 */
const GetEntityContextResponseV1Schema = z.object({
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

export const GetEntityContextResponseV1 = GetEntityContextResponseV1Schema
export type GetEntityContextResponseV1 = z.infer<typeof GetEntityContextResponseV1Schema>
