"use strict";
// @ts-nocheck
/**
 * @fileoverview Security Hardening Configuration
 *
 * Centralized security configuration for the IntelGraph platform.
 * Implements OWASP Top 10 protections and enterprise security standards.
 *
 * @module security/SecurityHardeningConfig
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityManager = exports.SecurityHardeningManager = exports.defaultSecurityConfig = void 0;
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Default security configuration
 */
exports.defaultSecurityConfig = {
    strictMode: process.env.NODE_ENV === 'production',
    csp: {
        enabled: true,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: [],
        },
        reportUri: process.env.CSP_REPORT_URI,
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        skipSuccessfulRequests: false,
    },
    cors: {
        allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
        allowCredentials: true,
        maxAge: 86400, // 24 hours
    },
    session: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    input: {
        maxBodySize: '10mb',
        maxUrlLength: 2048,
        maxQueryParams: 100,
        sanitizeInput: true,
    },
    audit: {
        enabled: true,
        logLevel: 'standard',
        sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'authorization', 'cookie'],
    },
};
/**
 * Security Hardening Manager
 *
 * Provides centralized security controls and middleware for the application.
 */
class SecurityHardeningManager {
    config;
    nonce = '';
    constructor(config = {}) {
        this.config = { ...exports.defaultSecurityConfig, ...config };
    }
    /**
     * Generate a cryptographic nonce for CSP
     */
    generateNonce() {
        this.nonce = crypto_1.default.randomBytes(16).toString('base64');
        return this.nonce;
    }
    /**
     * Get Helmet configuration with security headers
     */
    getHelmetConfig() {
        return {
            contentSecurityPolicy: this.config.csp.enabled
                ? {
                    directives: {
                        ...this.config.csp.directives,
                        scriptSrc: [...(this.config.csp.directives.scriptSrc || []), `'nonce-${this.nonce}'`],
                    },
                    reportOnly: process.env.NODE_ENV !== 'production',
                }
                : false,
            crossOriginEmbedderPolicy: false,
            crossOriginOpenerPolicy: { policy: 'same-origin' },
            crossOriginResourcePolicy: { policy: 'same-origin' },
            dnsPrefetchControl: { allow: false },
            frameguard: { action: 'deny' },
            hidePoweredBy: true,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true,
            },
            ieNoOpen: true,
            noSniff: true,
            originAgentCluster: true,
            permittedCrossDomainPolicies: { permittedPolicies: 'none' },
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
            xssFilter: true,
        };
    }
    /**
     * Get rate limiter middleware
     */
    getRateLimiter(customConfig) {
        const config = { ...this.config.rateLimit, ...customConfig };
        return (0, express_rate_limit_1.default)({
            windowMs: config.windowMs,
            max: config.maxRequests,
            skipSuccessfulRequests: config.skipSuccessfulRequests,
            standardHeaders: true,
            legacyHeaders: false,
            message: {
                error: 'Too many requests',
                retryAfter: Math.ceil(config.windowMs / 1000),
            },
            keyGenerator: (req) => {
                return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
            },
        });
    }
    /**
     * Input validation middleware
     */
    getInputValidationMiddleware() {
        return (req, res, next) => {
            // Check URL length
            if (req.originalUrl.length > this.config.input.maxUrlLength) {
                res.status(414).json({ error: 'URI too long' });
                return;
            }
            // Check query params count
            const queryParamsCount = Object.keys(req.query).length;
            if (queryParamsCount > this.config.input.maxQueryParams) {
                res.status(400).json({ error: 'Too many query parameters' });
                return;
            }
            // Sanitize input if enabled
            if (this.config.input.sanitizeInput) {
                req.body = this.sanitizeObject(req.body);
                req.query = this.sanitizeObject(req.query);
                req.params = this.sanitizeObject(req.params);
            }
            next();
        };
    }
    /**
     * Security headers middleware (additional headers beyond Helmet)
     */
    getSecurityHeadersMiddleware() {
        return (req, res, next) => {
            // Generate nonce for each request
            this.generateNonce();
            // Additional security headers
            res.setHeader('X-Request-Id', crypto_1.default.randomUUID());
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
            // Clear sensitive headers
            res.removeHeader('X-Powered-By');
            res.removeHeader('Server');
            // Store nonce for use in templates
            res.locals.nonce = this.nonce;
            next();
        };
    }
    /**
     * Audit logging middleware
     */
    getAuditMiddleware() {
        return (req, res, next) => {
            if (!this.config.audit.enabled) {
                next();
                return;
            }
            const startTime = Date.now();
            const requestId = res.getHeader('X-Request-Id') || crypto_1.default.randomUUID();
            // Capture original end function
            const originalEnd = res.end;
            const self = this;
            res.end = function (...args) {
                const duration = Date.now() - startTime;
                const auditEntry = self.createAuditEntry(req, res, duration, requestId.toString());
                // Log audit entry (in production, send to audit service)
                if (process.env.NODE_ENV !== 'test') {
                    console.log(JSON.stringify(auditEntry));
                }
                return originalEnd.apply(this, args);
            };
            next();
        };
    }
    /**
     * SQL injection prevention middleware
     */
    getSQLInjectionProtection() {
        const sqlPatterns = [
            /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
            /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
            /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
            /((\%27)|(\'))union/i,
            /exec(\s|\+)+(s|x)p\w+/i,
            /UNION(\s+)+(ALL(\s+)+)?SELECT/i,
            /INSERT(\s+)+INTO/i,
            /DELETE(\s+)+FROM/i,
            /DROP(\s+)+TABLE/i,
            /UPDATE(\s+)+\w+(\s+)+SET/i,
        ];
        return (req, res, next) => {
            const checkValue = (value) => {
                if (typeof value === 'string') {
                    return sqlPatterns.some((pattern) => pattern.test(value));
                }
                if (typeof value === 'object' && value !== null) {
                    return Object.values(value).some(checkValue);
                }
                return false;
            };
            const isSuspicious = checkValue(req.query) ||
                checkValue(req.body) ||
                checkValue(req.params);
            if (isSuspicious) {
                res.status(400).json({ error: 'Invalid request' });
                return;
            }
            next();
        };
    }
    /**
     * XSS protection middleware
     */
    getXSSProtection() {
        const xssPatterns = [
            /<script\b[^>]*>[\s\S]*?<\/script>/gi,
            /<script\b[^>]*>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe/gi,
            /<embed/gi,
            /<object/gi,
            /data:/gi,
            /vbscript:/gi,
        ];
        return (req, res, next) => {
            const checkValue = (value) => {
                if (typeof value === 'string') {
                    return xssPatterns.some((pattern) => pattern.test(value));
                }
                if (typeof value === 'object' && value !== null) {
                    return Object.values(value).some(checkValue);
                }
                return false;
            };
            const isSuspicious = checkValue(req.query) ||
                checkValue(req.body) ||
                checkValue(req.params);
            if (isSuspicious && this.config.strictMode) {
                res.status(400).json({ error: 'Invalid request content' });
                return;
            }
            next();
        };
    }
    /**
     * Path traversal protection middleware
     */
    getPathTraversalProtection() {
        const pathTraversalPatterns = [
            /\.\.\//g,
            /\.\.\\/g,
            /%2e%2e%2f/gi,
            /%2e%2e\//gi,
            /\.\.%2f/gi,
            /%2e%2e%5c/gi,
            /\.\.%5c/gi,
            /%252e%252e%252f/gi,
        ];
        return (req, res, next) => {
            const checkPathTraversal = (value) => {
                return pathTraversalPatterns.some((pattern) => pattern.test(value));
            };
            if (checkPathTraversal(req.path) || checkPathTraversal(req.originalUrl)) {
                res.status(400).json({ error: 'Invalid path' });
                return;
            }
            next();
        };
    }
    /**
     * Create audit log entry
     */
    createAuditEntry(req, res, duration, requestId) {
        const sanitizedBody = this.redactSensitiveFields(req.body);
        const sanitizedHeaders = this.redactSensitiveFields(req.headers);
        return {
            timestamp: new Date().toISOString(),
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id || 'anonymous',
            ...(this.config.audit.logLevel === 'detailed' && {
                body: sanitizedBody,
                query: req.query,
                headers: sanitizedHeaders,
            }),
        };
    }
    /**
     * Redact sensitive fields from object
     */
    redactSensitiveFields(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();
            if (this.config.audit.sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
                result[key] = '[REDACTED]';
            }
            else if (typeof value === 'object' && value !== null) {
                result[key] = this.redactSensitiveFields(value);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    /**
     * Sanitize object values (basic XSS prevention)
     */
    sanitizeObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                result[key] = this.sanitizeString(value);
            }
            else if (typeof value === 'object' && value !== null) {
                result[key] = this.sanitizeObject(value);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    /**
     * Sanitize string (escape HTML entities)
     */
    sanitizeString(str) {
        const htmlEntities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
        };
        return str.replace(/[&<>"'/]/g, (char) => htmlEntities[char]);
    }
    /**
     * Get all security middleware as an array
     */
    getAllMiddleware() {
        return [
            (0, helmet_1.default)(this.getHelmetConfig()),
            this.getSecurityHeadersMiddleware(),
            this.getPathTraversalProtection(),
            this.getSQLInjectionProtection(),
            this.getXSSProtection(),
            this.getInputValidationMiddleware(),
            this.getRateLimiter(),
            this.getAuditMiddleware(),
        ];
    }
}
exports.SecurityHardeningManager = SecurityHardeningManager;
/**
 * Create and export default security manager instance
 */
exports.securityManager = new SecurityHardeningManager();
exports.default = SecurityHardeningManager;
