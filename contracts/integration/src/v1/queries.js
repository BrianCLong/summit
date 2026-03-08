"use strict";
/**
 * Query Contract v1
 * IntelGraph query API contracts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetEntityContextResponseV1 = exports.GetEntityContextRequestV1 = exports.SearchEntitiesResponseV1 = exports.SearchEntitiesRequestV1 = exports.GetEntityResponseV1 = exports.GetEntityRequestV1 = exports.GetPersonNetworkResponseV1 = exports.GetPersonNetworkRequestV1 = exports.PersonAssociationV1 = exports.GetPersonResponseV1 = exports.GetPersonRequestV1 = void 0;
const zod_1 = require("zod");
const entities_js_1 = require("./entities.js");
const edges_js_1 = require("./edges.js");
/**
 * Get Person by ID Request
 */
exports.GetPersonRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    personId: zod_1.z.string().uuid().describe('Person entity ID'),
    includeMetadata: zod_1.z.boolean().default(true).describe('Whether to include full metadata'),
});
/**
 * Get Person by ID Response
 */
exports.GetPersonResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    person: entities_js_1.PersonEntityV1.describe('Person entity'),
    found: zod_1.z.boolean().describe('Whether the person was found'),
});
/**
 * Association result (edge + related person)
 */
exports.PersonAssociationV1 = zod_1.z.object({
    edge: edges_js_1.AssociatedWithEdgeV1.describe('Association edge'),
    relatedPerson: entities_js_1.PersonEntityV1.describe('Related person entity'),
});
/**
 * Get Person Network Request
 */
exports.GetPersonNetworkRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    personId: zod_1.z.string().uuid().describe('Person entity ID'),
    depth: zod_1.z
        .number()
        .int()
        .min(1)
        .max(3)
        .default(1)
        .describe('Traversal depth (1 = direct connections, 2 = friends of friends, etc.)'),
    includeMetadata: zod_1.z.boolean().default(true).describe('Whether to include full metadata'),
    maxResults: zod_1.z.number().int().positive().max(1000).optional().describe('Maximum number of results'),
    relationshipTypes: zod_1.z
        .array(zod_1.z.enum(['colleague', 'family', 'business', 'friend', 'mentor', 'advisor', 'partner', 'unknown']))
        .optional()
        .describe('Filter by relationship types'),
});
/**
 * Get Person Network Response
 */
exports.GetPersonNetworkResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    person: entities_js_1.PersonEntityV1.describe('Root person entity'),
    associations: zod_1.z.array(exports.PersonAssociationV1).describe('Person associations in the network'),
    metadata: zod_1.z.object({
        queryTime: zod_1.z.string().datetime().describe('When the query was executed'),
        resultCount: zod_1.z.number().int().nonnegative().describe('Number of associations returned'),
        totalCount: zod_1.z.number().int().nonnegative().optional().describe('Total associations (if limited by maxResults)'),
        depth: zod_1.z.number().int().min(1).max(3).describe('Actual depth traversed'),
    }),
});
/**
 * Get Entity by ID Request (generic)
 */
exports.GetEntityRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    entityId: zod_1.z.string().uuid().describe('Entity ID'),
    entityType: zod_1.z.enum(['Person', 'Organization']).optional().describe('Expected entity type (for validation)'),
    includeMetadata: zod_1.z.boolean().default(true).describe('Whether to include full metadata'),
});
/**
 * Get Entity by ID Response (generic)
 */
exports.GetEntityResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    entity: entities_js_1.EntityV1.optional().describe('Entity (if found)'),
    found: zod_1.z.boolean().describe('Whether the entity was found'),
});
/**
 * Search Entities Request
 */
exports.SearchEntitiesRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    query: zod_1.z.string().min(1).max(500).describe('Search query string'),
    entityTypes: zod_1.z.array(zod_1.z.enum(['Person', 'Organization'])).optional().describe('Filter by entity types'),
    limit: zod_1.z.number().int().positive().max(100).default(20).describe('Maximum number of results'),
    offset: zod_1.z.number().int().nonnegative().default(0).describe('Pagination offset'),
    filters: zod_1.z
        .object({
        source: zod_1.z.string().optional().describe('Filter by source'),
        minConfidence: zod_1.z.number().min(0).max(1).optional().describe('Minimum confidence score'),
        tags: zod_1.z.array(zod_1.z.string()).optional().describe('Filter by tags'),
    })
        .optional(),
});
/**
 * Search Entities Response
 */
exports.SearchEntitiesResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    results: zod_1.z.array(entities_js_1.EntityV1).describe('Matching entities'),
    metadata: zod_1.z.object({
        totalCount: zod_1.z.number().int().nonnegative().describe('Total matching entities'),
        limit: zod_1.z.number().int().positive().describe('Result limit'),
        offset: zod_1.z.number().int().nonnegative().describe('Pagination offset'),
        hasMore: zod_1.z.boolean().describe('Whether more results are available'),
    }),
});
/**
 * Get Entity Context Request (full context with claims/decisions)
 */
exports.GetEntityContextRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    entityId: zod_1.z.string().uuid().describe('Entity ID'),
    includeEdges: zod_1.z.boolean().default(true).describe('Include connected edges'),
    includeRelatedEntities: zod_1.z.boolean().default(true).describe('Include related entities'),
    maxRelated: zod_1.z.number().int().positive().max(50).default(10).describe('Maximum related entities'),
});
/**
 * Get Entity Context Response
 */
exports.GetEntityContextResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    entity: entities_js_1.EntityV1.describe('Root entity'),
    edges: zod_1.z.array(edges_js_1.EdgeV1).optional().describe('Connected edges'),
    relatedEntities: zod_1.z.array(entities_js_1.EntityV1).optional().describe('Related entities'),
    metadata: zod_1.z.object({
        queryTime: zod_1.z.string().datetime().describe('When the query was executed'),
        edgeCount: zod_1.z.number().int().nonnegative().describe('Number of edges returned'),
        relatedEntityCount: zod_1.z.number().int().nonnegative().describe('Number of related entities returned'),
    }),
});
