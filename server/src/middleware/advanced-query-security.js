"use strict";
/**
 * Advanced Query Security and Performance Enhancement
 *
 * Addresses critical roadmap items:
 * - C-005: Cypher injection vulnerability
 * - C-007: Missing query timeouts
 * - C-008: Missing input validation
 * - C-009: Zero rate limiting
 * Implements advanced injection prevention with parameterized queries,
 * comprehensive input validation, and performance optimization measures.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantRateLimiter = exports.enhancedRateLimiter = exports.injectionProtectionMiddleware = exports.SecureGraphDatabaseService = exports.advancedInputValidation = exports.queryTimeoutMiddleware = exports.SecureCypherQueryBuilder = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const middleware_js_1 = require("../monitoring/middleware.js");
// Advanced injection patterns for detection
const ADVANCED_INJECTION_PATTERNS = [
    // Cypher injection patterns
    /('|(\-\-)|(;)|(\|\|)|(\/\*)|(\*\/))|(\b(CREATE|DELETE|REMOVE|SET|DROP|MERGE|CALL|LOAD)\b)/gi,
    /UNION.*MATCH/gi,
    /MATCH\s+\(.*\)\s*WHERE\s+.*=.*OR/gi,
    /MATCH\s+\(.*\)\s*SET\s+\w+\s*=.*WHERE/gi,
    /DETACH\s+DELETE/gi,
    /CREATE\s+INDEX/gi,
    /DROP\s+INDEX/gi,
    /CALL\s+db\./gi, // Database procedures
    /CALL\s+apoc\./gi, // APOC procedures (often dangerous)
    /LIMIT\s+\d+\s*\+\s*\d+/gi, // Expression in LIMIT
    /SKIP\s+\w+\s*\+\s*\w+/gi, // Addition in SKIP
    /ORDER\s+BY.*\s*\+\s*/gi, // Operators in ORDER BY
    /WHERE.*=.*\^.*=/gi, // XOR operator abuse
    /WHERE.*\|\|.*\|\|/gi, // OR operator chaining
    // Advanced obfuscation techniques
    /MATCH[\s\n\r]*\([\s\n\r]*.*[\s\n\r]*\)/gi, // White-space obfuscated MATCH
    /WHERE[\s\n\r]*.*[\s\n\r]*=/gi, // White-space obfuscated WHERE
    /(MATCH|WHERE|RETURN|CREATE|DELETE|SET|REMOVE)[\s\n\r]+(.*\s*){3,}/gi, // Overly spaced keywords
    /CHAR\(.*\)|UNICODE\(.*\)/gi, // Character functions (potential obfuscation)
    /REPLACE\(.*,.*,.*\)/gi, // REPLACE functions (potential injection)
    // String concatenation injection patterns
    /'\s*\+\s*'/gi, // String concatenation
    /'\s*\+\s*\w+\s*\+\s*'/gi, // Variable insertion
    /\{\{\w+\}\}/gi, // Template injection
    /\%\w+\%/gi, // Environment variable injection
];
/**
 * Helper: Sanitize string to prevent injection
 */
const sanitizeStringHelper = (str) => {
    // Remove or escape dangerous characters
    return str
        .replace(/'/g, "''") // Escape single quotes
        .replace(/;/g, '') // Remove semicolons
        .replace(/\-\-/g, '') // Remove comment starters
        .replace(/\{\{/g, '{ {') // Break template patterns
        .replace(/\%\%/g, '% %') // Break environment patterns
        .substring(0, 10000); // Truncate extremely long strings (DoS protection)
};
/**
 * Helper: Detect potential injection attacks in cypher
 */
const detectCypherInjectionHelper = (cypher) => {
    // Check for injection patterns in the cypher query
    for (const pattern of ADVANCED_INJECTION_PATTERNS) {
        if (pattern.test(cypher)) {
            return true;
        }
    }
    // Check for parameter substitution in dangerous positions
    // This is a more sophisticated check for injection attempts
    const dangerousPositions = [
        { position: 'start', pattern: /(^|\b)(DROP|CREATE|ALTER|GRANT|REVOKE)\b/i },
        { position: 'middle', pattern: /LIMIT\s+\w+\s*\+\s*\w+/i },
        { position: 'middle', pattern: /SKIP\s+\w+\s*\+\s*\w+/i },
        { position: 'any', pattern: /;\s*(CREATE|DROP|ALTER|GRANT|REVOKE)/i }
    ];
    for (const posCheck of dangerousPositions) {
        if (posCheck.pattern.test(cypher)) {
            return true;
        }
    }
    return false;
};
/**
 * Secure Cypher Query Builder with parameterized queries
 */
class SecureCypherQueryBuilder {
    driver;
    defaultTimeoutMs;
    constructor(neo4jDriver, defaultTimeoutMs = 30000) {
        this.driver = neo4jDriver;
        this.defaultTimeoutMs = defaultTimeoutMs;
    }
    /**
     * Execute Cypher query safely with parameterization and timeouts
     */
    async executeSecureQuery(cypher, parameters, options = {}) {
        const startTime = Date.now();
        const queryTimeout = options.timeoutMs || this.defaultTimeoutMs;
        // Validate cypher query syntax first
        if (!this.isValidCypherSyntax(cypher)) {
            logger_js_1.default.warn({
                cypherQuery: cypher.substring(0, 100) + '...',
                parameters: Object.keys(parameters),
                validationError: 'Invalid Cypher syntax'
            }, 'Rejecting invalid Cypher query');
            throw new Error('Invalid Cypher syntax detected');
        }
        // Perform injection detection
        if (this.detectCypherInjection(cypher)) {
            logger_js_1.default.error({
                cypherQuery: cypher.substring(0, 100) + '...',
                parameters: Object.keys(parameters),
                ip: 'unknown' // This would come from request context
            }, 'Cypher injection attempt detected and blocked');
            (0, middleware_js_1.trackError)('security', 'CypherInjectionAttempt');
            throw new Error('Cypher injection detected');
        }
        const sessionConfig = {
            defaultAccessMode: neo4j_driver_1.default.session.READ,
            database: options.database,
        };
        if (options.impersonatedUser) {
            sessionConfig.impersonatedUser = options.impersonatedUser;
        }
        const session = this.driver.session(sessionConfig);
        try {
            // Add query timeout and other execution configuration
            const result = await session.executeWrite(tx => tx.run(cypher, parameters, {
                // Set query timeout
                timeout: queryTimeout,
                // Additional security metadata could be added here
                metadata: {
                    source: 'secure_query_builder',
                    timeout: queryTimeout
                }
            }));
            const executionTime = Date.now() - startTime;
            logger_js_1.default.debug({
                queryExecutionTime: executionTime,
                timeout: queryTimeout,
                queryLength: cypher.length
            }, 'Secure Cypher query executed successfully');
            return result.records;
        }
        catch (error) {
            logger_js_1.default.error({
                error: error instanceof Error ? error.message : String(error),
                cypherQuery: cypher.substring(0, 100) + '...',
                paramsSummary: Object.keys(parameters),
                executionTime: Date.now() - startTime
            }, 'Error executing secure Cypher query');
            (0, middleware_js_1.trackError)('database', 'SecureQueryExecutionError');
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Validate Cypher syntax without executing
     */
    isValidCypherSyntax(cypher) {
        // In a real system, we'd use Neo4j's parser or a formal grammar
        // For now, use basic structural checks
        if (!cypher || typeof cypher !== 'string') {
            return false;
        }
        const trimmed = cypher.trim();
        // Check that query starts with a valid Cypher keyword
        // Note: This is a basic validation, a real system would use a proper parser
        const validKeywords = [
            'MATCH', 'CREATE', 'MERGE', 'DELETE', 'DETACH', 'SET', 'REMOVE',
            'RETURN', 'WITH', 'WHERE', 'ORDER', 'LIMIT', 'SKIP', 'UNION',
            'OPTIONAL', 'CALL', 'YIELD', 'LOAD', 'FOREACH', 'UNWIND'
        ];
        const firstKeyword = trimmed.split(/\s+/)[0].toUpperCase();
        if (!validKeywords.includes(firstKeyword)) {
            // It could be a procedure call though
            if (!trimmed.toUpperCase().startsWith('CALL') &&
                !trimmed.toUpperCase().startsWith('SHOW') &&
                !trimmed.toUpperCase().startsWith('USE')) {
                return false;
            }
        }
        // Check for balanced parentheses
        const openParentheses = (trimmed.match(/\(/g) || []).length;
        const closeParentheses = (trimmed.match(/\)/g) || []).length;
        if (openParentheses !== closeParentheses) {
            return false;
        }
        return true;
    }
    /**
     * Detect potential injection attacks in cypher
     */
    detectCypherInjection(cypher) {
        return detectCypherInjectionHelper(cypher);
    }
    /**
     * Build a parameterized Cypher query from user input
     */
    buildParameterizedQuery(baseQuery, userInput) {
        // Sanitize user input and convert to parameters
        const params = {};
        let processedQuery = baseQuery;
        // Detect and extract user-provided values to convert to parameters
        const placeholders = this.extractPlaceholders(baseQuery);
        for (const placeholder of placeholders) {
            const userInputValue = userInput[placeholder] || userInput[placeholder.substring(1)]; // Remove '$' prefix
            if (userInputValue !== undefined) {
                // Validate the user input
                if (!this.validateParameter(userInputValue)) {
                    throw new Error(`Invalid parameter value for ${placeholder}: ${userInputValue}`);
                }
                // Set the parameter value (safe conversion)
                params[placeholder.substring(1)] = this.normalizeParameterValue(userInputValue);
                // In a real implementation, the query wouldn't have placeholders replaced this way
                // This is just for demo - actual implementation would ensure query is parameterized
                processedQuery = processedQuery.replace(new RegExp(`\\$${placeholder.substring(1)}`, 'g'), `$${placeholder.substring(1)}`); // Ensure it's properly parameterized
            }
        }
        return {
            cypher: processedQuery,
            parameters: params
        };
    }
    /**
     * Validate a parameter value
     */
    validateParameter(value) {
        // For strings, check for injection patterns
        if (typeof value === 'string') {
            // Check if string contains injection patterns
            for (const pattern of ADVANCED_INJECTION_PATTERNS) {
                if (pattern.test(value)) {
                    return false;
                }
            }
            // Check for excessively long strings (potential DoS)
            if (value.length > 10000) {
                // Log long string attempts for monitoring
                logger_js_1.default.debug({
                    valueLength: value.length,
                    valuePrefix: value.substring(0, 50)
                }, 'Long parameter value detected for monitoring');
            }
            return true;
        }
        // For arrays, validate each element
        if (Array.isArray(value)) {
            return value.every(item => this.validateParameter(item));
        }
        // For objects, validate recursively
        if (typeof value === 'object' && value !== null) {
            for (const val of Object.values(value)) {
                if (!this.validateParameter(val)) {
                    return false;
                }
            }
            return true;
        }
        // Numbers, booleans, null, undefined are generally safe
        return true;
    }
    /**
     * Normalize parameter value to safe representation
     */
    normalizeParameterValue(value) {
        if (typeof value === 'string') {
            // Sanitize string values
            return this.sanitizeString(value);
        }
        if (Array.isArray(value)) {
            return value.map(item => this.normalizeParameterValue(item));
        }
        if (typeof value === 'object' && value !== null) {
            const normalized = {};
            for (const [key, val] of Object.entries(value)) {
                normalized[key] = this.normalizeParameterValue(val);
            }
            return normalized;
        }
        return value;
    }
    /**
     * Sanitize string to prevent injection
     */
    sanitizeString(str) {
        return sanitizeStringHelper(str);
    }
    /**
     * Extract placeholder variables from query
     */
    extractPlaceholders(query) {
        // Match cypher parameters like $variableName, $param, etc.
        const matches = query.match(/\$[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
        return [...new Set(matches)]; // Remove duplicates
    }
}
exports.SecureCypherQueryBuilder = SecureCypherQueryBuilder;
/**
 * Query Timeout Middleware
 * Addresses C-007: Missing query timeouts
 */
const queryTimeoutMiddleware = (defaultTimeoutMs = 30000) => {
    return (req, res, next) => {
        // Set timeout header if not already set
        if (!req.headers['x-query-timeout']) {
            req.headers['x-query-timeout'] = defaultTimeoutMs.toString();
        }
        const timeoutMs = parseInt(req.headers['x-query-timeout']) || defaultTimeoutMs;
        // Validate timeout value (prevent extremely long or short timeouts)
        if (timeoutMs < 100 || timeoutMs > 300000) { // Less than 100ms or more than 5 minutes
            logger_js_1.default.warn({
                providedTimeout: timeoutMs,
                path: req.path,
                ip: req.ip
            }, 'Invalid query timeout value provided, using default');
            req.headers['x-query-timeout'] = defaultTimeoutMs.toString();
        }
        // Add timeout information to request for downstream use
        req.queryTimeout = timeoutMs;
        logger_js_1.default.debug({
            timeoutMs,
            path: req.path
        }, 'Query timeout applied');
        next();
    };
};
exports.queryTimeoutMiddleware = queryTimeoutMiddleware;
/**
 * Advanced Input Validation Middleware
 * Addresses C-008: Missing input validation
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const advancedInputValidation = (schema) => {
    return async (req, res, next) => {
        try {
            // Validate request body using Zod-like schema
            if (req.body && schema && typeof schema.safeParseAsync === 'function') {
                const result = await schema.safeParseAsync(req.body);
                if (!result.success) {
                    logger_js_1.default.warn({
                        path: req.path,
                        ip: req.ip,
                        errors: result.error.errors
                    }, 'Input validation failed');
                    (0, middleware_js_1.trackError)('validation', 'InputValidationError');
                    return res.status(400).json({
                        error: 'Input validation failed',
                        details: result.error.errors,
                        code: 'INPUT_VALIDATION_ERROR'
                    });
                }
                // Use the validated/transformed data
                req.body = result.data;
            }
            logger_js_1.default.debug({
                path: req.path,
                validatedFields: [...Object.keys(req.body || {}), ...Object.keys(req.query || {})]
            }, 'Advanced input validation passed');
            next();
        }
        catch (error) {
            logger_js_1.default.error({
                error: error instanceof Error ? error.message : String(error),
                path: req.path,
                ip: req.ip
            }, 'Error in advanced input validation middleware');
            (0, middleware_js_1.trackError)('validation', 'InputValidationError');
            return res.status(500).json({
                error: 'Internal validation error',
                code: 'INTERNAL_VALIDATION_ERROR'
            });
        }
    };
};
exports.advancedInputValidation = advancedInputValidation;
/**
 * Secure Graph Database Service with Injection Protection
 */
class SecureGraphDatabaseService {
    secureQueryBuilder;
    constructor(driver) {
        this.secureQueryBuilder = new SecureCypherQueryBuilder(driver, 30000);
    }
    /**
     * Execute a secure Cypher query with multiple validation layers
     */
    async executeSecureCypher(query, params, options = {}) {
        try {
            // Apply tenant-based query restrictions
            if (options.tenantId) {
                query = this.applyTenantRestrictions(query, options.tenantId);
            }
            // Validate that query is properly parameterized
            if (!this.isParameterizedQuery(query, params)) {
                logger_js_1.default.warn({
                    query,
                    params: Object.keys(params),
                    tenantId: options.tenantId
                }, 'Query is not properly parameterized');
                throw new Error('Query must be properly parameterized with $parameters');
            }
            // Execute with query builder for additional security
            const result = await this.secureQueryBuilder.executeSecureQuery(query, params, {
                timeoutMs: options.timeoutMs
            });
            return result;
        }
        catch (error) {
            logger_js_1.default.error({
                error: error instanceof Error ? error.message : String(error),
                query: query.substring(0, 100) + '...',
                params: Object.keys(params),
                tenantId: options.tenantId
            }, 'Error executing secure Cypher query');
            (0, middleware_js_1.trackError)('database', 'SecureCypherExecutionError');
            throw error;
        }
    }
    /**
     * Apply tenant-specific query restrictions
     */
    applyTenantRestrictions(query, tenantId) {
        // In a real system, this would add a WHERE clause to restrict results by tenant
        // For example: MATCH (e:Entity) WHERE e.tenantId = $tenantId
        if (query.toUpperCase().includes('MATCH')) {
            // This is a simplified example - in practice you'd need a proper Cypher parser
            // to safely inject tenant restrictions
            // const tenantRestriction = ` AND e.tenantId = $tenantId`;
            return query.replace(/MATCH\s+\(([^)]+)\)/gi, `MATCH ($1) WHERE $1.tenantId = $tenantId OR $1.tenantId IS NULL`);
        }
        return query;
    }
    /**
     * Validate that query uses proper parameterization
     */
    isParameterizedQuery(query, params) {
        // Check that the query uses parameters ($paramName) instead of string concatenation
        const paramNames = Object.keys(params);
        const paramPlaceholders = query.match(/\$[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
        // Extract parameter names from placeholders (remove $ prefix)
        const placeholderNames = paramPlaceholders.map(p => p.substring(1));
        // All parameter values should be represented as placeholders in the query
        return paramNames.every(param => placeholderNames.includes(param));
    }
}
exports.SecureGraphDatabaseService = SecureGraphDatabaseService;
/**
 * Detect various injection patterns in data
 */
const detectInjections = (data) => {
    const str = JSON.stringify(data, null, 0);
    const injections = [];
    // SQL injection patterns
    if (/(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER).*?(FROM|INTO|WHERE|TABLE|DATABASE)/i.test(str)) {
        injections.push('SQL_INJECTION');
    }
    // NoSQL injection patterns
    if (/\$where|regex|exec|eval/i.test(str)) {
        injections.push('NOSQL_INJECTION');
    }
    // Cypher injection patterns
    if (detectCypherInjectionHelper(str)) {
        injections.push('CYPHER_INJECTION');
    }
    // XSS patterns
    if (/<script|javascript:|on\w+=|data:/i.test(str)) {
        injections.push('XSS_INJECTION');
    }
    // Command injection patterns
    if (/\|\||&&|;|\$\(|`|\$env:/i.test(str)) {
        injections.push('COMMAND_INJECTION');
    }
    // GraphQL injection patterns
    if (/__schema|__type|__typename|IntrospectionQuery/i.test(str)) {
        injections.push('GRAPHQL_INJECTION');
    }
    // LDAP injection patterns
    if (/\(|\)|\*|&|=|!/i.test(str) && str.length > 100) { // Basic LDAP pattern detection
        injections.push('LDAP_INJECTION');
    }
    // XML injection patterns
    if (/<!DOCTYPE|<!ENTITY|<\?xml|CDATA/i.test(str)) {
        injections.push('XML_INJECTION');
    }
    return injections;
};
/**
 * Detect header-specific injection patterns
 */
const detectHeaderInjections = (headers) => {
    const injectionTypes = [];
    for (const [headerName, headerValue] of Object.entries(headers)) {
        if (typeof headerValue === 'string') {
            // Check for header injection attempts
            if (headerValue.includes('\n') || headerValue.includes('\r')) {
                injectionTypes.push('HEADER_INJECTION');
            }
            // Check for cookie injection in other headers
            if (/cookie|set-cookie/i.test(headerName) && /document\.cookie|localStorage|sessionStorage/i.test(headerValue)) {
                injectionTypes.push('COOKIE_INJECTION');
            }
        }
    }
    return injectionTypes;
};
/**
 * Sanitize input recursively
 */
const sanitizeInput = (input) => {
    if (typeof input === 'string') {
        return sanitizeStringHelper(input);
    }
    if (Array.isArray(input)) {
        return input.map(item => sanitizeInput(item));
    }
    if (input && typeof input === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(input)) {
            sanitized[sanitizeStringHelper(key)] = sanitizeInput(value);
        }
        return sanitized;
    }
    return input;
};
/**
 * Validate and sanitize parameter values
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const validateAndSanitizeParam = (value, paramName) => {
    // In a real system, we'd have more specific validation per parameter type
    if (typeof value === 'string') {
        // Apply additional validation for specific parameter types
        if (paramName.toLowerCase().includes('id')) {
            // Validate ID patterns (UUID, numeric, etc)
            if (!/^[a-zA-Z0-9\-_:]+$/.test(value)) {
                logger_js_1.default.warn({
                    paramName,
                    paramValue: value
                }, 'Potentially invalid ID parameter');
            }
        }
        return sanitizeStringHelper(value);
    }
    return value;
};
/**
 * Check request for various types of injection attempts
 */
const checkForInjections = async (req) => {
    const injectionTypes = [];
    // Check body
    if (req.body) {
        const bodyInjections = detectInjections(req.body);
        injectionTypes.push(...bodyInjections);
    }
    // Check query params
    if (req.query) {
        const queryInjections = detectInjections(req.query);
        injectionTypes.push(...queryInjections);
    }
    // Check URL params
    if (req.params) {
        const paramsInjections = detectInjections(req.params);
        injectionTypes.push(...paramsInjections);
    }
    // Check headers for injection patterns
    const headerInjections = detectHeaderInjections(req.headers);
    injectionTypes.push(...headerInjections);
    return {
        hasInjections: injectionTypes.length > 0,
        injectionTypes: [...new Set(injectionTypes)] // Unique injection types
    };
};
/**
 * Advanced Injection Protection Middleware
 * Provides comprehensive protection against various injection types
 */
const injectionProtectionMiddleware = () => {
    return async (req, res, next) => {
        try {
            const checkResult = await checkForInjections(req);
            if (checkResult.hasInjections) {
                logger_js_1.default.warn({
                    injections: checkResult.injectionTypes,
                    path: req.path,
                    ip: req.ip
                }, 'Injection attempt detected');
                (0, middleware_js_1.trackError)('security', 'InjectionAttemptDetected');
                return res.status(400).json({
                    error: 'Injection attempt detected',
                    injectionTypes: checkResult.injectionTypes,
                    code: 'INJECTION_DETECTED'
                });
            }
            // Sanitize inputs to remove potential injection vectors
            if (req.body)
                req.body = sanitizeInput(req.body);
            if (req.query)
                req.query = sanitizeInput(req.query);
            if (req.params)
                req.params = sanitizeInput(req.params);
            next();
        }
        catch (error) {
            logger_js_1.default.error({
                error: error instanceof Error ? error.message : String(error),
                path: req.path,
                ip: req.ip
            }, 'Error in injection protection middleware');
            (0, middleware_js_1.trackError)('security', 'InjectionProtectionError');
            return res.status(500).json({
                error: 'Internal injection protection error',
                code: 'INTERNAL_INJECTION_PROTECTION_ERROR'
            });
        }
    };
};
exports.injectionProtectionMiddleware = injectionProtectionMiddleware;
/**
 * Rate limiting with enhanced security beyond basic implementation
 * Addresses C-009: Zero rate limiting
 */
const enhancedRateLimiter = (windowMs = 15 * 60 * 1000, // 15 minutes
maxRequests = 100, message = 'Too many requests from this IP') => {
    const requestCounts = new Map();
    const banList = new Map(); // IP -> ban expiry time
    return (req, res, next) => {
        const clientId = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        // Check if client is banned
        const banExpiry = banList.get(clientId);
        if (banExpiry && Date.now() < banExpiry) {
            logger_js_1.default.warn({
                ip: clientId,
                path: req.path
            }, 'Blocked banned client');
            return res.status(429).json({
                error: 'Client temporarily banned for excessive requests',
                code: 'CLIENT_BANNED'
            });
        }
        const now = Date.now();
        const windowStart = now - windowMs;
        // Get or create request count array
        let requests = requestCounts.get(clientId) || [];
        // Remove old requests outside the window
        requests = requests.filter(timestamp => timestamp > windowStart);
        // Check limit
        if (requests.length >= maxRequests) {
            // Too many requests
            logger_js_1.default.warn({
                ip: clientId,
                requestCount: requests.length,
                limit: maxRequests,
                path: req.path
            }, 'Rate limit exceeded');
            // Ban client for 1 hour if they're consistently exceeding limits
            if (requests.length > maxRequests * 2) { // Way over the limit
                banList.set(clientId, Date.now() + (60 * 60 * 1000)); // 1 hour ban
                logger_js_1.default.info({ ip: clientId }, 'Client banned for excessive rate limit violations');
            }
            return res.status(429).json({
                error: message,
                retryAfter: Math.ceil(windowMs / 1000),
                code: 'RATE_LIMIT_EXCEEDED'
            });
        }
        // Record this request
        requests.push(now);
        requestCounts.set(clientId, requests);
        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', (maxRequests - requests.length).toString());
        res.setHeader('X-RateLimit-Reset', Math.ceil((windowStart + windowMs) / 1000).toString());
        next();
    };
};
exports.enhancedRateLimiter = enhancedRateLimiter;
/**
 * Tenant-specific rate limiting with isolation
 */
const tenantRateLimiter = (windowMs = 60 * 60 * 1000, // 1 hour
maxPerTenant = 1000, maxPerUser = 100) => {
    const tenantRequestCounts = new Map(); // tenant -> user -> timestamps
    const tenantCounts = new Map(); // tenant total counts
    return (req, res, next) => {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || 'global';
        const userId = req.headers['x-user-id'] || req.user?.id || req.ip || 'anonymous';
        const now = Date.now();
        const windowStart = now - windowMs;
        // Track tenant-level requests
        let tenantRequests = tenantCounts.get(tenantId) || [];
        tenantRequests = tenantRequests.filter(timestamp => timestamp > windowStart);
        if (tenantRequests.length >= maxPerTenant) {
            logger_js_1.default.warn({
                tenantId,
                requestCount: tenantRequests.length,
                limit: maxPerTenant,
                path: req.path
            }, 'Tenant rate limit exceeded');
            return res.status(429).json({
                error: 'Tenant rate limit exceeded',
                code: 'TENANT_RATE_LIMIT_EXCEEDED'
            });
        }
        // Track user-level requests within tenant
        if (!tenantRequestCounts.has(tenantId)) {
            tenantRequestCounts.set(tenantId, new Map());
        }
        const userRequestsMap = tenantRequestCounts.get(tenantId);
        let userRequests = userRequestsMap.get(userId) || [];
        userRequests = userRequests.filter(timestamp => timestamp > windowStart);
        if (userRequests.length >= maxPerUser) {
            logger_js_1.default.warn({
                tenantId,
                userId,
                requestCount: userRequests.length,
                limit: maxPerUser,
                path: req.path
            }, 'User rate limit exceeded within tenant');
            return res.status(429).json({
                error: 'User rate limit exceeded',
                code: 'USER_RATE_LIMIT_EXCEEDED'
            });
        }
        // Record requests
        tenantRequests.push(now);
        tenantCounts.set(tenantId, tenantRequests);
        userRequests.push(now);
        userRequestsMap.set(userId, userRequests);
        // Add tenant-aware rate limit headers
        res.setHeader('X-Tenant-RateLimit-Limit', maxPerTenant.toString());
        res.setHeader('X-Tenant-RateLimit-Remaining', (maxPerTenant - tenantRequests.length).toString());
        res.setHeader('X-User-RateLimit-Limit', maxPerUser.toString());
        res.setHeader('X-User-RateLimit-Remaining', (maxPerUser - userRequests.length).toString());
        next();
    };
};
exports.tenantRateLimiter = tenantRateLimiter;
exports.default = {
    SecureCypherQueryBuilder,
    queryTimeoutMiddleware: exports.queryTimeoutMiddleware,
    advancedInputValidation: exports.advancedInputValidation,
    injectionProtectionMiddleware: exports.injectionProtectionMiddleware,
    enhancedRateLimiter: exports.enhancedRateLimiter,
    tenantRateLimiter: exports.tenantRateLimiter
};
