"use strict";
/**
 * Endpoint telemetry schemas
 *
 * Covers: process events, file operations, EDR signals
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndpointEventSchema = exports.EdrAlertSchema = exports.RegistryEventSchema = exports.RegistryOperation = exports.FileEventSchema = exports.FileOperation = exports.ProcessEventSchema = exports.ProcessAction = void 0;
const zod_1 = require("zod");
const base_js_1 = require("./base.js");
/** Process event actions */
exports.ProcessAction = zod_1.z.enum([
    'created',
    'terminated',
    'injected',
    'hollowed',
]);
/** Process event schema (EDR-like) */
exports.ProcessEventSchema = base_js_1.BaseEventSchema.extend({
    eventType: zod_1.z.literal('endpoint.process'),
    hostId: zod_1.z.string(),
    hostname: zod_1.z.string(),
    action: exports.ProcessAction,
    processId: zod_1.z.number().int(),
    parentProcessId: zod_1.z.number().int().optional(),
    processName: zod_1.z.string(),
    processPath: zod_1.z.string(),
    commandLine: zod_1.z.string(),
    /** User context running the process */
    userName: zod_1.z.string(),
    userId: zod_1.z.string().optional(),
    /** Hash of the executable */
    sha256: zod_1.z.string().regex(/^[a-f0-9]{64}$/).optional(),
    /** Is process signed */
    isSigned: zod_1.z.boolean().optional(),
    /** Signer information */
    signer: zod_1.z.string().optional(),
    /** Parent process details */
    parentName: zod_1.z.string().optional(),
    parentPath: zod_1.z.string().optional(),
    parentCommandLine: zod_1.z.string().optional(),
    /** Integrity level (Windows) */
    integrityLevel: zod_1.z.enum(['untrusted', 'low', 'medium', 'high', 'system']).optional(),
    /** Is elevated/admin */
    isElevated: zod_1.z.boolean().optional(),
});
/** File operation types */
exports.FileOperation = zod_1.z.enum([
    'created',
    'modified',
    'deleted',
    'renamed',
    'read',
    'permission_changed',
]);
/** File event schema */
exports.FileEventSchema = base_js_1.BaseEventSchema.extend({
    eventType: zod_1.z.literal('endpoint.file'),
    hostId: zod_1.z.string(),
    hostname: zod_1.z.string(),
    operation: exports.FileOperation,
    filePath: zod_1.z.string(),
    fileName: zod_1.z.string(),
    fileExtension: zod_1.z.string().optional(),
    /** File size in bytes */
    fileSize: zod_1.z.number().int().nonnegative().optional(),
    sha256: zod_1.z.string().regex(/^[a-f0-9]{64}$/).optional(),
    /** Process that performed the operation */
    processId: zod_1.z.number().int().optional(),
    processName: zod_1.z.string().optional(),
    userName: zod_1.z.string(),
    /** Old path for rename operations */
    oldPath: zod_1.z.string().optional(),
    /** Is sensitive location */
    isSensitiveLocation: zod_1.z.boolean().optional(),
});
/** Registry operation types (Windows) */
exports.RegistryOperation = zod_1.z.enum([
    'key_created',
    'key_deleted',
    'value_set',
    'value_deleted',
]);
/** Registry event schema */
exports.RegistryEventSchema = base_js_1.BaseEventSchema.extend({
    eventType: zod_1.z.literal('endpoint.registry'),
    hostId: zod_1.z.string(),
    hostname: zod_1.z.string(),
    operation: exports.RegistryOperation,
    keyPath: zod_1.z.string(),
    valueName: zod_1.z.string().optional(),
    valueData: zod_1.z.string().optional(),
    valueType: zod_1.z.string().optional(),
    processId: zod_1.z.number().int(),
    processName: zod_1.z.string(),
    userName: zod_1.z.string(),
    /** Is persistence location */
    isPersistenceLocation: zod_1.z.boolean().optional(),
});
/** EDR alert schema */
exports.EdrAlertSchema = base_js_1.BaseEventSchema.extend({
    eventType: zod_1.z.literal('endpoint.edr_alert'),
    hostId: zod_1.z.string(),
    hostname: zod_1.z.string(),
    alertId: zod_1.z.string(),
    alertName: zod_1.z.string(),
    severity: base_js_1.SeverityLevel,
    category: zod_1.z.string(),
    description: zod_1.z.string(),
    /** MITRE ATT&CK mapping */
    mitreTactics: zod_1.z.array(zod_1.z.string()),
    mitreTechniques: zod_1.z.array(zod_1.z.string()),
    /** Related process */
    processId: zod_1.z.number().int().optional(),
    processName: zod_1.z.string().optional(),
    /** Related file */
    filePath: zod_1.z.string().optional(),
    /** Action taken */
    actionTaken: zod_1.z.enum(['blocked', 'quarantined', 'logged', 'none']),
    /** Confidence score */
    confidence: zod_1.z.number().min(0).max(1),
});
/** Union type for all endpoint events */
exports.EndpointEventSchema = zod_1.z.discriminatedUnion('eventType', [
    exports.ProcessEventSchema,
    exports.FileEventSchema,
    exports.RegistryEventSchema,
    exports.EdrAlertSchema,
]);
