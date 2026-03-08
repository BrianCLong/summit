"use strict";
/**
 * Express/GraphQL Middleware for Authority Enforcement
 *
 * Integrates the authority compiler into the request pipeline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthorityMiddleware = createAuthorityMiddleware;
exports.createAuthorityDirective = createAuthorityDirective;
exports.extractClassification = extractClassification;
exports.extractCompartments = extractCompartments;
/**
 * Create Express middleware for authority enforcement
 */
function createAuthorityMiddleware(options) {
    const { evaluator, extractUser, extractResource, defaultOperation = 'READ', skipPaths = ['/health', '/metrics'], onDeny, } = options;
    return async (req, res, next) => {
        // Skip certain paths
        if (skipPaths.some((path) => req.path.startsWith(path))) {
            return next();
        }
        // Extract user
        const user = extractUser(req);
        if (!user) {
            if (onDeny) {
                return onDeny(req, res, 'User not authenticated');
            }
            return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
        }
        // Determine operation from HTTP method
        let operation = defaultOperation;
        switch (req.method) {
            case 'GET':
                operation = 'READ';
                break;
            case 'POST':
                operation = 'CREATE';
                break;
            case 'PUT':
            case 'PATCH':
                operation = 'UPDATE';
                break;
            case 'DELETE':
                operation = 'DELETE';
                break;
        }
        // Extract resource context
        const resource = extractResource ? extractResource(req) : {};
        // Build evaluation context
        const context = {
            user,
            operation,
            resource,
            request: {
                ip: req.ip || req.socket.remoteAddress,
                userAgent: req.get('User-Agent'),
                timestamp: new Date(),
                justification: req.get('X-Access-Justification'),
                mfaVerified: req.get('X-MFA-Verified') === 'true',
            },
        };
        // Evaluate policy
        const decision = await evaluator.evaluate(context);
        // Attach decision to request for downstream use
        req.policyDecision = decision;
        if (!decision.allowed) {
            if (onDeny) {
                return onDeny(req, res, decision.reason);
            }
            return res.status(403).json({
                error: 'Forbidden',
                message: decision.reason,
                auditId: decision.auditId,
            });
        }
        // Handle two-person control requirement
        if (decision.requiresTwoPersonControl) {
            // Check if approval header is present
            const approvalId = req.get('X-Two-Person-Approval');
            if (!approvalId) {
                return res.status(403).json({
                    error: 'Two-Person Control Required',
                    message: 'This operation requires two-person approval',
                    twoPersonControlId: decision.twoPersonControlId,
                    auditId: decision.auditId,
                });
            }
            // In production, validate the approval ID against the approval service
        }
        // Handle pending conditions
        if (decision.conditions && decision.conditions.length > 0) {
            // Check if conditions are satisfied
            const conditionsSatisfied = decision.conditions.every((condition) => {
                if (condition === 'Justification required') {
                    return Boolean(context.request.justification);
                }
                return true;
            });
            if (!conditionsSatisfied) {
                return res.status(403).json({
                    error: 'Conditions Not Met',
                    message: `Required conditions: ${decision.conditions.join(', ')}`,
                    conditions: decision.conditions,
                    auditId: decision.auditId,
                });
            }
        }
        next();
    };
}
/**
 * GraphQL directive for authority enforcement
 */
function createAuthorityDirective(evaluator) {
    return {
        authorityDirectiveTypeDefs: `
      directive @authority(
        operation: String!
        entityType: String
        classification: String
      ) on FIELD_DEFINITION
    `,
        authorityDirectiveTransformer: (schema) => {
            // This would be implemented using @graphql-tools/utils mapSchema
            // to wrap resolvers with authority checks
            return schema;
        },
    };
}
/**
 * Helper to extract classification from entity props
 */
function extractClassification(props) {
    const classification = props?.classification || props?.securityClassification;
    if (classification && ['UNCLASSIFIED', 'CUI', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'].includes(classification)) {
        return classification;
    }
    return undefined;
}
/**
 * Helper to extract compartments from entity props
 */
function extractCompartments(props) {
    const compartments = props?.compartments || props?.accessCompartments;
    if (Array.isArray(compartments)) {
        return compartments.filter((c) => typeof c === 'string');
    }
    return [];
}
