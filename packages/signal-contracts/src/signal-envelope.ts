/**
 * Signal Envelope Schema
 *
 * The SignalEnvelope is the standard wrapper for all signals in the platform.
 * It provides:
 * - Consistent metadata across all signal types
 * - Multi-tenancy support with tenant partitioning
 * - Provenance tracking for chain-of-custody
 * - Schema versioning for forward/backward compatibility
 *
 * @module signal-envelope
 */

import { z } from 'zod';

import { SignalTypeIdSchema } from './signal-types.js';

/**
 * Quality indicator for signal data
 */
export const SignalQuality = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  UNKNOWN: 'unknown',
} as const;

export type SignalQualityType = (typeof SignalQuality)[keyof typeof SignalQuality];

/**
 * Signal source information
 */
export const SignalSourceSchema = z.object({
  /** Unique identifier for the source system/device */
  sourceId: z.string().min(1),

  /** Type of source (e.g., 'device', 'application', 'feed', 'manual') */
  sourceType: z.enum(['device', 'application', 'feed', 'manual', 'synthetic']),

  /** Human-readable name of the source */
  sourceName: z.string().optional(),

  /** Protocol used to receive the signal */
  protocol: z.string().optional(),

  /** IP address of the source (if applicable) */
  sourceIp: z.string().ip().optional(),

  /** Geographic region of the source */
  region: z.string().optional(),

  /** Connector/adapter that received the signal */
  connectorId: z.string().optional(),
});

export type SignalSource = z.infer<typeof SignalSourceSchema>;

/**
 * Geolocation data for enrichment
 */
export const GeoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  accuracy: z.number().positive().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().nonnegative().optional(),
  source: z.enum(['gps', 'cell', 'wifi', 'ip', 'manual']).optional(),
});

export type GeoLocation = z.infer<typeof GeoLocationSchema>;

/**
 * Device information for telemetry signals
 */
export const DeviceInfoSchema = z.object({
  deviceId: z.string().min(1),
  deviceType: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  osName: z.string().optional(),
  osVersion: z.string().optional(),
  appVersion: z.string().optional(),
  firmwareVersion: z.string().optional(),
});

export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

/**
 * Provenance chain for audit trail
 */
export const ProvenanceSchema = z.object({
  /** Chain of processing steps this signal has been through */
  chain: z.array(
    z.object({
      step: z.string(),
      timestamp: z.number(),
      processor: z.string(),
      version: z.string().optional(),
    }),
  ),

  /** Original source reference */
  originalSourceId: z.string().optional(),

  /** Original timestamp at source */
  originalTimestamp: z.number().optional(),

  /** Hash of original payload for integrity verification */
  contentHash: z.string().optional(),
});

export type Provenance = z.infer<typeof ProvenanceSchema>;

/**
 * Enrichment data added during processing
 */
export const EnrichmentDataSchema = z.object({
  /** GeoIP enrichment results */
  geoIp: z
    .object({
      country: z.string().optional(),
      countryCode: z.string().length(2).optional(),
      region: z.string().optional(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      timezone: z.string().optional(),
      isp: z.string().optional(),
      org: z.string().optional(),
      asn: z.string().optional(),
      isVpn: z.boolean().optional(),
      isProxy: z.boolean().optional(),
      isTor: z.boolean().optional(),
      threatScore: z.number().min(0).max(100).optional(),
    })
    .optional(),

  /** Device lookup results */
  deviceLookup: z
    .object({
      knownDevice: z.boolean(),
      deviceProfile: z.string().optional(),
      lastSeen: z.number().optional(),
      associatedEntities: z.array(z.string()).optional(),
      riskScore: z.number().min(0).max(100).optional(),
    })
    .optional(),

  /** Entity resolution results */
  entityResolution: z
    .object({
      resolvedEntities: z.array(
        z.object({
          entityId: z.string(),
          entityType: z.string(),
          confidence: z.number().min(0).max(1),
        }),
      ),
    })
    .optional(),

  /** Custom enrichment data */
  custom: z.record(z.string(), z.unknown()).optional(),
});

export type EnrichmentData = z.infer<typeof EnrichmentDataSchema>;

/**
 * Signal metadata - common fields across all signal types
 */
export const SignalMetadataSchema = z.object({
  /** Unique identifier for this signal instance */
  signalId: z.string().uuid(),

  /** Signal type from the registry */
  signalType: SignalTypeIdSchema,

  /** Unix timestamp in milliseconds when the signal was generated at source */
  timestamp: z.number().positive(),

  /** Unix timestamp in milliseconds when the signal was received by the platform */
  receivedAt: z.number().positive(),

  /** Tenant identifier for multi-tenancy */
  tenantId: z.string().min(1),

  /** Source information */
  source: SignalSourceSchema,

  /** Correlation ID for tracking related signals */
  correlationId: z.string().optional(),

  /** Causation ID for tracking cause-effect relationships */
  causationId: z.string().optional(),

  /** Schema version of the envelope */
  envelopeVersion: z.string().default('1.0.0'),

  /** Schema version of the payload */
  payloadSchemaVersion: z.string().optional(),

  /** Signal quality indicator */
  quality: z.enum(['high', 'medium', 'low', 'unknown']).default('unknown'),

  /** Policy labels for access control */
  policyLabels: z.array(z.string()).default([]),

  /** Classification level */
  classification: z.string().optional(),

  /** Priority override (if different from type default) */
  priorityOverride: z.enum(['low', 'medium', 'high', 'critical']).optional(),

  /** Tags for categorization and search */
  tags: z.array(z.string()).default([]),

  /** TTL in seconds (time-to-live for ephemeral signals) */
  ttlSeconds: z.number().positive().optional(),
});

export type SignalMetadata = z.infer<typeof SignalMetadataSchema>;

/**
 * Complete Signal Envelope schema
 *
 * The envelope wraps any signal payload with consistent metadata,
 * enabling uniform processing across the streaming pipeline.
 */
export const SignalEnvelopeSchema = z.object({
  /** Signal metadata */
  metadata: SignalMetadataSchema,

  /** The actual signal payload (type-specific) */
  payload: z.unknown(),

  /** Location data (if applicable) */
  location: GeoLocationSchema.optional(),

  /** Device information (if applicable) */
  device: DeviceInfoSchema.optional(),

  /** Provenance chain */
  provenance: ProvenanceSchema.default({ chain: [] }),

  /** Enrichment data added during processing */
  enrichment: EnrichmentDataSchema.optional(),

  /** Additional headers (for protocol passthrough) */
  headers: z.record(z.string(), z.string()).optional(),
});

export type SignalEnvelope<T = unknown> = Omit<
  z.infer<typeof SignalEnvelopeSchema>,
  'payload'
> & {
  payload: T;
};

/**
 * Raw signal input before validation and enrichment
 */
export const RawSignalInputSchema = z.object({
  signalType: SignalTypeIdSchema,
  tenantId: z.string().min(1),
  sourceId: z.string().min(1),
  sourceType: z.enum(['device', 'application', 'feed', 'manual', 'synthetic']),
  payload: z.unknown(),
  timestamp: z.number().positive().optional(),
  correlationId: z.string().optional(),
  location: GeoLocationSchema.optional(),
  device: DeviceInfoSchema.optional(),
  tags: z.array(z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export type RawSignalInput = z.infer<typeof RawSignalInputSchema>;

/**
 * Create a new signal envelope from raw input
 */
export function createSignalEnvelope<T>(
  input: RawSignalInput,
  options?: {
    signalId?: string;
    receivedAt?: number;
    quality?: SignalQualityType;
    policyLabels?: string[];
    classification?: string;
  },
): SignalEnvelope<T> {
  const now = Date.now();
  const signalId = options?.signalId ?? crypto.randomUUID();

  return {
    metadata: {
      signalId,
      signalType: input.signalType,
      timestamp: input.timestamp ?? now,
      receivedAt: options?.receivedAt ?? now,
      tenantId: input.tenantId,
      source: {
        sourceId: input.sourceId,
        sourceType: input.sourceType,
      },
      correlationId: input.correlationId,
      envelopeVersion: '1.0.0',
      quality: options?.quality ?? 'unknown',
      policyLabels: options?.policyLabels ?? [],
      classification: options?.classification,
      tags: input.tags ?? [],
    },
    payload: input.payload as T,
    location: input.location,
    device: input.device,
    provenance: {
      chain: [
        {
          step: 'ingestion',
          timestamp: now,
          processor: 'signal-bus-service',
          version: '1.0.0',
        },
      ],
    },
    headers: input.headers,
  };
}

/**
 * Add a provenance step to an envelope
 */
export function addProvenanceStep<T>(
  envelope: SignalEnvelope<T>,
  step: string,
  processor: string,
  version?: string,
): SignalEnvelope<T> {
  return {
    ...envelope,
    provenance: {
      ...envelope.provenance,
      chain: [
        ...envelope.provenance.chain,
        {
          step,
          timestamp: Date.now(),
          processor,
          version,
        },
      ],
    },
  };
}

/**
 * Validate a signal envelope
 */
export function validateSignalEnvelope(
  input: unknown,
): z.SafeParseReturnType<unknown, SignalEnvelope> {
  return SignalEnvelopeSchema.safeParse(input);
}

/**
 * Get partition key for Kafka topic partitioning
 * Partitions by tenant + signal type for ordered processing per tenant/type
 */
export function getPartitionKey(envelope: SignalEnvelope): string {
  return `${envelope.metadata.tenantId}:${envelope.metadata.signalType}`;
}

/**
 * Get routing key for downstream fan-out
 */
export function getRoutingKey(envelope: SignalEnvelope): string {
  const category = envelope.metadata.signalType.split('.')[0];
  return `${envelope.metadata.tenantId}:${category}`;
}
