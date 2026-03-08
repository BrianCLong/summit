"use strict";
/**
 * Cloud control plane telemetry schemas
 *
 * Covers: IAM changes, resource creation, API calls, configuration changes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudEventSchema = exports.SecurityFindingSchema = exports.ApiCallEventSchema = exports.ResourceEventSchema = exports.ResourceAction = exports.IamEventSchema = exports.IamAction = exports.CloudProvider = void 0;
const zod_1 = require("zod");
const base_js_1 = require("./base.js");
/** Cloud provider type */
exports.CloudProvider = zod_1.z.enum(['aws', 'azure', 'gcp', 'generic']);
/** IAM action types */
exports.IamAction = zod_1.z.enum([
    'user_created',
    'user_deleted',
    'user_modified',
    'role_created',
    'role_deleted',
    'role_assumed',
    'policy_attached',
    'policy_detached',
    'permission_added',
    'permission_removed',
    'mfa_enabled',
    'mfa_disabled',
    'access_key_created',
    'access_key_deleted',
    'password_changed',
]);
/** IAM event schema */
exports.IamEventSchema = base_js_1.BaseEventSchema.extend({
    eventType: zod_1.z.literal('cloud.iam'),
    provider: exports.CloudProvider,
    action: exports.IamAction,
    /** Principal performing the action */
    actorId: zod_1.z.string(),
    actorType: zod_1.z.enum(['user', 'role', 'service', 'root']),
    actorName: zod_1.z.string(),
    /** Target of the action */
    targetId: zod_1.z.string().optional(),
    targetType: zod_1.z.string().optional(),
    targetName: zod_1.z.string().optional(),
    /** Was this successful */
    success: zod_1.z.boolean(),
    errorCode: zod_1.z.string().optional(),
    errorMessage: zod_1.z.string().optional(),
    /** Source IP */
    sourceIp: zod_1.z.string().ip().optional(),
    /** User agent (CLI, console, SDK) */
    userAgent: zod_1.z.string().optional(),
    /** Resource ARN/ID affected */
    resourceArn: zod_1.z.string().optional(),
    /** Region */
    region: zod_1.z.string().optional(),
    /** Account ID */
    accountId: zod_1.z.string(),
});
/** Resource lifecycle actions */
exports.ResourceAction = zod_1.z.enum([
    'created',
    'deleted',
    'modified',
    'started',
    'stopped',
    'tagged',
    'untagged',
]);
/** Resource event schema */
exports.ResourceEventSchema = base_js_1.BaseEventSchema.extend({
    eventType: zod_1.z.literal('cloud.resource'),
    provider: exports.CloudProvider,
    action: exports.ResourceAction,
    resourceType: zod_1.z.string(),
    resourceId: zod_1.z.string(),
    resourceName: zod_1.z.string().optional(),
    resourceArn: zod_1.z.string().optional(),
    region: zod_1.z.string(),
    accountId: zod_1.z.string(),
    actorId: zod_1.z.string(),
    actorName: zod_1.z.string(),
    success: zod_1.z.boolean(),
    errorCode: zod_1.z.string().optional(),
    /** Resource configuration changes */
    configChanges: zod_1.z.record(zod_1.z.unknown()).optional(),
    /** Tags on resource */
    tags: zod_1.z.record(zod_1.z.string()).optional(),
    /** Is publicly accessible */
    isPublic: zod_1.z.boolean().optional(),
    /** Encryption status */
    isEncrypted: zod_1.z.boolean().optional(),
});
/** API call event schema */
exports.ApiCallEventSchema = base_js_1.BaseEventSchema.extend({
    eventType: zod_1.z.literal('cloud.api_call'),
    provider: exports.CloudProvider,
    serviceName: zod_1.z.string(),
    apiAction: zod_1.z.string(),
    actorId: zod_1.z.string(),
    actorType: zod_1.z.enum(['user', 'role', 'service', 'root']),
    actorName: zod_1.z.string(),
    sourceIp: zod_1.z.string().ip(),
    userAgent: zod_1.z.string(),
    region: zod_1.z.string(),
    accountId: zod_1.z.string(),
    success: zod_1.z.boolean(),
    errorCode: zod_1.z.string().optional(),
    /** Request parameters (sanitized) */
    requestParams: zod_1.z.record(zod_1.z.unknown()).optional(),
    /** Is read-only operation */
    isReadOnly: zod_1.z.boolean(),
    /** Resources accessed */
    resourcesAccessed: zod_1.z.array(zod_1.z.string()).optional(),
});
/** Security finding from cloud security tools */
exports.SecurityFindingSchema = base_js_1.BaseEventSchema.extend({
    eventType: zod_1.z.literal('cloud.security_finding'),
    provider: exports.CloudProvider,
    findingId: zod_1.z.string(),
    findingType: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    severity: base_js_1.SeverityLevel,
    resourceType: zod_1.z.string(),
    resourceId: zod_1.z.string(),
    resourceArn: zod_1.z.string().optional(),
    region: zod_1.z.string(),
    accountId: zod_1.z.string(),
    /** Compliance frameworks affected */
    complianceFrameworks: zod_1.z.array(zod_1.z.string()).optional(),
    /** Remediation recommendation */
    remediation: zod_1.z.string().optional(),
    /** Is active/resolved */
    status: zod_1.z.enum(['active', 'resolved', 'suppressed']),
    /** First seen */
    firstSeen: zod_1.z.string().datetime(),
    /** Last seen */
    lastSeen: zod_1.z.string().datetime(),
});
/** Union type for all cloud events */
exports.CloudEventSchema = zod_1.z.discriminatedUnion('eventType', [
    exports.IamEventSchema,
    exports.ResourceEventSchema,
    exports.ApiCallEventSchema,
    exports.SecurityFindingSchema,
]);
