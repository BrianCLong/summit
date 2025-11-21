/**
 * Base schemas shared across all telemetry event types
 */

import { z } from 'zod';

/** Severity levels for events */
export const SeverityLevel = z.enum(['low', 'medium', 'high', 'critical']);
export type SeverityLevel = z.infer<typeof SeverityLevel>;

/** Classification labels for data handling */
export const DataClassification = z.enum([
  'public',
  'internal',
  'confidential',
  'restricted',
]);
export type DataClassification = z.infer<typeof DataClassification>;

/** Base event metadata present on all telemetry */
export const BaseEventSchema = z.object({
  /** Unique event identifier */
  id: z.string().uuid(),
  /** ISO 8601 timestamp */
  timestamp: z.string().datetime(),
  /** Event type discriminator */
  eventType: z.string(),
  /** Source system/sensor */
  source: z.string(),
  /** Tenant/organization ID (for multi-tenancy) */
  tenantId: z.string().optional(),
  /** Data classification label */
  classification: DataClassification.default('internal'),
  /** Retention policy identifier */
  retentionPolicy: z.string().default('standard'),
  /** Synthetic data flag - MUST be true in this system */
  isSynthetic: z.literal(true).default(true),
});
export type BaseEvent = z.infer<typeof BaseEventSchema>;

/** Geographic location (synthetic) */
export const GeoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().length(2).optional(),
});
export type GeoLocation = z.infer<typeof GeoLocationSchema>;

/** Network address types */
export const NetworkAddressSchema = z.object({
  ip: z.string().ip(),
  port: z.number().int().min(0).max(65535).optional(),
  hostname: z.string().optional(),
  mac: z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/).optional(),
});
export type NetworkAddress = z.infer<typeof NetworkAddressSchema>;

/** Detection match result */
export const DetectionResultSchema = z.object({
  ruleId: z.string(),
  ruleName: z.string(),
  severity: SeverityLevel,
  confidence: z.number().min(0).max(1),
  matchedFields: z.array(z.string()),
  description: z.string(),
  mitreTactics: z.array(z.string()).optional(),
  mitreTechniques: z.array(z.string()).optional(),
});
export type DetectionResult = z.infer<typeof DetectionResultSchema>;
