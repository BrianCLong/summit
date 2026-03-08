"use strict";
/**
 * GraphQL Middleware for Selector Minimization Tracking
 *
 * This middleware intercepts GraphQL queries and tracks:
 * - Field selection expansion (initial vs resolved fields)
 * - Records accessed vs returned
 * - Reason-for-access validation
 * - Tripwire violations
 *
 * Integrates with SelectorMinimizationService for comprehensive tracking.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectorMinimizationMiddleware = selectorMinimizationMiddleware;
exports.validateQueryPolicy = validateQueryPolicy;
exports.requireReasonDirective = requireReasonDirective;
exports.withSelectorTracking = withSelectorTracking;
exports.withReasonRequired = withReasonRequired;
const SelectorMinimizationService_js_1 = require("../../services/SelectorMinimizationService.js");
const enforcer_js_1 = require("../../policy/enforcer.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const crypto_1 = __importDefault(require("crypto"));
// ============================================================================
// Middleware Implementation
// ============================================================================
/**
 * GraphQL middleware for tracking selector minimization
 */
async function selectorMinimizationMiddleware(resolve, parent, args, context, info) {
    const startTime = Date.now();
    // Extract initial field selections
    const initialFields = extractFieldSelections(info);
    // Create tracking object
    const tracking = {
        initialFields,
        expandedFields: new Set(initialFields),
        recordsAccessed: 0,
        recordsReturned: 0,
        executionTimeMs: 0,
    };
    // Wrap context to track field access
    const wrappedContext = wrapContextForTracking(context, tracking);
    try {
        // Execute resolver
        const result = await resolve(parent, args, wrappedContext, info);
        // Calculate metrics
        tracking.executionTimeMs = Date.now() - startTime;
        // Count returned records
        tracking.recordsReturned = countRecords(result);
        // Track in selector minimization service
        await trackQueryScope(context, info, tracking, args);
        return result;
    }
    catch (error) {
        // Log error but still track metrics
        logger_js_1.default.error('Error in GraphQL resolver', {
            operation: info.fieldName,
            error,
        });
        // Track failed query
        tracking.executionTimeMs = Date.now() - startTime;
        await trackQueryScope(context, info, tracking, args).catch((err) => logger_js_1.default.error('Failed to track failed query', { err }));
        throw error;
    }
}
/**
 * Extract field selections from GraphQL query
 */
function extractFieldSelections(info) {
    const fields = new Set();
    function traverse(selections, prefix = '') {
        if (!selections)
            return;
        for (const selection of selections) {
            if (selection.kind === 'Field') {
                const fieldName = prefix ? `${prefix}.${selection.name.value}` : selection.name.value;
                fields.add(fieldName);
                if (selection.selectionSet) {
                    traverse(selection.selectionSet.selections, fieldName);
                }
            }
            else if (selection.kind === 'InlineFragment' || selection.kind === 'FragmentSpread') {
                if (selection.selectionSet) {
                    traverse(selection.selectionSet.selections, prefix);
                }
            }
        }
    }
    traverse(info.fieldNodes[0]?.selectionSet?.selections);
    return fields;
}
/**
 * Wrap context to track field expansions
 */
function wrapContextForTracking(context, tracking) {
    return new Proxy(context, {
        get(target, prop) {
            // Track when data loaders or databases are accessed
            if (prop === 'loaders' || prop === 'db' || prop === 'postgres' || prop === 'neo4j') {
                return new Proxy(target[prop], {
                    get(loaderTarget, loaderProp) {
                        const original = loaderTarget[loaderProp];
                        if (typeof original === 'function') {
                            return new Proxy(original, {
                                apply(fn, thisArg, args) {
                                    // Track that we're accessing additional data
                                    tracking.expandedFields.add(String(loaderProp));
                                    const result = fn.apply(thisArg, args);
                                    // If it's a promise (async), track when it resolves
                                    if (result && typeof result.then === 'function') {
                                        return result.then((data) => {
                                            // Count records accessed
                                            tracking.recordsAccessed += countRecords(data);
                                            return data;
                                        });
                                    }
                                    // Sync result
                                    tracking.recordsAccessed += countRecords(result);
                                    return result;
                                },
                            });
                        }
                        return original;
                    },
                });
            }
            return target[prop];
        },
    });
}
/**
 * Count number of records in a result
 */
function countRecords(data) {
    if (!data)
        return 0;
    if (Array.isArray(data)) {
        return data.length;
    }
    if (typeof data === 'object' && data !== null) {
        // Check for common pagination patterns
        if ('nodes' in data && Array.isArray(data.nodes)) {
            return data.nodes.length;
        }
        if ('edges' in data && Array.isArray(data.edges)) {
            return data.edges.length;
        }
        if ('items' in data && Array.isArray(data.items)) {
            return data.items.length;
        }
        // Single record
        return 1;
    }
    return 0;
}
/**
 * Track query scope in selector minimization service
 */
async function trackQueryScope(context, info, tracking, args) {
    // Skip tracking if context doesn't have tenant ID
    if (!context.tenantId) {
        return;
    }
    const metrics = {
        tenantId: context.tenantId,
        userId: context.userId || 'anonymous',
        queryId: generateQueryId(info, args),
        correlationId: context.correlationId,
        queryType: 'graphql',
        queryName: `${info.parentType.name}.${info.fieldName}`,
        queryHash: '', // Will be calculated by service
        queryText: generateQueryText(info, args),
        initialSelectors: tracking.initialFields.size,
        expandedSelectors: tracking.expandedFields.size,
        expansionRatio: 0, // Calculated by service
        recordsAccessed: tracking.recordsAccessed,
        recordsReturned: tracking.recordsReturned,
        selectivityRatio: 0, // Calculated by service
        purpose: context.purpose,
        reasonForAccess: context.reasonForAccess,
        reasonRequired: false, // Determined by service
        reasonProvided: !!context.reasonForAccess,
        isAnomaly: false, // Determined by service
        tripwireThreshold: 10.0, // Default, will be loaded by service
        tripwireTriggered: false, // Determined by service
        alertSent: false,
        executionTimeMs: tracking.executionTimeMs,
        executedAt: new Date(),
    };
    try {
        await SelectorMinimizationService_js_1.selectorMinimizationService.trackQueryScope(metrics);
    }
    catch (error) {
        logger_js_1.default.error('Failed to track query scope', {
            error,
            queryName: metrics.queryName,
        });
        // Don't throw - tracking failure shouldn't break queries
    }
}
/**
 * Generate unique query ID
 */
function generateQueryId(info, args) {
    const base = `${info.parentType.name}.${info.fieldName}:${JSON.stringify(args)}:${Date.now()}`;
    return crypto_1.default.createHash('sha256').update(base).digest('hex').substring(0, 16);
}
/**
 * Generate readable query text for debugging
 */
function generateQueryText(info, args) {
    const fields = Array.from(extractFieldSelections(info)).join(', ');
    const argsStr = Object.keys(args).length > 0 ? JSON.stringify(args) : '';
    return `${info.parentType.name}.${info.fieldName}(${argsStr}) { ${fields} }`;
}
// ============================================================================
// Policy Enforcement Integration
// ============================================================================
/**
 * Validate query against policy before execution
 */
async function validateQueryPolicy(args, context, info) {
    // Skip if no tenant
    if (!context.tenantId) {
        return { allowed: true };
    }
    // Estimate query scope for policy validation
    const initialFields = extractFieldSelections(info);
    // Check with policy enforcer
    const decision = await enforcer_js_1.policyEnforcer.validateReasonForAccess({
        tenantId: context.tenantId,
        userId: context.userId,
        action: 'read',
        resource: `${info.parentType.name}.${info.fieldName}`,
        purpose: context.purpose,
        reasonForAccess: context.reasonForAccess,
        clientIP: context.clientIP,
        userAgent: context.userAgent,
        queryMetadata: {
            initialSelectors: initialFields.size,
            // Can't know expansion yet, will validate after
        },
    });
    if (!decision.allow) {
        logger_js_1.default.warn('Query rejected by policy', {
            queryName: `${info.parentType.name}.${info.fieldName}`,
            reason: decision.reason,
        });
        return {
            allowed: false,
            reason: decision.reason,
        };
    }
    return { allowed: true };
}
/**
 * GraphQL directive for requiring reason-for-access
 */
function requireReasonDirective(resolve, parent, args, context, info) {
    // Check if reason is provided
    if (!context.reasonForAccess || context.reasonForAccess.trim().length === 0) {
        throw new Error(`Reason for access is required for ${info.parentType.name}.${info.fieldName}. ` +
            'Please provide a justification for this query.');
    }
    // Validate reason quality
    if (context.reasonForAccess.length < 10) {
        throw new Error('Reason for access must be at least 10 characters long.');
    }
    // Continue with normal resolution
    return resolve(parent, args, context, info);
}
/**
 * Create a field resolver with selector minimization tracking
 */
function withSelectorTracking(resolver) {
    return async (parent, args, context, info) => {
        return selectorMinimizationMiddleware(resolver, parent, args, context, info);
    };
}
/**
 * Create a field resolver with reason requirement
 */
function withReasonRequired(resolver) {
    return async (parent, args, context, info) => {
        return requireReasonDirective(resolver, parent, args, context, info);
    };
}
