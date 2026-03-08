"use strict";
// @ts-nocheck
/**
 * @fileoverview Comprehensive API Validation Layer
 *
 * Production-grade validation system implementing:
 * - Zod-based schema validation
 * - Request/Response validation middleware
 * - GraphQL input validation
 * - Custom validators for domain-specific types
 * - Sanitization and normalization
 * - Validation error formatting
 *
 * @module validation/ApiValidationLayer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphqlValidator = exports.JWTSchema = exports.APIKeySchema = exports.zodURL = exports.zodIPAddress = exports.FileUploadSchema = exports.GraphQLInputValidator = exports.AIAnalysisSchema = exports.SearchInputSchema = exports.GraphQLQuerySchema = exports.InvestigationCreateSchema = exports.RelationshipCreateSchema = exports.EntityUpdateSchema = exports.EntityCreateSchema = exports.UserLoginSchema = exports.UserRegistrationSchema = exports.InvestigationStatus = exports.UserRole = exports.RelationshipType = exports.EntityType = exports.zodSearchQuery = exports.zodDateRange = exports.zodPagination = exports.zodUsername = exports.zodPassword = exports.zodEmail = exports.zodUUID = void 0;
exports.sanitizeString = sanitizeString;
exports.sanitizeObject = sanitizeObject;
exports.validate = validate;
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
exports.validateCypherQuery = validateCypherQuery;
const zod_1 = require("zod");
const ErrorHandlingFramework_js_1 = require("../errors/ErrorHandlingFramework.js");
// ============================================================================
// Custom Zod Types for IntelGraph Domain
// ============================================================================
/**
 * UUID validation
 */
exports.zodUUID = zod_1.z.uuid({ message: 'Invalid UUID format' });
/**
 * Email validation with additional checks
 */
exports.zodEmail = zod_1.z
    .email({ message: 'Invalid email format' })
    .min(5, { message: 'Email must be at least 5 characters' })
    .max(254, { message: 'Email must not exceed 254 characters' })
    .transform((email) => email.toLowerCase().trim());
/**
 * Strong password validation
 */
exports.zodPassword = zod_1.z
    .string()
    .min(12, { message: 'Password must be at least 12 characters' })
    .max(128, { message: 'Password must not exceed 128 characters' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' })
    .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' });
/**
 * Username validation
 */
exports.zodUsername = zod_1.z
    .string()
    .min(3, { message: 'Username must be at least 3 characters' })
    .max(50, { message: 'Username must not exceed 50 characters' })
    .regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
})
    .transform((username) => username.toLowerCase());
/**
 * Pagination parameters
 */
exports.zodPagination = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
/**
 * Date range validation
 */
exports.zodDateRange = zod_1.z
    .object({
    startDate: zod_1.z.coerce.date(),
    endDate: zod_1.z.coerce.date(),
})
    .refine((data) => data.startDate <= data.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['startDate'],
});
/**
 * Search query validation
 */
exports.zodSearchQuery = zod_1.z
    .string()
    .min(1, { message: 'Search query cannot be empty' })
    .max(500, { message: 'Search query too long' })
    .transform((query) => query.trim());
/**
 * Entity type enum
 */
exports.EntityType = zod_1.z.enum([
    'PERSON',
    'ORGANIZATION',
    'LOCATION',
    'EVENT',
    'DOCUMENT',
    'ASSET',
    'COMMUNICATION',
    'TRANSACTION',
    'ARTIFACT',
    'UNKNOWN',
]);
/**
 * Relationship type enum
 */
exports.RelationshipType = zod_1.z.enum([
    'KNOWS',
    'WORKS_FOR',
    'OWNS',
    'LOCATED_AT',
    'PARTICIPATED_IN',
    'RELATED_TO',
    'COMMUNICATES_WITH',
    'TRANSACTED_WITH',
    'AUTHORED',
    'MENTIONED_IN',
]);
/**
 * User role enum
 */
exports.UserRole = zod_1.z.enum([
    'ADMIN',
    'ANALYST',
    'VIEWER',
    'INVESTIGATOR',
    'MANAGER',
    'AUDITOR',
]);
/**
 * Investigation status enum
 */
exports.InvestigationStatus = zod_1.z.enum([
    'DRAFT',
    'ACTIVE',
    'ON_HOLD',
    'COMPLETED',
    'ARCHIVED',
    'DELETED',
]);
// ============================================================================
// Domain Schemas
// ============================================================================
/**
 * User registration schema
 */
exports.UserRegistrationSchema = zod_1.z.object({
    email: exports.zodEmail,
    username: exports.zodUsername,
    password: exports.zodPassword,
    firstName: zod_1.z
        .string()
        .min(1, { message: 'First name is required' })
        .max(100, { message: 'First name too long' })
        .transform((s) => s.trim()),
    lastName: zod_1.z
        .string()
        .min(1, { message: 'Last name is required' })
        .max(100, { message: 'Last name too long' })
        .transform((s) => s.trim()),
    role: exports.UserRole.optional().default('ANALYST'),
});
/**
 * User login schema
 */
exports.UserLoginSchema = zod_1.z.object({
    email: exports.zodEmail,
    password: zod_1.z.string().min(1, { message: 'Password is required' }),
    rememberMe: zod_1.z.boolean().optional().default(false),
    mfaCode: zod_1.z.string().length(6).optional(),
});
/**
 * Entity creation schema
 */
exports.EntityCreateSchema = zod_1.z.object({
    type: exports.EntityType,
    label: zod_1.z
        .string()
        .min(1, { message: 'Entity label is required' })
        .max(500, { message: 'Entity label too long' })
        .transform((s) => s.trim()),
    description: zod_1.z
        .string()
        .max(5000, { message: 'Description too long' })
        .optional()
        .transform((s) => s?.trim()),
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional().default({}),
    investigationId: exports.zodUUID.optional(),
    tags: zod_1.z.array(zod_1.z.string().max(50)).max(20).optional().default([]),
    confidence: zod_1.z.number().min(0).max(1).optional().default(0.5),
    source: zod_1.z.string().max(200).optional(),
});
/**
 * Entity update schema
 */
exports.EntityUpdateSchema = exports.EntityCreateSchema.partial().extend({
    id: exports.zodUUID,
});
/**
 * Relationship creation schema
 */
exports.RelationshipCreateSchema = zod_1.z.object({
    type: exports.RelationshipType,
    sourceId: exports.zodUUID,
    targetId: exports.zodUUID,
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional().default({}),
    confidence: zod_1.z.number().min(0).max(1).optional().default(0.5),
    startDate: zod_1.z.coerce.date().optional(),
    endDate: zod_1.z.coerce.date().optional(),
    bidirectional: zod_1.z.boolean().optional().default(false),
});
/**
 * Investigation creation schema
 */
exports.InvestigationCreateSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(1, { message: 'Investigation title is required' })
        .max(200, { message: 'Title too long' })
        .transform((s) => s.trim()),
    description: zod_1.z
        .string()
        .max(10000, { message: 'Description too long' })
        .optional()
        .transform((s) => s?.trim()),
    status: exports.InvestigationStatus.optional().default('DRAFT'),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
    assignees: zod_1.z.array(exports.zodUUID).optional().default([]),
    tags: zod_1.z.array(zod_1.z.string().max(50)).max(50).optional().default([]),
    dueDate: zod_1.z.coerce.date().optional(),
    classification: zod_1.z.string().max(100).optional(),
});
/**
 * GraphQL query input schema
 */
exports.GraphQLQuerySchema = zod_1.z.object({
    query: zod_1.z
        .string()
        .min(1, { message: 'Query is required' })
        .max(50000, { message: 'Query too large' }),
    variables: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    operationName: zod_1.z.string().max(200).optional(),
});
/**
 * Search input schema
 */
exports.SearchInputSchema = zod_1.z.object({
    query: exports.zodSearchQuery,
    entityTypes: zod_1.z.array(exports.EntityType).optional(),
    investigationIds: zod_1.z.array(exports.zodUUID).optional(),
    dateRange: exports.zodDateRange.optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    confidence: zod_1.z.object({
        min: zod_1.z.number().min(0).max(1).optional(),
        max: zod_1.z.number().min(0).max(1).optional(),
    }).optional(),
    pagination: exports.zodPagination.optional(),
});
/**
 * AI analysis request schema
 */
exports.AIAnalysisSchema = zod_1.z.object({
    entityIds: zod_1.z.array(exports.zodUUID).min(1).max(100),
    analysisType: zod_1.z.enum([
        'ENTITY_RESOLUTION',
        'RELATIONSHIP_INFERENCE',
        'ANOMALY_DETECTION',
        'CLUSTERING',
        'SUMMARIZATION',
        'SENTIMENT_ANALYSIS',
    ]),
    parameters: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    priority: zod_1.z.enum(['LOW', 'NORMAL', 'HIGH']).optional().default('NORMAL'),
});
// ============================================================================
// Sanitization Utilities
// ============================================================================
/**
 * HTML escape function
 */
function escapeHtml(str) {
    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };
    return str.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
}
/**
 * Sanitize string input
 */
function sanitizeString(input) {
    return escapeHtml(input.trim());
}
/**
 * Sanitize object recursively
 */
function sanitizeObject(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            result[key] = sanitizeString(value);
        }
        else if (Array.isArray(value)) {
            result[key] = value.map((item) => typeof item === 'string'
                ? sanitizeString(item)
                : typeof item === 'object' && item !== null
                    ? sanitizeObject(item)
                    : item);
        }
        else if (typeof value === 'object' && value !== null) {
            result[key] = sanitizeObject(value);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
// ============================================================================
// Validation Middleware Factory
// ============================================================================
/**
 * Format Zod errors into standardized format
 */
function formatZodErrors(error) {
    return error.issues.map((err) => ({
        field: err.path.join('.') || 'root',
        message: err.message,
        code: err.code,
        value: undefined, // Don't include potentially sensitive values
    }));
}
/**
 * Validate data against schema
 */
function validate(schema, data, options = {}) {
    try {
        const sanitizedData = options.sanitize && typeof data === 'object' && data !== null
            ? sanitizeObject(data)
            : data;
        const result = schema.parse(sanitizedData);
        return { success: true, data: result };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return {
                success: false,
                errors: formatZodErrors(error),
            };
        }
        throw error;
    }
}
/**
 * Create validation middleware for Express routes
 */
function validateBody(schema, options = {}) {
    return (req, res, next) => {
        const result = validate(schema, req.body, { sanitize: true, ...options });
        if (!result.success) {
            next(new ErrorHandlingFramework_js_1.ValidationError('Request validation failed', result.errors));
            return;
        }
        req.body = result.data;
        next();
    };
}
/**
 * Create validation middleware for query parameters
 */
function validateQuery(schema, options = {}) {
    return (req, res, next) => {
        const result = validate(schema, req.query, { sanitize: true, ...options });
        if (!result.success) {
            next(new ErrorHandlingFramework_js_1.ValidationError('Query parameter validation failed', result.errors));
            return;
        }
        req.validatedQuery = result.data;
        next();
    };
}
/**
 * Create validation middleware for URL parameters
 */
function validateParams(schema, options = {}) {
    return (req, res, next) => {
        const result = validate(schema, req.params, options);
        if (!result.success) {
            next(new ErrorHandlingFramework_js_1.ValidationError('URL parameter validation failed', result.errors));
            return;
        }
        req.validatedParams = result.data;
        next();
    };
}
// ============================================================================
// GraphQL Validation
// ============================================================================
/**
 * GraphQL input validator
 */
class GraphQLInputValidator {
    schemas = new Map();
    constructor() {
        // Register default schemas
        this.register('CreateEntity', exports.EntityCreateSchema);
        this.register('UpdateEntity', exports.EntityUpdateSchema);
        this.register('CreateRelationship', exports.RelationshipCreateSchema);
        this.register('CreateInvestigation', exports.InvestigationCreateSchema);
        this.register('SearchInput', exports.SearchInputSchema);
        this.register('AIAnalysis', exports.AIAnalysisSchema);
    }
    /**
     * Register a schema for a GraphQL input type
     */
    register(typeName, schema) {
        this.schemas.set(typeName, schema);
    }
    /**
     * Validate GraphQL input
     */
    validate(typeName, input) {
        const schema = this.schemas.get(typeName);
        if (!schema) {
            return {
                success: false,
                errors: [{ field: 'type', message: `Unknown input type: ${typeName}`, code: 'unknown_type' }],
            };
        }
        return validate(schema, input, { sanitize: true });
    }
    /**
     * Create a GraphQL resolver wrapper with validation
     */
    withValidation(typeName, resolver) {
        return async (parent, args, context, info) => {
            const result = this.validate(typeName, args.input);
            if (!result.success) {
                throw new ErrorHandlingFramework_js_1.ValidationError(`Validation failed for ${typeName}`, result.errors);
            }
            return resolver(parent, result.data, context, info);
        };
    }
}
exports.GraphQLInputValidator = GraphQLInputValidator;
// ============================================================================
// Custom Validators
// ============================================================================
/**
 * Validate Neo4j Cypher query for safety
 */
function validateCypherQuery(query) {
    const dangerousPatterns = [
        /\bCALL\s+\{/i, // Subqueries that could be harmful
        /\bAPOC\./i, // APOC procedures (unless whitelisted)
        /\bdbms\./i, // Database management procedures
        /\bdb\.index/i, // Index management
        /\bCREATE\s+INDEX/i,
        /\bDROP\s+INDEX/i,
        /\bCREATE\s+CONSTRAINT/i,
        /\bDROP\s+CONSTRAINT/i,
        /\bLOAD\s+CSV/i, // File access
        /\/\//i, // Comments that could hide malicious code
    ];
    for (const pattern of dangerousPatterns) {
        if (pattern.test(query)) {
            return {
                success: false,
                errors: [{
                        field: 'query',
                        message: 'Query contains potentially dangerous operations',
                        code: 'dangerous_query',
                    }],
            };
        }
    }
    return { success: true, data: query };
}
/**
 * Validate file upload
 */
exports.FileUploadSchema = zod_1.z.object({
    filename: zod_1.z
        .string()
        .max(255)
        .regex(/^[a-zA-Z0-9_.-]+$/, { message: 'Invalid filename characters' }),
    mimetype: zod_1.z.enum([
        'application/pdf',
        'application/json',
        'text/plain',
        'text/csv',
        'image/png',
        'image/jpeg',
        'image/gif',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]),
    size: zod_1.z.number().max(50 * 1024 * 1024, { message: 'File size exceeds 50MB limit' }),
});
/**
 * Validate IP address
 */
exports.zodIPAddress = zod_1.z.string().refine((ip) => {
    // IPv4
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
        return ip.split('.').every((octet) => {
            const num = parseInt(octet, 10);
            return num >= 0 && num <= 255;
        });
    }
    // IPv6 (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    return ipv6Regex.test(ip);
}, { message: 'Invalid IP address format' });
/**
 * Validate URL
 */
exports.zodURL = zod_1.z.string().url().refine((url) => {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    }
    catch {
        return false;
    }
}, { message: 'URL must use HTTP or HTTPS protocol' });
// ============================================================================
// Rate Limit Validation
// ============================================================================
/**
 * API Key validation schema
 */
exports.APIKeySchema = zod_1.z
    .string()
    .min(32, { message: 'API key too short' })
    .max(128, { message: 'API key too long' })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid API key format' });
/**
 * JWT validation schema (structure only, not signature)
 */
exports.JWTSchema = zod_1.z
    .string()
    .regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, {
    message: 'Invalid JWT format',
});
// ============================================================================
// Export Singleton Instance
// ============================================================================
exports.graphqlValidator = new GraphQLInputValidator();
exports.default = {
    validate,
    validateBody,
    validateQuery,
    validateParams,
    sanitizeString,
    sanitizeObject,
    graphqlValidator: exports.graphqlValidator,
    schemas: {
        UserRegistration: exports.UserRegistrationSchema,
        UserLogin: exports.UserLoginSchema,
        EntityCreate: exports.EntityCreateSchema,
        EntityUpdate: exports.EntityUpdateSchema,
        RelationshipCreate: exports.RelationshipCreateSchema,
        InvestigationCreate: exports.InvestigationCreateSchema,
        GraphQLQuery: exports.GraphQLQuerySchema,
        Search: exports.SearchInputSchema,
        AIAnalysis: exports.AIAnalysisSchema,
        FileUpload: exports.FileUploadSchema,
        Pagination: exports.zodPagination,
        DateRange: exports.zodDateRange,
    },
    types: {
        UUID: exports.zodUUID,
        Email: exports.zodEmail,
        Password: exports.zodPassword,
        Username: exports.zodUsername,
        SearchQuery: exports.zodSearchQuery,
        EntityType: exports.EntityType,
        RelationshipType: exports.RelationshipType,
        UserRole: exports.UserRole,
        InvestigationStatus: exports.InvestigationStatus,
        IPAddress: exports.zodIPAddress,
        URL: exports.zodURL,
        APIKey: exports.APIKeySchema,
        JWT: exports.JWTSchema,
    },
};
