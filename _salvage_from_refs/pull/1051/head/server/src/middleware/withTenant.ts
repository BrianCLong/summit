/**
 * Tenant Isolation Middleware
 * 
 * Ensures all GraphQL resolvers are scoped to the current user's tenant.
 * Prevents cross-tenant data access at the resolver level.
 */

import { GraphQLError } from 'graphql';
import pino from 'pino';
import { tenantScopeViolationsTotal } from '../monitoring/metrics.js';

const logger = pino({ name: 'withTenant' });

export interface TenantContext {
  user: {
    id: string;
    tenant: string;
    roles: string[];
  };
}

/**
 * Middleware factory that wraps resolvers to enforce tenant scoping
 */
export const withTenant = (resolver: any) => {
  return (parent: any, args: any, context: TenantContext, info: any) => {
    // Ensure user context exists
    if (!context?.user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }

    // Ensure tenant exists
    if (!context.user.tenant) {
      logger.error({ userId: context.user.id }, 'User missing tenant');
      throw new GraphQLError('Missing tenant context', {
        extensions: { code: 'FORBIDDEN' }
      });
    }

    // Add tenantId to args for easy access in resolvers
    const scopedArgs = {
      ...args,
      tenantId: context.user.tenant
    };

    logger.debug({ 
      tenant: context.user.tenant, 
      userId: context.user.id,
      operation: info.fieldName 
    }, 'Tenant-scoped resolver invoked');

    return resolver(parent, scopedArgs, context, info);
  };
};

/**
 * Helper function to create tenant-scoped Redis keys
 */
export const tenantKey = (tenant: string, base: string): string => {
  return `${tenant}:${base}`;
};

/**
 * Helper function to add tenant filter to Neo4j queries
 */
export const addTenantFilter = (cypher: string, params: any, tenantId: string) => {
  // Add tenant filter to WHERE clause or create one
  const hasWhere = cypher.toLowerCase().includes('where');
  const tenantFilter = hasWhere 
    ? ' AND n.tenantId = $tenantId'
    : ' WHERE n.tenantId = $tenantId';
  
<<<<<<< HEAD
  if (resourceTenantId !== userTenantId) {
    logger.warn('Cross-tenant access attempt blocked', {
      userId: context.user?.id,
      userTenant: userTenantId,
      attemptedTenant: resourceTenantId
    });

    tenantScopeViolationsTotal.inc();

    throw new GraphQLError('Access denied: resource not found', {
      extensions: { code: 'FORBIDDEN' }
    });
  }
};

/**
 * Middleware for bulk operations that need tenant validation
 */
export const withTenantBatch = <TArgs = any, TReturn = any>(
  resolver: (parent: any, args: TArgs & { tenantId: string }, context: AuthContext, info: any) => TReturn,
  options: {
    auditOperation?: string;
    maxBatchSize?: number;
  } = {}
) => {
  return async (parent: any, args: TArgs, context: AuthContext, info: any): Promise<TReturn> => {
    const tenantId = requireTenant(context);
    const { maxBatchSize = 100, auditOperation } = options;
    
    // Check batch size limits
    if (Array.isArray((args as any).input) && (args as any).input.length > maxBatchSize) {
      throw new GraphQLError(`Batch size exceeds limit of ${maxBatchSize}`, {
        extensions: { code: 'BAD_REQUEST' }
      });
    }

    if (auditOperation) {
      logger.info('Tenant batch operation', {
        operation: auditOperation,
        tenantId,
        userId: context.user?.id,
        batchSize: Array.isArray((args as any).input) ? (args as any).input.length : 1
      });
    }

    const tenantScopedArgs = { ...args, tenantId } as TArgs & { tenantId: string };
    return resolver(parent, tenantScopedArgs, context, info);
=======
  return {
    cypher: cypher + tenantFilter,
    params: { ...params, tenantId }
>>>>>>> origin/security/multi-tenant
  };
};