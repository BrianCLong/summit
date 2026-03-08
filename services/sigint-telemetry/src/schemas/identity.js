"use strict";
/**
 * Identity telemetry schemas
 *
 * Covers: authentication, MFA, SSO, device posture, session events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityEventSchema = exports.SessionEventSchema = exports.SessionAction = exports.DevicePostureSchema = exports.PostureStatus = exports.AuthEventSchema = exports.AuthResult = exports.AuthMethod = void 0;
const zod_1 = require("zod");
const base_js_1 = require("./base.js");
/** Authentication method */
exports.AuthMethod = zod_1.z.enum([
    'password',
    'mfa_totp',
    'mfa_push',
    'mfa_sms',
    'mfa_hardware',
    'sso_saml',
    'sso_oidc',
    'certificate',
    'api_key',
    'service_account',
]);
/** Authentication result */
exports.AuthResult = zod_1.z.enum([
    'success',
    'failure_invalid_credentials',
    'failure_mfa_required',
    'failure_mfa_failed',
    'failure_account_locked',
    'failure_account_disabled',
    'failure_policy_denied',
    'failure_expired',
]);
/** Authentication event schema */
exports.AuthEventSchema = base_js_1.BaseEventSchema.extend({
    eventType: zod_1.z.literal('identity.auth'),
    userId: zod_1.z.string(),
    username: zod_1.z.string(),
    authMethod: exports.AuthMethod,
    result: exports.AuthResult,
    clientAddress: base_js_1.NetworkAddressSchema,
    clientGeo: base_js_1.GeoLocationSchema.optional(),
    /** Identity provider source */
    identityProvider: zod_1.z.string(),
    /** Application being accessed */
    targetApplication: zod_1.z.string(),
    /** Session ID if successful */
    sessionId: zod_1.z.string().optional(),
    /** Device identifier */
    deviceId: zod_1.z.string().optional(),
    /** User agent string */
    userAgent: zod_1.z.string().optional(),
    /** Risk score from IdP */
    riskScore: zod_1.z.number().min(0).max(100).optional(),
    /** Conditional access policies evaluated */
    policiesEvaluated: zod_1.z.array(zod_1.z.string()).optional(),
    /** Was this an impossible travel scenario */
    impossibleTravel: zod_1.z.boolean().optional(),
    /** Previous auth location if known */
    previousAuthGeo: base_js_1.GeoLocationSchema.optional(),
});
/** Device posture status */
exports.PostureStatus = zod_1.z.enum(['compliant', 'non_compliant', 'unknown', 'not_evaluated']);
/** Device posture event */
exports.DevicePostureSchema = base_js_1.BaseEventSchema.extend({
    eventType: zod_1.z.literal('identity.device_posture'),
    deviceId: zod_1.z.string(),
    userId: zod_1.z.string(),
    deviceType: zod_1.z.enum(['desktop', 'laptop', 'mobile', 'tablet', 'server', 'iot']),
    osType: zod_1.z.string(),
    osVersion: zod_1.z.string(),
    /** Overall posture status */
    status: exports.PostureStatus,
    /** Individual posture checks */
    checks: zod_1.z.array(zod_1.z.object({
        checkName: zod_1.z.string(),
        passed: zod_1.z.boolean(),
        details: zod_1.z.string().optional(),
    })),
    /** Is device managed/MDM enrolled */
    isManaged: zod_1.z.boolean(),
    /** Last check-in time */
    lastCheckIn: zod_1.z.string().datetime(),
    /** Encryption enabled */
    diskEncrypted: zod_1.z.boolean().optional(),
    /** Firewall enabled */
    firewallEnabled: zod_1.z.boolean().optional(),
    /** Antivirus status */
    avEnabled: zod_1.z.boolean().optional(),
});
/** Session action types */
exports.SessionAction = zod_1.z.enum([
    'created',
    'refreshed',
    'revoked',
    'expired',
    'elevated',
]);
/** Session lifecycle event */
exports.SessionEventSchema = base_js_1.BaseEventSchema.extend({
    eventType: zod_1.z.literal('identity.session'),
    sessionId: zod_1.z.string(),
    userId: zod_1.z.string(),
    action: exports.SessionAction,
    clientAddress: base_js_1.NetworkAddressSchema,
    /** Session duration in seconds */
    duration: zod_1.z.number().int().optional(),
    /** Was MFA step-up performed */
    mfaStepUp: zod_1.z.boolean().optional(),
    /** Privilege level */
    privilegeLevel: zod_1.z.enum(['standard', 'elevated', 'admin']).optional(),
});
/** Union type for all identity events */
exports.IdentityEventSchema = zod_1.z.discriminatedUnion('eventType', [
    exports.AuthEventSchema,
    exports.DevicePostureSchema,
    exports.SessionEventSchema,
]);
