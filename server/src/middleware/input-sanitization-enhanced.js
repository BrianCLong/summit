"use strict";
/**
 * Enhanced input sanitization middleware for OWASP ZAP vulnerability remediation
 * Addresses: #13598 - OWASP ZAP Security Scan Found Vulnerabilities
 *
 * This middleware provides comprehensive input validation and sanitization to prevent:
 * - SQL Injection
 * - NoSQL Injection
 * - XSS (Cross-Site Scripting)
 * - Command Injection
 * - Path Traversal
 * - LDAP Injection
 * - XML Injection
 * - GraphQL Injection
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeOutput = exports.sanitizeGraphQL = exports.validateFilePath = exports.enhancedSanitization = void 0;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const middleware_js_1 = require("../monitoring/middleware.js");
/**
 * Comprehensive injection patterns for detection
 */
const INJECTION_PATTERNS = {
    // SQL Injection patterns
    sqlInjection: [
        /('|(\-\-)|(;)|(\|\|)|(\/\*)|(\*\/))|(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|eval)\b)/gi,
        /\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|into|where|table|database)\b/gi,
        /\b(or|and)\b.*\b(1|true)\s*=\s*(1|true)/gi,
    ],
    // NoSQL Injection patterns (MongoDB, Neo4j)
    noSQLInjection: [
        /(\$ne|\$gt|\$gte|\$lt|\$lte|\$in|\$nin|\$or|\$and|\$not|\$nor|\$exists|\$type|\$regex|\$where|\$elemMatch)/gi,
        /\.find\s*\(|\$where\s*:/gi,
    ],
    // XSS patterns
    xss: [
        /<script[^>]*>.*?<\/script>/gis,
        /<iframe[^>]*>/gi,
        /javascript:/gi,
        /on(load|error|click|mouse|focus|blur|change|submit)\s*=/gi,
        /<img[^>]+src[^>]*>/gi,
        /eval\s*\(/gi,
        /expression\s*\(/gi,
    ],
    // Command Injection patterns
    commandInjection: [
        /[;&|`$(){}\[\]<>]/g,
        /\b(wget|curl|nc|netcat|bash|sh|cmd|powershell|exec)\b/gi,
    ],
    // Path Traversal patterns
    pathTraversal: [
        /\.\.[\\\/]/g,
        /%2e%2e[\\\/]/gi,
        /\.\.\/|\.\.\\/g,
    ],
    // LDAP Injection patterns
    ldapInjection: [
        /[*()\\]/g,
        /\|\|/g,
    ],
    // XML Injection patterns
    xmlInjection: [
        /<!\[CDATA\[/gi,
        /<!DOCTYPE/gi,
        /<!ENTITY/gi,
    ],
    // GraphQL Injection patterns
    graphqlInjection: [
        /\{\s*__schema/gi,
        /\{\s*__type/gi,
        /__typename/gi,
    ],
};
/**
 * Sanitize string to prevent HTML injection
 */
function sanitizeHTML(input) {
    const htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };
    return input.replace(/[&<>"'\/]/g, (char) => htmlEntities[char] || char);
}
/**
 * Sanitize object recursively
 */
function sanitizeObject(obj, depth = 0) {
    // Prevent deep recursion attacks
    if (depth > 10) {
        logger_js_1.default.warn('Maximum sanitization depth reached');
        return obj;
    }
    if (typeof obj === 'string') {
        return sanitizeHTML(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item, depth + 1));
    }
    if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            // Sanitize both keys and values
            const sanitizedKey = sanitizeHTML(key);
            sanitized[sanitizedKey] = sanitizeObject(value, depth + 1);
        }
        return sanitized;
    }
    return obj;
}
/**
 * Detect injection attacks
 */
function detectInjection(data) {
    const dataStr = JSON.stringify(data);
    // Check SQL Injection
    for (const pattern of INJECTION_PATTERNS.sqlInjection) {
        if (pattern.test(dataStr)) {
            return { detected: true, type: 'SQL Injection' };
        }
    }
    // Check NoSQL Injection
    for (const pattern of INJECTION_PATTERNS.noSQLInjection) {
        if (pattern.test(dataStr)) {
            return { detected: true, type: 'NoSQL Injection' };
        }
    }
    // Check XSS
    for (const pattern of INJECTION_PATTERNS.xss) {
        if (pattern.test(dataStr)) {
            return { detected: true, type: 'XSS Attack' };
        }
    }
    // Check Command Injection
    for (const pattern of INJECTION_PATTERNS.commandInjection) {
        if (pattern.test(dataStr)) {
            return { detected: true, type: 'Command Injection' };
        }
    }
    // Check Path Traversal
    for (const pattern of INJECTION_PATTERNS.pathTraversal) {
        if (pattern.test(dataStr)) {
            return { detected: true, type: 'Path Traversal' };
        }
    }
    // Check LDAP Injection
    for (const pattern of INJECTION_PATTERNS.ldapInjection) {
        if (pattern.test(dataStr)) {
            return { detected: true, type: 'LDAP Injection' };
        }
    }
    // Check XML Injection
    for (const pattern of INJECTION_PATTERNS.xmlInjection) {
        if (pattern.test(dataStr)) {
            return { detected: true, type: 'XML Injection' };
        }
    }
    return { detected: false, type: '' };
}
/**
 * Enhanced input sanitization middleware
 */
const enhancedSanitization = (req, res, next) => {
    try {
        // Detect injection attempts
        const queryDetection = detectInjection(req.query);
        const bodyDetection = detectInjection(req.body);
        const paramsDetection = detectInjection(req.params);
        if (queryDetection.detected) {
            (0, middleware_js_1.trackError)('security', queryDetection.type);
            logger_js_1.default.warn(`${queryDetection.type} detected in query. IP: ${req.ip}, Path: ${req.path}, Query: ${JSON.stringify(req.query)}`);
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Suspicious input detected',
            });
        }
        if (bodyDetection.detected) {
            (0, middleware_js_1.trackError)('security', bodyDetection.type);
            logger_js_1.default.warn(`${bodyDetection.type} detected in body. IP: ${req.ip}, Path: ${req.path}`);
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Suspicious input detected',
            });
        }
        if (paramsDetection.detected) {
            (0, middleware_js_1.trackError)('security', paramsDetection.type);
            logger_js_1.default.warn(`${paramsDetection.type} detected in params. IP: ${req.ip}, Path: ${req.path}, Params: ${JSON.stringify(req.params)}`);
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Suspicious input detected',
            });
        }
        // Sanitize request data
        if (req.body) {
            req.body = sanitizeObject(req.body);
        }
        if (req.query) {
            req.query = sanitizeObject(req.query);
        }
        if (req.params) {
            req.params = sanitizeObject(req.params);
        }
        next();
    }
    catch (error) {
        logger_js_1.default.error(`Error in sanitization middleware: ${error}`);
        next(error);
    }
};
exports.enhancedSanitization = enhancedSanitization;
/**
 * File path validation middleware
 */
const validateFilePath = (req, res, next) => {
    const { path, filename, filepath } = req.body;
    const paths = [path, filename, filepath].filter(Boolean);
    for (const p of paths) {
        if (typeof p === 'string') {
            // Check for path traversal
            if (/\.\.\/|\.\.\\/.test(p)) {
                (0, middleware_js_1.trackError)('security', 'PathTraversal');
                logger_js_1.default.warn(`Path traversal attempt detected. IP: ${req.ip}, Path: ${req.path}, File Path: ${p}`);
                return res.status(400).json({
                    error: 'Invalid file path',
                    message: 'Path traversal detected',
                });
            }
            // Check for absolute paths (security risk)
            if (p.startsWith('/') || /^[a-zA-Z]:\\/.test(p)) {
                (0, middleware_js_1.trackError)('security', 'AbsolutePathRejected');
                logger_js_1.default.warn(`Absolute path rejected. IP: ${req.ip}, Path: ${req.path}, File Path: ${p}`);
                return res.status(400).json({
                    error: 'Invalid file path',
                    message: 'Absolute paths not allowed',
                });
            }
        }
    }
    next();
};
exports.validateFilePath = validateFilePath;
/**
 * GraphQL query sanitization
 */
const sanitizeGraphQL = (req, res, next) => {
    if (req.body && req.body.query) {
        const query = req.body.query;
        // Block introspection queries in production
        if (process.env.NODE_ENV === 'production') {
            if (/__schema|__type|__typename/.test(query)) {
                (0, middleware_js_1.trackError)('security', 'IntrospectionBlocked');
                logger_js_1.default.warn(`GraphQL introspection attempt in production. IP: ${req.ip}`);
                return res.status(403).json({
                    error: 'Introspection disabled',
                    message: 'GraphQL introspection is disabled in production',
                });
            }
        }
        // Check for excessively large queries
        if (query.length > 10000) {
            (0, middleware_js_1.trackError)('security', 'GraphQLQueryTooLarge');
            logger_js_1.default.warn(`Excessively large GraphQL query. IP: ${req.ip}, Query Length: ${query.length}`);
            return res.status(413).json({
                error: 'Query too large',
                message: 'GraphQL query exceeds maximum size',
            });
        }
    }
    next();
};
exports.sanitizeGraphQL = sanitizeGraphQL;
/**
 * Output encoding middleware for preventing XSS in responses
 */
const encodeOutput = (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
        // Sanitize response data
        const sanitizedBody = sanitizeObject(body);
        return originalJson(sanitizedBody);
    };
    next();
};
exports.encodeOutput = encodeOutput;
exports.default = {
    enhancedSanitization: exports.enhancedSanitization,
    validateFilePath: exports.validateFilePath,
    sanitizeGraphQL: exports.sanitizeGraphQL,
    encodeOutput: exports.encodeOutput,
};
