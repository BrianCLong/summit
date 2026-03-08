"use strict";
/**
 * Event Types for Media Pipeline
 *
 * Defines events emitted to Graph Core, Spacetime, Provenance,
 * and internal processing queues.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookConfig = exports.WebhookEvent = exports.RedactionEvent = exports.RedactionRule = exports.RTBFResult = exports.RTBFRequest = exports.RetentionEvent = exports.RetentionAction = exports.ProvenanceRecord = exports.ProvenanceEventType = exports.SpacetimeSyncEvent = exports.SpacetimeEventType = exports.CommunicationEntityAttributes = exports.GraphSyncEvent = exports.GraphRelationshipRequest = exports.GraphEntityRequest = exports.GraphRelationshipType = exports.GraphEntityType = exports.PipelineEvent = exports.PipelineEventType = void 0;
const zod_1 = require("zod");
const media_js_1 = require("./media.js");
// ============================================================================
// Internal Pipeline Events
// ============================================================================
exports.PipelineEventType = zod_1.z.enum([
    // Media lifecycle
    'media.created',
    'media.updated',
    'media.deleted',
    'media.expired',
    // Processing lifecycle
    'processing.started',
    'processing.progress',
    'processing.completed',
    'processing.failed',
    'processing.retry',
    'processing.cancelled',
    // Transcription events
    'transcription.started',
    'transcription.completed',
    'transcription.failed',
    // Diarization events
    'diarization.started',
    'diarization.completed',
    'diarization.failed',
    // Segmentation events
    'segmentation.started',
    'segmentation.completed',
    'segmentation.failed',
    // Integration events
    'graph.sync.started',
    'graph.sync.completed',
    'graph.sync.failed',
    'spacetime.sync.started',
    'spacetime.sync.completed',
    'spacetime.sync.failed',
    'provenance.recorded',
    // Policy events
    'policy.retention.applied',
    'policy.rtbf.processed',
    'policy.redaction.applied',
]);
exports.PipelineEvent = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: exports.PipelineEventType,
    timestamp: zod_1.z.string().datetime(),
    correlationId: zod_1.z.string().uuid(),
    mediaAssetId: zod_1.z.string().uuid().optional(),
    transcriptId: zod_1.z.string().uuid().optional(),
    jobId: zod_1.z.string().uuid().optional(),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    metadata: zod_1.z
        .object({
        source: zod_1.z.string(),
        version: zod_1.z.string(),
        tenantId: zod_1.z.string().optional(),
        userId: zod_1.z.string().optional(),
    })
        .optional(),
});
// ============================================================================
// Graph Core Integration Events
// ============================================================================
exports.GraphEntityType = zod_1.z.enum([
    'Communication',
    'Person',
    'Organization',
    'Device',
    'Location',
    'Document',
    'MediaAsset',
]);
exports.GraphRelationshipType = zod_1.z.enum([
    'PARTICIPATED_IN',
    'COMMUNICATED_WITH',
    'MENTIONED',
    'LOCATED_AT',
    'CREATED',
    'OWNS',
    'REFERENCES',
    'DERIVED_FROM',
    'TRANSCRIBED_FROM',
]);
exports.GraphEntityRequest = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    type: exports.GraphEntityType,
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    validFrom: zod_1.z.string().datetime().optional(),
    validTo: zod_1.z.string().datetime().optional(),
    policy: media_js_1.PolicyLabels.optional(),
});
exports.GraphRelationshipRequest = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    from: zod_1.z.string().uuid(),
    to: zod_1.z.string().uuid(),
    type: exports.GraphRelationshipType,
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    validFrom: zod_1.z.string().datetime().optional(),
    validTo: zod_1.z.string().datetime().optional(),
    policy: media_js_1.PolicyLabels.optional(),
});
exports.GraphSyncEvent = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    mediaAssetId: zod_1.z.string().uuid(),
    transcriptId: zod_1.z.string().uuid().optional(),
    correlationId: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    entities: zod_1.z.array(exports.GraphEntityRequest),
    relationships: zod_1.z.array(exports.GraphRelationshipRequest),
    provenance: media_js_1.Provenance,
});
// ============================================================================
// Communication Entity for Graph
// ============================================================================
exports.CommunicationEntityAttributes = zod_1.z.object({
    mediaAssetId: zod_1.z.string().uuid(),
    transcriptId: zod_1.z.string().uuid().optional(),
    communicationType: zod_1.z.enum([
        'call',
        'meeting',
        'message',
        'email',
        'chat',
        'broadcast',
        'conference',
    ]),
    direction: zod_1.z.enum(['inbound', 'outbound', 'bidirectional', 'unknown']).optional(),
    channel: zod_1.z.string().optional(),
    startTime: zod_1.z.string().datetime(),
    endTime: zod_1.z.string().datetime().optional(),
    duration: zod_1.z.number().optional(),
    participantCount: zod_1.z.number().int(),
    utteranceCount: zod_1.z.number().int().optional(),
    wordCount: zod_1.z.number().int().optional(),
    primaryLanguage: zod_1.z.string().optional(),
    summary: zod_1.z.string().optional(),
    topics: zod_1.z.array(zod_1.z.string()).optional(),
    sentiment: zod_1.z.enum(['positive', 'negative', 'neutral', 'mixed']).optional(),
    urgency: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
    hasTranscript: zod_1.z.boolean(),
    transcriptConfidence: zod_1.z.number().min(0).max(1).optional(),
    location: media_js_1.GeoLocation.optional(),
    sourceRef: zod_1.z.string().optional(),
    sourceConnector: zod_1.z.string().optional(),
});
// ============================================================================
// Spacetime Integration Events
// ============================================================================
exports.SpacetimeEventType = zod_1.z.enum([
    'communication.call',
    'communication.meeting',
    'communication.message',
    'communication.email',
    'location.presence',
    'device.activity',
]);
exports.SpacetimeSyncEvent = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    mediaAssetId: zod_1.z.string().uuid(),
    communicationEntityId: zod_1.z.string().uuid().optional(),
    correlationId: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    eventType: exports.SpacetimeEventType,
    timeRange: media_js_1.TimeRange,
    location: media_js_1.GeoLocation.optional(),
    participantEntityIds: zod_1.z.array(zod_1.z.string().uuid()),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    source: zod_1.z.string(),
    provenance: media_js_1.Provenance,
});
// ============================================================================
// Provenance Integration Events
// ============================================================================
exports.ProvenanceEventType = zod_1.z.enum([
    'evidence.registered',
    'claim.created',
    'transform.recorded',
    'disclosure.prepared',
]);
exports.ProvenanceRecord = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    mediaAssetId: zod_1.z.string().uuid(),
    transcriptId: zod_1.z.string().uuid().optional(),
    eventType: exports.ProvenanceEventType,
    timestamp: zod_1.z.string().datetime(),
    sourceRef: zod_1.z.string(),
    checksum: zod_1.z.string(),
    transformStep: zod_1.z.string().optional(),
    transformProvider: zod_1.z.string().optional(),
    transformVersion: zod_1.z.string().optional(),
    inputChecksum: zod_1.z.string().optional(),
    outputChecksum: zod_1.z.string().optional(),
    authorityId: zod_1.z.string(),
    reasonForAccess: zod_1.z.string(),
    policyLabels: zod_1.z.array(zod_1.z.string()).optional(),
    licenseId: zod_1.z.string().optional(),
    caseId: zod_1.z.string().uuid().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
// ============================================================================
// Policy Events (Retention, RTBF, Redaction)
// ============================================================================
exports.RetentionAction = zod_1.z.enum([
    'retain',
    'archive',
    'delete',
    'extend',
    'review',
]);
exports.RetentionEvent = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    mediaAssetId: zod_1.z.string().uuid(),
    action: exports.RetentionAction,
    timestamp: zod_1.z.string().datetime(),
    expiresAt: zod_1.z.string().datetime().optional(),
    reason: zod_1.z.string(),
    policyId: zod_1.z.string().optional(),
    authorizedBy: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.RTBFRequest = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    requesterId: zod_1.z.string(),
    subjectIdentifiers: zod_1.z.array(zod_1.z.string()),
    scope: zod_1.z.enum(['full', 'partial', 'anonymize']),
    mediaAssetIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    reason: zod_1.z.string(),
    requestedAt: zod_1.z.string().datetime(),
    deadline: zod_1.z.string().datetime().optional(),
});
exports.RTBFResult = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    requestId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['pending', 'processing', 'completed', 'failed', 'partial']),
    processedAt: zod_1.z.string().datetime().optional(),
    affectedAssets: zod_1.z.array(zod_1.z.object({
        mediaAssetId: zod_1.z.string().uuid(),
        action: zod_1.z.enum(['deleted', 'anonymized', 'redacted', 'retained']),
        reason: zod_1.z.string().optional(),
    })),
    errors: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.RedactionRule = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    pattern: zod_1.z.string(), // Regex pattern
    replacement: zod_1.z.string().default('[REDACTED]'),
    fieldTypes: zod_1.z.array(zod_1.z.string()).optional(), // e.g., ['phone', 'email', 'ssn']
    enabled: zod_1.z.boolean().default(true),
    priority: zod_1.z.number().int().default(50),
});
exports.RedactionEvent = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    mediaAssetId: zod_1.z.string().uuid(),
    transcriptId: zod_1.z.string().uuid().optional(),
    timestamp: zod_1.z.string().datetime(),
    rulesApplied: zod_1.z.array(zod_1.z.string()),
    redactionsCount: zod_1.z.number().int(),
    fieldTypes: zod_1.z.array(zod_1.z.string()),
    originalChecksum: zod_1.z.string(),
    redactedChecksum: zod_1.z.string(),
    authorizedBy: zod_1.z.string(),
});
// ============================================================================
// Webhook/Callback Types
// ============================================================================
exports.WebhookEvent = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    webhookId: zod_1.z.string(),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    signature: zod_1.z.string().optional(),
    attempt: zod_1.z.number().int().default(1),
    maxAttempts: zod_1.z.number().int().default(3),
});
exports.WebhookConfig = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    url: zod_1.z.string().url(),
    events: zod_1.z.array(exports.PipelineEventType),
    secret: zod_1.z.string().optional(),
    enabled: zod_1.z.boolean().default(true),
    retryPolicy: zod_1.z
        .object({
        maxAttempts: zod_1.z.number().int().default(3),
        backoffMs: zod_1.z.number().int().default(1000),
        backoffMultiplier: zod_1.z.number().default(2),
    })
        .optional(),
    headers: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    tenantId: zod_1.z.string().optional(),
});
