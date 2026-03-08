"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authGuard = void 0;
const graphql_1 = require("graphql");
/**
 * Higher-order function to enforce authentication and tenant isolation.
 * Acts as an invariant layer for resolvers.
 */
const authGuard = (resolver, requiredPermission) => {
    return async (parent, args, context, info) => {
        // 1. Authentication Check
        if (!context.user) {
            throw new graphql_1.GraphQLError('Not authenticated', {
                extensions: { code: 'UNAUTHENTICATED' },
            });
        }
        // 2. Tenant Context Check (Invariant)
        if (!context.user.tenantId) {
            throw new graphql_1.GraphQLError('Tenant context missing', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
        // 3. Permission Check (Optional)
        if (requiredPermission) {
            // Assuming user.permissions or scopes exists
            // This is a placeholder for actual RBAC logic
            const permissions = context.user.permissions || [];
            if (!permissions.includes(requiredPermission)) {
                // Check for wildcards or superadmin
                if (!permissions.includes('*') && !context.user.isSuperAdmin) {
                    throw new graphql_1.GraphQLError(`Missing permission: ${requiredPermission}`, {
                        extensions: { code: 'FORBIDDEN' },
                    });
                }
            }
        }
        return resolver(parent, args, context, info);
    };
};
exports.authGuard = authGuard;
