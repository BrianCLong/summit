/**
 * Cloud control plane telemetry schemas
 *
 * Covers: IAM changes, resource creation, API calls, configuration changes
 */

import { z } from 'zod';
import { BaseEventSchema, SeverityLevel } from './base.js';

/** Cloud provider type */
export const CloudProvider = z.enum(['aws', 'azure', 'gcp', 'generic']);

/** IAM action types */
export const IamAction = z.enum([
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
export const IamEventSchema = BaseEventSchema.extend({
  eventType: z.literal('cloud.iam'),
  provider: CloudProvider,
  action: IamAction,
  /** Principal performing the action */
  actorId: z.string(),
  actorType: z.enum(['user', 'role', 'service', 'root']),
  actorName: z.string(),
  /** Target of the action */
  targetId: z.string().optional(),
  targetType: z.string().optional(),
  targetName: z.string().optional(),
  /** Was this successful */
  success: z.boolean(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  /** Source IP */
  sourceIp: z.string().ip().optional(),
  /** User agent (CLI, console, SDK) */
  userAgent: z.string().optional(),
  /** Resource ARN/ID affected */
  resourceArn: z.string().optional(),
  /** Region */
  region: z.string().optional(),
  /** Account ID */
  accountId: z.string(),
});
export type IamEvent = z.infer<typeof IamEventSchema>;

/** Resource lifecycle actions */
export const ResourceAction = z.enum([
  'created',
  'deleted',
  'modified',
  'started',
  'stopped',
  'tagged',
  'untagged',
]);

/** Resource event schema */
export const ResourceEventSchema = BaseEventSchema.extend({
  eventType: z.literal('cloud.resource'),
  provider: CloudProvider,
  action: ResourceAction,
  resourceType: z.string(),
  resourceId: z.string(),
  resourceName: z.string().optional(),
  resourceArn: z.string().optional(),
  region: z.string(),
  accountId: z.string(),
  actorId: z.string(),
  actorName: z.string(),
  success: z.boolean(),
  errorCode: z.string().optional(),
  /** Resource configuration changes */
  configChanges: z.record(z.unknown()).optional(),
  /** Tags on resource */
  tags: z.record(z.string()).optional(),
  /** Is publicly accessible */
  isPublic: z.boolean().optional(),
  /** Encryption status */
  isEncrypted: z.boolean().optional(),
});
export type ResourceEvent = z.infer<typeof ResourceEventSchema>;

/** API call event schema */
export const ApiCallEventSchema = BaseEventSchema.extend({
  eventType: z.literal('cloud.api_call'),
  provider: CloudProvider,
  serviceName: z.string(),
  apiAction: z.string(),
  actorId: z.string(),
  actorType: z.enum(['user', 'role', 'service', 'root']),
  actorName: z.string(),
  sourceIp: z.string().ip(),
  userAgent: z.string(),
  region: z.string(),
  accountId: z.string(),
  success: z.boolean(),
  errorCode: z.string().optional(),
  /** Request parameters (sanitized) */
  requestParams: z.record(z.unknown()).optional(),
  /** Is read-only operation */
  isReadOnly: z.boolean(),
  /** Resources accessed */
  resourcesAccessed: z.array(z.string()).optional(),
});
export type ApiCallEvent = z.infer<typeof ApiCallEventSchema>;

/** Security finding from cloud security tools */
export const SecurityFindingSchema = BaseEventSchema.extend({
  eventType: z.literal('cloud.security_finding'),
  provider: CloudProvider,
  findingId: z.string(),
  findingType: z.string(),
  title: z.string(),
  description: z.string(),
  severity: SeverityLevel,
  resourceType: z.string(),
  resourceId: z.string(),
  resourceArn: z.string().optional(),
  region: z.string(),
  accountId: z.string(),
  /** Compliance frameworks affected */
  complianceFrameworks: z.array(z.string()).optional(),
  /** Remediation recommendation */
  remediation: z.string().optional(),
  /** Is active/resolved */
  status: z.enum(['active', 'resolved', 'suppressed']),
  /** First seen */
  firstSeen: z.string().datetime(),
  /** Last seen */
  lastSeen: z.string().datetime(),
});
export type SecurityFinding = z.infer<typeof SecurityFindingSchema>;

/** Union type for all cloud events */
export const CloudEventSchema = z.discriminatedUnion('eventType', [
  IamEventSchema,
  ResourceEventSchema,
  ApiCallEventSchema,
  SecurityFindingSchema,
]);
export type CloudEvent = z.infer<typeof CloudEventSchema>;
