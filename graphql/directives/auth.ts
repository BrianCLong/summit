/**
 * Enhanced GraphQL Authorization Directives
 * Provides field-level RBAC with role and permission-based access control
 */

import {
  defaultFieldResolver,
  GraphQLField,
  GraphQLFieldResolver,
  GraphQLSchema,
} from 'graphql';
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';

// Authorization context interface
export interface AuthContext {
  user?: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
    tenantId?: string;
  };
  policy?: {
    assert: (user: any, scopes: string[], context: any) => void;
  };
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly requiredRoles?: string[],
    public readonly requiredPermissions?: string[],
    public readonly userRoles?: string[],
    public readonly userPermissions?: string[]
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * @auth directive - Requires authentication
 */
export function authDirective(directiveName = 'auth') {
  const typeDefs = `
    directive @${directiveName}(
      """Required roles (OR logic - user must have at least one)"""
      roles: [String!]

      """Required permissions (AND logic - user must have all)"""
      permissions: [String!]

      """Require ownership (user.id must match field argument or parent field)"""
      requireOwnership: Boolean

      """Field path to check ownership against (e.g., "userId" or "author.id")"""
      ownerField: String
    ) on FIELD_DEFINITION | OBJECT
  `;

  const transformer = (schema: GraphQLSchema) =>
    mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig: GraphQLField<any, any>) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
        if (!directive) return fieldConfig;

        const {
          roles,
          permissions,
          requireOwnership,
          ownerField,
        } = directive as {
          roles?: string[];
          permissions?: string[];
          requireOwnership?: boolean;
          ownerField?: string;
        };

        const originalResolve = fieldConfig.resolve ?? defaultFieldResolver;

        const authResolve: GraphQLFieldResolver<any, AuthContext> = async (
          source,
          args,
          context,
          info
        ) => {
          // Check if user is authenticated
          if (!context.user) {
            throw new AuthorizationError(
              'Authentication required',
              roles,
              permissions
            );
          }

          // Check roles (OR logic - user needs at least one)
          if (roles && roles.length > 0) {
            const hasRole = roles.some((role) =>
              context.user!.roles.includes(role)
            );
            if (!hasRole) {
              throw new AuthorizationError(
                `Access denied. Required roles: ${roles.join(' OR ')}`,
                roles,
                permissions,
                context.user.roles,
                context.user.permissions
              );
            }
          }

          // Check permissions (AND logic - user needs all)
          if (permissions && permissions.length > 0) {
            const hasAllPermissions = permissions.every((permission) =>
              context.user!.permissions.includes(permission)
            );
            if (!hasAllPermissions) {
              const missingPermissions = permissions.filter(
                (p) => !context.user!.permissions.includes(p)
              );
              throw new AuthorizationError(
                `Access denied. Missing permissions: ${missingPermissions.join(', ')}`,
                roles,
                permissions,
                context.user.roles,
                context.user.permissions
              );
            }
          }

          // Check ownership
          if (requireOwnership) {
            const ownerId = ownerField
              ? this.getNestedValue(source, ownerField)
              : args.userId || args.id || source?.userId;

            if (ownerId && ownerId !== context.user.id) {
              // Allow admins to bypass ownership check
              const isAdmin = context.user.roles.includes('admin');
              if (!isAdmin) {
                throw new AuthorizationError(
                  'Access denied. You can only access your own resources',
                  roles,
                  permissions,
                  context.user.roles,
                  context.user.permissions
                );
              }
            }
          }

          // Call original resolver
          return originalResolve(source, args, context, info);
        };

        return {
          ...fieldConfig,
          resolve: authResolve,
        };
      },
    });

  return { typeDefs, transformer };
}

/**
 * @rateLimit directive - Rate limiting per user/tenant
 */
export function rateLimitDirective(directiveName = 'rateLimit') {
  const typeDefs = `
    directive @${directiveName}(
      """Maximum requests per window"""
      max: Int!

      """Window duration in seconds"""
      window: Int! = 60

      """Scope: USER or TENANT"""
      scope: RateLimitScope = USER
    ) on FIELD_DEFINITION

    enum RateLimitScope {
      USER
      TENANT
      IP
    }
  `;

  // Simple in-memory rate limiter (use Redis in production)
  const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

  const transformer = (schema: GraphQLSchema) =>
    mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig: GraphQLField<any, any>) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
        if (!directive) return fieldConfig;

        const { max, window, scope } = directive as {
          max: number;
          window: number;
          scope: 'USER' | 'TENANT' | 'IP';
        };

        const originalResolve = fieldConfig.resolve ?? defaultFieldResolver;

        const rateLimitResolve: GraphQLFieldResolver<any, AuthContext> = async (
          source,
          args,
          context,
          info
        ) => {
          // Determine rate limit key based on scope
          let key: string;
          switch (scope) {
            case 'TENANT':
              key = `${info.fieldName}:tenant:${context.user?.tenantId || 'anonymous'}`;
              break;
            case 'USER':
              key = `${info.fieldName}:user:${context.user?.id || 'anonymous'}`;
              break;
            case 'IP':
              key = `${info.fieldName}:ip:${(context as any).ip || 'unknown'}`;
              break;
            default:
              key = `${info.fieldName}:user:${context.user?.id || 'anonymous'}`;
          }

          const now = Date.now();
          const record = rateLimitStore.get(key);

          if (record && record.resetAt > now) {
            // Within window
            if (record.count >= max) {
              const resetIn = Math.ceil((record.resetAt - now) / 1000);
              throw new Error(
                `Rate limit exceeded. Try again in ${resetIn} seconds.`
              );
            }
            record.count++;
          } else {
            // New window
            rateLimitStore.set(key, {
              count: 1,
              resetAt: now + window * 1000,
            });
          }

          // Cleanup old entries periodically
          if (Math.random() < 0.01) {
            for (const [k, v] of rateLimitStore.entries()) {
              if (v.resetAt < now) {
                rateLimitStore.delete(k);
              }
            }
          }

          return originalResolve(source, args, context, info);
        };

        return {
          ...fieldConfig,
          resolve: rateLimitResolve,
        };
      },
    });

  return { typeDefs, transformer };
}

/**
 * @deprecated directive - Mark fields as deprecated with migration info
 */
export function deprecatedDirective(directiveName = 'deprecated') {
  const typeDefs = `
    directive @${directiveName}(
      """Deprecation reason"""
      reason: String!

      """Removal date (YYYY-MM-DD)"""
      removeBy: String

      """Replacement field or type"""
      replaceWith: String
    ) on FIELD_DEFINITION | ENUM_VALUE | INPUT_FIELD_DEFINITION
  `;

  // This directive is handled by GraphQL natively, but we can enhance logging
  const transformer = (schema: GraphQLSchema) =>
    mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig: GraphQLField<any, any>) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
        if (!directive) return fieldConfig;

        const { reason, removeBy, replaceWith } = directive as {
          reason: string;
          removeBy?: string;
          replaceWith?: string;
        };

        const originalResolve = fieldConfig.resolve ?? defaultFieldResolver;

        const deprecatedResolve: GraphQLFieldResolver<any, any> = async (
          source,
          args,
          context,
          info
        ) => {
          // Log usage of deprecated field
          console.warn(
            `Deprecated field used: ${info.parentType}.${info.fieldName}`,
            {
              reason,
              removeBy,
              replaceWith,
              user: (context as AuthContext).user?.id,
            }
          );

          return originalResolve(source, args, context, info);
        };

        return {
          ...fieldConfig,
          resolve: deprecatedResolve,
          deprecationReason: formatDeprecationReason(reason, removeBy, replaceWith),
        };
      },
    });

  return { typeDefs, transformer };
}

/**
 * Helper to format deprecation reason
 */
function formatDeprecationReason(
  reason: string,
  removeBy?: string,
  replaceWith?: string
): string {
  let formatted = reason;
  if (replaceWith) {
    formatted += ` Use \`${replaceWith}\` instead.`;
  }
  if (removeBy) {
    formatted += ` This field will be removed on ${removeBy}.`;
  }
  return formatted;
}

/**
 * Helper to get nested value from object
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

/**
 * Create authorization context with default values
 */
export function createAuthContext(baseContext: any): AuthContext {
  return {
    ...baseContext,
    user: baseContext.user
      ? {
          ...baseContext.user,
          roles: baseContext.user.roles || [],
          permissions: baseContext.user.permissions || [],
        }
      : undefined,
  };
}

/**
 * Role-based permission mapper
 */
export class RolePermissionMapper {
  private rolePermissions: Map<string, string[]> = new Map();

  /**
   * Define permissions for a role
   */
  defineRole(role: string, permissions: string[]): void {
    this.rolePermissions.set(role, permissions);
  }

  /**
   * Get all permissions for given roles
   */
  getPermissionsForRoles(roles: string[]): string[] {
    const permissions = new Set<string>();
    for (const role of roles) {
      const rolePerms = this.rolePermissions.get(role) || [];
      rolePerms.forEach((p) => permissions.add(p));
    }
    return Array.from(permissions);
  }

  /**
   * Check if roles grant a specific permission
   */
  hasPermission(roles: string[], permission: string): boolean {
    return this.getPermissionsForRoles(roles).includes(permission);
  }
}

// Default role-permission mappings
export const defaultRolePermissions = new RolePermissionMapper();

// Define standard roles
defaultRolePermissions.defineRole('admin', [
  'read:all',
  'write:all',
  'delete:all',
  'manage:users',
  'manage:roles',
  'manage:investigations',
]);

defaultRolePermissions.defineRole('analyst', [
  'read:investigations',
  'write:investigations',
  'read:entities',
  'write:entities',
  'read:relationships',
  'write:relationships',
]);

defaultRolePermissions.defineRole('viewer', [
  'read:investigations',
  'read:entities',
  'read:relationships',
]);

defaultRolePermissions.defineRole('guest', ['read:public']);
