/**
 * Event Types for Media Pipeline
 *
 * Defines events emitted to Graph Core, Spacetime, Provenance,
 * and internal processing queues.
 */

import { z } from 'zod';
import {
  TimeRange,
  GeoLocation,
  PolicyLabels,
  Provenance,
} from './media.js';
import type {
  MediaAsset,
  Transcript,
  Thread,
  Utterance,
  ParticipantRef,
  CommunicationEvent,
  SpacetimeEvent,
  ProcessingJob,
} from './media.js';

// ============================================================================
// Internal Pipeline Events
// ============================================================================

export const PipelineEventType = z.enum([
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
export type PipelineEventType = z.infer<typeof PipelineEventType>;

export const PipelineEvent = z.object({
  id: z.string().uuid(),
  type: PipelineEventType,
  timestamp: z.string().datetime(),
  correlationId: z.string().uuid(),
  mediaAssetId: z.string().uuid().optional(),
  transcriptId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()),
  metadata: z
    .object({
      source: z.string(),
      version: z.string(),
      tenantId: z.string().optional(),
      userId: z.string().optional(),
    })
    .optional(),
});
export type PipelineEvent = z.infer<typeof PipelineEvent>;

// ============================================================================
// Graph Core Integration Events
// ============================================================================

export const GraphEntityType = z.enum([
  'Communication',
  'Person',
  'Organization',
  'Device',
  'Location',
  'Document',
  'MediaAsset',
]);
export type GraphEntityType = z.infer<typeof GraphEntityType>;

export const GraphRelationshipType = z.enum([
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
export type GraphRelationshipType = z.infer<typeof GraphRelationshipType>;

export const GraphEntityRequest = z.object({
  id: z.string().uuid().optional(),
  type: GraphEntityType,
  attributes: z.record(z.string(), z.unknown()),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  policy: PolicyLabels.optional(),
});
export type GraphEntityRequest = z.infer<typeof GraphEntityRequest>;

export const GraphRelationshipRequest = z.object({
  id: z.string().uuid().optional(),
  from: z.string().uuid(),
  to: z.string().uuid(),
  type: GraphRelationshipType,
  attributes: z.record(z.string(), z.unknown()).optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  policy: PolicyLabels.optional(),
});
export type GraphRelationshipRequest = z.infer<typeof GraphRelationshipRequest>;

export const GraphSyncEvent = z.object({
  id: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  transcriptId: z.string().uuid().optional(),
  correlationId: z.string().uuid(),
  timestamp: z.string().datetime(),
  entities: z.array(GraphEntityRequest),
  relationships: z.array(GraphRelationshipRequest),
  provenance: Provenance,
});
export type GraphSyncEvent = z.infer<typeof GraphSyncEvent>;

// ============================================================================
// Communication Entity for Graph
// ============================================================================

export const CommunicationEntityAttributes = z.object({
  mediaAssetId: z.string().uuid(),
  transcriptId: z.string().uuid().optional(),
  communicationType: z.enum([
    'call',
    'meeting',
    'message',
    'email',
    'chat',
    'broadcast',
    'conference',
  ]),
  direction: z.enum(['inbound', 'outbound', 'bidirectional', 'unknown']).optional(),
  channel: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  duration: z.number().optional(),
  participantCount: z.number().int(),
  utteranceCount: z.number().int().optional(),
  wordCount: z.number().int().optional(),
  primaryLanguage: z.string().optional(),
  summary: z.string().optional(),
  topics: z.array(z.string()).optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']).optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  hasTranscript: z.boolean(),
  transcriptConfidence: z.number().min(0).max(1).optional(),
  location: GeoLocation.optional(),
  sourceRef: z.string().optional(),
  sourceConnector: z.string().optional(),
});
export type CommunicationEntityAttributes = z.infer<
  typeof CommunicationEntityAttributes
>;

// ============================================================================
// Spacetime Integration Events
// ============================================================================

export const SpacetimeEventType = z.enum([
  'communication.call',
  'communication.meeting',
  'communication.message',
  'communication.email',
  'location.presence',
  'device.activity',
]);
export type SpacetimeEventType = z.infer<typeof SpacetimeEventType>;

export const SpacetimeSyncEvent = z.object({
  id: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  communicationEntityId: z.string().uuid().optional(),
  correlationId: z.string().uuid(),
  timestamp: z.string().datetime(),
  eventType: SpacetimeEventType,
  timeRange: TimeRange,
  location: GeoLocation.optional(),
  participantEntityIds: z.array(z.string().uuid()),
  attributes: z.record(z.string(), z.unknown()),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string(),
  provenance: Provenance,
});
export type SpacetimeSyncEvent = z.infer<typeof SpacetimeSyncEvent>;

// ============================================================================
// Provenance Integration Events
// ============================================================================

export const ProvenanceEventType = z.enum([
  'evidence.registered',
  'claim.created',
  'transform.recorded',
  'disclosure.prepared',
]);
export type ProvenanceEventType = z.infer<typeof ProvenanceEventType>;

export const ProvenanceRecord = z.object({
  id: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  transcriptId: z.string().uuid().optional(),
  eventType: ProvenanceEventType,
  timestamp: z.string().datetime(),
  sourceRef: z.string(),
  checksum: z.string(),
  transformStep: z.string().optional(),
  transformProvider: z.string().optional(),
  transformVersion: z.string().optional(),
  inputChecksum: z.string().optional(),
  outputChecksum: z.string().optional(),
  authorityId: z.string(),
  reasonForAccess: z.string(),
  policyLabels: z.array(z.string()).optional(),
  licenseId: z.string().optional(),
  caseId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ProvenanceRecord = z.infer<typeof ProvenanceRecord>;

// ============================================================================
// Policy Events (Retention, RTBF, Redaction)
// ============================================================================

export const RetentionAction = z.enum([
  'retain',
  'archive',
  'delete',
  'extend',
  'review',
]);
export type RetentionAction = z.infer<typeof RetentionAction>;

export const RetentionEvent = z.object({
  id: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  action: RetentionAction,
  timestamp: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  reason: z.string(),
  policyId: z.string().optional(),
  authorizedBy: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type RetentionEvent = z.infer<typeof RetentionEvent>;

export const RTBFRequest = z.object({
  id: z.string().uuid(),
  requesterId: z.string(),
  subjectIdentifiers: z.array(z.string()),
  scope: z.enum(['full', 'partial', 'anonymize']),
  mediaAssetIds: z.array(z.string().uuid()).optional(),
  reason: z.string(),
  requestedAt: z.string().datetime(),
  deadline: z.string().datetime().optional(),
});
export type RTBFRequest = z.infer<typeof RTBFRequest>;

export const RTBFResult = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'partial']),
  processedAt: z.string().datetime().optional(),
  affectedAssets: z.array(
    z.object({
      mediaAssetId: z.string().uuid(),
      action: z.enum(['deleted', 'anonymized', 'redacted', 'retained']),
      reason: z.string().optional(),
    })
  ),
  errors: z.array(z.string()).optional(),
});
export type RTBFResult = z.infer<typeof RTBFResult>;

export const RedactionRule = z.object({
  id: z.string(),
  name: z.string(),
  pattern: z.string(), // Regex pattern
  replacement: z.string().default('[REDACTED]'),
  fieldTypes: z.array(z.string()).optional(), // e.g., ['phone', 'email', 'ssn']
  enabled: z.boolean().default(true),
  priority: z.number().int().default(50),
});
export type RedactionRule = z.infer<typeof RedactionRule>;

export const RedactionEvent = z.object({
  id: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  transcriptId: z.string().uuid().optional(),
  timestamp: z.string().datetime(),
  rulesApplied: z.array(z.string()),
  redactionsCount: z.number().int(),
  fieldTypes: z.array(z.string()),
  originalChecksum: z.string(),
  redactedChecksum: z.string(),
  authorizedBy: z.string(),
});
export type RedactionEvent = z.infer<typeof RedactionEvent>;

// ============================================================================
// Event Bus Types
// ============================================================================

export interface EventHandler<T = unknown> {
  (event: T): Promise<void>;
}

export interface EventSubscription {
  unsubscribe(): void;
}

export interface EventBus {
  publish<T>(eventType: string, event: T): Promise<void>;
  subscribe<T>(eventType: string, handler: EventHandler<T>): EventSubscription;
  subscribeOnce<T>(eventType: string, handler: EventHandler<T>): EventSubscription;
}

// ============================================================================
// Webhook/Callback Types
// ============================================================================

export const WebhookEvent = z.object({
  id: z.string().uuid(),
  type: z.string(),
  timestamp: z.string().datetime(),
  webhookId: z.string(),
  payload: z.record(z.string(), z.unknown()),
  signature: z.string().optional(),
  attempt: z.number().int().default(1),
  maxAttempts: z.number().int().default(3),
});
export type WebhookEvent = z.infer<typeof WebhookEvent>;

export const WebhookConfig = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  events: z.array(PipelineEventType),
  secret: z.string().optional(),
  enabled: z.boolean().default(true),
  retryPolicy: z
    .object({
      maxAttempts: z.number().int().default(3),
      backoffMs: z.number().int().default(1000),
      backoffMultiplier: z.number().default(2),
    })
    .optional(),
  headers: z.record(z.string(), z.string()).optional(),
  tenantId: z.string().optional(),
});
export type WebhookConfig = z.infer<typeof WebhookConfig>;
