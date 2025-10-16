/**
 * Tenant Isolation Middleware
 *
 * Ensures all GraphQL resolvers are scoped to the current user's tenant.
 * Prevents cross-tenant data access at the resolver level.
 */
import { GraphQLError } from 'graphql';
import pino from 'pino';
const logger = pino({ name: 'withTenant' });
/**
 * Middleware factory that wraps resolvers to enforce tenant scoping
 */
export const withTenant = (resolver) => {
    return (parent, args, context, info) => {
        // Ensure user context exists
        if (!context?.user) {
            throw new GraphQLError('Authentication required', {
                extensions: { code: 'UNAUTHENTICATED' },
            });
        }
        // Ensure tenant exists
        if (!context.user.tenant) {
            logger.error({ userId: context.user.id }, 'User missing tenant');
            throw new GraphQLError('Missing tenant context', {
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
/**
 * Helper function to create tenant-scoped Redis keys
 */
export const tenantKey = (tenant, base) => {
    return `${tenant}:${base}`;
};
/**
 * Helper function to add tenant filter to Neo4j queries
 */
export const addTenantFilter = (cypher, params, tenantId) => {
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
//# sourceMappingURL=withTenant.js.map