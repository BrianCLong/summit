/**
 * Enhanced Tenant Validation Middleware
 * Provides comprehensive tenant isolation at API, DB, and cache layers
 *
 * ✅ SCAFFOLD ELIMINATED: Fixed regex injection vulnerability in Neo4j query handling
 */

import { GraphQLError } from 'graphql';
import pino from 'pino';
import { TenantContext as CanonicalTenantContext } from '../tenancy/types.js';

const logger = (pino as any)({ name: 'tenantValidator' });

export interface TenantContext extends CanonicalTenantContext {
  userId: string;
  roles: string[];
  permissions: string[];
}

export interface TenantValidationOptions {
  requireExplicitTenant?: boolean;
  allowSystemAccess?: boolean;
  validateOwnership?: boolean;
  cacheScope?: 'tenant' | 'global' | 'user';
}

/**
 * Configuration for Neo4j tenant enforcement
 */
export interface Neo4jTenantEnforcement {
  /**
   * If true, throw error if query doesn't include tenant filtering
   * If false, log warning only
   */
  strict: boolean;

  /**
   * Node labels that require tenant isolation (e.g., ['Investigation', 'Entity'])
   * If empty, all nodes are checked
   */
  requiredLabels?: string[];
}

/**
 * Validates tenant access and creates secure tenant context
 */
export class TenantValidator {
  /**
   * Validate tenant access for a given operation
   */
  static validateTenantAccess(
    context: any,
    resourceTenantId?: string,
    options: TenantValidationOptions = {},
  ): TenantContext {
    const {
      requireExplicitTenant = true,
      allowSystemAccess = false,
      validateOwnership = true,
    } = options;

    // Extract tenant context from request
    const userTenantId = context.user?.tenantId;
    const userId = context.user?.id;
    const roles = context.user?.roles || [];
    const environment =
      (context.tenant as any)?.environment ||
      (context.user as any)?.environment ||
      (process.env.NODE_ENV?.startsWith('prod')
        ? 'prod'
        : process.env.NODE_ENV?.startsWith('stag')
          ? 'staging'
          : 'dev');
    const privilegeTier =
      (context.tenant as any)?.privilegeTier ||
      (context.user as any)?.privilegeTier ||
      (roles.includes('SUPER_ADMIN') || roles.includes('SYSTEM')
        ? 'break-glass'
        : roles.includes('ADMIN')
          ? 'elevated'
          : 'standard');

    // System-level access check
    if (
      allowSystemAccess &&
      (roles.includes('SYSTEM') || roles.includes('SUPER_ADMIN'))
    ) {
      logger.info(`System-level access granted for user ${userId}`);
      return {
        tenantId: resourceTenantId || userTenantId || 'system',
        userId,
        roles,
        permissions: ['*'],
        environment,
        privilegeTier,
      };
    }

    // Validate user has tenant context
    if (requireExplicitTenant && !userTenantId) {
      logger.error(
        `Tenant isolation violation: User ${userId} lacks tenant context`,
      );
      throw new GraphQLError('Tenant context required', {
        extensions: {
          code: 'TENANT_REQUIRED',
          userId,
        },
      });
    }

    // Cross-tenant access validation
    if (
      validateOwnership &&
      resourceTenantId &&
      resourceTenantId !== userTenantId
    ) {
      logger.error(
        `Cross-tenant access denied: User ${userId} (tenant: ${userTenantId}) attempted to access resource (tenant: ${resourceTenantId})`,
      );
      throw new GraphQLError('Cross-tenant access denied', {
        extensions: {
          code: 'CROSS_TENANT_ACCESS_DENIED',
          userTenant: userTenantId,
          resourceTenant: resourceTenantId,
        },
      });
    }

    const effectiveTenantId = resourceTenantId || userTenantId;

    logger.debug(
      `Tenant access validated for user ${userId}, tenant ${effectiveTenantId}`,
    );

    return {
      tenantId: effectiveTenantId,
      userId,
      roles,
      permissions: this.calculatePermissions(roles),
      environment,
      privilegeTier,
    };
  }

  /**
   * Generate tenant-scoped cache key
   */
  static getTenantCacheKey(
    baseKey: string,
    tenantContext: TenantContext,
    scope: 'tenant' | 'global' | 'user' = 'tenant',
  ): string {
    switch (scope) {
      case 'tenant':
        return `tenant:${tenantContext.tenantId}:${baseKey}`;
      case 'user':
        return `user:${tenantContext.userId}:${baseKey}`;
      case 'global':
        return baseKey;
      default:
        return `tenant:${tenantContext.tenantId}:${baseKey}`;
    }
  }

  /**
   * Generate tenant-scoped database query constraints
   */
  static getTenantQueryConstraints(
    tenantContext: TenantContext,
  ): Record<string, any> {
    return {
      tenantId: tenantContext.tenantId,
      // Additional constraints for multi-tenancy
      deletedAt: null,
      status: { $ne: 'archived' },
    };
  }

  /**
   * Prepare Neo4j query with tenant context parameter
   *
   * ✅ SECURITY FIX: Removed dangerous regex-based query rewriting
   *
   * PREVIOUS VULNERABILITY:
   * - Used regex to inject tenant filtering into Cypher queries
   * - Could be bypassed with formatting tricks
   * - String manipulation instead of parameterization
   * - Hardcoded node variable names (assumed 'n')
   * - Skipped filtering if 'tenantId' string found anywhere
   *
   * NEW SECURE APPROACH:
   * - Adds tenantId to parameters (safe parameterization)
   * - Validates that query includes tenant filtering
   * - Throws error if tenant isolation not explicitly implemented
   * - Forces developers to write tenant-aware queries
   *
   * @param cypherQuery - Cypher query that MUST include tenant filtering
   * @param parameters - Query parameters
   * @param tenantContext - Tenant context to enforce
   * @param enforcement - Enforcement configuration
   * @returns Enhanced query parameters with tenantId
   * @throws Error if query lacks tenant filtering and strict mode enabled
   */
  static prepareTenantScopedNeo4jQuery(
    cypherQuery: string,
    parameters: Record<string, any>,
    tenantContext: TenantContext,
    enforcement: Neo4jTenantEnforcement = { strict: true },
  ): { query: string; parameters: Record<string, any> } {
    // Add tenant parameter to query parameters
    const enhancedParams = {
      ...parameters,
      tenantId: tenantContext.tenantId,
    };

    // Validate that query includes tenant filtering
    const hasTenantFilter = this.validateNeo4jTenantIsolation(
      cypherQuery,
      enforcement,
    );

    if (!hasTenantFilter) {
      const errorMessage =
        `SECURITY: Neo4j query lacks tenant isolation for tenant ${tenantContext.tenantId}. ` +
        `All queries MUST filter by tenantId parameter. ` +
        `Example: MATCH (n:Node {tenantId: $tenantId}) or WHERE n.tenantId = $tenantId`;

      if (enforcement.strict) {
        logger.error(errorMessage);
        throw new Error(errorMessage);
      } else {
        logger.warn(errorMessage);
      }
    }

    logger.debug(
      `Prepared Neo4j query with tenant parameter for tenant ${tenantContext.tenantId}`,
    );

    return {
      query: cypherQuery,
      parameters: enhancedParams,
    };
  }

  /**
   * Validate that a Neo4j query includes proper tenant isolation
   *
   * Checks for common patterns that indicate tenant filtering:
   * - {tenantId: $tenantId} in node patterns
   * - WHERE clauses with tenantId checks
   * - SET tenantId = $tenantId for CREATE/MERGE
   *
   * @param query - Cypher query to validate
   * @param enforcement - Enforcement configuration
   * @returns true if query appears to include tenant filtering
   */
  private static validateNeo4jTenantIsolation(
    query: string,
    enforcement: Neo4jTenantEnforcement,
  ): boolean {
    const normalizedQuery = query.toLowerCase();

    // Check for tenant filtering patterns
    const hasTenantInNodePattern =
      /\{[^}]*tenantid\s*:\s*\$tenantid[^}]*\}/i.test(query);
    const hasTenantInWhere =
      /where\s+[^;]*\.tenantid\s*=\s*\$tenantid/i.test(query);
    const hasTenantInSet = /set\s+[^;]*\.tenantid\s*=\s*\$tenantid/i.test(
      query,
    );

    // Query has tenant filtering if any pattern matches
    const hasFiltering =
      hasTenantInNodePattern || hasTenantInWhere || hasTenantInSet;

    // If requiredLabels specified, validate they're present in query
    if (enforcement.requiredLabels && enforcement.requiredLabels.length > 0) {
      for (const label of enforcement.requiredLabels) {
        const labelPattern = new RegExp(`:${label}\\b`, 'i');
        if (labelPattern.test(query)) {
          // This label is in the query - ensure it has tenant filtering nearby
          const labelIndex = normalizedQuery.indexOf(`:${label.toLowerCase()}`);
          const querySegment = normalizedQuery.slice(
            Math.max(0, labelIndex - 100),
            labelIndex + 200,
          );

          if (!querySegment.includes('tenantid')) {
            logger.warn(
              `Query includes label ${label} but lacks nearby tenant filtering`,
            );
            return false;
          }
        }
      }
    }

    return hasFiltering;
  }

  /**
   * Helper to build tenant-scoped MATCH clause
   *
   * @param nodeVar - Node variable name (e.g., 'n', 'user', 'inv')
   * @param nodeLabel - Node label (e.g., 'Investigation', 'Entity')
   * @param additionalProps - Additional properties to match
   * @returns Cypher MATCH clause with tenant filtering
   *
   * @example
   * buildTenantMatch('inv', 'Investigation', { status: 'active' })
   * // Returns: "MATCH (inv:Investigation {tenantId: $tenantId, status: $status})"
   */
  static buildTenantMatch(
    nodeVar: string,
    nodeLabel: string,
    additionalProps: Record<string, string> = {},
  ): string {
    const props = Object.keys(additionalProps)
      .map((key) => `${key}: $${additionalProps[key]}`)
      .join(', ');

    const propsClause = props ? `, ${props}` : '';

    return `MATCH (${nodeVar}:${nodeLabel} {tenantId: $tenantId${propsClause}})`;
  }

  /**
   * Helper to build tenant-scoped WHERE clause
   *
   * @param nodeVar - Node variable name
   * @returns Cypher WHERE clause for tenant filtering
   *
   * @example
   * buildTenantWhere('n')
   * // Returns: "n.tenantId = $tenantId"
   */
  static buildTenantWhere(nodeVar: string): string {
    return `${nodeVar}.tenantId = $tenantId`;
  }

  /**
   * Calculate user permissions based on roles
   */
  private static calculatePermissions(roles: string[]): string[] {
    const permissions: Set<string> = new Set();

    roles.forEach((role) => {
      switch (role.toUpperCase()) {
        case 'SUPER_ADMIN':
        case 'SYSTEM':
          permissions.add('*');
          break;
        case 'ADMIN':
          permissions.add('investigations:*');
          permissions.add('entities:*');
          permissions.add('relationships:*');
          permissions.add('users:read');
          break;
        case 'ANALYST':
          permissions.add('investigations:read');
          permissions.add('investigations:write');
          permissions.add('entities:read');
          permissions.add('entities:write');
          permissions.add('relationships:read');
          permissions.add('relationships:write');
          permissions.add('graphrag:query');
          break;
        case 'VIEWER':
          permissions.add('investigations:read');
          permissions.add('entities:read');
          permissions.add('relationships:read');
          break;
        default:
          break;
      }
    });

    return Array.from(permissions);
  }

  /**
   * Middleware factory for GraphQL resolvers
   */
  static createTenantMiddleware(options: TenantValidationOptions = {}) {
    return (resolver: any) => {
      return async (parent: any, args: any, context: any, info: any) => {
        try {
          // Extract resource tenant ID from arguments if available
          const resourceTenantId =
            args.tenantId || args.input?.tenantId || parent?.tenantId;

          // Validate tenant access
          const tenantContext = TenantValidator.validateTenantAccess(
            context,
            resourceTenantId,
            options,
          );

          // Enhance context with validated tenant information
          const enhancedContext = {
            ...context,
            tenant: tenantContext,
            getTenantCacheKey: (
              baseKey: string,
              scope?: 'tenant' | 'global' | 'user',
            ) =>
              TenantValidator.getTenantCacheKey(baseKey, tenantContext, scope),
            getTenantQueryConstraints: () =>
              TenantValidator.getTenantQueryConstraints(tenantContext),
            prepareTenantNeo4jQuery: (
              query: string,
              params: Record<string, any>,
              enforcement?: Neo4jTenantEnforcement,
            ) =>
              TenantValidator.prepareTenantScopedNeo4jQuery(
                query,
                params,
                tenantContext,
                enforcement,
              ),
            buildTenantMatch: TenantValidator.buildTenantMatch,
            buildTenantWhere: TenantValidator.buildTenantWhere,
          };

          // Call original resolver with enhanced context
          return await resolver(parent, args, enhancedContext, info);
        } catch (error) {
          logger.error(
            `Tenant validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          throw error;
        }
      };
    };
  }
}

export const {
  validateTenantAccess,
  getTenantCacheKey,
  prepareTenantScopedNeo4jQuery,
  buildTenantMatch,
  buildTenantWhere,
} = TenantValidator;
export const tenantMiddleware = TenantValidator.createTenantMiddleware;
