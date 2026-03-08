"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIngest = setupIngest;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const uuid_1 = require("uuid");
const joi_1 = __importDefault(require("joi"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const signalService_js_1 = require("../services/signalService.js");
const logger_js_1 = require("../observability/logger.js");
const metrics_js_1 = require("../observability/metrics.js");
const environment_js_1 = require("../../config/environment.js");
// Signal input validation schema
const signalSchema = joi_1.default.object({
    tenantId: joi_1.default.string().required().max(255),
    type: joi_1.default.string().required().max(100),
    value: joi_1.default.number().required().min(-1000).max(1000),
    weight: joi_1.default.number().optional().min(0).max(100).default(1.0),
    source: joi_1.default.string().required().max(255),
    ts: joi_1.default.date()
        .iso()
        .optional()
        .default(() => new Date()),
    metadata: joi_1.default.object().optional(),
});
const batchSignalSchema = joi_1.default.object({
    signals: joi_1.default.array().items(signalSchema).min(1).max(1000).required(),
});
// Rate limiting middleware
const createRateLimiter = (windowMs, max, keyGenerator) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        keyGenerator: keyGenerator || ((req) => req.ip),
        message: {
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil(windowMs / 1000),
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            (0, metrics_js_1.incrementCounter)('http_requests_rate_limited_total', {
                endpoint: req.path,
                tenant_id: req.body?.tenantId || 'unknown',
            });
            logger_js_1.logger.warn('Rate limit exceeded', {
                ip: req.ip,
                path: req.path,
                tenantId: req.body?.tenantId,
                userAgent: req.get('User-Agent'),
            });
            res.status(429).json({
                error: 'Rate limit exceeded',
                retryAfter: Math.ceil(windowMs / 1000),
            });
        },
    });
};
// Global rate limiter
const globalLimiter = createRateLimiter(60 * 1000, environment_js_1.config.CONDUCTOR_RPS_MAX); // 1000 RPM global
// Per-tenant rate limiter
const tenantLimiter = createRateLimiter(60 * 1000, Math.floor(environment_js_1.config.CONDUCTOR_RPS_MAX / 10), // 100 RPM per tenant
(req) => req.body?.tenantId || req.ip);
// Authentication middleware
const authenticateRequest = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Missing or invalid Authorization header',
            });
        }
        const token = authHeader.substring(7);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, environment_js_1.config.JWT_PUBLIC_KEY, {
                algorithms: [environment_js_1.config.JWT_ALGORITHM],
                issuer: environment_js_1.config.JWT_ISSUER,
                audience: environment_js_1.config.JWT_AUDIENCE,
            });
            // Fail-closed: Ensure critical claims are present
            if (!decoded.tenantId) {
                logger_js_1.logger.warn('Token missing tenantId claim', { requestId: req.requestId });
                return res.status(401).json({ error: 'Invalid token: missing tenant context' });
            }
            req.user = {
                id: decoded.sub || decoded.id || 'unknown',
                tenantId: decoded.tenantId,
                scopes: decoded.scopes || [],
            };
            next();
        }
        catch (jwtError) {
            logger_js_1.logger.warn('JWT verification failed', {
                error: jwtError.message,
                requestId: req.requestId,
                ip: req.ip,
            });
            return res.status(401).json({
                error: 'Invalid or expired token',
            });
        }
    }
    catch (error) {
        logger_js_1.logger.error('Authentication error', { error: error.message, requestId: req.requestId });
        res.status(401).json({
            error: 'Authentication failed',
        });
    }
};
// Request logging middleware
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger_js_1.logger.info('HTTP request completed', {
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            tenantId: req.body?.tenantId,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
        });
        // Record metrics
        (0, metrics_js_1.incrementCounter)('http_requests_total', {
            method: req.method,
            status_code: res.statusCode.toString(),
            endpoint: req.path,
        });
        (0, metrics_js_1.recordHistogram)('http_request_duration_seconds', duration / 1000, {
            method: req.method,
            status_code: res.statusCode.toString(),
            endpoint: req.path,
        });
    });
    next();
};
// Provenance middleware - attaches metadata to all requests
const attachProvenance = (req, res, next) => {
    const provenance = {
        id: (0, uuid_1.v4)(),
        timestamp: new Date().toISOString(),
        source: 'http-ingest',
        requestId: req.requestId,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        purpose: 'benchmarking',
        retention: 'standard-365d',
        license: 'Restricted-TOS',
        residency: 'US',
    };
    req.provenance = provenance;
    next();
};
// Single signal ingestion endpoint
const ingestSignal = async (req, res) => {
    const startTime = Date.now();
    try {
        // Validate request body
        const { error, value: validatedSignal } = signalSchema.validate(req.body);
        if (error) {
            (0, metrics_js_1.incrementCounter)('signal_validation_errors_total', {
                tenant_id: req.body?.tenantId || 'unknown',
                error_type: 'validation',
            });
            return res.status(400).json({
                error: 'Validation failed',
                details: error.details.map((d) => d.message),
            });
        }
        // Check tenant authorization
        if (req.user.tenantId !== validatedSignal.tenantId &&
            req.user.tenantId !== 'system') {
            (0, metrics_js_1.incrementCounter)('signal_authorization_errors_total', {
                tenant_id: validatedSignal.tenantId,
            });
            return res.status(403).json({
                error: 'Unauthorized to write signals for this tenant',
            });
        }
        // Attach provenance
        const signalWithProvenance = {
            ...validatedSignal,
            provenance: req.provenance,
        };
        // Process signal
        const result = await signalService_js_1.signalService.ingestSignal(signalWithProvenance);
        // Record success metrics
        (0, metrics_js_1.incrementCounter)('signals_ingested_total', {
            tenant_id: validatedSignal.tenantId,
            signal_type: validatedSignal.type,
            source: validatedSignal.source,
        });
        (0, metrics_js_1.recordHistogram)('signal_processing_duration_seconds', (Date.now() - startTime) / 1000, {
            tenant_id: validatedSignal.tenantId,
            signal_type: validatedSignal.type,
        });
        logger_js_1.logger.info('Signal ingested successfully', {
            requestId: req.requestId,
            tenantId: validatedSignal.tenantId,
            signalType: validatedSignal.type,
            signalId: result.signalId,
            provenanceId: req.provenance.id,
            duration: Date.now() - startTime,
        });
        res.status(201).json({
            success: true,
            signalId: result.signalId,
            provenanceId: req.provenance.id,
            processed: true,
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        (0, metrics_js_1.incrementCounter)('signal_processing_errors_total', {
            tenant_id: req.body?.tenantId || 'unknown',
            error_type: error.name || 'unknown',
        });
        logger_js_1.logger.error('Signal ingestion failed', {
            requestId: req.requestId,
            error: error.message,
            stack: error.stack,
            tenantId: req.body?.tenantId,
            duration,
        });
        res.status(500).json({
            error: 'Signal ingestion failed',
            requestId: req.requestId,
        });
    }
};
// Batch signal ingestion endpoint
const ingestBatchSignals = async (req, res) => {
    const startTime = Date.now();
    try {
        // Validate request body
        const { error, value: validatedBatch } = batchSignalSchema.validate(req.body);
        if (error) {
            (0, metrics_js_1.incrementCounter)('batch_validation_errors_total', {
                error_type: 'validation',
            });
            return res.status(400).json({
                error: 'Batch validation failed',
                details: error.details.map((d) => d.message),
            });
        }
        const { signals } = validatedBatch;
        // Check all signals belong to authorized tenants
        const unauthorizedSignals = signals.filter((s) => req.user.tenantId !== s.tenantId && req.user.tenantId !== 'system');
        if (unauthorizedSignals.length > 0) {
            (0, metrics_js_1.incrementCounter)('batch_authorization_errors_total', {
                unauthorized_count: unauthorizedSignals.length,
            });
            return res.status(403).json({
                error: 'Unauthorized to write signals for some tenants',
                unauthorizedTenants: [
                    ...new Set(unauthorizedSignals.map((s) => s.tenantId)),
                ],
            });
        }
        // Attach provenance to all signals
        const signalsWithProvenance = signals.map((signal) => ({
            ...signal,
            provenance: req.provenance,
        }));
        // Process batch
        const results = await signalService_js_1.signalService.ingestBatchSignals(signalsWithProvenance);
        // Record success metrics
        (0, metrics_js_1.incrementCounter)('batch_signals_ingested_total', {
            batch_size: signals.length,
        });
        signals.forEach((signal) => {
            (0, metrics_js_1.incrementCounter)('signals_ingested_total', {
                tenant_id: signal.tenantId,
                signal_type: signal.type,
                source: signal.source,
            });
        });
        (0, metrics_js_1.recordHistogram)('batch_processing_duration_seconds', (Date.now() - startTime) / 1000, {
            batch_size: signals.length,
        });
        logger_js_1.logger.info('Batch signals ingested successfully', {
            requestId: req.requestId,
            batchSize: signals.length,
            successCount: results.successCount,
            errorCount: results.errorCount,
            provenanceId: req.provenance.id,
            duration: Date.now() - startTime,
        });
        res.status(201).json({
            success: true,
            processed: results.successCount,
            errors: results.errorCount,
            provenanceId: req.provenance.id,
            results: results.details,
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        (0, metrics_js_1.incrementCounter)('batch_processing_errors_total', {
            error_type: error.name || 'unknown',
        });
        logger_js_1.logger.error('Batch signal ingestion failed', {
            requestId: req.requestId,
            error: error.message,
            stack: error.stack,
            duration,
        });
        res.status(500).json({
            error: 'Batch signal ingestion failed',
            requestId: req.requestId,
        });
    }
};
// Health check for ingest endpoint
const ingestHealthCheck = (req, res) => {
    res.json({
        service: 'coherence-signal-ingest',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: environment_js_1.config.APP_VERSION,
        endpoints: [
            'POST /v1/coherence/signals',
            'POST /v1/coherence/signals/batch',
        ],
    });
};
function setupIngest(app) {
    // Apply middleware stack
    app.use('/v1/coherence', requestLogger);
    app.use('/v1/coherence', globalLimiter);
    app.use('/v1/coherence', tenantLimiter);
    app.use('/v1/coherence', authenticateRequest);
    app.use('/v1/coherence', attachProvenance);
    // Register endpoints
    app.post('/v1/coherence/signals', ingestSignal);
    app.post('/v1/coherence/signals/batch', ingestBatchSignals);
    app.get('/v1/coherence/health', ingestHealthCheck);
    logger_js_1.logger.info('Coherence signal ingest endpoints registered', {
        endpoints: [
            'POST /v1/coherence/signals',
            'POST /v1/coherence/signals/batch',
            'GET /v1/coherence/health',
        ],
    });
}
