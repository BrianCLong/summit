"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPolicyPlugin = createPolicyPlugin;
const policy_1 = require("../policy");
const config_1 = require("../config");
const audit_1 = require("../audit");
function headerLookup(headers) {
    if (!headers)
        return () => '';
    if (headers instanceof Map) {
        return (name) => headers.get(name.toLowerCase()) || headers.get(name) || '';
    }
    return (name) => headers.get(name) || '';
}
function defaultBuildInput(ctx, action) {
    const getHeader = headerLookup(ctx.request.http?.headers);
    const purpose = getHeader('x-purpose');
    const authority = getHeader('x-authority');
    const user = ctx.contextValue?.user || {};
    const roles = user.roles || [];
    const tenantId = String(user.tenantId || '');
    return {
        user: {
            sub: String(user.sub || ''),
            tenantId,
            roles,
            ...user,
        },
        resource: {
            path: ctx.request.http?.url || 'graphql',
            tenantId,
            attributes: {},
        },
        action,
        purpose: purpose || '',
        authority: authority || '',
    };
}
function createPolicyPlugin(options = {}) {
    const action = options.action || 'query';
    return {
        async requestDidStart() {
            return {
                async didResolveOperation(ctx) {
                    if (!config_1.features.policyReasoner) {
                        return;
                    }
                    const input = options.buildInput
                        ? options.buildInput(ctx)
                        : defaultBuildInput(ctx, action);
                    const decision = await (0, policy_1.authorize)(input);
                    const audit = (0, audit_1.log)({
                        subject: String(input.user.sub || 'anonymous'),
                        action,
                        resource: JSON.stringify(input.resource),
                        tenantId: String(input.user.tenantId || ''),
                        decision,
                        purpose: input.purpose,
                        authority: input.authority,
                    });
                    ctx.contextValue = ctx.contextValue || {};
                    ctx.contextValue.policyDecision = decision;
                    ctx.contextValue.policyAuditId = audit.id;
                    options.onDecision?.(decision, ctx);
                    if (!decision.allowed) {
                        const error = new Error(`Access denied: ${decision.reason}`);
                        error.extensions = {
                            code: 'FORBIDDEN',
                            policyId: decision.policyId,
                            appealLink: decision.appealLink,
                            appealToken: decision.appealToken,
                        };
                        ctx.errors = ctx.errors ? [...ctx.errors, error] : [error];
                    }
                },
            };
        },
    };
}
