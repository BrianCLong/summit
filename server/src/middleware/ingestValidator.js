"use strict";
/**
 * Maestro Conductor v24.4.0 - Malformed Ingest Detection & Validation
 * Epic E19: Advanced Abuse/Misuse Detection & Mitigation
 *
 * Comprehensive validation and sanitization of incoming data
 * Detects malformed payloads, injection attempts, and data corruption
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestValidator = exports.IngestValidator = void 0;
const joi_1 = __importDefault(require("joi"));
const isomorphic_dompurify_1 = __importDefault(require("isomorphic-dompurify"));
const metrics_js_1 = require("../utils/metrics.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const tracing_js_1 = require("../utils/tracing.js");
const QuotaEnforcer_js_1 = require("../lib/resources/QuotaEnforcer.js");
class IngestValidator {
    config;
    metrics;
    suspiciousPatterns;
    schemaDefinitions;
    validationCache = new Map();
    constructor(config = {}) {
        this.config = {
            enabled: true,
            maxPayloadSize: 10 * 1024 * 1024, // 10MB
            maxStringLength: 10000,
            maxArrayLength: 1000,
            maxObjectDepth: 10,
            maxPropertiesPerObject: 100,
            sanitizeHtml: true,
            blockSuspiciousPatterns: true,
            validateJsonSchema: true,
            rateLimitValidation: true,
            validationTimeoutMs: 5000,
            ...config,
        };
        this.metrics = new metrics_js_1.PrometheusMetrics('ingest_validator');
        this.suspiciousPatterns = this.getDefaultSuspiciousPatterns();
        this.schemaDefinitions = this.getDefaultSchemaDefinitions();
        this.initializeMetrics();
        this.startCleanupTask();
    }
    initializeMetrics() {
        this.metrics.createCounter('validations_total', 'Total validations performed', ['tenant_id', 'status']);
        this.metrics.createCounter('validation_errors', 'Validation errors detected', ['tenant_id', 'error_type']);
        this.metrics.createCounter('suspicious_patterns', 'Suspicious patterns detected', ['tenant_id', 'pattern']);
        this.metrics.createCounter('blocked_requests', 'Requests blocked by validation', ['tenant_id', 'reason']);
        this.metrics.createHistogram('validation_duration', 'Validation processing time', {
            buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
        });
        this.metrics.createHistogram('payload_size', 'Incoming payload sizes', {
            buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600], // 1KB to 100MB
        });
        this.metrics.createGauge('validation_cache_size', 'Number of cached validation results');
    }
    getDefaultSuspiciousPatterns() {
        return [
            {
                name: 'sql_injection',
                pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)|(\b(UNION|OR|AND)\s+\d+\s*=\s*\d+)|('.*'.*=.*')|(\bOR\b.*\bLIKE\b)|(\bUNION\b.*\bSELECT\b)/i,
                description: 'Potential SQL injection attempt',
                severity: 'high',
                blockRequest: true,
            },
            {
                name: 'xss_script',
                pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                description: 'XSS script injection attempt',
                severity: 'high',
                blockRequest: true,
            },
            {
                name: 'command_injection',
                pattern: /(\||;|`|\$\(|\${|&&|\|\||>|<|exec|eval|system|shell_exec|passthru|popen)/i,
                description: 'Potential command injection',
                severity: 'high',
                blockRequest: true,
            },
            {
                name: 'path_traversal',
                pattern: /(\.\.[\/\\])|(\.[\/\\])|([\/\\]\.\.[\/\\])|([\/\\]\.\.)|(\%2e\%2e)|(\%2f)|(\%5c)/i,
                description: 'Path traversal attempt',
                severity: 'medium',
                blockRequest: true,
            },
            {
                name: 'ldap_injection',
                pattern: /(\*|\(|\)|\\|\||\&)/g,
                description: 'Potential LDAP injection',
                severity: 'medium',
                blockRequest: false,
            },
            {
                name: 'xml_external_entity',
                pattern: /<!ENTITY|SYSTEM|PUBLIC|DOCTYPE.*ENTITY/i,
                description: 'XXE attack attempt',
                severity: 'high',
                blockRequest: true,
            },
            {
                name: 'excessive_recursion',
                pattern: /(\{[^}]*){10,}/g,
                description: 'Potentially recursive/nested structure',
                severity: 'medium',
                blockRequest: false,
            },
            {
                name: 'binary_data',
                pattern: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/,
                description: 'Binary or control characters detected',
                severity: 'low',
                blockRequest: false,
            },
        ];
    }
    getDefaultSchemaDefinitions() {
        const schemas = new Map();
        // Graph node schema
        schemas.set('graph_node', {
            name: 'Graph Node',
            description: 'Schema for graph node data',
            schema: joi_1.default.object({
                id: joi_1.default.string().max(255).required(),
                type: joi_1.default.string().max(100).required(),
                properties: joi_1.default.object().max(this.config.maxPropertiesPerObject),
                labels: joi_1.default.array().items(joi_1.default.string().max(100)).max(10),
                metadata: joi_1.default.object({
                    created: joi_1.default.date(),
                    updated: joi_1.default.date(),
                    version: joi_1.default.number().integer().min(1),
                }),
            }),
        });
        // Graph edge schema
        schemas.set('graph_edge', {
            name: 'Graph Edge',
            description: 'Schema for graph edge data',
            schema: joi_1.default.object({
                id: joi_1.default.string().max(255).required(),
                type: joi_1.default.string().max(100).required(),
                from: joi_1.default.string().max(255).required(),
                to: joi_1.default.string().max(255).required(),
                properties: joi_1.default.object().max(this.config.maxPropertiesPerObject),
                weight: joi_1.default.number().min(0).max(1),
                metadata: joi_1.default.object(),
            }),
        });
        // Event data schema
        schemas.set('event_data', {
            name: 'Event Data',
            description: 'Schema for event ingestion',
            schema: joi_1.default.object({
                id: joi_1.default.string().max(255).required(),
                timestamp: joi_1.default.date().required(),
                source: joi_1.default.string().max(255).required(),
                type: joi_1.default.string().max(100).required(),
                severity: joi_1.default.string().valid('low', 'medium', 'high', 'critical'),
                data: joi_1.default.object().max(this.config.maxPropertiesPerObject),
                tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(20),
            }),
        });
        // Analytics query schema
        schemas.set('analytics_query', {
            name: 'Analytics Query',
            description: 'Schema for analytics query validation',
            schema: joi_1.default.object({
                query: joi_1.default.string().max(5000).required(),
                parameters: joi_1.default.object().max(50),
                timeRange: joi_1.default.object({
                    start: joi_1.default.date().required(),
                    end: joi_1.default.date().required(),
                }),
                limit: joi_1.default.number().integer().min(1).max(10000),
                format: joi_1.default.string().valid('json', 'csv', 'xml'),
            }),
        });
        return schemas;
    }
    // Express middleware factory
    middleware(schemaType) {
        return async (req, res, next) => {
            if (!this.config.enabled) {
                return next();
            }
            return tracing_js_1.tracer.startActiveSpan('ingest_validator.middleware', async (span) => {
                const startTime = Date.now();
                try {
                    const tenantId = this.extractTenantId(req);
                    const payloadSize = this.calculatePayloadSize(req);
                    // Ingest Quota Check (Step 1)
                    const count = Array.isArray(req.body) ? req.body.length : 1;
                    const quotaResult = await QuotaEnforcer_js_1.quotaEnforcer.checkIngestQuota(tenantId, count);
                    if (!quotaResult.allowed) {
                        logger_js_1.default.warn('Ingest quota exceeded', { tenantId, count, limit: quotaResult.limit });
                        this.metrics.incrementCounter('blocked_requests', { tenant_id: tenantId, reason: 'quota_exceeded' });
                        res.status(429).json({
                            error: 'Ingest Quota Exceeded',
                            message: `You have exceeded your ingest rate limit. Reset in ${Math.ceil((quotaResult.reset - Date.now()) / 1000)}s`
                        });
                        return;
                    }
                    span.setAttributes({
                        'ingest_validator.tenant_id': tenantId,
                        'ingest_validator.payload_size': payloadSize,
                        'ingest_validator.schema_type': schemaType || 'none',
                    });
                    // Record payload size
                    this.metrics.observeHistogram('payload_size', payloadSize);
                    // Check payload size limits
                    if (payloadSize > this.config.maxPayloadSize) {
                        logger_js_1.default.warn('Payload size exceeded', {
                            tenantId,
                            size: payloadSize,
                            limit: this.config.maxPayloadSize,
                        });
                        this.metrics.incrementCounter('blocked_requests', {
                            tenant_id: tenantId,
                            reason: 'payload_too_large',
                        });
                        res.status(413).json({
                            error: 'Payload too large',
                            message: `Payload size ${payloadSize} exceeds limit of ${this.config.maxPayloadSize} bytes`,
                            maxSize: this.config.maxPayloadSize,
                        });
                        return;
                    }
                    // Validate the request data
                    const validationResult = await this.validateRequest(req, schemaType);
                    span.setAttributes({
                        'ingest_validator.is_valid': validationResult.isValid,
                        'ingest_validator.risk_score': validationResult.riskScore,
                        'ingest_validator.error_count': validationResult.errors.length,
                        'ingest_validator.warning_count': validationResult.warnings.length,
                    });
                    // Record metrics
                    this.metrics.observeHistogram('validation_duration', validationResult.processingTime);
                    this.metrics.incrementCounter('validations_total', {
                        tenant_id: tenantId,
                        status: validationResult.isValid ? 'valid' : 'invalid',
                    });
                    // Handle validation errors
                    if (!validationResult.isValid) {
                        const blockingErrors = validationResult.errors.filter((e) => e.blocked);
                        if (blockingErrors.length > 0) {
                            logger_js_1.default.warn('Request blocked by validation', {
                                tenantId,
                                errors: blockingErrors,
                                riskScore: validationResult.riskScore,
                            });
                            blockingErrors.forEach((error) => {
                                this.metrics.incrementCounter('validation_errors', {
                                    tenant_id: tenantId,
                                    error_type: error.code,
                                });
                            });
                            this.metrics.incrementCounter('blocked_requests', {
                                tenant_id: tenantId,
                                reason: 'validation_failed',
                            });
                            res.status(400).json({
                                error: 'Validation failed',
                                message: 'Request contains invalid or malicious data',
                                details: blockingErrors.map((e) => ({
                                    field: e.field,
                                    message: e.message,
                                    severity: e.severity,
                                })),
                            });
                            return;
                        }
                    }
                    // Log warnings but allow request
                    if (validationResult.warnings.length > 0) {
                        logger_js_1.default.warn('Validation warnings', {
                            tenantId,
                            warnings: validationResult.warnings,
                            riskScore: validationResult.riskScore,
                        });
                    }
                    // Attach sanitized data if available
                    if (validationResult.sanitizedData) {
                        req.body = validationResult.sanitizedData;
                    }
                    // Attach validation metadata
                    req.validationResult = validationResult;
                    next();
                }
                catch (error) {
                    const duration = Date.now() - startTime;
                    logger_js_1.default.error('Validation error', {
                        error: error.message,
                        duration,
                    });
                    span.recordException(error);
                    this.metrics.observeHistogram('validation_duration', duration / 1000);
                    this.metrics.incrementCounter('validations_total', {
                        tenant_id: 'unknown',
                        status: 'error',
                    });
                    // Fail open - allow request but log error
                    next();
                }
            });
        };
    }
    extractTenantId(req) {
        return (req.headers['x-tenant-id'] ||
            req.body?.tenantId ||
            req.query.tenantId ||
            req.user?.tenantId ||
            'default');
    }
    calculatePayloadSize(req) {
        let size = 0;
        if (req.body) {
            size += JSON.stringify(req.body).length;
        }
        if (req.query) {
            size += JSON.stringify(req.query).length;
        }
        return size;
    }
    async validateRequest(req, schemaType) {
        const startTime = Date.now();
        const tenantId = this.extractTenantId(req);
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            riskScore: 0,
            processingTime: 0,
        };
        try {
            // Create cache key for validation results
            const cacheKey = this.createCacheKey(req, schemaType);
            const cached = this.validationCache.get(cacheKey);
            if (cached && Date.now() - startTime < 60000) {
                // 1 minute cache
                return cached;
            }
            // Validate structure limits
            this.validateStructureLimits(req.body, result);
            // Check for suspicious patterns
            if (this.config.blockSuspiciousPatterns) {
                this.checkSuspiciousPatterns(req.body, result, tenantId);
            }
            // Validate against schema if specified
            if (schemaType && this.config.validateJsonSchema) {
                await this.validateAgainstSchema(req.body, schemaType, result);
            }
            // Sanitize HTML if enabled
            if (this.config.sanitizeHtml) {
                result.sanitizedData = this.sanitizeData(req.body, result);
            }
            // Calculate risk score
            result.riskScore = this.calculateRiskScore(result);
            result.processingTime = (Date.now() - startTime) / 1000;
            // Cache the result
            if (result.processingTime < 1) {
                // Only cache quick validations
                this.validationCache.set(cacheKey, result);
            }
            return result;
        }
        catch (error) {
            result.isValid = false;
            result.errors.push({
                field: 'root',
                message: 'Validation processing error',
                code: 'processing_error',
                severity: 'medium',
                blocked: false,
            });
            result.processingTime = (Date.now() - startTime) / 1000;
            return result;
        }
    }
    validateStructureLimits(data, result, path = '', depth = 0) {
        if (depth > this.config.maxObjectDepth) {
            result.errors.push({
                field: path,
                message: `Object depth exceeds limit of ${this.config.maxObjectDepth}`,
                code: 'max_depth_exceeded',
                severity: 'medium',
                blocked: true,
            });
            result.isValid = false;
            return;
        }
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                if (data.length > this.config.maxArrayLength) {
                    result.errors.push({
                        field: path,
                        message: `Array length ${data.length} exceeds limit of ${this.config.maxArrayLength}`,
                        code: 'max_array_length',
                        severity: 'medium',
                        blocked: true,
                    });
                    result.isValid = false;
                    return;
                }
                data.forEach((item, index) => {
                    this.validateStructureLimits(item, result, `${path}[${index}]`, depth + 1);
                });
            }
            else {
                const keys = Object.keys(data);
                if (keys.length > this.config.maxPropertiesPerObject) {
                    result.errors.push({
                        field: path,
                        message: `Object has ${keys.length} properties, exceeds limit of ${this.config.maxPropertiesPerObject}`,
                        code: 'max_properties_exceeded',
                        severity: 'medium',
                        blocked: true,
                    });
                    result.isValid = false;
                    return;
                }
                keys.forEach((key) => {
                    const fieldPath = path ? `${path}.${key}` : key;
                    this.validateStructureLimits(data[key], result, fieldPath, depth + 1);
                });
            }
        }
        else if (typeof data === 'string') {
            if (data.length > this.config.maxStringLength) {
                result.errors.push({
                    field: path,
                    message: `String length ${data.length} exceeds limit of ${this.config.maxStringLength}`,
                    code: 'max_string_length',
                    severity: 'low',
                    blocked: false,
                });
            }
        }
    }
    checkSuspiciousPatterns(data, result, tenantId, path = '') {
        if (typeof data === 'string') {
            for (const pattern of this.suspiciousPatterns) {
                if (pattern.pattern.test(data)) {
                    const error = {
                        field: path,
                        message: pattern.description,
                        code: pattern.name,
                        severity: pattern.severity,
                        blocked: pattern.blockRequest,
                    };
                    result.errors.push(error);
                    if (pattern.blockRequest) {
                        result.isValid = false;
                    }
                    this.metrics.incrementCounter('suspicious_patterns', {
                        tenant_id: tenantId,
                        pattern: pattern.name,
                    });
                    logger_js_1.default.warn('Suspicious pattern detected', {
                        tenantId,
                        pattern: pattern.name,
                        field: path,
                        severity: pattern.severity,
                    });
                }
            }
        }
        else if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                data.forEach((item, index) => {
                    this.checkSuspiciousPatterns(item, result, tenantId, `${path}[${index}]`);
                });
            }
            else {
                Object.keys(data).forEach((key) => {
                    const fieldPath = path ? `${path}.${key}` : key;
                    this.checkSuspiciousPatterns(data[key], result, tenantId, fieldPath);
                });
            }
        }
    }
    async validateAgainstSchema(data, schemaType, result) {
        const schemaDef = this.schemaDefinitions.get(schemaType);
        if (!schemaDef) {
            result.warnings.push({
                field: 'schema',
                message: `Schema type '${schemaType}' not found, skipping validation`,
            });
            return;
        }
        try {
            const { error } = schemaDef.schema.validate(data, {
                abortEarly: false,
                allowUnknown: true,
                stripUnknown: false,
            });
            if (error) {
                error.details.forEach((detail) => {
                    result.errors.push({
                        field: detail.path.join('.'),
                        message: detail.message,
                        code: 'schema_validation',
                        severity: 'medium',
                        blocked: false,
                    });
                });
            }
        }
        catch (error) {
            result.errors.push({
                field: 'schema',
                message: 'Schema validation failed',
                code: 'schema_error',
                severity: 'low',
                blocked: false,
            });
        }
    }
    sanitizeData(data, result, path = '') {
        if (typeof data === 'string') {
            const sanitized = isomorphic_dompurify_1.default.sanitize(data);
            if (sanitized !== data) {
                result.warnings.push({
                    field: path,
                    message: 'String was sanitized to remove potentially malicious content',
                    originalValue: data,
                    sanitizedValue: sanitized,
                });
            }
            return sanitized;
        }
        else if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                return data.map((item, index) => this.sanitizeData(item, result, `${path}[${index}]`));
            }
            else {
                const sanitized = {};
                Object.keys(data).forEach((key) => {
                    const fieldPath = path ? `${path}.${key}` : key;
                    sanitized[key] = this.sanitizeData(data[key], result, fieldPath);
                });
                return sanitized;
            }
        }
        return data;
    }
    calculateRiskScore(result) {
        let score = 0;
        result.errors.forEach((error) => {
            switch (error.severity) {
                case 'critical':
                    score += 40;
                    break;
                case 'high':
                    score += 25;
                    break;
                case 'medium':
                    score += 15;
                    break;
                case 'low':
                    score += 5;
                    break;
            }
        });
        result.warnings.forEach(() => {
            score += 2;
        });
        return Math.min(score, 100);
    }
    createCacheKey(req, schemaType) {
        const data = JSON.stringify({ body: req.body, query: req.query });
        const hash = require('crypto').createHash('md5').update(data).digest('hex');
        return `${schemaType || 'none'}_${hash}`;
    }
    startCleanupTask() {
        // Clean up cache every 10 minutes
        setInterval(() => {
            const cutoff = Date.now() - 10 * 60 * 1000;
            let cleaned = 0;
            for (const [key, result] of this.validationCache.entries()) {
                if (Date.now() - result.processingTime * 1000 > cutoff) {
                    this.validationCache.delete(key);
                    cleaned++;
                }
            }
            if (cleaned > 0) {
                logger_js_1.default.debug('Cleaned validation cache', { count: cleaned });
                this.metrics.setGauge('validation_cache_size', this.validationCache.size);
            }
        }, 10 * 60 * 1000);
    }
    // Admin methods
    getValidationStats() {
        return {
            cacheSize: this.validationCache.size,
            schemaCount: this.schemaDefinitions.size,
            patternCount: this.suspiciousPatterns.length,
        };
    }
    addSuspiciousPattern(pattern) {
        this.suspiciousPatterns.push(pattern);
        logger_js_1.default.info('Added suspicious pattern', { name: pattern.name });
    }
    addSchemaDefinition(name, schema) {
        this.schemaDefinitions.set(name, schema);
        logger_js_1.default.info('Added schema definition', { name });
    }
}
exports.IngestValidator = IngestValidator;
// Export singleton instance
exports.ingestValidator = new IngestValidator({
    enabled: process.env.INGEST_VALIDATOR_ENABLED !== 'false',
    maxPayloadSize: parseInt(process.env.INGEST_MAX_PAYLOAD_SIZE || '10485760'), // 10MB
    maxStringLength: parseInt(process.env.INGEST_MAX_STRING_LENGTH || '10000'),
    maxArrayLength: parseInt(process.env.INGEST_MAX_ARRAY_LENGTH || '1000'),
    maxObjectDepth: parseInt(process.env.INGEST_MAX_OBJECT_DEPTH || '10'),
    maxPropertiesPerObject: parseInt(process.env.INGEST_MAX_PROPERTIES || '100'),
    sanitizeHtml: process.env.INGEST_SANITIZE_HTML !== 'false',
    blockSuspiciousPatterns: process.env.INGEST_BLOCK_SUSPICIOUS !== 'false',
    validateJsonSchema: process.env.INGEST_VALIDATE_SCHEMA !== 'false',
    rateLimitValidation: process.env.INGEST_RATE_LIMIT !== 'false',
    validationTimeoutMs: parseInt(process.env.INGEST_VALIDATION_TIMEOUT || '5000'),
});
