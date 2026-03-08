"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABACContext = exports.OPAClient = void 0;
exports.validateOIDCToken = validateOIDCToken;
exports.buildGraphQLContext = buildGraphQLContext;
exports.opaAuthzMiddleware = opaAuthzMiddleware;
exports.createABACMiddleware = createABACMiddleware;
exports.createAuthzDirective = createAuthzDirective;
exports.residencyEnforcementMiddleware = residencyEnforcementMiddleware;
const apollo_server_express_1 = require("apollo-server-express");
const jsonwebtoken_1 = require("jsonwebtoken");
const axios_1 = __importDefault(require("axios"));
const api_1 = require("@opentelemetry/api");
const logger_js_1 = __importStar(require("../utils/logger.js"));
const tracer = api_1.trace.getTracer('intelgraph-opa-abac');
class OPAClient {
    baseUrl;
    timeout;
    logger = (() => {
        const resolved = logger_js_1.logger ?? logger_js_1.default ?? console;
        return typeof resolved.child === 'function'
            ? resolved.child({ component: 'opa-client' })
            : resolved;
    })();
    constructor(baseUrl, timeout = 5000) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.timeout = timeout;
    }
    async evaluate(policy, input) {
        const span = tracer.startSpan('opa-policy-evaluation', {
            attributes: {
                'opa.policy': policy,
                'opa.input.subject_tenant': input.subject?.tenantId || 'unknown',
                'opa.input.action': input.action || 'unknown',
            },
        });
        const log = this.logger ?? logger_js_1.logger ?? logger_js_1.default ?? console;
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/v1/data/${policy.replace(/\./g, '/')}`, { input }, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const result = response.data?.result;
            span.setAttributes({
                'opa.result.type': typeof result,
                'opa.result.allowed': (typeof result === 'object' && result !== null) ? result.allow : !!result,
                'opa.response.status': response.status,
            });
            log.debug('OPA policy evaluation result', {
                policy,
                input: {
                    subject_tenant: input.subject?.tenantId,
                    action: input.action,
                },
                result: typeof result === 'object' ? JSON.stringify(result) : result,
            });
            return result;
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            log.error('OPA policy evaluation failed', {
                policy,
                error: error.message,
            });
            // Fail closed - deny access if OPA is unavailable
            return { allow: false, reason: 'opa_unavailable', obligations: [] };
        }
        finally {
            span.end();
        }
    }
}
exports.OPAClient = OPAClient;
/**
 * OIDC JWT token validation middleware
 */
function validateOIDCToken(req, res, next) {
    const span = tracer.startSpan('validate-oidc-token');
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // For development, allow anonymous access
            if (process.env.NODE_ENV === 'development') {
                req.user = {
                    id: 'dev-user',
                    tenantId: 'default',
                    tenant: 'default', // Backward compat
                    roles: ['developer'],
                    scopes: [
                        'purpose:investigation',
                        'purpose:threat-intel',
                        'scope:pii',
                    ],
                    residency: 'US',
                    clearance: 'top-secret',
                    email: 'dev@topicality.co',
                };
                span.setAttributes({ 'auth.mode': 'development' });
                span.end();
                return next();
            }
            span.setStatus({ code: 2, message: 'No authorization header' });
            span.end();
            throw new apollo_server_express_1.AuthenticationError('No authorization token provided');
        }
        const token = authHeader.split(' ')[1];
        const issuer = process.env.OIDC_ISSUER || 'https://auth.topicality.co/';
        // In production, implement proper OIDC validation
        // For development/demo, decode without verification
        if (process.env.NODE_ENV === 'development') {
            const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            req.user = {
                id: decoded.sub || 'demo-user',
                tenantId: decoded.tenant || 'default',
                tenant: decoded.tenant || 'default', // Backward compat
                roles: decoded.roles || ['user'],
                scopes: decoded.scopes || ['purpose:investigation'],
                residency: decoded.residency || 'US',
                clearance: decoded.clearance || 'restricted',
                email: decoded.email,
            };
            span.setAttributes({
                'auth.mode': 'development',
                'user.id': req.user.id,
                'user.tenant': req.user.tenantId,
            });
            span.end();
            return next();
        }
        // Production OIDC validation
        let publicKey;
        if (process.env.OIDC_PUBLIC_KEY) {
            publicKey = process.env.OIDC_PUBLIC_KEY.replace(/\\n/g, '\n');
        }
        else {
            throw new Error('OIDC_PUBLIC_KEY environment variable is required in production');
        }
        const decoded = (0, jsonwebtoken_1.verify)(token, publicKey, {
            issuer,
            algorithms: ['RS256'],
        });
        req.user = {
            id: decoded.sub || 'unknown',
            tenantId: decoded.tenant || 'default',
            tenant: decoded.tenant || 'default', // Backward compat
            roles: decoded.roles || ['user'],
            scopes: decoded.scopes || [],
            residency: decoded.residency || 'US',
            clearance: decoded.clearance || 'restricted',
            email: decoded.email,
        };
        span.setAttributes({
            'auth.mode': 'production',
            'user.id': req.user.id,
            'user.tenant': req.user.tenantId,
        });
        span.end();
        return next();
    }
    catch (error) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error.message });
        span.end();
        if (error instanceof apollo_server_express_1.AuthenticationError) {
            throw error;
        }
        logger.error('Token validation failed', {
            error: error.message,
        });
        throw new apollo_server_express_1.AuthenticationError('Invalid or expired token');
    }
}
/**
 * GraphQL context builder with OPA client
 * Restored for backward compatibility
 */
function buildGraphQLContext(opaClient) {
    return ({ req }) => {
        const requestId = req.headers['x-request-id'] ||
            `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const user = req.user;
        return {
            user,
            opa: opaClient,
            requestId,
            // Database connections will be added by the GraphQL server
        };
    };
}
/**
 * Express middleware for OPA authorization using summit.abac
 */
function opaAuthzMiddleware(opaClient) {
    return async (req, res, next) => {
        const span = tracer.startSpan('opa-authz-middleware');
        try {
            const user = req.user;
            if (!user) {
                span.setStatus({ code: 2, message: 'No user in request' });
                span.end();
                throw new apollo_server_express_1.AuthenticationError('Authentication required');
            }
            // Determine action from method/path or explicit override
            const action = req.action || mapMethodToAction(req.method);
            // Robust resource extraction
            // Attempt to find ID in path params first, then path itself
            let resourceId = req.params.id || (req.body && req.body.id);
            let resourceType = 'api';
            // If used as global middleware, req.params might be empty.
            // Parse path: /api/resourceType/resourceId
            if (!resourceId) {
                const pathParts = req.path.split('/').filter(Boolean);
                // Heuristic: api/v1/users/123 -> type=users, id=123
                if (pathParts.length >= 2) {
                    const potentialId = pathParts[pathParts.length - 1];
                    // Check if it looks like an ID (UUID or numeric or slug)
                    if (potentialId.match(/^[a-zA-Z0-9-]+$/)) {
                        resourceId = potentialId;
                        resourceType = pathParts[pathParts.length - 2];
                    }
                    else {
                        resourceType = potentialId; // Collection access
                    }
                }
                else if (pathParts.length === 1) {
                    resourceType = pathParts[0];
                }
            }
            else {
                // If params had ID, try to get type from baseUrl
                resourceType = req.baseUrl.split('/').pop() || 'api';
            }
            // Security: Determine ACR (Authentication Context Reference)
            // DO NOT trust x-step-up-auth header blindly for elevation in production.
            let currentAcr = 'loa1';
            const stepUpHeader = req.headers['x-step-up-auth'];
            if (stepUpHeader) {
                if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
                    // In dev/test, mock validation
                    if (stepUpHeader === 'valid-token' || stepUpHeader.length > 5) {
                        currentAcr = 'loa2';
                    }
                }
                else {
                    // Production: Verify JWT token signature
                    try {
                        let publicKey;
                        if (process.env.OIDC_PUBLIC_KEY) {
                            publicKey = process.env.OIDC_PUBLIC_KEY.replace(/\\n/g, '\n');
                        }
                        else {
                            throw new Error('OIDC_PUBLIC_KEY required');
                        }
                        const issuer = process.env.OIDC_ISSUER || 'https://auth.topicality.co/';
                        (0, jsonwebtoken_1.verify)(stepUpHeader, publicKey, {
                            issuer,
                            algorithms: ['RS256'],
                        });
                        currentAcr = 'loa2';
                    }
                    catch (err) {
                        logger.warn('Step-Up token verification failed', { error: err.message });
                    }
                }
            }
            const policyInput = {
                subject: {
                    id: user.id,
                    tenantId: user.tenantId || user.tenant || 'default',
                    roles: user.roles || [],
                    residency: user.residency || 'US',
                    clearance: user.clearance || 'public',
                    entitlements: user.entitlements || [],
                },
                resource: {
                    type: resourceType,
                    id: resourceId,
                    tenantId: user.tenantId || user.tenant || 'default', // Default to own tenant if not specified
                    residency: user.residency || 'US', // Default to own residency
                    classification: 'restricted', // Default classification
                    ...req.body?.resource // Allow override from body
                },
                action: action,
                context: {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    time: Date.now(),
                    currentAcr: currentAcr
                }
            };
            const decisionRaw = await opaClient.evaluate('summit.abac.decision', policyInput);
            // Normalize decision (handle boolean legacy)
            const decision = (typeof decisionRaw === 'boolean')
                ? { allow: decisionRaw, reason: decisionRaw ? 'allow' : 'denied', obligations: [] }
                : decisionRaw;
            if (!decision || !decision.allow) {
                const reason = decision?.reason || 'Access denied by policy';
                span.setStatus({ code: 2, message: `Access denied: ${reason}` });
                span.end();
                // Return structured denial for frontend
                res.status(403).json({
                    error: 'Access Denied',
                    code: 'FORBIDDEN',
                    reason: reason,
                    help: 'Contact your administrator to request access.',
                    rule_id: 'summit.abac' // placeholder
                });
                return;
            }
            // Check obligations
            if (decision.obligations && decision.obligations.length > 0) {
                for (const obligation of decision.obligations) {
                    if (obligation.type === 'step_up') {
                        span.setStatus({ code: 2, message: 'Step-up authentication required' });
                        span.end();
                        res.status(401).json({
                            error: 'Step-up Authentication Required',
                            code: 'STEP_UP_REQUIRED',
                            mechanism: obligation.mechanism || 'webauthn',
                            message: 'Please re-authenticate with a second factor to perform this action.'
                        });
                        return;
                    }
                    // Future: Handle 'dual_control' obligation (check for approvals in context)
                }
            }
            span.setAttributes({
                'authz.allowed': true,
                'user.tenant': user.tenantId,
            });
            span.end();
            next();
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            span.end();
            if (error instanceof apollo_server_express_1.AuthenticationError) {
                throw error;
            }
            logger.error('OPA authorization middleware failed', {
                error: error.message,
            });
            // Fail closed
            res.status(403).json({ error: 'Authorization check failed' });
        }
    };
}
class ABACContext {
    static fromRequest(req) {
        const forwardedFor = req.headers['x-forwarded-for'];
        const forwardedIp = Array.isArray(forwardedFor)
            ? forwardedFor[0]
            : forwardedFor?.split(',')[0]?.trim();
        return {
            ip: forwardedIp || req.ip,
            userAgent: req.get('User-Agent'),
            time: Date.now(),
        };
    }
}
exports.ABACContext = ABACContext;
function createABACMiddleware(opaClient) {
    return {
        enforce(resourceType, action) {
            return async (req, res, next) => {
                const user = req.user;
                if (!user) {
                    res.status(401).json({ error: 'Unauthorized' });
                    return;
                }
                const context = ABACContext.fromRequest(req);
                const resourceId = req.params?.investigationId ||
                    req.params?.id ||
                    (req.body && req.body.id);
                const policyInput = {
                    subject: {
                        id: user.id,
                        tenantId: user.tenantId || user.tenant || 'default',
                        roles: user.roles || (user.role ? [user.role] : []),
                        residency: user.residency || 'US',
                        clearance: user.clearance || 'public',
                        entitlements: user.entitlements || [],
                    },
                    resource: {
                        type: resourceType,
                        id: resourceId,
                        tenantId: req.headers['x-tenant-id'] ||
                            user.tenantId ||
                            user.tenant ||
                            'default',
                    },
                    action,
                    context,
                };
                try {
                    const result = await opaClient.evaluate('summit.abac.allow', policyInput);
                    if (typeof result === 'boolean') {
                        if (result) {
                            return next();
                        }
                        res.status(403).json({ error: 'Forbidden', reason: 'Denied' });
                        return;
                    }
                    if (result.allow) {
                        return next();
                    }
                    if (result.reason === 'opa_unavailable') {
                        res.status(503).json({
                            error: 'ServiceUnavailable',
                            message: 'Authorization service temporarily unavailable',
                        });
                        return;
                    }
                    const obligation = result.obligations?.[0];
                    if (obligation?.type === 'step_up_auth') {
                        res.status(403).json({
                            error: 'StepUpRequired',
                            reason: result.reason,
                            obligation,
                        });
                        return;
                    }
                    if (obligation?.type === 'dual_control') {
                        res.status(403).json({
                            error: 'DualControlRequired',
                            reason: result.reason,
                            obligation,
                        });
                        return;
                    }
                    res.status(403).json({
                        error: 'Forbidden',
                        reason: result.reason,
                    });
                }
                catch (error) {
                    res.status(503).json({
                        error: 'ServiceUnavailable',
                        message: 'Authorization service temporarily unavailable',
                    });
                }
            };
        },
    };
}
function mapMethodToAction(method) {
    switch (method.toUpperCase()) {
        case 'GET': return 'read';
        case 'POST': return 'write';
        case 'PUT': return 'write';
        case 'PATCH': return 'write';
        case 'DELETE': return 'delete';
        default: return 'read';
    }
}
/**
 * Field-level authorization directive for GraphQL
 */
function createAuthzDirective(opaClient) {
    return class AuthzDirective {
        visitFieldDefinition(field, details) {
            const { resolve = defaultFieldResolver } = field;
            field.resolve = async function (source, args, context, info) {
                const span = tracer.startSpan('field-level-authz', {
                    attributes: {
                        'graphql.field.name': info.fieldName,
                        'graphql.parent.type': info.parentType.name,
                    },
                });
                try {
                    if (!context.user) {
                        span.setStatus({ code: 2, message: 'No user in context' });
                        span.end();
                        throw new apollo_server_express_1.AuthenticationError('Authentication required');
                    }
                    const policyInput = {
                        subject: {
                            id: context.user.id,
                            tenantId: context.user.tenant || context.user.tenantId,
                            roles: context.user.roles || [],
                            residency: context.user.residency || 'US',
                            clearance: context.user.clearance || 'public'
                        },
                        resource: {
                            type: info.parentType.name.toLowerCase(),
                            id: source?.id,
                            tenantId: context.user.tenant,
                            classification: source?.classification || 'restricted',
                            // Add field-specific resource attributes
                            ...(source && source.purpose && { purpose: source.purpose }),
                            ...(source && source.region && { region: source.region }),
                            ...(source &&
                                source.pii_flags && { pii_flags: source.pii_flags }),
                        },
                        action: info.operation.operation || 'query',
                        context: {
                            ip: 'unknown', // Context not always available in GQL resolve without extra wiring
                            time: Date.now()
                        }
                    };
                    const decisionRaw = await opaClient.evaluate('summit.abac.decision', policyInput);
                    const decision = (typeof decisionRaw === 'boolean')
                        ? { allow: decisionRaw, reason: decisionRaw ? 'allow' : 'denied', obligations: [] }
                        : decisionRaw;
                    if (!decision || !decision.allow) {
                        span.setStatus({ code: 2, message: 'Field access denied' });
                        span.end();
                        throw new apollo_server_express_1.ForbiddenError(`Access denied to field ${info.fieldName}: ${decision?.reason || 'policy'}`);
                    }
                    // Check obligations for GraphQL - Fail closed if step-up is required but not satisfied
                    if (decision.obligations && decision.obligations.length > 0) {
                        const hasStepUp = decision.obligations.some(o => o.type === 'step_up');
                        if (hasStepUp) {
                            span.setStatus({ code: 2, message: 'Step-up required for field access' });
                            span.end();
                            throw new apollo_server_express_1.AuthenticationError('Step-up authentication required to access this field');
                        }
                    }
                    span.setAttributes({ 'authz.field.allowed': true });
                    span.end();
                    return resolve.call(this, source, args, context, info);
                }
                catch (error) {
                    span.recordException(error);
                    span.setStatus({ code: 2, message: error.message });
                    span.end();
                    throw error;
                }
            };
        }
    };
}
/**
 * Residency enforcement middleware for US-only data locality
 */
function residencyEnforcementMiddleware(req, res, next) {
    const user = req.user;
    if (user && user.residency !== 'US') {
        logger.warn('Non-US user attempted access', {
            user_id: user.id,
            user_residency: user.residency,
            ip: req.ip,
        });
        throw new apollo_server_express_1.ForbiddenError('Access restricted to US residents only');
    }
    next();
}
// Default field resolver placeholder
const defaultFieldResolver = (source, args, context, info) => {
    return source[info.fieldName];
};
