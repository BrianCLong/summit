import { GraphQLError } from 'graphql';
import { Action, Principal, ResourceRef } from '../types/identity.js';
import { evaluate } from '../services/AccessControl.js';
import { mutationRoleMatrix } from './authzGuard';

function buildPrincipal(context: any): Principal {
  const user = context?.user || {};
  return {
    kind: (user.kind as Principal['kind']) || 'user',
    id: user.id || 'anonymous',
    tenantId: user.tenantId || context?.tenant || 'unknown',
    roles: user.roles || [],
    scopes: user.scopes || [],
    metadata: user.metadata,
    user,
  };
}

async function ensureAuthz(action: Action, resource: ResourceRef, context: any) {
  const principal = buildPrincipal(context);
  const allowedRoles = mutationRoleMatrix[resource.id || ''];

  if (resource.tenantId && resource.tenantId !== principal.tenantId) {
    throw new GraphQLError('Forbidden: tenant mismatch', {
      extensions: { code: 'FORBIDDEN', action, resource },
    });
  }

  if (!allowedRoles) {
    throw new GraphQLError('Forbidden: unknown mutation', {
      extensions: { code: 'FORBIDDEN', action, resource },
    });
  }

  const hasRole = principal.roles.some((role) => allowedRoles.roles.includes(role));
  const actionMatches = allowedRoles.action === action;

  if (!hasRole || !actionMatches) {
    throw new GraphQLError('Forbidden', {
      extensions: {
        code: 'FORBIDDEN',
        action,
        resource,
        reason: hasRole ? 'action_mismatch' : 'role_mismatch',
      },
    });
  }
}

export function withPolicy(action: string, resolver: any) {
  return async (parent: any, args: any, context: any, info: any) => {
    const actionName: Action = info?.operation?.operation === 'mutation' ? 'execute' : 'read';
    const resource: ResourceRef = {
      type: `graphql.${info?.operation?.operation || 'unknown'}`,
      id: info?.fieldName,
      tenantId: context?.user?.tenantId || context?.tenant || 'unknown',
      attributes: { args },
    };

    if (info?.operation?.operation === 'mutation') {
      await ensureAuthz(actionName, resource, context);
    }

    const decision = await evaluate(
      action,
      context.user,
      resource as unknown as Record<string, unknown>,
      {
      tenant: context?.tenant,
      },
    );
    if (!decision.allow) {
      throw new GraphQLError('Forbidden', {
        extensions: {
          code: 'FORBIDDEN',
          reason: (decision as any).reason || 'policy_denied',
        },
      });
    }
    return resolver(parent, args, context, info);
  };
}

export function wrapResolversWithPolicy(namespace: string, resolvers: any) {
  const wrap = (type: 'Query' | 'Mutation') => {
    const src = resolvers[type] || {};
    return Object.fromEntries(
      Object.entries(src).map(([name, fn]) => [
        name,
        withPolicy(`${namespace}.${type}.${name}`, fn as any),
      ]),
    );
  };
  return {
    ...resolvers,
    Query: wrap('Query'),
    Mutation: wrap('Mutation'),
  };
}
