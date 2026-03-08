"use strict";
/**
 * GraphQL Governance Hooks
 *
 * Hooks for integrating governance into Apollo Server GraphQL resolvers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationError = exports.DEFAULT_PII_PATTERNS = void 0;
exports.createAuthorityHook = createAuthorityHook;
exports.createPIIDetectionHook = createPIIDetectionHook;
exports.createAuditHook = createAuditHook;
exports.createProvenanceHook = createProvenanceHook;
exports.createResultLimitHook = createResultLimitHook;
exports.createFieldRedactionHook = createFieldRedactionHook;
exports.composeHooks = composeHooks;
// -----------------------------------------------------------------------------
// Authority Hook
// -----------------------------------------------------------------------------
function createAuthorityHook(evaluator) {
    return {
        async beforeResolve(ctx) {
            const decision = await evaluator.evaluate({
                user: ctx.context.user,
                operation: ctx.operation,
                resource: ctx.resource,
                request: {
                    timestamp: new Date(),
                    ip: ctx.context.request.ip,
                    userAgent: ctx.context.request.userAgent,
                },
            });
            if (!decision.allowed) {
                throw new AuthorizationError(decision.reason, decision.auditId);
            }
            ctx.context.policyDecision = decision;
        },
    };
}
function createPIIDetectionHook(config) {
    const { patterns, redactionText = '[REDACTED]' } = config;
    return {
        async afterResolve(ctx, result) {
            return redactPII(result, patterns, redactionText);
        },
    };
}
function redactPII(data, patterns, redactionText) {
    if (data === null || data === undefined) {
        return data;
    }
    if (typeof data === 'string') {
        let result = data;
        for (const pattern of patterns) {
            if (pattern.action === 'redact') {
                result = result.replace(pattern.regex, redactionText);
            }
            else if (pattern.action === 'mask') {
                result = result.replace(pattern.regex, (match) => '*'.repeat(match.length));
            }
        }
        return result;
    }
    if (Array.isArray(data)) {
        return data.map((item) => redactPII(item, patterns, redactionText));
    }
    if (typeof data === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            result[key] = redactPII(value, patterns, redactionText);
        }
        return result;
    }
    return data;
}
// Default PII patterns
exports.DEFAULT_PII_PATTERNS = [
    { name: 'SSN', regex: /\b\d{3}-?\d{2}-?\d{4}\b/g, action: 'redact' },
    { name: 'Credit Card', regex: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, action: 'redact' },
    { name: 'Email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, action: 'mask' },
    { name: 'Phone', regex: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, action: 'mask' },
    { name: 'Passport', regex: /\b[A-Z]{1,2}\d{6,9}\b/g, action: 'redact' },
    { name: 'IP Address', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, action: 'mask' },
];
function createAuditHook(logger) {
    return {
        async afterResolve(ctx, result) {
            await logger.log({
                eventType: 'graphql_resolve',
                userId: ctx.context.user.id,
                tenantId: ctx.context.user.tenantId,
                operation: ctx.operation,
                resourceType: ctx.resource.type,
                resourceId: ctx.resource.id,
                investigationId: ctx.resource.investigationId,
                authorityId: ctx.context.policyDecision?.authorityId,
                success: true,
                timestamp: new Date(),
            });
            return result;
        },
        async onError(ctx, error) {
            await logger.log({
                eventType: 'graphql_error',
                userId: ctx.context.user.id,
                tenantId: ctx.context.user.tenantId,
                operation: ctx.operation,
                resourceType: ctx.resource.type,
                resourceId: ctx.resource.id,
                investigationId: ctx.resource.investigationId,
                success: false,
                errorMessage: error.message,
                timestamp: new Date(),
            });
        },
    };
}
function createProvenanceHook(recorder) {
    return {
        async afterResolve(ctx, result) {
            // Only record for mutations
            if (!['CREATE', 'UPDATE', 'DELETE', 'LINK'].includes(ctx.operation)) {
                return result;
            }
            await recorder.recordStep({
                type: `graphql_${ctx.operation.toLowerCase()}`,
                userId: ctx.context.user.id,
                tenantId: ctx.context.user.tenantId,
                operation: ctx.operation,
                entityIds: extractEntityIds(result),
                metadata: {
                    fieldName: ctx.info.fieldName,
                    args: sanitizeArgs(ctx.args),
                },
            });
            return result;
        },
    };
}
function extractEntityIds(result) {
    if (!result) {
        return [];
    }
    if (Array.isArray(result)) {
        return result.flatMap((item) => extractEntityIds(item));
    }
    if (typeof result === 'object' && result !== null) {
        const obj = result;
        if (typeof obj.id === 'string') {
            return [obj.id];
        }
    }
    return [];
}
function sanitizeArgs(args) {
    // Remove sensitive fields from args before logging
    const sanitized = { ...args };
    const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'authorization'];
    for (const key of sensitiveKeys) {
        if (key in sanitized) {
            sanitized[key] = '[REDACTED]';
        }
    }
    return sanitized;
}
// -----------------------------------------------------------------------------
// Result Limiting Hook
// -----------------------------------------------------------------------------
function createResultLimitHook() {
    return {
        async afterResolve(ctx, result) {
            const maxResults = ctx.context.policyDecision?.maxResults;
            if (maxResults && Array.isArray(result)) {
                return result.slice(0, maxResults);
            }
            return result;
        },
    };
}
// -----------------------------------------------------------------------------
// Field Redaction Hook
// -----------------------------------------------------------------------------
function createFieldRedactionHook() {
    return {
        async afterResolve(ctx, result) {
            const redactedFields = ctx.context.policyDecision?.redactedFields;
            if (!redactedFields || redactedFields.length === 0) {
                return result;
            }
            return redactFields(result, redactedFields);
        },
    };
}
function redactFields(data, fields) {
    if (data === null || data === undefined) {
        return data;
    }
    if (Array.isArray(data)) {
        return data.map((item) => redactFields(item, fields));
    }
    if (typeof data === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            if (fields.includes(key)) {
                result[key] = '[REDACTED]';
            }
            else {
                result[key] = redactFields(value, fields);
            }
        }
        return result;
    }
    return data;
}
// -----------------------------------------------------------------------------
// Composite Hook
// -----------------------------------------------------------------------------
function composeHooks(...hooks) {
    return {
        async beforeResolve(ctx) {
            for (const hook of hooks) {
                if (hook.beforeResolve) {
                    await hook.beforeResolve(ctx);
                }
            }
        },
        async afterResolve(ctx, result) {
            let current = result;
            for (const hook of hooks) {
                if (hook.afterResolve) {
                    current = await hook.afterResolve(ctx, current);
                }
            }
            return current;
        },
        async onError(ctx, error) {
            for (const hook of hooks) {
                if (hook.onError) {
                    await hook.onError(ctx, error);
                }
            }
        },
    };
}
// -----------------------------------------------------------------------------
// Error Types
// -----------------------------------------------------------------------------
class AuthorizationError extends Error {
    auditId;
    constructor(message, auditId) {
        super(message);
        this.auditId = auditId;
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
