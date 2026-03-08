"use strict";
/**
 * Enhanced GraphQL Authorization Directives
 * Provides field-level RBAC with role and permission-based access control
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRolePermissions = exports.RolePermissionMapper = exports.AuthorizationError = void 0;
exports.authDirective = authDirective;
exports.rateLimitDirective = rateLimitDirective;
exports.deprecatedDirective = deprecatedDirective;
exports.createAuthContext = createAuthContext;
const graphql_1 = require("graphql");
const utils_1 = require("@graphql-tools/utils");
class AuthorizationError extends Error {
    requiredRoles;
    requiredPermissions;
    userRoles;
    userPermissions;
    constructor(message, requiredRoles, requiredPermissions, userRoles, userPermissions) {
        super(message);
        this.requiredRoles = requiredRoles;
        this.requiredPermissions = requiredPermissions;
        this.userRoles = userRoles;
        this.userPermissions = userPermissions;
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * @auth directive - Requires authentication
 */
function authDirective(directiveName = 'auth') {
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
    const transformer = (schema) => (0, utils_1.mapSchema)(schema, {
        [utils_1.MapperKind.OBJECT_FIELD]: (fieldConfig) => {
            const directive = (0, utils_1.getDirective)(schema, fieldConfig, directiveName)?.[0];
            if (!directive)
                return fieldConfig;
            const { roles, permissions, requireOwnership, ownerField, } = directive;
            const originalResolve = fieldConfig.resolve ?? graphql_1.defaultFieldResolver;
            const authResolve = async (source, args, context, info) => {
                // Check if user is authenticated
                if (!context.user) {
                    throw new AuthorizationError('Authentication required', roles, permissions);
                }
                // Check roles (OR logic - user needs at least one)
                if (roles && roles.length > 0) {
                    const hasRole = roles.some((role) => context.user.roles.includes(role));
                    if (!hasRole) {
                        throw new AuthorizationError(`Access denied. Required roles: ${roles.join(' OR ')}`, roles, permissions, context.user.roles, context.user.permissions);
                    }
                }
                // Check permissions (AND logic - user needs all)
                if (permissions && permissions.length > 0) {
                    const hasAllPermissions = permissions.every((permission) => context.user.permissions.includes(permission));
                    if (!hasAllPermissions) {
                        const missingPermissions = permissions.filter((p) => !context.user.permissions.includes(p));
                        throw new AuthorizationError(`Access denied. Missing permissions: ${missingPermissions.join(', ')}`, roles, permissions, context.user.roles, context.user.permissions);
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
                            throw new AuthorizationError('Access denied. You can only access your own resources', roles, permissions, context.user.roles, context.user.permissions);
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
function rateLimitDirective(directiveName = 'rateLimit') {
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
    const rateLimitStore = new Map();
    const transformer = (schema) => (0, utils_1.mapSchema)(schema, {
        [utils_1.MapperKind.OBJECT_FIELD]: (fieldConfig) => {
            const directive = (0, utils_1.getDirective)(schema, fieldConfig, directiveName)?.[0];
            if (!directive)
                return fieldConfig;
            const { max, window, scope } = directive;
            const originalResolve = fieldConfig.resolve ?? graphql_1.defaultFieldResolver;
            const rateLimitResolve = async (source, args, context, info) => {
                // Determine rate limit key based on scope
                let key;
                switch (scope) {
                    case 'TENANT':
                        key = `${info.fieldName}:tenant:${context.user?.tenantId || 'anonymous'}`;
                        break;
                    case 'USER':
                        key = `${info.fieldName}:user:${context.user?.id || 'anonymous'}`;
                        break;
                    case 'IP':
                        key = `${info.fieldName}:ip:${context.ip || 'unknown'}`;
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
                        throw new Error(`Rate limit exceeded. Try again in ${resetIn} seconds.`);
                    }
                    record.count++;
                }
                else {
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
function deprecatedDirective(directiveName = 'deprecated') {
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
    const transformer = (schema) => (0, utils_1.mapSchema)(schema, {
        [utils_1.MapperKind.OBJECT_FIELD]: (fieldConfig) => {
            const directive = (0, utils_1.getDirective)(schema, fieldConfig, directiveName)?.[0];
            if (!directive)
                return fieldConfig;
            const { reason, removeBy, replaceWith } = directive;
            const originalResolve = fieldConfig.resolve ?? graphql_1.defaultFieldResolver;
            const deprecatedResolve = async (source, args, context, info) => {
                // Log usage of deprecated field
                console.warn(`Deprecated field used: ${info.parentType}.${info.fieldName}`, {
                    reason,
                    removeBy,
                    replaceWith,
                    user: context.user?.id,
                });
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
function formatDeprecationReason(reason, removeBy, replaceWith) {
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
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
}
/**
 * Create authorization context with default values
 */
function createAuthContext(baseContext) {
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
class RolePermissionMapper {
    rolePermissions = new Map();
    /**
     * Define permissions for a role
     */
    defineRole(role, permissions) {
        this.rolePermissions.set(role, permissions);
    }
    /**
     * Get all permissions for given roles
     */
    getPermissionsForRoles(roles) {
        const permissions = new Set();
        for (const role of roles) {
            const rolePerms = this.rolePermissions.get(role) || [];
            rolePerms.forEach((p) => permissions.add(p));
        }
        return Array.from(permissions);
    }
    /**
     * Check if roles grant a specific permission
     */
    hasPermission(roles, permission) {
        return this.getPermissionsForRoles(roles).includes(permission);
    }
}
exports.RolePermissionMapper = RolePermissionMapper;
// Default role-permission mappings
exports.defaultRolePermissions = new RolePermissionMapper();
// Define standard roles
exports.defaultRolePermissions.defineRole('admin', [
    'read:all',
    'write:all',
    'delete:all',
    'manage:users',
    'manage:roles',
    'manage:investigations',
]);
exports.defaultRolePermissions.defineRole('analyst', [
    'read:investigations',
    'write:investigations',
    'read:entities',
    'write:entities',
    'read:relationships',
    'write:relationships',
]);
exports.defaultRolePermissions.defineRole('viewer', [
    'read:investigations',
    'read:entities',
    'read:relationships',
]);
exports.defaultRolePermissions.defineRole('guest', ['read:public']);
