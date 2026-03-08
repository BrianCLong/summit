"use strict";
/**
 * Unified Audit Log Types
 * Common schema for aggregating audit events from CompanyOS, Switchboard, and Summit
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditQuerySchema = exports.UnifiedAuditEventSchema = exports.AuditOutcomeSchema = exports.ComplianceFrameworkSchema = exports.AuditCategorySchema = exports.AuditSeveritySchema = exports.AuditSourceSchema = void 0;
const zod_1 = require("zod");
// Source systems
exports.AuditSourceSchema = zod_1.z.enum(['companyos', 'switchboard', 'summit', 'prov-ledger', 'auditlake']);
// Severity levels
exports.AuditSeveritySchema = zod_1.z.enum(['debug', 'info', 'warn', 'error', 'critical']);
// Action categories
exports.AuditCategorySchema = zod_1.z.enum([
    'authentication',
    'authorization',
    'data_access',
    'data_modification',
    'system_event',
    'security_event',
    'compliance_event',
    'user_action',
    'admin_action',
    'integration_event',
    'ai_action',
]);
// Compliance frameworks
exports.ComplianceFrameworkSchema = zod_1.z.enum([
    'SOC2',
    'GDPR',
    'HIPAA',
    'SOX',
    'NIST',
    'ISO27001',
    'CCPA',
    'PCI_DSS',
    'FedRAMP',
]);
// Outcome status
exports.AuditOutcomeSchema = zod_1.z.enum(['success', 'failure', 'partial', 'pending', 'blocked']);
// Unified Audit Event schema
exports.UnifiedAuditEventSchema = zod_1.z.object({
    // Core identification
    id: zod_1.z.string().uuid(),
    source: exports.AuditSourceSchema,
    sourceEventId: zod_1.z.string().optional(), // Original event ID from source system
    // Timing
    timestamp: zod_1.z.date(),
    receivedAt: zod_1.z.date().optional(),
    processedAt: zod_1.z.date().optional(),
    // Classification
    eventType: zod_1.z.string(),
    category: exports.AuditCategorySchema,
    severity: exports.AuditSeveritySchema,
    // Context
    tenantId: zod_1.z.string(),
    correlationId: zod_1.z.string().uuid().optional(),
    sessionId: zod_1.z.string().optional(),
    requestId: zod_1.z.string().optional(),
    traceId: zod_1.z.string().optional(),
    spanId: zod_1.z.string().optional(),
    // Actor
    actor: zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.enum(['user', 'service', 'system', 'api_key', 'anonymous']),
        email: zod_1.z.string().email().optional(),
        name: zod_1.z.string().optional(),
        roles: zod_1.z.array(zod_1.z.string()).optional(),
        ipAddress: zod_1.z.string().optional(),
        userAgent: zod_1.z.string().optional(),
        impersonatedBy: zod_1.z.string().optional(),
    }),
    // Resource
    resource: zod_1.z.object({
        type: zod_1.z.string(),
        id: zod_1.z.string(),
        name: zod_1.z.string().optional(),
        path: zod_1.z.string().optional(),
    }).optional(),
    // Action details
    action: zod_1.z.string(),
    outcome: exports.AuditOutcomeSchema,
    message: zod_1.z.string().optional(),
    // State changes
    changes: zod_1.z.object({
        before: zod_1.z.record(zod_1.z.unknown()).optional(),
        after: zod_1.z.record(zod_1.z.unknown()).optional(),
        diff: zod_1.z.array(zod_1.z.object({
            field: zod_1.z.string(),
            oldValue: zod_1.z.unknown(),
            newValue: zod_1.z.unknown(),
        })).optional(),
    }).optional(),
    // Compliance
    compliance: zod_1.z.object({
        relevant: zod_1.z.boolean(),
        frameworks: zod_1.z.array(exports.ComplianceFrameworkSchema).optional(),
        dataClassification: zod_1.z.enum(['public', 'internal', 'confidential', 'restricted', 'top_secret']).optional(),
        retentionDays: zod_1.z.number().int().optional(),
        legalHold: zod_1.z.boolean().optional(),
    }).optional(),
    // Integrity
    integrity: zod_1.z.object({
        hash: zod_1.z.string(),
        previousHash: zod_1.z.string().optional(),
        signature: zod_1.z.string().optional(),
        algorithm: zod_1.z.string().optional(),
    }).optional(),
    // Error details
    error: zod_1.z.object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        stack: zod_1.z.string().optional(),
    }).optional(),
    // Additional metadata
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
// Query interface
exports.AuditQuerySchema = zod_1.z.object({
    // Filters
    sources: zod_1.z.array(exports.AuditSourceSchema).optional(),
    categories: zod_1.z.array(exports.AuditCategorySchema).optional(),
    severities: zod_1.z.array(exports.AuditSeveritySchema).optional(),
    eventTypes: zod_1.z.array(zod_1.z.string()).optional(),
    tenantIds: zod_1.z.array(zod_1.z.string()).optional(),
    actorIds: zod_1.z.array(zod_1.z.string()).optional(),
    resourceTypes: zod_1.z.array(zod_1.z.string()).optional(),
    resourceIds: zod_1.z.array(zod_1.z.string()).optional(),
    outcomes: zod_1.z.array(exports.AuditOutcomeSchema).optional(),
    correlationId: zod_1.z.string().uuid().optional(),
    // Time range
    startTime: zod_1.z.date().optional(),
    endTime: zod_1.z.date().optional(),
    // Full-text search
    searchText: zod_1.z.string().optional(),
    // Compliance
    complianceRelevant: zod_1.z.boolean().optional(),
    frameworks: zod_1.z.array(exports.ComplianceFrameworkSchema).optional(),
    // Pagination
    limit: zod_1.z.number().int().min(1).max(1000).default(100),
    offset: zod_1.z.number().int().min(0).default(0),
    cursor: zod_1.z.string().optional(),
    // Sorting
    sortBy: zod_1.z.enum(['timestamp', 'severity', 'category', 'source']).default('timestamp'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
