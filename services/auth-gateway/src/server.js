"use strict";
/**
 * Authentication Gateway for Agentic Mesh
 *
 * Provides:
 * - OIDC/OAuth2 authentication for human operators
 * - mTLS authentication for service-to-service communication
 * - Token validation and enrichment with ABAC attributes
 * - Integration with policy-enforcer for authorization
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pino_http_1 = require("pino-http");
const pino_1 = __importDefault(require("pino"));
const oidc_authenticator_js_1 = require("./auth/oidc-authenticator.js");
const service_authenticator_js_1 = require("./auth/service-authenticator.js");
const context_enricher_js_1 = require("./auth/context-enricher.js");
const policy_client_js_1 = require("./clients/policy-client.js");
const health_js_1 = require("./routes/health.js");
const auth_js_1 = require("./routes/auth.js");
const proxy_js_1 = require("./routes/proxy.js");
const logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty' }
        : undefined
});
const app = (0, express_1.default)();
// Request logging
app.use((0, pino_http_1.pinoHttp)({ logger }));
// Parse JSON bodies
app.use(express_1.default.json());
// Initialize authentication components
const oidcAuthenticator = new oidc_authenticator_js_1.OIDCAuthenticator({
    issuerUrl: process.env.OIDC_ISSUER_URL || '',
    clientId: process.env.OIDC_CLIENT_ID || '',
    clientSecret: process.env.OIDC_CLIENT_SECRET || '',
    redirectUri: process.env.OIDC_REDIRECT_URI || 'http://localhost:8443/auth/callback',
    scopes: ['openid', 'profile', 'email']
});
const serviceAuthenticator = new service_authenticator_js_1.ServiceAuthenticator({
    trustBundlePath: process.env.SPIRE_TRUST_BUNDLE_PATH || '/var/run/spire/bundle.pem',
    validateSPIFFEID: true
});
const contextEnricher = new context_enricher_js_1.AuthContextEnricher({
    tenantServiceUrl: process.env.TENANT_REGISTRY_URL || 'http://tenant-registry.mesh-control:8083'
});
const policyClient = new policy_client_js_1.PolicyClient({
    policyEnforcerUrl: process.env.POLICY_ENFORCER_URL || 'http://policy-enforcer.mesh-control:8081'
});
// Health check routes (no auth required)
app.use('/health', health_js_1.healthRouter);
// Auth routes (login, callback, logout)
app.use('/auth', (0, auth_js_1.authRouter)(oidcAuthenticator));
// Authentication middleware
// Tries OIDC token first, then mTLS service auth
app.use(async (req, res, next) => {
    try {
        // Skip auth for health checks and auth routes
        if (req.path.startsWith('/health') || req.path.startsWith('/auth')) {
            return next();
        }
        // Try OIDC token auth (for human operators)
        const authHeader = req.headers.authorization;
        let authContext;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const identity = await oidcAuthenticator.validateToken(token);
            authContext = await contextEnricher.enrichHumanIdentity(identity);
        }
        // Try mTLS service auth
        else if (req.socket && req.socket.getPeerCertificate) {
            const cert = req.socket.getPeerCertificate();
            const identity = await serviceAuthenticator.validateCertificate(cert);
            authContext = await contextEnricher.enrichServiceIdentity(identity);
        }
        // No valid authentication
        else {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'No valid authentication credentials provided'
            });
            return;
        }
        // Attach auth context to request
        req.authContext = authContext;
        logger.info({
            authContext,
            path: req.path,
            method: req.method
        }, 'Request authenticated');
        next();
    }
    catch (error) {
        logger.error({ error }, 'Authentication failed');
        res.status(401).json({
            error: 'Unauthorized',
            message: error instanceof Error ? error.message : 'Authentication failed'
        });
    }
});
// Authorization middleware
app.use(async (req, res, next) => {
    try {
        // Skip for health checks and auth routes
        if (req.path.startsWith('/health') || req.path.startsWith('/auth')) {
            return next();
        }
        const authContext = req.authContext;
        if (!authContext) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Determine resource and action from request
        const resource = extractResource(req);
        const action = extractAction(req);
        // Check authorization with policy enforcer
        const decision = await policyClient.authorize({
            subject: authContext,
            resource,
            action,
            context: {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                timestamp: new Date().toISOString()
            }
        });
        if (!decision.allowed) {
            logger.warn({
                authContext,
                resource,
                action,
                reason: decision.reason
            }, 'Authorization denied');
            res.status(403).json({
                error: 'Forbidden',
                message: decision.reason || 'Access denied by policy'
            });
            return;
        }
        logger.info({
            authContext,
            resource,
            action
        }, 'Request authorized');
        next();
    }
    catch (error) {
        logger.error({ error }, 'Authorization failed');
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authorization check failed'
        });
    }
});
// Proxy routes to backend services
app.use('/', proxy_js_1.proxyRouter);
// Error handling middleware
app.use((err, req, res, next) => {
    logger.error({ err, req }, 'Unhandled error');
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message
    });
});
// Start server
const PORT = process.env.PORT || 8443;
app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Auth Gateway started');
});
// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});
/**
 * Extract resource identifier from request
 */
function extractResource(req) {
    // Map request path to resource type
    const pathParts = req.path.split('/').filter(Boolean);
    if (pathParts.length === 0) {
        return 'mesh:*';
    }
    const [service, ...rest] = pathParts;
    if (rest.length > 0) {
        return `mesh:${service}:${rest[0]}`;
    }
    return `mesh:${service}`;
}
/**
 * Extract action from request method
 */
function extractAction(req) {
    const methodMap = {
        GET: 'read',
        POST: 'create',
        PUT: 'update',
        PATCH: 'update',
        DELETE: 'delete'
    };
    return methodMap[req.method] || 'execute';
}
