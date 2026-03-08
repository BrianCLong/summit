"use strict";
/**
 * Tenant Isolation Middleware
 *
 * Ensures all GraphQL resolvers are scoped to the current user's tenant.
 * Prevents cross-tenant data access at the resolver level.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTenantFilter = exports.tenantKey = exports.requireTenant = exports.withTenant = void 0;
const graphql_1 = require("graphql");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'withTenant' });
/**
 * Middleware factory that wraps resolvers to enforce tenant scoping
 */
const withTenant = (resolver) => {
    return (parent, args, context, info) => {
        // Ensure user context exists
        if (!context?.user) {
            throw new graphql_1.GraphQLError('Authentication required', {
                extensions: { code: 'UNAUTHENTICATED' },
            });
        }
        // Ensure tenant exists
        if (!context.user.tenant) {
            logger.error({ userId: context.user.id }, 'User missing tenant');
            throw new graphql_1.GraphQLError('Missing tenant context', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
        // Add tenantId to args for easy access in resolvers
        const scopedArgs = {
            ...args,
            tenantId: context.user.tenant,
        };
        logger.debug({
            tenant: context.user.tenant,
            userId: context.user.id,
            operation: info.fieldName,
        }, 'Tenant-scoped resolver invoked');
        return resolver(parent, scopedArgs, context, info);
    };
};
exports.withTenant = withTenant;
/**
 * Helper function to extract and validate tenant from context
 */
const requireTenant = (context) => {
    if (!context?.user) {
        throw new graphql_1.GraphQLError('Authentication required', {
            extensions: { code: 'UNAUTHENTICATED' },
        });
    }
    if (!context.user.tenant) {
        logger.error({ userId: context.user.id }, 'User missing tenant');
        throw new graphql_1.GraphQLError('Missing tenant context', {
            extensions: { code: 'FORBIDDEN' },
        });
    }
    return context.user.tenant;
};
exports.requireTenant = requireTenant;
/**
 * Helper function to create tenant-scoped Redis keys
 */
const tenantKey = (tenant, base) => {
    return `${tenant}:${base}`;
};
exports.tenantKey = tenantKey;
/**
 * Helper function to add tenant filter to Neo4j queries
 */
const addTenantFilter = (cypher, params, tenantId) => {
    // Add tenant filter to WHERE clause or create one
    const hasWhere = cypher.toLowerCase().includes('where');
    const tenantFilter = hasWhere
        ? ' AND n.tenantId = $tenantId'
        : ' WHERE n.tenantId = $tenantId';
    return {
        cypher: cypher + tenantFilter,
        params: { ...params, tenantId },
    };
};
exports.addTenantFilter = addTenantFilter;
