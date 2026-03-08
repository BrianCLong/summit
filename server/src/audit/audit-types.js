"use strict";
/**
 * Comprehensive Audit Event Schema
 *
 * Design Goals:
 * - Immutable audit trail with cryptographic integrity
 * - SOC 2, GDPR, HIPAA, and ISO 27001 compliance
 * - TimescaleDB hypertable partitioning for performance
 * - HMAC signatures for tamper detection
 * - Before/after state tracking for all mutations
 * - Write-once file append support
 * - Multi-tenant isolation
 * - Forensic analysis capabilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEventSchema = void 0;
const zod_1 = require("zod");
/**
 * Validation schema for audit events using Zod
 */
exports.AuditEventSchema = zod_1.z.object({
    eventType: zod_1.z.string(),
    level: zod_1.z.enum(['debug', 'info', 'warn', 'error', 'critical']),
    timestamp: zod_1.z.date().optional(),
    version: zod_1.z.string().default('1.0.0'),
    // Context
    correlationId: zod_1.z.string().uuid(),
    sessionId: zod_1.z.string().uuid().optional(),
    requestId: zod_1.z.string().uuid().optional(),
    parentEventId: zod_1.z.string().uuid().optional(),
    traceId: zod_1.z.string().optional(),
    spanId: zod_1.z.string().optional(),
    // Actors
    userId: zod_1.z.string().optional(),
    impersonatedBy: zod_1.z.string().optional(),
    serviceAccountId: zod_1.z.string().optional(),
    tenantId: zod_1.z.string(),
    organizationId: zod_1.z.string().optional(),
    // Service
    serviceId: zod_1.z.string(),
    serviceName: zod_1.z.string(),
    serviceVersion: zod_1.z.string().optional(),
    environment: zod_1.z.enum(['development', 'staging', 'production']),
    // Resource
    resourceType: zod_1.z.string().optional(),
    resourceId: zod_1.z.string().optional(),
    resourceIds: zod_1.z.array(zod_1.z.string()).optional(),
    resourcePath: zod_1.z.string().optional(),
    resourceName: zod_1.z.string().optional(),
    // Action
    action: zod_1.z.string(),
    outcome: zod_1.z.enum(['success', 'failure', 'partial', 'pending']),
    message: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.any()).default({}),
    // Mutations
    oldValues: zod_1.z.record(zod_1.z.any()).optional(),
    newValues: zod_1.z.record(zod_1.z.any()).optional(),
    diffSummary: zod_1.z.string().optional(),
    // Security
    ipAddress: zod_1.z.string().optional(),
    ipAddressV6: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
    geolocation: zod_1.z.object({
        country: zod_1.z.string().optional(),
        region: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        coordinates: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]).optional(),
    }).optional(),
    deviceFingerprint: zod_1.z.string().optional(),
    // Compliance
    complianceRelevant: zod_1.z.boolean(),
    complianceFrameworks: zod_1.z.array(zod_1.z.string()),
    dataClassification: zod_1.z.enum(['public', 'internal', 'confidential', 'restricted', 'top_secret']).optional(),
    retentionPeriodDays: zod_1.z.number().optional(),
    legalHold: zod_1.z.boolean().optional(),
    gdprLawfulBasis: zod_1.z.string().optional(),
    hipaaRequirement: zod_1.z.string().optional(),
    // Performance
    duration: zod_1.z.number().optional(),
    errorCode: zod_1.z.string().optional(),
    errorMessage: zod_1.z.string().optional(),
    stackTrace: zod_1.z.string().optional(),
    // Metadata
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    redacted: zod_1.z.boolean().optional(),
});
