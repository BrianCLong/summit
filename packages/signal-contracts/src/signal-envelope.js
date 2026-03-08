"use strict";
// @ts-nocheck
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawSignalInputSchema = exports.SignalEnvelopeSchema = exports.SignalMetadataSchema = exports.EnrichmentDataSchema = exports.ProvenanceSchema = exports.DeviceInfoSchema = exports.GeoLocationSchema = exports.SignalSourceSchema = exports.SignalQuality = void 0;
exports.createSignalEnvelope = createSignalEnvelope;
exports.addProvenanceStep = addProvenanceStep;
exports.validateSignalEnvelope = validateSignalEnvelope;
exports.getPartitionKey = getPartitionKey;
exports.getRoutingKey = getRoutingKey;
const zod_1 = require("zod");
const signal_types_js_1 = require("./signal-types.js");
/**
 * Quality indicator for signal data
 */
exports.SignalQuality = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    UNKNOWN: 'unknown',
};
/**
 * Signal source information
 */
exports.SignalSourceSchema = zod_1.z.object({
    /** Unique identifier for the source system/device */
    sourceId: zod_1.z.string().min(1),
    /** Type of source (e.g., 'device', 'application', 'feed', 'manual') */
    sourceType: zod_1.z.enum(['device', 'application', 'feed', 'manual', 'synthetic']),
    /** Human-readable name of the source */
    sourceName: zod_1.z.string().optional(),
    /** Protocol used to receive the signal */
    protocol: zod_1.z.string().optional(),
    /** IP address of the source (if applicable) */
    sourceIp: zod_1.z.string().ip().optional(),
    /** Geographic region of the source */
    region: zod_1.z.string().optional(),
    /** Connector/adapter that received the signal */
    connectorId: zod_1.z.string().optional(),
});
/**
 * Geolocation data for enrichment
 */
exports.GeoLocationSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    altitude: zod_1.z.number().optional(),
    accuracy: zod_1.z.number().positive().optional(),
    heading: zod_1.z.number().min(0).max(360).optional(),
    speed: zod_1.z.number().nonnegative().optional(),
    source: zod_1.z.enum(['gps', 'cell', 'wifi', 'ip', 'manual']).optional(),
});
/**
 * Device information for telemetry signals
 */
exports.DeviceInfoSchema = zod_1.z.object({
    deviceId: zod_1.z.string().min(1),
    deviceType: zod_1.z.string().optional(),
    manufacturer: zod_1.z.string().optional(),
    model: zod_1.z.string().optional(),
    osName: zod_1.z.string().optional(),
    osVersion: zod_1.z.string().optional(),
    appVersion: zod_1.z.string().optional(),
    firmwareVersion: zod_1.z.string().optional(),
});
/**
 * Provenance chain for audit trail
 */
exports.ProvenanceSchema = zod_1.z.object({
    /** Chain of processing steps this signal has been through */
    chain: zod_1.z.array(zod_1.z.object({
        step: zod_1.z.string(),
        timestamp: zod_1.z.number(),
        processor: zod_1.z.string(),
        version: zod_1.z.string().optional(),
    })),
    /** Original source reference */
    originalSourceId: zod_1.z.string().optional(),
    /** Original timestamp at source */
    originalTimestamp: zod_1.z.number().optional(),
    /** Hash of original payload for integrity verification */
    contentHash: zod_1.z.string().optional(),
});
/**
 * Enrichment data added during processing
 */
exports.EnrichmentDataSchema = zod_1.z.object({
    /** GeoIP enrichment results */
    geoIp: zod_1.z
        .object({
        country: zod_1.z.string().optional(),
        countryCode: zod_1.z.string().length(2).optional(),
        region: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        postalCode: zod_1.z.string().optional(),
        latitude: zod_1.z.number().optional(),
        longitude: zod_1.z.number().optional(),
        timezone: zod_1.z.string().optional(),
        isp: zod_1.z.string().optional(),
        org: zod_1.z.string().optional(),
        asn: zod_1.z.string().optional(),
        isVpn: zod_1.z.boolean().optional(),
        isProxy: zod_1.z.boolean().optional(),
        isTor: zod_1.z.boolean().optional(),
        threatScore: zod_1.z.number().min(0).max(100).optional(),
    })
        .optional(),
    /** Device lookup results */
    deviceLookup: zod_1.z
        .object({
        knownDevice: zod_1.z.boolean(),
        deviceProfile: zod_1.z.string().optional(),
        lastSeen: zod_1.z.number().optional(),
        associatedEntities: zod_1.z.array(zod_1.z.string()).optional(),
        riskScore: zod_1.z.number().min(0).max(100).optional(),
    })
        .optional(),
    /** Entity resolution results */
    entityResolution: zod_1.z
        .object({
        resolvedEntities: zod_1.z.array(zod_1.z.object({
            entityId: zod_1.z.string(),
            entityType: zod_1.z.string(),
            confidence: zod_1.z.number().min(0).max(1),
        })),
    })
        .optional(),
    /** Custom enrichment data */
    custom: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
/**
 * Signal metadata - common fields across all signal types
 */
exports.SignalMetadataSchema = zod_1.z.object({
    /** Unique identifier for this signal instance */
    signalId: zod_1.z.string().uuid(),
    /** Signal type from the registry */
    signalType: signal_types_js_1.SignalTypeIdSchema,
    /** Unix timestamp in milliseconds when the signal was generated at source */
    timestamp: zod_1.z.number().positive(),
    /** Unix timestamp in milliseconds when the signal was received by the platform */
    receivedAt: zod_1.z.number().positive(),
    /** Tenant identifier for multi-tenancy */
    tenantId: zod_1.z.string().min(1),
    /** Source information */
    source: exports.SignalSourceSchema,
    /** Correlation ID for tracking related signals */
    correlationId: zod_1.z.string().optional(),
    /** Causation ID for tracking cause-effect relationships */
    causationId: zod_1.z.string().optional(),
    /** Schema version of the envelope */
    envelopeVersion: zod_1.z.string().default('1.0.0'),
    /** Schema version of the payload */
    payloadSchemaVersion: zod_1.z.string().optional(),
    /** Signal quality indicator */
    quality: zod_1.z.enum(['high', 'medium', 'low', 'unknown']).default('unknown'),
    /** Policy labels for access control */
    policyLabels: zod_1.z.array(zod_1.z.string()).default([]),
    /** Classification level */
    classification: zod_1.z.string().optional(),
    /** Priority override (if different from type default) */
    priorityOverride: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
    /** Tags for categorization and search */
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    /** TTL in seconds (time-to-live for ephemeral signals) */
    ttlSeconds: zod_1.z.number().positive().optional(),
});
/**
 * Complete Signal Envelope schema
 *
 * The envelope wraps any signal payload with consistent metadata,
 * enabling uniform processing across the streaming pipeline.
 */
exports.SignalEnvelopeSchema = zod_1.z.object({
    /** Signal metadata */
    metadata: exports.SignalMetadataSchema,
    /** The actual signal payload (type-specific) */
    payload: zod_1.z.unknown(),
    /** Location data (if applicable) */
    location: exports.GeoLocationSchema.optional(),
    /** Device information (if applicable) */
    device: exports.DeviceInfoSchema.optional(),
    /** Provenance chain */
    provenance: exports.ProvenanceSchema.default({ chain: [] }),
    /** Enrichment data added during processing */
    enrichment: exports.EnrichmentDataSchema.optional(),
    /** Additional headers (for protocol passthrough) */
    headers: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
/**
 * Raw signal input before validation and enrichment
 */
exports.RawSignalInputSchema = zod_1.z.object({
    signalType: signal_types_js_1.SignalTypeIdSchema,
    tenantId: zod_1.z.string().min(1),
    sourceId: zod_1.z.string().min(1),
    sourceType: zod_1.z.enum(['device', 'application', 'feed', 'manual', 'synthetic']),
    payload: zod_1.z.unknown(),
    timestamp: zod_1.z.number().positive().optional(),
    correlationId: zod_1.z.string().optional(),
    location: exports.GeoLocationSchema.optional(),
    device: exports.DeviceInfoSchema.optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    headers: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
/**
 * Create a new signal envelope from raw input
 */
function createSignalEnvelope(input, options) {
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
        payload: input.payload,
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
function addProvenanceStep(envelope, step, processor, version) {
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
function validateSignalEnvelope(input) {
    return exports.SignalEnvelopeSchema.safeParse(input);
}
/**
 * Get partition key for Kafka topic partitioning
 * Partitions by tenant + signal type for ordered processing per tenant/type
 */
function getPartitionKey(envelope) {
    return `${envelope.metadata.tenantId}:${envelope.metadata.signalType}`;
}
/**
 * Get routing key for downstream fan-out
 */
function getRoutingKey(envelope) {
    const category = envelope.metadata.signalType.split('.')[0];
    return `${envelope.metadata.tenantId}:${category}`;
}
