"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPolicy = withPolicy;
exports.wrapResolversWithPolicy = wrapResolversWithPolicy;
const graphql_1 = require("graphql");
const AccessControl_js_1 = require("../services/AccessControl.js");
const authzGuard_js_1 = require("./authzGuard.js");
function buildPrincipal(context) {
    const user = context?.user || {};
    return {
        kind: user.kind || 'user',
        id: user.id || 'anonymous',
        tenantId: user.tenantId || context?.tenant || 'unknown',
        roles: user.roles || [],
        scopes: user.scopes || [],
        metadata: user.metadata,
        user,
    };
}
async function ensureAuthz(action, resource, context) {
    const principal = buildPrincipal(context);
    const allowedRoles = authzGuard_js_1.mutationRoleMatrix[resource.id || ''];
    if (resource.tenantId && resource.tenantId !== principal.tenantId) {
        throw new graphql_1.GraphQLError('Forbidden: tenant mismatch', {
            extensions: { code: 'FORBIDDEN', action, resource },
        });
    }
    if (!allowedRoles) {
        throw new graphql_1.GraphQLError('Forbidden: unknown mutation', {
            extensions: { code: 'FORBIDDEN', action, resource },
        });
    }
    const hasRole = principal.roles.some((role) => allowedRoles.roles.includes(role));
    const actionMatches = allowedRoles.action === action;
    if (!hasRole || !actionMatches) {
        throw new graphql_1.GraphQLError('Forbidden', {
            extensions: {
                code: 'FORBIDDEN',
                action,
                resource,
                reason: hasRole ? 'action_mismatch' : 'role_mismatch',
            },
        });
    }
}
function withPolicy(action, resolver) {
    return async (parent, args, context, info) => {
        const actionName = info?.operation?.operation === 'mutation' ? 'execute' : 'read';
        const resource = {
            type: `graphql.${info?.operation?.operation || 'unknown'}`,
            id: info?.fieldName,
            tenantId: context?.user?.tenantId || context?.tenant || 'unknown',
            attributes: { args },
        };
        if (info?.operation?.operation === 'mutation') {
            await ensureAuthz(actionName, resource, context);
        }
        const decision = await (0, AccessControl_js_1.evaluate)(action, context.user, resource, {
            tenant: context?.tenant,
        });
        if (!decision.allow) {
            throw new graphql_1.GraphQLError('Forbidden', {
                extensions: {
                    code: 'FORBIDDEN',
                    reason: decision.reason || 'policy_denied',
                },
            });
        }
        return resolver(parent, args, context, info);
    };
}
function wrapResolversWithPolicy(namespace, resolvers) {
    const wrap = (type) => {
        const src = resolvers[type] || {};
        return Object.fromEntries(Object.entries(src).map(([name, fn]) => [
            name,
            withPolicy(`${namespace}.${type}.${name}`, fn),
        ]));
    };
    return {
        ...resolvers,
        Query: wrap('Query'),
        Mutation: wrap('Mutation'),
    };
}
