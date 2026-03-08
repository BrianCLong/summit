"use strict";
// @ts-nocheck
/**
 * Core GraphQL Resolvers - Production persistence layer
 * Replaces demo resolvers with real PostgreSQL + Neo4j operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.coreResolvers = void 0;
const graphql_1 = require("graphql");
const EntityRepo_js_1 = require("../../repos/EntityRepo.js");
const RelationshipRepo_js_1 = require("../../repos/RelationshipRepo.js");
const InvestigationRepo_js_1 = require("../../repos/InvestigationRepo.js");
const neo4j_js_1 = require("../../db/neo4j.js");
const postgres_js_1 = require("../../db/postgres.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const zod_1 = require("zod");
const tenantScope_js_1 = require("../../tenancy/tenantScope.js");
const resolverLogger = logger_js_1.default.child({ name: 'CoreResolvers' });
// ============================================================================
// Base validation schemas with security constraints
// ============================================================================
// Tenant ID validation - alphanumeric with underscores and hyphens only
const TenantIdZ = zod_1.z
    .string()
    .min(1, 'Tenant ID required')
    .max(100, 'Tenant ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Tenant ID must contain only alphanumeric characters, underscores, and hyphens');
// Entity ID validation - must be a valid UUID
const EntityIdZ = zod_1.z
    .string()
    .min(1, 'Entity ID required')
    .uuid('Entity ID must be a valid UUID');
// Relationship ID validation - must be a valid UUID
const RelationshipIdZ = zod_1.z
    .string()
    .min(1, 'Relationship ID required')
    .uuid('Relationship ID must be a valid UUID');
// Investigation ID validation - must be a valid UUID
const InvestigationIdZ = zod_1.z
    .string()
    .min(1, 'Investigation ID required')
    .uuid('Investigation ID must be a valid UUID');
// Entity kind validation - safe pattern only
const EntityKindZ = zod_1.z
    .string()
    .min(1, 'Entity kind required')
    .max(50, 'Entity kind too long')
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Entity kind must start with letter and contain only alphanumeric and underscores')
    .optional();
// Relationship type validation - uppercase with underscores
const RelationshipTypeZ = zod_1.z
    .string()
    .min(1, 'Relationship type required')
    .max(100, 'Relationship type too long')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Relationship type must be uppercase with underscores')
    .optional();
// Pagination validation with safe limits
const LimitZ = zod_1.z
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(1000, 'Limit cannot exceed 1000')
    .default(100);
const OffsetZ = zod_1.z
    .number()
    .int('Offset must be an integer')
    .min(0, 'Offset cannot be negative')
    .default(0);
// Investigation status validation
const InvestigationStatusZ = zod_1.z.enum(['ACTIVE', 'ARCHIVED', 'COMPLETED']);
// Direction validation for relationships
const DirectionZ = zod_1.z
    .enum(['INCOMING', 'OUTGOING', 'BOTH'])
    .default('BOTH');
// Props validation with size and content checks
const PropsZ = zod_1.z
    .record(zod_1.z.unknown())
    .refine((props) => JSON.stringify(props).length <= 32768, 'Properties too large (max 32KB)')
    .refine((props) => {
    // Block potentially dangerous content
    const str = JSON.stringify(props);
    const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
    ];
    return !dangerousPatterns.some((p) => p.test(str));
}, 'Properties contain potentially dangerous content')
    .default({});
// ============================================================================
// Query argument schemas
// ============================================================================
// Single entity query
const EntityQueryArgsZ = zod_1.z.object({
    id: EntityIdZ,
    tenantId: TenantIdZ.optional(),
});
// Entity list/search query
const EntitiesQueryArgsZ = zod_1.z.object({
    input: zod_1.z.object({
        tenantId: TenantIdZ.optional(),
        kind: EntityKindZ,
        props: PropsZ.optional(),
        limit: LimitZ,
        offset: OffsetZ,
    }),
});
// Single relationship query
const RelationshipQueryArgsZ = zod_1.z.object({
    id: RelationshipIdZ,
    tenantId: TenantIdZ.optional(),
});
// Relationship list/search query
const RelationshipsQueryArgsZ = zod_1.z.object({
    input: zod_1.z.object({
        tenantId: TenantIdZ.optional(),
        type: RelationshipTypeZ,
        srcId: EntityIdZ.optional(),
        dstId: EntityIdZ.optional(),
        limit: LimitZ,
        offset: OffsetZ,
    }),
});
// Single investigation query
const InvestigationQueryArgsZ = zod_1.z.object({
    id: InvestigationIdZ,
    tenantId: TenantIdZ.optional(),
});
// Investigation list query
const InvestigationsQueryArgsZ = zod_1.z.object({
    tenantId: TenantIdZ.optional(),
    status: InvestigationStatusZ.optional(),
    limit: LimitZ,
    offset: OffsetZ,
});
// ============================================================================
// Mutation input schemas
// ============================================================================
const EntityInputZ = zod_1.z.object({
    tenantId: TenantIdZ.optional(),
    kind: zod_1.z
        .string()
        .min(1, 'Entity kind required')
        .max(50, 'Entity kind too long')
        .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Entity kind must start with letter and contain only alphanumeric and underscores'),
    labels: zod_1.z.array(zod_1.z.string().max(100)).max(20, 'Maximum 20 labels').default([]),
    props: PropsZ,
    investigationId: InvestigationIdZ.optional(),
});
const EntityUpdateZ = zod_1.z.object({
    id: EntityIdZ,
    tenantId: TenantIdZ.optional(),
    labels: zod_1.z.array(zod_1.z.string().max(100)).max(20, 'Maximum 20 labels').optional(),
    props: PropsZ.optional(),
});
const RelationshipInputZ = zod_1.z.object({
    tenantId: TenantIdZ.optional(),
    srcId: EntityIdZ,
    dstId: EntityIdZ,
    type: zod_1.z
        .string()
        .min(1, 'Relationship type required')
        .max(100, 'Relationship type too long')
        .regex(/^[A-Z][A-Z0-9_]*$/, 'Relationship type must be uppercase with underscores'),
    props: PropsZ,
    investigationId: InvestigationIdZ.optional(),
});
const InvestigationInputZ = zod_1.z.object({
    tenantId: TenantIdZ.optional(),
    name: zod_1.z.string().min(1, 'Investigation name required').max(200),
    description: zod_1.z.string().max(2000).optional(),
    status: InvestigationStatusZ.default('ACTIVE'),
    props: PropsZ,
});
const InvestigationUpdateZ = zod_1.z.object({
    id: InvestigationIdZ,
    tenantId: TenantIdZ.optional(),
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(2000).optional(),
    status: InvestigationStatusZ.optional(),
    props: PropsZ.optional(),
});
const toBadRequestError = (operation, error) => new graphql_1.GraphQLError(`Invalid input for ${operation}`, {
    extensions: {
        code: 'BAD_USER_INPUT',
        http: { status: 400 },
        details: error.flatten(),
    },
});
const parseWithValidation = (schema, value, operation) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
        throw toBadRequestError(operation, parsed.error);
    }
    return parsed.data;
};
const resolveContextTenant = (context) => context.tenantId ?? context.tenant ?? context.user?.tenantId;
const requireTenant = (tenantId, operation) => {
    if (!tenantId) {
        throw new graphql_1.GraphQLError('Tenant ID is required', {
            extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } },
        });
    }
    return (0, tenantScope_js_1.resolveTenantId)(tenantId, operation);
};
const normalizeInvestigationStatus = (status) => status ? status.toLowerCase() : undefined;
// ============================================================================
// Field resolver argument schemas
// ============================================================================
const EntityRelationshipsArgsZ = zod_1.z.object({
    direction: DirectionZ,
    type: RelationshipTypeZ,
    limit: LimitZ,
});
const InvestigationEntitiesArgsZ = zod_1.z.object({
    kind: EntityKindZ,
    limit: LimitZ,
    offset: OffsetZ,
});
const InvestigationRelationshipsArgsZ = zod_1.z.object({
    type: RelationshipTypeZ,
    limit: LimitZ,
    offset: OffsetZ,
});
const directionMap = {
    INCOMING: 'incoming',
    OUTGOING: 'outgoing',
    BOTH: 'both',
};
// Initialize repositories
const pg = (0, postgres_js_1.getPostgresPool)();
const neo4j = (0, neo4j_js_1.getNeo4jDriver)();
const entityRepo = new EntityRepo_js_1.EntityRepo(pg, neo4j);
const relationshipRepo = new RelationshipRepo_js_1.RelationshipRepo(pg, neo4j);
const investigationRepo = new InvestigationRepo_js_1.InvestigationRepo(pg);
// Custom scalars
const DateTimeScalar = new graphql_1.GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime custom scalar type',
    serialize: (value) => value instanceof Date ? value.toISOString() : value,
    parseValue: (value) => {
        if (typeof value === 'string' || value instanceof Date) {
            return new Date(value);
        }
        throw new TypeError('DateTime value must be a string or Date instance');
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING) {
            return new Date(ast.value);
        }
        return null;
    },
});
const JSONScalar = new graphql_1.GraphQLScalarType({
    name: 'JSON',
    description: 'JSON custom scalar type',
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING) {
            return JSON.parse(ast.value);
        }
        return null;
    },
});
exports.coreResolvers = {
    DateTime: DateTimeScalar,
    JSON: JSONScalar,
    Query: {
        // Entity queries - with Zod validation
        entity: async (_parent, args, context) => {
            const parsed = parseWithValidation(EntityQueryArgsZ, args, 'Query.entity');
            const effectiveTenantId = requireTenant(parsed.tenantId ?? resolveContextTenant(context), 'graphql.query.entity');
            resolverLogger.debug({ id: parsed.id, tenantId: effectiveTenantId }, 'entity query');
            return entityRepo.findById(parsed.id, effectiveTenantId);
        },
        entities: async (_parent, args, context) => {
            const { input } = parseWithValidation(EntitiesQueryArgsZ, args, 'Query.entities');
            const effectiveTenantId = requireTenant(input.tenantId ?? resolveContextTenant(context), 'graphql.query.entities');
            resolverLogger.debug({ tenantId: effectiveTenantId, kind: input.kind, limit: input.limit }, 'entities query');
            return entityRepo.search({
                tenantId: effectiveTenantId,
                kind: input.kind,
                props: input.props,
                limit: input.limit,
                offset: input.offset,
            });
        },
        // Relationship queries - with Zod validation
        relationship: async (_parent, args, context) => {
            const parsed = parseWithValidation(RelationshipQueryArgsZ, args, 'Query.relationship');
            const effectiveTenantId = requireTenant(parsed.tenantId ?? resolveContextTenant(context), 'graphql.query.relationship');
            resolverLogger.debug({ id: parsed.id, tenantId: effectiveTenantId }, 'relationship query');
            return relationshipRepo.findById(parsed.id, effectiveTenantId);
        },
        relationships: async (_parent, args, context) => {
            const { input } = parseWithValidation(RelationshipsQueryArgsZ, args, 'Query.relationships');
            const effectiveTenantId = requireTenant(input.tenantId ?? resolveContextTenant(context), 'graphql.query.relationships');
            resolverLogger.debug({ tenantId: effectiveTenantId, type: input.type, limit: input.limit }, 'relationships query');
            return relationshipRepo.search({
                tenantId: effectiveTenantId,
                type: input.type,
                srcId: input.srcId,
                dstId: input.dstId,
                limit: input.limit,
                offset: input.offset,
            });
        },
        // Investigation queries - with Zod validation
        investigation: async (_parent, args, context) => {
            const parsed = parseWithValidation(InvestigationQueryArgsZ, args, 'Query.investigation');
            const effectiveTenantId = requireTenant(parsed.tenantId ?? resolveContextTenant(context), 'graphql.query.investigation');
            resolverLogger.debug({ id: parsed.id, tenantId: effectiveTenantId }, 'investigation query');
            return investigationRepo.findById(parsed.id, effectiveTenantId);
        },
        investigations: async (_parent, args, context) => {
            const parsed = parseWithValidation(InvestigationsQueryArgsZ, args, 'Query.investigations');
            const effectiveTenantId = requireTenant(parsed.tenantId ?? resolveContextTenant(context), 'graphql.query.investigations');
            resolverLogger.debug({ tenantId: effectiveTenantId, status: parsed.status, limit: parsed.limit }, 'investigations query');
            return investigationRepo.list({
                tenantId: effectiveTenantId,
                status: normalizeInvestigationStatus(parsed.status),
                limit: parsed.limit,
                offset: parsed.offset,
            });
        },
        // NOTE: graphNeighborhood and searchEntities are temporarily disabled
        // due to schema mismatch. See ADR-2025-001 for migration plan.
    },
    Mutation: {
        // Entity mutations
        createEntity: async (_parent, { input }, context) => {
            const effectiveTenantId = requireTenant(input?.tenantId ?? resolveContextTenant(context), 'graphql.mutation.createEntity');
            const parsed = parseWithValidation(EntityInputZ, { ...input, tenantId: effectiveTenantId }, 'Mutation.createEntity');
            const userId = context.user?.sub || context.user?.id || 'system';
            const props = parsed.investigationId
                ? { ...parsed.props, investigationId: parsed.investigationId }
                : parsed.props;
            return entityRepo.create({ ...parsed, props }, userId);
        },
        updateEntity: async (_parent, { input }, context) => {
            const parsed = parseWithValidation(EntityUpdateZ, input, 'Mutation.updateEntity');
            const tenantId = requireTenant(parsed.tenantId ?? resolveContextTenant(context), 'graphql.mutation.updateEntity');
            return entityRepo.update({ ...parsed, tenantId });
        },
        deleteEntity: async (_parent, { id, tenantId }, context) => {
            const effectiveTenantId = requireTenant(tenantId ?? resolveContextTenant(context), 'graphql.mutation.deleteEntity');
            const entity = await entityRepo.findById(id, effectiveTenantId);
            if (!entity) {
                return false;
            }
            return entityRepo.delete(id, effectiveTenantId);
        },
        // Relationship mutations
        createRelationship: async (_parent, { input }, context) => {
            const effectiveTenantId = requireTenant(input?.tenantId ?? resolveContextTenant(context), 'graphql.mutation.createRelationship');
            const parsed = parseWithValidation(RelationshipInputZ, { ...input, tenantId: effectiveTenantId }, 'Mutation.createRelationship');
            const userId = context.user?.sub || context.user?.id || 'system';
            const props = parsed.investigationId
                ? { ...parsed.props, investigationId: parsed.investigationId }
                : parsed.props;
            return relationshipRepo.create({ ...parsed, props }, userId);
        },
        deleteRelationship: async (_parent, { id, tenantId }, context) => {
            const effectiveTenantId = requireTenant(tenantId ?? resolveContextTenant(context), 'graphql.mutation.deleteRelationship');
            const relationship = await relationshipRepo.findById(id, effectiveTenantId);
            if (!relationship) {
                return false;
            }
            return relationshipRepo.delete(id);
        },
        // Investigation mutations
        createInvestigation: async (_parent, { input }, context) => {
            const userId = context.user?.sub || context.user?.id || 'system';
            const tenantId = requireTenant(input?.tenantId ?? resolveContextTenant(context), 'graphql.mutation.createInvestigation');
            const parsed = parseWithValidation(InvestigationInputZ, { ...input, tenantId }, 'Mutation.createInvestigation');
            return investigationRepo.create({
                ...parsed,
                tenantId,
                status: normalizeInvestigationStatus(parsed.status) ?? 'active',
            }, userId);
        },
        updateInvestigation: async (_parent, { input }, context) => {
            const parsed = parseWithValidation(InvestigationUpdateZ, input, 'Mutation.updateInvestigation');
            const tenantId = requireTenant(parsed.tenantId ?? resolveContextTenant(context), 'graphql.mutation.updateInvestigation');
            return investigationRepo.update({
                ...parsed,
                tenantId,
                status: normalizeInvestigationStatus(parsed.status),
            });
        },
        deleteInvestigation: async (_parent, { id, tenantId }, context) => {
            const effectiveTenantId = requireTenant(tenantId ?? resolveContextTenant(context), 'graphql.mutation.deleteInvestigation');
            const investigation = await investigationRepo.findById(id, effectiveTenantId);
            if (!investigation) {
                return false;
            }
            return investigationRepo.delete(id, effectiveTenantId);
        },
    },
    // Field resolvers - with Zod validation
    Entity: {
        relationships: async (parent, args) => {
            const parsed = parseWithValidation(EntityRelationshipsArgsZ, args, 'Entity.relationships');
            const tenantId = requireTenant(parent.tenantId, 'graphql.entity.relationships');
            return relationshipRepo.findByEntityId(parent.id, tenantId, directionMap[parsed.direction]);
        },
        relationshipCount: async (parent) => {
            const tenantId = requireTenant(parent.tenantId, 'graphql.entity.relationshipCount');
            const counts = await relationshipRepo.getEntityRelationshipCount(parent.id, tenantId);
            return {
                incoming: counts.incoming,
                outgoing: counts.outgoing,
                total: counts.incoming + counts.outgoing,
            };
        },
        investigation: async (parent) => {
            const investigationId = parent.props?.investigationId;
            if (!investigationId || typeof investigationId !== 'string')
                return null;
            const tenantId = requireTenant(parent.tenantId, 'graphql.entity.investigation');
            return investigationRepo.findById(investigationId, tenantId);
        },
    },
    Relationship: {
        source: async (parent) => {
            const tenantId = requireTenant(parent.tenantId, 'graphql.relationship.source');
            return entityRepo.findById(parent.srcId, tenantId);
        },
        destination: async (parent) => {
            const tenantId = requireTenant(parent.tenantId, 'graphql.relationship.destination');
            return entityRepo.findById(parent.dstId, tenantId);
        },
    },
    Investigation: {
        stats: async (parent) => {
            const tenantId = requireTenant(parent.tenantId, 'graphql.investigation.stats');
            return investigationRepo.getStats(parent.id, tenantId);
        },
        entities: async (parent, args) => {
            const parsed = parseWithValidation(InvestigationEntitiesArgsZ, args, 'Investigation.entities');
            const tenantId = requireTenant(parent.tenantId, 'graphql.investigation.entities');
            return entityRepo.search({
                tenantId,
                kind: parsed.kind,
                props: { investigationId: parent.id },
                limit: parsed.limit,
                offset: parsed.offset,
            });
        },
        relationships: async (parent, args) => {
            const parsed = parseWithValidation(InvestigationRelationshipsArgsZ, args, 'Investigation.relationships');
            const tenantId = requireTenant(parent.tenantId, 'graphql.investigation.relationships');
            return relationshipRepo.search({
                tenantId,
                type: parsed.type,
                limit: parsed.limit,
                offset: parsed.offset,
            });
        },
    },
};
