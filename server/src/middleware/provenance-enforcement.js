"use strict";
/**
 * Provenance Enforcement Middleware
 *
 * Enforces provenance tracking on protected routes and wraps responses with DataEnvelope
 *
 * SOC 2 Controls: PI1.1, PI1.2, PI1.4, C1.2, CC6.1
 *
 * @module provenance-enforcement
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVENANCE_CHAIN_HEADER = exports.PROVENANCE_ID_HEADER = exports.CORRELATION_ID_HEADER = void 0;
exports.correlationIdMiddleware = correlationIdMiddleware;
exports.validateIngressProvenance = validateIngressProvenance;
exports.provenanceEnforcementMiddleware = provenanceEnforcementMiddleware;
exports.responseWrapperMiddleware = responseWrapperMiddleware;
exports.auditProvenanceMiddleware = auditProvenanceMiddleware;
exports.isProtectedRoute = isProtectedRoute;
exports.addProvenanceWarning = addProvenanceWarning;
const crypto_1 = require("crypto");
const data_envelope_js_1 = require("../types/data-envelope.js");
const provenance_js_1 = require("../canonical/provenance.js");
/**
 * Protected routes configuration - routes that require provenance
 */
const PROTECTED_ROUTES = [
    '/api/v1/entities',
    '/api/v1/relationships',
    '/api/v1/investigations',
    '/api/v1/exports',
];
/**
 * Correlation ID header name
 */
exports.CORRELATION_ID_HEADER = 'X-Correlation-ID';
/**
 * Provenance header names
 */
exports.PROVENANCE_ID_HEADER = 'X-Provenance-Id';
exports.PROVENANCE_CHAIN_HEADER = 'X-Provenance-Chain';
/**
 * Correlation ID Middleware
 *
 * Adds or extracts correlation ID from request headers for distributed tracing
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
function correlationIdMiddleware(req, res, next) {
    try {
        // Extract or generate correlation ID
        const correlationId = req.headers[exports.CORRELATION_ID_HEADER.toLowerCase()] ||
            req.headers['x-request-id'] ||
            (0, crypto_1.randomUUID)();
        // Attach to request
        req.correlationId = correlationId;
        // Store in response locals
        res.locals = res.locals || {};
        res.locals.correlationId = correlationId;
        // Add to response headers
        res.setHeader(exports.CORRELATION_ID_HEADER, correlationId);
        // Log correlation ID establishment
        console.log(`[Provenance] Correlation ID established: ${correlationId}`);
        next();
    }
    catch (error) {
        console.error('[Provenance] Error in correlation ID middleware:', error);
        next(error);
    }
}
/**
 * Validate Ingress Provenance
 *
 * Validates that incoming requests to protected routes have proper provenance metadata
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
function validateIngressProvenance(req, res, next) {
    try {
        // Check if this is a protected route
        const isProtectedRoute = PROTECTED_ROUTES.some((route) => req.path.startsWith(route));
        if (!isProtectedRoute) {
            return next();
        }
        // Only validate POST, PUT, PATCH requests (not GET, DELETE)
        if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
            return next();
        }
        console.log(`[Provenance] Validating ingress provenance for ${req.method} ${req.path}`);
        // Check for provenance in request body
        const body = req.body;
        if (!body) {
            res.status(400).json({
                error: 'Request body required for protected route',
                code: 'MISSING_BODY',
                path: req.path,
                correlationId: req.correlationId,
            });
            return;
        }
        // Check if body is wrapped in DataEnvelope
        if (body.provenance && body.dataHash) {
            // Validate the envelope
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(body);
            if (!validation.valid) {
                console.error('[Provenance] Envelope validation failed:', validation.errors);
                return res.status(400).json({
                    error: 'Invalid data envelope',
                    errors: validation.errors,
                    code: 'ENVELOPE_VALIDATION_FAILED',
                    correlationId: req.correlationId,
                });
            }
            // Attach validated envelope to request
            req.envelope = body;
            console.log(`[Provenance] Valid envelope detected: ${body.provenance.provenanceId}`);
        }
        else {
            // For protected routes, require provenance
            console.warn(`[Provenance] Missing provenance for protected route: ${req.path}`);
            return res.status(400).json({
                error: 'Provenance required for this endpoint',
                code: 'PROVENANCE_REQUIRED',
                path: req.path,
                hint: 'Wrap your request in a DataEnvelope with proper provenance metadata',
                correlationId: req.correlationId,
            });
        }
        next();
    }
    catch (error) {
        console.error('[Provenance] Error validating ingress provenance:', error);
        res.status(500).json({
            error: 'Internal server error during provenance validation',
            code: 'PROVENANCE_VALIDATION_ERROR',
            correlationId: req.correlationId,
        });
    }
}
/**
 * Provenance Enforcement Middleware
 *
 * Main middleware that validates provenance chains on incoming requests
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
function provenanceEnforcementMiddleware(req, res, next) {
    try {
        // Check for provenance chain header
        const provenanceChainHeader = req.headers[exports.PROVENANCE_CHAIN_HEADER.toLowerCase()];
        if (provenanceChainHeader) {
            try {
                // Parse provenance chain from header
                const provenanceChain = JSON.parse(provenanceChainHeader);
                // Verify chain integrity
                const verification = (0, provenance_js_1.verifyChain)(provenanceChain);
                if (!verification.valid) {
                    console.error('[Provenance] Chain verification failed:', verification.errors);
                    return res.status(400).json({
                        error: 'Invalid provenance chain',
                        errors: verification.errors,
                        code: 'PROVENANCE_CHAIN_INVALID',
                        correlationId: req.correlationId,
                    });
                }
                // Attach verified chain to request
                req.provenanceChain = provenanceChain;
                console.log(`[Provenance] Valid provenance chain: ${provenanceChain.chainId}`);
            }
            catch (parseError) {
                console.error('[Provenance] Error parsing provenance chain:', parseError);
                return res.status(400).json({
                    error: 'Malformed provenance chain header',
                    code: 'PROVENANCE_CHAIN_MALFORMED',
                    correlationId: req.correlationId,
                });
            }
        }
        next();
    }
    catch (error) {
        console.error('[Provenance] Error in provenance enforcement:', error);
        next(error);
    }
}
/**
 * Response Wrapper Middleware
 *
 * Automatically wraps all responses in DataEnvelope with proper provenance
 *
 * @param config - Configuration options
 * @returns Express middleware function
 */
function responseWrapperMiddleware(config) {
    const { source = 'summit-api', version = '1.0.0', defaultClassification = data_envelope_js_1.DataClassification.INTERNAL, excludePaths = ['/health', '/metrics', '/ready', '/live'], } = config || {};
    return (req, res, next) => {
        try {
            // Check if path should be excluded
            if (excludePaths.some((path) => req.path.startsWith(path))) {
                return next();
            }
            // Store original json method
            const originalJson = res.json.bind(res);
            // Override json method to wrap response
            res.json = function (data) {
                // Don't wrap if already wrapped
                if (data && data.provenance && data.dataHash) {
                    return originalJson(data);
                }
                // Don't wrap error responses
                if (data && data.error) {
                    return originalJson(data);
                }
                // Extract metadata from request
                const userId = req.userId || req.user?.id || req.user?.sub || 'anonymous';
                const tenantId = req.tenantId || req.user?.tenant_id;
                // Determine if this is AI-generated content
                const isAIEndpoint = req.path.includes('/ai/') ||
                    req.path.includes('/copilot/') ||
                    req.path.includes('/hypothesis') ||
                    req.path.includes('/narrative') ||
                    req.path.includes('/risk');
                const confidence = isAIEndpoint && data.confidence !== undefined
                    ? data.confidence
                    : undefined;
                // Determine classification based on path
                const classification = determineClassification(req.path, defaultClassification);
                // Build lineage from provenance chain if available
                const lineage = req.provenanceChain
                    ? [
                        {
                            id: (0, crypto_1.randomUUID)(),
                            operation: `${req.method} ${req.path}`,
                            inputs: req.provenanceChain.source
                                ? [req.provenanceChain.source.sourceId]
                                : [],
                            timestamp: new Date(),
                            actor: userId,
                            metadata: {
                                method: req.method,
                                path: req.path,
                                tenantId,
                                correlationId: req.correlationId,
                                upstreamChainId: req.provenanceChain.chainId,
                            },
                        },
                    ]
                    : [
                        {
                            id: (0, crypto_1.randomUUID)(),
                            operation: `${req.method} ${req.path}`,
                            inputs: Object.keys(req.body || {}),
                            timestamp: new Date(),
                            actor: userId,
                            metadata: {
                                method: req.method,
                                path: req.path,
                                tenantId,
                                correlationId: req.correlationId,
                            },
                        },
                    ];
                // Collect warnings
                const warnings = res.locals?.warnings || [];
                // Add warning if data lacks provenance chain on protected route
                const isProtectedRoute = PROTECTED_ROUTES.some((route) => req.path.startsWith(route));
                if (isProtectedRoute && !req.provenanceChain) {
                    warnings.push('Response generated without upstream provenance chain');
                }
                // Create governance verdict for automatic response wrapping (GA Compliance)
                const governanceVerdict = {
                    verdictId: (0, crypto_1.randomUUID)(),
                    policyId: 'policy:response-wrapper:auto',
                    result: data_envelope_js_1.GovernanceResult.ALLOW,
                    decidedAt: new Date(),
                    reason: 'Automatic response wrapping by provenance enforcement middleware',
                    evaluator: 'provenance-enforcement-middleware',
                };
                // Create envelope
                const envelope = (0, data_envelope_js_1.createDataEnvelope)(data, {
                    source,
                    actor: userId,
                    version,
                    confidence,
                    isSimulated: process.env.NODE_ENV !== 'production',
                    classification,
                    governanceVerdict,
                    lineage,
                    warnings,
                });
                // Add response headers
                res.setHeader(exports.PROVENANCE_ID_HEADER, envelope.provenance.provenanceId);
                res.setHeader('X-Data-Hash', envelope.dataHash);
                res.setHeader('X-Data-Classification', envelope.classification);
                res.setHeader('X-Is-Simulated', envelope.isSimulated.toString());
                if (envelope.confidence !== undefined) {
                    res.setHeader('X-AI-Confidence', envelope.confidence.toString());
                }
                if (req.correlationId) {
                    res.setHeader(exports.CORRELATION_ID_HEADER, req.correlationId);
                }
                // Log envelope creation
                console.log(`[Provenance] Response wrapped: ${envelope.provenance.provenanceId}`);
                return originalJson(envelope);
            };
            next();
        }
        catch (error) {
            console.error('[Provenance] Error in response wrapper middleware:', error);
            next(error);
        }
    };
}
/**
 * Determine data classification based on request path
 *
 * @param path - Request path
 * @param defaultClassification - Default classification level
 * @returns Data classification level
 */
function determineClassification(path, defaultClassification) {
    // Highly restricted paths
    if (path.includes('/admin/') ||
        path.includes('/security/') ||
        path.includes('/audit/')) {
        return data_envelope_js_1.DataClassification.HIGHLY_RESTRICTED;
    }
    // Restricted paths
    if (path.includes('/risk/') ||
        path.includes('/pii/') ||
        path.includes('/financial/') ||
        path.includes('/sensitive/')) {
        return data_envelope_js_1.DataClassification.RESTRICTED;
    }
    // Confidential paths
    if (path.includes('/investigation') ||
        path.includes('/case') ||
        path.includes('/intelligence') ||
        path.includes('/entities') ||
        path.includes('/relationships')) {
        return data_envelope_js_1.DataClassification.CONFIDENTIAL;
    }
    // Internal paths
    if (path.includes('/api/')) {
        return data_envelope_js_1.DataClassification.INTERNAL;
    }
    // Public paths
    if (path.includes('/public/') ||
        path.includes('/health') ||
        path.includes('/docs')) {
        return data_envelope_js_1.DataClassification.PUBLIC;
    }
    return defaultClassification;
}
/**
 * Audit Provenance Middleware
 *
 * Logs provenance events to audit trail
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
function auditProvenanceMiddleware(req, res, next) {
    try {
        const envelope = req.envelope;
        if (envelope) {
            // Create audit entry
            const auditEntry = {
                timestamp: new Date().toISOString(),
                correlationId: req.correlationId,
                provenanceId: envelope.provenance.provenanceId,
                source: envelope.provenance.source,
                actor: envelope.provenance.actor,
                operation: `${req.method} ${req.path}`,
                classification: envelope.classification,
                confidence: envelope.confidence,
                isSimulated: envelope.isSimulated,
                dataHash: envelope.dataHash,
                userId: req.userId || req.user?.id,
                tenantId: req.tenantId || req.user?.tenant_id,
                provenanceChainId: req.provenanceChain?.chainId,
            };
            // Log to audit system
            console.log('[AUDIT] Provenance Event:', JSON.stringify(auditEntry));
            // TODO: Send to audit ledger service
            // await auditLedgerService.log(auditEntry);
        }
        next();
    }
    catch (error) {
        console.error('[Provenance] Error in audit middleware:', error);
        // Don't fail the request if audit logging fails
        next();
    }
}
/**
 * Check if route is protected
 *
 * @param path - Request path
 * @returns True if route requires provenance
 */
function isProtectedRoute(path) {
    return PROTECTED_ROUTES.some((route) => path.startsWith(route));
}
/**
 * Add warning to response
 *
 * @param res - Express response
 * @param warning - Warning message
 */
function addProvenanceWarning(res, warning) {
    res.locals = res.locals || {};
    res.locals.warnings = res.locals.warnings || [];
    res.locals.warnings.push(warning);
}
