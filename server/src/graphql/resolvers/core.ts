/**
 * Core GraphQL Resolvers - Production persistence layer
 * Replaces demo resolvers with real PostgreSQL + Neo4j operations
 */

import { GraphQLScalarType, Kind } from 'graphql';
import { EntityRepo } from '../../repos/EntityRepo.js';
import { RelationshipRepo } from '../../repos/RelationshipRepo.js';
import { InvestigationRepo } from '../../repos/InvestigationRepo.js';
import { getNeo4jDriver } from '../../db/neo4j.js';
import { getPostgresPool } from '../../db/postgres.js';
import logger from '../../config/logger.js';
import { z } from 'zod';

const resolverLogger = logger.child({ name: 'CoreResolvers' });

// ============================================================================
// Base validation schemas with security constraints
// ============================================================================

// Tenant ID validation - alphanumeric with underscores and hyphens only
const TenantIdZ = z
  .string()
  .min(1, 'Tenant ID required')
  .max(100, 'Tenant ID too long')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Tenant ID must contain only alphanumeric characters, underscores, and hyphens',
  );

// Entity ID validation - must be a valid UUID
const EntityIdZ = z
  .string()
  .min(1, 'Entity ID required')
  .uuid('Entity ID must be a valid UUID');

// Relationship ID validation - must be a valid UUID
const RelationshipIdZ = z
  .string()
  .min(1, 'Relationship ID required')
  .uuid('Relationship ID must be a valid UUID');

// Investigation ID validation - must be a valid UUID
const InvestigationIdZ = z
  .string()
  .min(1, 'Investigation ID required')
  .uuid('Investigation ID must be a valid UUID');

// Entity kind validation - safe pattern only
const EntityKindZ = z
  .string()
  .min(1, 'Entity kind required')
  .max(50, 'Entity kind too long')
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_]*$/,
    'Entity kind must start with letter and contain only alphanumeric and underscores',
  )
  .optional();

// Relationship type validation - uppercase with underscores
const RelationshipTypeZ = z
  .string()
  .min(1, 'Relationship type required')
  .max(100, 'Relationship type too long')
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    'Relationship type must be uppercase with underscores',
  )
  .optional();

// Pagination validation with safe limits
const LimitZ = z
  .number()
  .int('Limit must be an integer')
  .min(1, 'Limit must be at least 1')
  .max(1000, 'Limit cannot exceed 1000')
  .default(100);

const OffsetZ = z
  .number()
  .int('Offset must be an integer')
  .min(0, 'Offset cannot be negative')
  .default(0);

// Investigation status validation
const InvestigationStatusZ = z
  .enum(['ACTIVE', 'ARCHIVED', 'COMPLETED', 'DRAFT'])
  .optional();

// Direction validation for relationships
const DirectionZ = z
  .enum(['INCOMING', 'OUTGOING', 'BOTH'])
  .default('BOTH');

// Props validation with size and content checks
const PropsZ = z
  .record(z.any())
  .refine(
    (props) => JSON.stringify(props).length <= 32768,
    'Properties too large (max 32KB)',
  )
  .refine(
    (props) => {
      // Block potentially dangerous content
      const str = JSON.stringify(props);
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
      ];
      return !dangerousPatterns.some((p) => p.test(str));
    },
    'Properties contain potentially dangerous content',
  )
  .default({});

// ============================================================================
// Query argument schemas
// ============================================================================

// Single entity query
const EntityQueryArgsZ = z.object({
  id: EntityIdZ,
  tenantId: TenantIdZ.optional(),
});

// Entity list/search query
const EntitiesQueryArgsZ = z.object({
  input: z.object({
    tenantId: TenantIdZ.optional(),
    kind: EntityKindZ,
    props: PropsZ.optional(),
    limit: LimitZ,
    offset: OffsetZ,
  }),
});

// Single relationship query
const RelationshipQueryArgsZ = z.object({
  id: RelationshipIdZ,
  tenantId: TenantIdZ.optional(),
});

// Relationship list/search query
const RelationshipsQueryArgsZ = z.object({
  input: z.object({
    tenantId: TenantIdZ.optional(),
    type: RelationshipTypeZ,
    srcId: EntityIdZ.optional(),
    dstId: EntityIdZ.optional(),
    limit: LimitZ,
    offset: OffsetZ,
  }),
});

// Single investigation query
const InvestigationQueryArgsZ = z.object({
  id: InvestigationIdZ,
  tenantId: TenantIdZ.optional(),
});

// Investigation list query
const InvestigationsQueryArgsZ = z.object({
  tenantId: TenantIdZ.optional(),
  status: InvestigationStatusZ,
  limit: LimitZ,
  offset: OffsetZ,
});

// ============================================================================
// Mutation input schemas
// ============================================================================

const EntityInputZ = z.object({
  tenantId: TenantIdZ.optional(),
  kind: z
    .string()
    .min(1, 'Entity kind required')
    .max(50, 'Entity kind too long')
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*$/,
      'Entity kind must start with letter and contain only alphanumeric and underscores',
    ),
  labels: z.array(z.string().max(100)).max(20, 'Maximum 20 labels').default([]),
  props: PropsZ,
  investigationId: InvestigationIdZ.optional(),
});

const EntityUpdateZ = z.object({
  id: EntityIdZ,
  labels: z.array(z.string().max(100)).max(20, 'Maximum 20 labels').optional(),
  props: PropsZ.optional(),
});

const RelationshipInputZ = z.object({
  tenantId: TenantIdZ.optional(),
  srcId: EntityIdZ,
  dstId: EntityIdZ,
  type: z
    .string()
    .min(1, 'Relationship type required')
    .max(100, 'Relationship type too long')
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      'Relationship type must be uppercase with underscores',
    ),
  props: PropsZ,
  investigationId: InvestigationIdZ.optional(),
});

// ============================================================================
// Field resolver argument schemas
// ============================================================================

const EntityRelationshipsArgsZ = z.object({
  direction: DirectionZ,
  type: RelationshipTypeZ,
  limit: LimitZ,
});

const InvestigationEntitiesArgsZ = z.object({
  kind: EntityKindZ,
  limit: LimitZ,
  offset: OffsetZ,
});

const InvestigationRelationshipsArgsZ = z.object({
  type: RelationshipTypeZ,
  limit: LimitZ,
  offset: OffsetZ,
});

// Initialize repositories
const pg = getPostgresPool();
const neo4j = getNeo4jDriver();
const entityRepo = new EntityRepo(pg, neo4j);
const relationshipRepo = new RelationshipRepo(pg, neo4j);
const investigationRepo = new InvestigationRepo(pg);

// Custom scalars
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize: (value: any) =>
    value instanceof Date ? value.toISOString() : value,
  parseValue: (value: any) => new Date(value),
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize: (value: any) => value,
  parseValue: (value: any) => value,
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return JSON.parse(ast.value);
    }
    return null;
  },
});

export const coreResolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  Query: {
    // Entity queries - with Zod validation
    entity: async (_: any, args: any, context: any) => {
      // Validate and parse input arguments
      const parsed = EntityQueryArgsZ.parse(args);
      const effectiveTenantId = parsed.tenantId || context.tenantId;

      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required');
      }

      // Validate tenant ID from context as well
      TenantIdZ.parse(effectiveTenantId);

      resolverLogger.debug({ id: parsed.id, tenantId: effectiveTenantId }, 'entity query');
      return await entityRepo.findById(parsed.id, effectiveTenantId);
    },

    entities: async (_: any, args: any, context: any) => {
      // Validate and parse input arguments
      const { input } = EntitiesQueryArgsZ.parse(args);
      const effectiveTenantId = input.tenantId || context.tenantId;

      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required');
      }

      // Validate tenant ID from context as well
      TenantIdZ.parse(effectiveTenantId);

      resolverLogger.debug(
        { tenantId: effectiveTenantId, kind: input.kind, limit: input.limit },
        'entities query',
      );

      return await entityRepo.search({
        tenantId: effectiveTenantId,
        kind: input.kind,
        props: input.props,
        limit: input.limit,
        offset: input.offset,
      });
    },

    // Relationship queries - with Zod validation
    relationship: async (_: any, args: any, context: any) => {
      // Validate and parse input arguments
      const parsed = RelationshipQueryArgsZ.parse(args);
      const effectiveTenantId = parsed.tenantId || context.tenantId;

      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required');
      }

      // Validate tenant ID from context as well
      TenantIdZ.parse(effectiveTenantId);

      resolverLogger.debug({ id: parsed.id, tenantId: effectiveTenantId }, 'relationship query');
      return await relationshipRepo.findById(parsed.id, effectiveTenantId);
    },

    relationships: async (_: any, args: any, context: any) => {
      // Validate and parse input arguments
      const { input } = RelationshipsQueryArgsZ.parse(args);
      const effectiveTenantId = input.tenantId || context.tenantId;

      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required');
      }

      // Validate tenant ID from context as well
      TenantIdZ.parse(effectiveTenantId);

      resolverLogger.debug(
        { tenantId: effectiveTenantId, type: input.type, limit: input.limit },
        'relationships query',
      );

      return await relationshipRepo.search({
        tenantId: effectiveTenantId,
        type: input.type,
        srcId: input.srcId,
        dstId: input.dstId,
        limit: input.limit,
        offset: input.offset,
      });
    },

    // Investigation queries - with Zod validation
    investigation: async (_: any, args: any, context: any) => {
      // Validate and parse input arguments
      const parsed = InvestigationQueryArgsZ.parse(args);
      const effectiveTenantId = parsed.tenantId || context.tenantId;

      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required');
      }

      // Validate tenant ID from context as well
      TenantIdZ.parse(effectiveTenantId);

      resolverLogger.debug({ id: parsed.id, tenantId: effectiveTenantId }, 'investigation query');
      return await investigationRepo.findById(parsed.id, effectiveTenantId);
    },

    investigations: async (_: any, args: any, context: any) => {
      // Validate and parse input arguments
      const parsed = InvestigationsQueryArgsZ.parse(args);
      const effectiveTenantId = parsed.tenantId || context.tenantId;

      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required');
      }

      // Validate tenant ID from context as well
      TenantIdZ.parse(effectiveTenantId);

      resolverLogger.debug(
        { tenantId: effectiveTenantId, status: parsed.status, limit: parsed.limit },
        'investigations query',
      );

      return await investigationRepo.list({
        tenantId: effectiveTenantId,
        status: parsed.status,
        limit: parsed.limit,
        offset: parsed.offset,
      });
    },

    // Graph traversal (temporarily disabled due to schema mismatch)
    // graphNeighborhood: async (_: any, { input }: any, context: any) => {
    //   const { startEntityId, tenantId, maxDepth = 2, relationshipTypes, entityKinds, limit = 100 } = input;
    //   const effectiveTenantId = tenantId || context.tenantId;
    //
    //   if (!effectiveTenantId) {
    //     throw new Error('Tenant ID is required');
    //   }
    //
    //   const session = neo4j.session();
    //   try {
    //     // Neo4j traversal query
    //     const cypher = `
    //       MATCH (center:Entity {id: $startEntityId, tenantId: $tenantId})
    //       CALL apoc.path.subgraphAll(center, {
    //         maxLevel: $maxDepth,
    //         relationshipFilter: $relationshipTypes,
    //         labelFilter: $entityKinds,
    //         limit: $limit
    //       }) YIELD nodes, relationships
    //       RETURN nodes, relationships
    //     `;
    //
    //     const result = await session.run(cypher, {
    //       startEntityId,
    //       tenantId: effectiveTenantId,
    //       maxDepth,
    //       relationshipTypes: relationshipTypes?.join('|') || null,
    //       entityKinds: entityKinds?.join(':') || null,
    //       limit
    //     });
    //
    //     if (result.records.length === 0) {
    //       // Fallback to simple 1-hop query if APOC not available
    //       const simpleResult = await session.run(`
    //         MATCH (center:Entity {id: $startEntityId, tenantId: $tenantId})
    //         OPTIONAL MATCH (center)-[r:REL]-(neighbor:Entity {tenantId: $tenantId})
    //         RETURN center, collect(DISTINCT neighbor) as neighbors, collect(DISTINCT r) as relationships
    //       `, { startEntityId, tenantId: effectiveTenantId });
    //
    //       const record = simpleResult.records[0];
    //       const center = record?.get('center');
    //       const neighbors = record?.get('neighbors') || [];
    //       const relationships = record?.get('relationships') || [];
    //
    //       return {
    //         center: await entityRepo.findById(startEntityId, effectiveTenantId),
    //         entities: await Promise.all(
    //           neighbors
    //             .filter((n: any) => n.properties.id !== startEntityId)
    //             .map((n: any) => entityRepo.findById(n.properties.id, effectiveTenantId))
    //         ),
    //         relationships: await Promise.all(
    //           relationships.map((r: any) => relationshipRepo.findById(r.properties.id, effectiveTenantId))
    //         ),
    //         depth: 1
    //       };
    //     }
    //
    //     // Process APOC result
    //     const record = result.records[0];
    //     const nodes = record.get('nodes') || [];
    //     const relationships = record.get('relationships') || [];
    //
    //     return {
    //       center: await entityRepo.findById(startEntityId, effectiveTenantId),
    //       entities: await Promise.all(
    //         nodes
    //           .filter((n: any) => n.properties.id !== startEntityId)
    //           .map((n: any) => entityRepo.findById(n.properties.id, effectiveTenantId))
    //       ),
    //       relationships: await Promise.all(
    //         relationships.map((r: any) => relationshipRepo.findById(r.properties.id, effectiveTenantId))
    //       ),
    //       depth: maxDepth
    //     };
    //
    //   } finally {
    //     await session.close();
    //   }
    // },

    // Full text search across entities (temporarily disabled due to schema mismatch)
    // searchEntities: async (_: any, { tenantId, query, kinds, limit }: any, context: any) => {
    //   const effectiveTenantId = tenantId || context.tenantId;
    //   if (!effectiveTenantId) {
    //     throw new Error('Tenant ID is required');
    //   }
    //
    //   // Use PostgreSQL full-text search on props
    //   const params = [effectiveTenantId, `%${query}%`];
    //   let sql = `
    //     SELECT DISTINCT e.* FROM entities e
    //     WHERE e.tenant_id = $1
    //     AND (
    //       e.props::text ILIKE $2
    //       OR array_to_string(e.labels, ' ') ILIKE $2
    //     )
    //   `;
    //
    //   if (kinds && kinds.length > 0) {
    //     sql += ` AND e.kind = ANY($3)`;
    //     params.push(kinds);
    //   }
    //
    //   sql += ` ORDER BY e.created_at DESC LIMIT $${params.length + 1}`;
    //   params.push(limit || 50);
    //
    //   const { rows } = await pg.query(sql, params);
    //   return rows.map((row: any) => ({
    //     id: row.id,
    //     tenantId: row.tenant_id,
    //     kind: row.kind,
    //     labels: row.labels,
    //     props: row.props,
    //     createdAt: row.created_at,
    //     updatedAt: row.updated_at,
    //     createdBy: row.created_by
    //   }));
    // }
  },

  Mutation: {
    // Entity mutations
    createEntity: async (_: any, { input }: any, context: any) => {
      const effectiveTenantId =
        input.tenantId ||
        context.tenantId ||
        context.user?.tenantId ||
        'default_tenant';
      const parsed = EntityInputZ.parse({ ...input, tenantId: effectiveTenantId });
      const userId = context.user?.sub || context.user?.id || 'system';

      // Add investigation context to props if provided
      if (parsed.investigationId) {
        parsed.props = {
          ...parsed.props,
          investigationId: parsed.investigationId,
        };
      }

      return await entityRepo.create(parsed, userId);
    },

    updateEntity: async (_: any, { input }: any, context: any) => {
      const parsed = EntityUpdateZ.parse(input);
      return await entityRepo.update(parsed);
    },

    deleteEntity: async (_: any, { id, tenantId }: any, context: any) => {
      const effectiveTenantId = tenantId || context.tenantId;
      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required');
      }

      // Verify entity belongs to tenant before deletion
      const entity = await entityRepo.findById(id, effectiveTenantId);
      if (!entity) {
        return false;
      }

      return await entityRepo.delete(id);
    },

    // Relationship mutations
    createRelationship: async (_: any, { input }: any, context: any) => {
      const effectiveTenantId =
        input.tenantId ||
        context.tenantId ||
        context.user?.tenantId ||
        'default_tenant';
      const parsed = RelationshipInputZ.parse({
        ...input,
        tenantId: effectiveTenantId,
      });
      const userId = context.user?.sub || context.user?.id || 'system';

      // Add investigation context to props if provided
      if (parsed.investigationId) {
        parsed.props = {
          ...parsed.props,
          investigationId: parsed.investigationId,
        };
      }

      return await relationshipRepo.create(parsed, userId);
    },

    deleteRelationship: async (_: any, { id, tenantId }: any, context: any) => {
      const effectiveTenantId = tenantId || context.tenantId;
      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required');
      }

      // Verify relationship belongs to tenant before deletion
      const relationship = await relationshipRepo.findById(
        id,
        effectiveTenantId,
      );
      if (!relationship) {
        return false;
      }

      return await relationshipRepo.delete(id);
    },

    // Investigation mutations
    createInvestigation: async (_: any, { input }: any, context: any) => {
      const userId = context.user?.sub || context.user?.id || 'system';
      const tenantId =
        context.tenantId || context.user?.tenantId || 'default_tenant';
      return await investigationRepo.create({ ...input, tenantId }, userId);
    },

    updateInvestigation: async (_: any, { input }: any, context: any) => {
      return await investigationRepo.update(input);
    },

    deleteInvestigation: async (
      _: any,
      { id, tenantId }: any,
      context: any,
    ) => {
      const effectiveTenantId = tenantId || context.tenantId;
      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required');
      }

      // Verify investigation belongs to tenant before deletion
      const investigation = await investigationRepo.findById(
        id,
        effectiveTenantId,
      );
      if (!investigation) {
        return false;
      }

      return await investigationRepo.delete(id);
    },
  },

  // Field resolvers - with Zod validation
  Entity: {
    relationships: async (parent: any, args: any) => {
      // Validate and parse field arguments
      const parsed = EntityRelationshipsArgsZ.parse(args);

      const directionMap: Record<string, 'incoming' | 'outgoing' | 'both'> = {
        INCOMING: 'incoming',
        OUTGOING: 'outgoing',
        BOTH: 'both',
      };

      // Validate parent entity ID
      EntityIdZ.parse(parent.id);
      if (parent.tenantId) {
        TenantIdZ.parse(parent.tenantId);
      }

      return await relationshipRepo.findByEntityId(
        parent.id,
        parent.tenantId,
        directionMap[parsed.direction],
      );
    },

    relationshipCount: async (parent: any) => {
      // Validate parent entity ID
      EntityIdZ.parse(parent.id);
      if (parent.tenantId) {
        TenantIdZ.parse(parent.tenantId);
      }

      const counts = await relationshipRepo.getEntityRelationshipCount(
        parent.id,
        parent.tenantId,
      );
      return {
        incoming: counts.incoming,
        outgoing: counts.outgoing,
        total: counts.incoming + counts.outgoing,
      };
    },

    investigation: async (parent: any) => {
      const investigationId = parent.props?.investigationId;
      if (!investigationId) return null;

      // Validate IDs
      InvestigationIdZ.parse(investigationId);
      if (parent.tenantId) {
        TenantIdZ.parse(parent.tenantId);
      }

      return await investigationRepo.findById(investigationId, parent.tenantId);
    },
  },

  Relationship: {
    source: async (parent: any) => {
      // Validate IDs from parent
      EntityIdZ.parse(parent.srcId);
      if (parent.tenantId) {
        TenantIdZ.parse(parent.tenantId);
      }

      return await entityRepo.findById(parent.srcId, parent.tenantId);
    },

    destination: async (parent: any) => {
      // Validate IDs from parent
      EntityIdZ.parse(parent.dstId);
      if (parent.tenantId) {
        TenantIdZ.parse(parent.tenantId);
      }

      return await entityRepo.findById(parent.dstId, parent.tenantId);
    },
  },

  Investigation: {
    stats: async (parent: any) => {
      // Validate IDs from parent
      InvestigationIdZ.parse(parent.id);
      if (parent.tenantId) {
        TenantIdZ.parse(parent.tenantId);
      }

      return await investigationRepo.getStats(parent.id, parent.tenantId);
    },

    entities: async (parent: any, args: any) => {
      // Validate and parse field arguments
      const parsed = InvestigationEntitiesArgsZ.parse(args);

      // Validate IDs from parent
      InvestigationIdZ.parse(parent.id);
      if (parent.tenantId) {
        TenantIdZ.parse(parent.tenantId);
      }

      return await entityRepo.search({
        tenantId: parent.tenantId,
        kind: parsed.kind,
        props: { investigationId: parent.id },
        limit: parsed.limit,
        offset: parsed.offset,
      });
    },

    relationships: async (parent: any, args: any) => {
      // Validate and parse field arguments
      const parsed = InvestigationRelationshipsArgsZ.parse(args);

      // Validate IDs from parent
      InvestigationIdZ.parse(parent.id);
      if (parent.tenantId) {
        TenantIdZ.parse(parent.tenantId);
      }

      return await relationshipRepo.search({
        tenantId: parent.tenantId,
        type: parsed.type,
        limit: parsed.limit,
        offset: parsed.offset,
      });
    },
  },
};
