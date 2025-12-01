/**
 * Identity telemetry schemas
 *
 * Covers: authentication, MFA, SSO, device posture, session events
 */

import { z } from 'zod';
import { BaseEventSchema, NetworkAddressSchema, GeoLocationSchema } from './base.js';

/** Authentication method */
export const AuthMethod = z.enum([
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
export const AuthResult = z.enum([
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
export const AuthEventSchema = BaseEventSchema.extend({
  eventType: z.literal('identity.auth'),
  userId: z.string(),
  username: z.string(),
  authMethod: AuthMethod,
  result: AuthResult,
  clientAddress: NetworkAddressSchema,
  clientGeo: GeoLocationSchema.optional(),
  /** Identity provider source */
  identityProvider: z.string(),
  /** Application being accessed */
  targetApplication: z.string(),
  /** Session ID if successful */
  sessionId: z.string().optional(),
  /** Device identifier */
  deviceId: z.string().optional(),
  /** User agent string */
  userAgent: z.string().optional(),
  /** Risk score from IdP */
  riskScore: z.number().min(0).max(100).optional(),
  /** Conditional access policies evaluated */
  policiesEvaluated: z.array(z.string()).optional(),
  /** Was this an impossible travel scenario */
  impossibleTravel: z.boolean().optional(),
  /** Previous auth location if known */
  previousAuthGeo: GeoLocationSchema.optional(),
});
export type AuthEvent = z.infer<typeof AuthEventSchema>;

/** Device posture status */
export const PostureStatus = z.enum(['compliant', 'non_compliant', 'unknown', 'not_evaluated']);

/** Device posture event */
export const DevicePostureSchema = BaseEventSchema.extend({
  eventType: z.literal('identity.device_posture'),
  deviceId: z.string(),
  userId: z.string(),
  deviceType: z.enum(['desktop', 'laptop', 'mobile', 'tablet', 'server', 'iot']),
  osType: z.string(),
  osVersion: z.string(),
  /** Overall posture status */
  status: PostureStatus,
  /** Individual posture checks */
  checks: z.array(z.object({
    checkName: z.string(),
    passed: z.boolean(),
    details: z.string().optional(),
  })),
  /** Is device managed/MDM enrolled */
  isManaged: z.boolean(),
  /** Last check-in time */
  lastCheckIn: z.string().datetime(),
  /** Encryption enabled */
  diskEncrypted: z.boolean().optional(),
  /** Firewall enabled */
  firewallEnabled: z.boolean().optional(),
  /** Antivirus status */
  avEnabled: z.boolean().optional(),
});
export type DevicePosture = z.infer<typeof DevicePostureSchema>;

/** Session action types */
export const SessionAction = z.enum([
  'created',
  'refreshed',
  'revoked',
  'expired',
  'elevated',
]);

/** Session lifecycle event */
export const SessionEventSchema = BaseEventSchema.extend({
  eventType: z.literal('identity.session'),
  sessionId: z.string(),
  userId: z.string(),
  action: SessionAction,
  clientAddress: NetworkAddressSchema,
  /** Session duration in seconds */
  duration: z.number().int().optional(),
  /** Was MFA step-up performed */
  mfaStepUp: z.boolean().optional(),
  /** Privilege level */
  privilegeLevel: z.enum(['standard', 'elevated', 'admin']).optional(),
});
export type SessionEvent = z.infer<typeof SessionEventSchema>;

/** Union type for all identity events */
export const IdentityEventSchema = z.discriminatedUnion('eventType', [
  AuthEventSchema,
  DevicePostureSchema,
  SessionEventSchema,
]);
export type IdentityEvent = z.infer<typeof IdentityEventSchema>;
