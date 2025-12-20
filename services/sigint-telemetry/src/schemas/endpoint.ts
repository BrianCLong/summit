/**
 * Endpoint telemetry schemas
 *
 * Covers: process events, file operations, EDR signals
 */

import { z } from 'zod';
import { BaseEventSchema, SeverityLevel } from './base.js';

/** Process event actions */
export const ProcessAction = z.enum([
  'created',
  'terminated',
  'injected',
  'hollowed',
]);

/** Process event schema (EDR-like) */
export const ProcessEventSchema = BaseEventSchema.extend({
  eventType: z.literal('endpoint.process'),
  hostId: z.string(),
  hostname: z.string(),
  action: ProcessAction,
  processId: z.number().int(),
  parentProcessId: z.number().int().optional(),
  processName: z.string(),
  processPath: z.string(),
  commandLine: z.string(),
  /** User context running the process */
  userName: z.string(),
  userId: z.string().optional(),
  /** Hash of the executable */
  sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  /** Is process signed */
  isSigned: z.boolean().optional(),
  /** Signer information */
  signer: z.string().optional(),
  /** Parent process details */
  parentName: z.string().optional(),
  parentPath: z.string().optional(),
  parentCommandLine: z.string().optional(),
  /** Integrity level (Windows) */
  integrityLevel: z.enum(['untrusted', 'low', 'medium', 'high', 'system']).optional(),
  /** Is elevated/admin */
  isElevated: z.boolean().optional(),
});
export type ProcessEvent = z.infer<typeof ProcessEventSchema>;

/** File operation types */
export const FileOperation = z.enum([
  'created',
  'modified',
  'deleted',
  'renamed',
  'read',
  'permission_changed',
]);

/** File event schema */
export const FileEventSchema = BaseEventSchema.extend({
  eventType: z.literal('endpoint.file'),
  hostId: z.string(),
  hostname: z.string(),
  operation: FileOperation,
  filePath: z.string(),
  fileName: z.string(),
  fileExtension: z.string().optional(),
  /** File size in bytes */
  fileSize: z.number().int().nonnegative().optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  /** Process that performed the operation */
  processId: z.number().int().optional(),
  processName: z.string().optional(),
  userName: z.string(),
  /** Old path for rename operations */
  oldPath: z.string().optional(),
  /** Is sensitive location */
  isSensitiveLocation: z.boolean().optional(),
});
export type FileEvent = z.infer<typeof FileEventSchema>;

/** Registry operation types (Windows) */
export const RegistryOperation = z.enum([
  'key_created',
  'key_deleted',
  'value_set',
  'value_deleted',
]);

/** Registry event schema */
export const RegistryEventSchema = BaseEventSchema.extend({
  eventType: z.literal('endpoint.registry'),
  hostId: z.string(),
  hostname: z.string(),
  operation: RegistryOperation,
  keyPath: z.string(),
  valueName: z.string().optional(),
  valueData: z.string().optional(),
  valueType: z.string().optional(),
  processId: z.number().int(),
  processName: z.string(),
  userName: z.string(),
  /** Is persistence location */
  isPersistenceLocation: z.boolean().optional(),
});
export type RegistryEvent = z.infer<typeof RegistryEventSchema>;

/** EDR alert schema */
export const EdrAlertSchema = BaseEventSchema.extend({
  eventType: z.literal('endpoint.edr_alert'),
  hostId: z.string(),
  hostname: z.string(),
  alertId: z.string(),
  alertName: z.string(),
  severity: SeverityLevel,
  category: z.string(),
  description: z.string(),
  /** MITRE ATT&CK mapping */
  mitreTactics: z.array(z.string()),
  mitreTechniques: z.array(z.string()),
  /** Related process */
  processId: z.number().int().optional(),
  processName: z.string().optional(),
  /** Related file */
  filePath: z.string().optional(),
  /** Action taken */
  actionTaken: z.enum(['blocked', 'quarantined', 'logged', 'none']),
  /** Confidence score */
  confidence: z.number().min(0).max(1),
});
export type EdrAlert = z.infer<typeof EdrAlertSchema>;

/** Union type for all endpoint events */
export const EndpointEventSchema = z.discriminatedUnion('eventType', [
  ProcessEventSchema,
  FileEventSchema,
  RegistryEventSchema,
  EdrAlertSchema,
]);
export type EndpointEvent = z.infer<typeof EndpointEventSchema>;
