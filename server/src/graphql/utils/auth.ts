import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../apollo-v5-server.js';

type ResolverFn = (parent: any, args: any, context: GraphQLContext, info: any) => Promise<any> | any;

/**
 * Higher-order function to enforce authentication and tenant isolation.
 * Acts as an invariant layer for resolvers.
 */
export const authGuard = (resolver: ResolverFn, requiredPermission?: string) => {
  return async (parent: any, args: any, context: GraphQLContext, info: any) => {
    // 1. Authentication Check
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // 2. Tenant Context Check (Invariant)
    if (!context.user.tenantId) {
      throw new GraphQLError('Tenant context missing', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // 3. Permission Check (Optional)
    if (requiredPermission) {
        // Assuming user.permissions or scopes exists
        // This is a placeholder for actual RBAC logic
        const permissions = (context.user as any).permissions || [];
        if (!permissions.includes(requiredPermission)) {
            // Check for wildcards or superadmin
            if (!permissions.includes('*') && !(context.user as any).isSuperAdmin) {
                 throw new GraphQLError(`Missing permission: ${requiredPermission}`, {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
        }
    }

    return resolver(parent, args, context, info);
  };
};
