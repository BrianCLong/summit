"use strict";
/**
 * Base schemas shared across all telemetry event types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectionResultSchema = exports.NetworkAddressSchema = exports.GeoLocationSchema = exports.BaseEventSchema = exports.DataClassification = exports.SeverityLevel = void 0;
const zod_1 = require("zod");
/** Severity levels for events */
exports.SeverityLevel = zod_1.z.enum(['low', 'medium', 'high', 'critical']);
/** Classification labels for data handling */
exports.DataClassification = zod_1.z.enum([
    'public',
    'internal',
    'confidential',
    'restricted',
]);
/** Base event metadata present on all telemetry */
exports.BaseEventSchema = zod_1.z.object({
    /** Unique event identifier */
    id: zod_1.z.string().uuid(),
    /** ISO 8601 timestamp */
    timestamp: zod_1.z.string().datetime(),
    /** Event type discriminator */
    eventType: zod_1.z.string(),
    /** Source system/sensor */
    source: zod_1.z.string(),
    /** Tenant/organization ID (for multi-tenancy) */
    tenantId: zod_1.z.string().optional(),
    /** Data classification label */
    classification: exports.DataClassification.default('internal'),
    /** Retention policy identifier */
    retentionPolicy: zod_1.z.string().default('standard'),
    /** Synthetic data flag - MUST be true in this system */
    isSynthetic: zod_1.z.literal(true).default(true),
});
/** Geographic location (synthetic) */
exports.GeoLocationSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    city: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    countryCode: zod_1.z.string().length(2).optional(),
});
/** Network address types */
exports.NetworkAddressSchema = zod_1.z.object({
    ip: zod_1.z.string().ip(),
    port: zod_1.z.number().int().min(0).max(65535).optional(),
    hostname: zod_1.z.string().optional(),
    mac: zod_1.z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/).optional(),
});
/** Detection match result */
exports.DetectionResultSchema = zod_1.z.object({
    ruleId: zod_1.z.string(),
    ruleName: zod_1.z.string(),
    severity: exports.SeverityLevel,
    confidence: zod_1.z.number().min(0).max(1),
    matchedFields: zod_1.z.array(zod_1.z.string()),
    description: zod_1.z.string(),
    mitreTactics: zod_1.z.array(zod_1.z.string()).optional(),
    mitreTechniques: zod_1.z.array(zod_1.z.string()).optional(),
});
