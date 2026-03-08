"use strict";
/**
 * CompanyOS Tenant API - GraphQL Resolvers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const index_js_1 = require("../services/index.js");
const postgres_js_1 = require("../db/postgres.js");
const graphql_1 = require("graphql");
// Custom DateTime scalar
const DateTimeScalar = new graphql_1.GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime custom scalar type',
    serialize(value) {
        if (value instanceof Date) {
            return value.toISOString();
        }
        throw new Error('DateTime cannot represent non-Date value');
    },
    parseValue(value) {
        if (typeof value === 'string' || typeof value === 'number') {
            return new Date(value);
        }
        throw new Error('DateTime cannot parse non-string/number value');
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING || ast.kind === graphql_1.Kind.INT) {
            return new Date(ast.kind === graphql_1.Kind.INT ? ast.value : ast.value);
        }
        return null;
    },
});
// Custom JSON scalar
const JSONScalar = new graphql_1.GraphQLScalarType({
    name: 'JSON',
    description: 'JSON custom scalar type',
    serialize(value) {
        return value;
    },
    parseValue(value) {
        return value;
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING) {
            try {
                return JSON.parse(ast.value);
            }
            catch {
                return ast.value;
            }
        }
        if (ast.kind === graphql_1.Kind.INT) {
            return parseInt(ast.value, 10);
        }
        if (ast.kind === graphql_1.Kind.FLOAT) {
            return parseFloat(ast.value);
        }
        if (ast.kind === graphql_1.Kind.BOOLEAN) {
            return ast.value;
        }
        if (ast.kind === graphql_1.Kind.NULL) {
            return null;
        }
        if (ast.kind === graphql_1.Kind.OBJECT) {
            const obj = {};
            for (const field of ast.fields) {
                obj[field.name.value] = JSONScalar.parseLiteral(field.value);
            }
            return obj;
        }
        if (ast.kind === graphql_1.Kind.LIST) {
            return ast.values.map((v) => JSONScalar.parseLiteral(v));
        }
        return null;
    },
});
// Helper to get actor info from context
function getActor(context) {
    return {
        id: context.user?.id,
        email: context.user?.email,
        ip: context.clientIp,
    };
}
exports.resolvers = {
    DateTime: DateTimeScalar,
    JSON: JSONScalar,
    Query: {
        // Tenant queries
        tenant: async (_parent, { id }, context) => {
            context.logger.info({ tenantId: id }, 'Fetching tenant by ID');
            return index_js_1.tenantService.getTenantById(id);
        },
        tenantBySlug: async (_parent, { slug }, context) => {
            context.logger.info({ slug }, 'Fetching tenant by slug');
            return index_js_1.tenantService.getTenantBySlug(slug);
        },
        tenants: async (_parent, { status, limit, offset, }, context) => {
            context.logger.info({ status, limit, offset }, 'Listing tenants');
            const result = await index_js_1.tenantService.listTenants({ status, limit, offset });
            return {
                tenants: result.tenants,
                totalCount: result.totalCount,
                pageInfo: {
                    hasNextPage: (offset || 0) + (limit || 50) < result.totalCount,
                    hasPreviousPage: (offset || 0) > 0,
                },
            };
        },
        // Feature flag queries
        tenantFeatures: async (_parent, { tenantId }, context) => {
            context.logger.info({ tenantId }, 'Fetching tenant features');
            return index_js_1.tenantService.getTenantFeatures(tenantId);
        },
        effectiveFeatureFlags: async (_parent, { tenantId }, context) => {
            context.logger.info({ tenantId }, 'Getting effective feature flags');
            return index_js_1.tenantService.getEffectiveFeatureFlags(tenantId);
        },
        // Audit queries
        auditEvents: async (_parent, { filter, limit, offset, }, context) => {
            context.logger.info({ filter, limit, offset }, 'Querying audit events');
            const result = await index_js_1.auditService.getAuditEvents({
                ...filter,
                limit,
                offset,
            });
            return {
                events: result.events,
                totalCount: result.totalCount,
                pageInfo: {
                    hasNextPage: (offset || 0) + (limit || 100) < result.totalCount,
                    hasPreviousPage: (offset || 0) > 0,
                },
            };
        },
        // Health check
        _health: async (_parent, _args, context) => {
            const dbHealthy = await (0, postgres_js_1.healthCheck)();
            return {
                status: dbHealthy ? 'healthy' : 'unhealthy',
                timestamp: new Date(),
                version: process.env.npm_package_version || '0.1.0',
                services: {
                    postgres: dbHealthy ? 'healthy' : 'unhealthy',
                },
            };
        },
    },
    Mutation: {
        // Tenant mutations
        createTenant: async (_parent, { input }, context) => {
            context.logger.info({ input }, 'Creating tenant');
            const tenant = await index_js_1.tenantService.createTenant(input, context.user?.id);
            // Log audit event
            await index_js_1.auditService.logTenantCreated(tenant.id, { name: tenant.name, slug: tenant.slug, dataRegion: tenant.dataRegion }, getActor(context));
            context.logger.info({ tenantId: tenant.id, slug: tenant.slug }, 'Tenant created successfully');
            return tenant;
        },
        updateTenant: async (_parent, { id, input }, context) => {
            context.logger.info({ tenantId: id, input }, 'Updating tenant');
            const before = await index_js_1.tenantService.getTenantById(id);
            if (!before) {
                throw new Error(`Tenant not found: ${id}`);
            }
            const tenant = await index_js_1.tenantService.updateTenant(id, input, context.user?.id);
            if (!tenant) {
                throw new Error(`Failed to update tenant: ${id}`);
            }
            // Log audit event
            await index_js_1.auditService.logTenantUpdated(id, { name: before.name, status: before.status }, { name: tenant.name, status: tenant.status }, getActor(context));
            context.logger.info({ tenantId: id }, 'Tenant updated successfully');
            return tenant;
        },
        deleteTenant: async (_parent, { id }, context) => {
            context.logger.info({ tenantId: id }, 'Deleting tenant');
            const success = await index_js_1.tenantService.deleteTenant(id, context.user?.id);
            if (success) {
                await index_js_1.auditService.logTenantDeleted(id, getActor(context));
                context.logger.info({ tenantId: id }, 'Tenant deleted successfully');
            }
            return success;
        },
        // Feature flag mutations
        setFeatureFlag: async (_parent, { input }, context) => {
            context.logger.info({ input }, 'Setting feature flag');
            const feature = await index_js_1.tenantService.setFeatureFlag(input, context.user?.id);
            await index_js_1.auditService.logFeatureFlagChanged(input.tenantId, input.flagName, input.enabled, getActor(context));
            context.logger.info({
                tenantId: input.tenantId,
                flagName: input.flagName,
                enabled: input.enabled,
            }, 'Feature flag updated');
            return feature;
        },
        enableFeatureFlag: async (_parent, { tenantId, flagName }, context) => {
            return exports.resolvers.Mutation.setFeatureFlag(_parent, { input: { tenantId, flagName, enabled: true } }, context);
        },
        disableFeatureFlag: async (_parent, { tenantId, flagName }, context) => {
            return exports.resolvers.Mutation.setFeatureFlag(_parent, { input: { tenantId, flagName, enabled: false } }, context);
        },
    },
    // Type resolvers
    Tenant: {
        features: async (parent, _args, context) => {
            return index_js_1.tenantService.getTenantFeatures(parent.id);
        },
        effectiveFlags: async (parent, _args, context) => {
            return index_js_1.tenantService.getEffectiveFeatureFlags(parent.id);
        },
    },
};
