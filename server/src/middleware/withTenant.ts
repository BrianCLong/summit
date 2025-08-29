/**
 * Multi-tenant safety middleware for GraphQL resolvers
 * Ensures all operations are scoped to the authenticated user's tenant
 */

import { GraphQLError } from 'graphql';
import pino from 'pino';
import { tenantScopeViolationsTotal } from '../monitoring/metrics.js';

const logger = pino({ name: 'withTenant' });

interface AuthContext {
  user?: {
    id: string;
    tenantId?: string;
    role?: string;
  };
  tenantId?: string;
  isAuthenticated: boolean;
}

interface TenantScopedArgs {
  tenantId?: string;
  [key: string]: any;
}

/**
 * Ensures the user has a tenant and threads it through resolver args
 */
export const requireTenant = (context: AuthContext): string => {
  if (!context.isAuthenticated || !context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  if (!context.user.tenantId) {
    throw new GraphQLError('User has no tenant assignment', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  return context.user.tenantId;
};

/**
 * Resolver decorator that automatically injects tenantId from context
 * and validates tenant access
 */
export const withTenant = <TArgs = any, TReturn = any>(
  resolver: (
    parent: any,
    args: TArgs & { tenantId: string },
    context: AuthContext,
    info: any,
  ) => TReturn,
) => {
  return (parent: any, args: TArgs, context: AuthContext, info: any): TReturn => {
    const tenantId = requireTenant(context);

    // Thread tenant ID through args
    const tenantScopedArgs = { ...args, tenantId } as TArgs & { tenantId: string };

    logger.debug('Tenant-scoped resolver called', {
      resolver: info.fieldName,
      tenantId,
      userId: context.user?.id,
    });

    return resolver(parent, tenantScopedArgs, context, info);
  };
};

/**
 * Validate that a resource belongs to the user's tenant
 */
export const validateTenantAccess = (context: AuthContext, resourceTenantId: string): void => {
  const userTenantId = requireTenant(context);

  if (resourceTenantId !== userTenantId) {
    logger.warn('Cross-tenant access attempt blocked', {
      userId: context.user?.id,
      userTenant: userTenantId,
      attemptedTenant: resourceTenantId,
    });

    tenantScopeViolationsTotal.inc();

    throw new GraphQLError('Access denied: resource not found', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
};

/**
 * Middleware for bulk operations that need tenant validation
 */
export const withTenantBatch = <TArgs = any, TReturn = any>(
  resolver: (
    parent: any,
    args: TArgs & { tenantId: string },
    context: AuthContext,
    info: any,
  ) => TReturn,
  options: {
    auditOperation?: string;
    maxBatchSize?: number;
  } = {},
) => {
  return async (parent: any, args: TArgs, context: AuthContext, info: any): Promise<TReturn> => {
    const tenantId = requireTenant(context);
    const { maxBatchSize = 100, auditOperation } = options;

    // Check batch size limits
    if (Array.isArray((args as any).input) && (args as any).input.length > maxBatchSize) {
      throw new GraphQLError(`Batch size exceeds limit of ${maxBatchSize}`, {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    if (auditOperation) {
      logger.info('Tenant batch operation', {
        operation: auditOperation,
        tenantId,
        userId: context.user?.id,
        batchSize: Array.isArray((args as any).input) ? (args as any).input.length : 1,
      });
    }

    const tenantScopedArgs = { ...args, tenantId } as TArgs & { tenantId: string };
    return resolver(parent, tenantScopedArgs, context, info);
  };
};

/**
 * Generate tenant-scoped Redis cache keys
 */
export const getTenantCacheKey = (tenantId: string, baseKey: string): string => {
  return `tenant:${tenantId}:${baseKey}`;
};

/**
 * Get tenant-scoped database filter for Neo4j queries
 */
export const getTenantFilter = (tenantId: string): { tenantId: string } => {
  return { tenantId };
};

export default withTenant;
