/**
 * Downstream Integration Contracts
 *
 * Defines the event schemas for downstream services:
 * - Graph Core: Entity and relationship creation events
 * - Spacetime: Temporal events for timeline tracking
 * - Case Service: Task and watchlist events
 * - Analytics: Metrics and aggregation events
 *
 * These contracts ensure clean separation between the Signal Bus
 * and downstream consumers. The Signal Bus emits events; downstream
 * services decide how to handle them.
 *
 * @module downstream
 */

import { z } from 'zod';

import type { Alert } from './alert.js';
import type { SignalEnvelope } from './signal-envelope.js';

/**
 * Event types for downstream routing
 */
export const DownstreamEventType = {
  // Graph events
  GRAPH_ENTITY_SUGGESTED: 'graph.entity.suggested',
  GRAPH_RELATIONSHIP_SUGGESTED: 'graph.relationship.suggested',
  GRAPH_ENRICHMENT: 'graph.enrichment',

  // Spacetime events
  SPACETIME_EVENT: 'spacetime.event',
  SPACETIME_TRACK: 'spacetime.track',

  // Case events
  CASE_TASK_SUGGESTED: 'case.task.suggested',
  CASE_WATCHLIST_HIT: 'case.watchlist.hit',
  CASE_ALERT_NOTIFICATION: 'case.alert.notification',

  // Analytics events
  ANALYTICS_METRIC: 'analytics.metric',
  ANALYTICS_AGGREGATION: 'analytics.aggregation',
} as const;

export type DownstreamEventTypeType =
  (typeof DownstreamEventType)[keyof typeof DownstreamEventType];

/**
 * Base downstream event envelope
 */
export const DownstreamEventBaseSchema = z.object({
  /** Unique event ID */
  eventId: z.string().uuid(),

  /** Event type for routing */
  eventType: z.string(),

  /** Tenant ID */
  tenantId: z.string().min(1),

  /** Timestamp when event was created */
  timestamp: z.number(),

  /** Source signal ID(s) that generated this event */
  sourceSignalIds: z.array(z.string().uuid()),

  /** Source alert ID if from an alert */
  sourceAlertId: z.string().uuid().optional(),

  /** Correlation ID for tracing */
  correlationId: z.string().optional(),

  /** Idempotency key for exactly-once processing */
  idempotencyKey: z.string(),

  /** Schema version */
  schemaVersion: z.string().default('1.0.0'),
});

export type DownstreamEventBase = z.infer<typeof DownstreamEventBaseSchema>;

// ============================================================================
// Graph Core Events
// ============================================================================

/**
 * Suggested entity for Graph Core to create
 */
export const GraphEntitySuggestedSchema = DownstreamEventBaseSchema.extend({
  eventType: z.literal(DownstreamEventType.GRAPH_ENTITY_SUGGESTED),

  payload: z.object({
    /** Suggested entity kind */
    entityKind: z.enum([
      'Person',
      'Org',
      'Location',
      'Event',
      'Document',
      'Indicator',
      'Device',
      'Asset',
    ]),

    /** Entity properties */
    properties: z.record(z.string(), z.unknown()),

    /** Confidence score for this suggestion */
    confidence: z.number().min(0).max(1),

    /** Extraction method */
    extractionMethod: z.enum(['rule', 'ml', 'pattern', 'manual']),

    /** Policy labels to apply */
    policyLabels: z.array(z.string()).default([]),

    /** Provenance information */
    provenance: z.object({
      signalType: z.string(),
      sourceId: z.string(),
      timestamp: z.number(),
    }),
  }),
});

export type GraphEntitySuggested = z.infer<typeof GraphEntitySuggestedSchema>;

/**
 * Suggested relationship for Graph Core to create
 */
export const GraphRelationshipSuggestedSchema = DownstreamEventBaseSchema.extend({
  eventType: z.literal(DownstreamEventType.GRAPH_RELATIONSHIP_SUGGESTED),

  payload: z.object({
    /** Relationship type */
    relationshipType: z.enum([
      'relatesTo',
      'locatedAt',
      'participatesIn',
      'derivedFrom',
      'mentions',
      'communicatedWith',
      'owns',
      'employs',
    ]),

    /** Source entity reference */
    sourceEntity: z.object({
      entityId: z.string().optional(),
      entityKind: z.string(),
      identifiers: z.record(z.string(), z.string()),
    }),

    /** Target entity reference */
    targetEntity: z.object({
      entityId: z.string().optional(),
      entityKind: z.string(),
      identifiers: z.record(z.string(), z.string()),
    }),

    /** Relationship properties */
    properties: z.record(z.string(), z.unknown()).optional(),

    /** Confidence score */
    confidence: z.number().min(0).max(1),

    /** Temporal bounds if known */
    temporal: z
      .object({
        start: z.number().optional(),
        end: z.number().optional(),
      })
      .optional(),
  }),
});

export type GraphRelationshipSuggested = z.infer<
  typeof GraphRelationshipSuggestedSchema
>;

/**
 * Enrichment data for existing graph entities
 */
export const GraphEnrichmentSchema = DownstreamEventBaseSchema.extend({
  eventType: z.literal(DownstreamEventType.GRAPH_ENRICHMENT),

  payload: z.object({
    /** Target entity ID */
    entityId: z.string(),

    /** Enrichment type */
    enrichmentType: z.enum([
      'geoip',
      'device_profile',
      'risk_score',
      'classification',
      'attributes',
    ]),

    /** Enrichment data */
    data: z.record(z.string(), z.unknown()),

    /** Confidence in enrichment accuracy */
    confidence: z.number().min(0).max(1),

    /** Enrichment source */
    source: z.string(),
  }),
});

export type GraphEnrichment = z.infer<typeof GraphEnrichmentSchema>;

// ============================================================================
// Spacetime Events
// ============================================================================

/**
 * Temporal event for Spacetime service
 */
export const SpacetimeEventSchema = DownstreamEventBaseSchema.extend({
  eventType: z.literal(DownstreamEventType.SPACETIME_EVENT),

  payload: z.object({
    /** Event type name */
    eventName: z.string(),

    /** Precise timestamp */
    occurredAt: z.number(),

    /** Duration in milliseconds (if applicable) */
    durationMs: z.number().optional(),

    /** Location if spatial */
    location: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
        altitude: z.number().optional(),
        accuracy: z.number().optional(),
        placeName: z.string().optional(),
      })
      .optional(),

    /** Associated entity IDs */
    entityIds: z.array(z.string()).default([]),

    /** Event properties */
    properties: z.record(z.string(), z.unknown()).optional(),

    /** Tags for filtering */
    tags: z.array(z.string()).default([]),
  }),
});

export type SpacetimeEvent = z.infer<typeof SpacetimeEventSchema>;

/**
 * Track update for Spacetime service (movement/trajectory)
 */
export const SpacetimeTrackSchema = DownstreamEventBaseSchema.extend({
  eventType: z.literal(DownstreamEventType.SPACETIME_TRACK),

  payload: z.object({
    /** Track identifier */
    trackId: z.string(),

    /** Associated entity ID */
    entityId: z.string().optional(),

    /** Track point */
    point: z.object({
      timestamp: z.number(),
      latitude: z.number(),
      longitude: z.number(),
      altitude: z.number().optional(),
      heading: z.number().optional(),
      speed: z.number().optional(),
      accuracy: z.number().optional(),
    }),

    /** Track metadata */
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type SpacetimeTrack = z.infer<typeof SpacetimeTrackSchema>;

// ============================================================================
// Case Service Events
// ============================================================================

/**
 * Suggested task for Case service
 */
export const CaseTaskSuggestedSchema = DownstreamEventBaseSchema.extend({
  eventType: z.literal(DownstreamEventType.CASE_TASK_SUGGESTED),

  payload: z.object({
    /** Task title */
    title: z.string(),

    /** Task description */
    description: z.string(),

    /** Priority */
    priority: z.enum(['low', 'medium', 'high', 'urgent']),

    /** Due date suggestion */
    suggestedDueDate: z.number().optional(),

    /** Associated case ID (if known) */
    caseId: z.string().optional(),

    /** Associated investigation ID */
    investigationId: z.string().optional(),

    /** Source alert ID */
    alertId: z.string().optional(),

    /** Entity IDs to link */
    linkedEntityIds: z.array(z.string()).default([]),

    /** Task type */
    taskType: z.enum([
      'review_alert',
      'investigate_entity',
      'verify_relationship',
      'follow_up',
      'escalate',
    ]),
  }),
});

export type CaseTaskSuggested = z.infer<typeof CaseTaskSuggestedSchema>;

/**
 * Watchlist hit notification
 */
export const CaseWatchlistHitSchema = DownstreamEventBaseSchema.extend({
  eventType: z.literal(DownstreamEventType.CASE_WATCHLIST_HIT),

  payload: z.object({
    /** Watchlist ID that was hit */
    watchlistId: z.string(),

    /** Watchlist name */
    watchlistName: z.string(),

    /** Matched entity/value */
    matchedValue: z.string(),

    /** Match type */
    matchType: z.enum(['exact', 'fuzzy', 'pattern', 'range']),

    /** Confidence score */
    confidence: z.number().min(0).max(1),

    /** Context about the hit */
    context: z.record(z.string(), z.unknown()).optional(),

    /** Suggested actions */
    suggestedActions: z.array(z.string()).default([]),
  }),
});

export type CaseWatchlistHit = z.infer<typeof CaseWatchlistHitSchema>;

/**
 * Alert notification for Case service
 */
export const CaseAlertNotificationSchema = DownstreamEventBaseSchema.extend({
  eventType: z.literal(DownstreamEventType.CASE_ALERT_NOTIFICATION),

  payload: z.object({
    /** Alert ID */
    alertId: z.string().uuid(),

    /** Alert severity */
    severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),

    /** Alert title */
    title: z.string(),

    /** Alert summary */
    summary: z.string(),

    /** Related case/investigation IDs */
    relatedCaseIds: z.array(z.string()).default([]),
    relatedInvestigationIds: z.array(z.string()).default([]),

    /** Notification targets (user IDs, group IDs) */
    targets: z.array(z.string()).default([]),

    /** Notification channel preferences */
    channels: z.array(z.enum(['in_app', 'email', 'sms', 'webhook'])).default(['in_app']),
  }),
});

export type CaseAlertNotification = z.infer<typeof CaseAlertNotificationSchema>;

// ============================================================================
// Analytics Events
// ============================================================================

/**
 * Metric event for Analytics service
 */
export const AnalyticsMetricSchema = DownstreamEventBaseSchema.extend({
  eventType: z.literal(DownstreamEventType.ANALYTICS_METRIC),

  payload: z.object({
    /** Metric name */
    metricName: z.string(),

    /** Metric value */
    value: z.number(),

    /** Metric unit */
    unit: z.string().optional(),

    /** Dimensions for aggregation */
    dimensions: z.record(z.string(), z.string()).default({}),

    /** Metric type */
    metricType: z.enum(['counter', 'gauge', 'histogram', 'summary']),

    /** Timestamp of measurement */
    measuredAt: z.number(),
  }),
});

export type AnalyticsMetric = z.infer<typeof AnalyticsMetricSchema>;

/**
 * Pre-aggregated data for Analytics service
 */
export const AnalyticsAggregationSchema = DownstreamEventBaseSchema.extend({
  eventType: z.literal(DownstreamEventType.ANALYTICS_AGGREGATION),

  payload: z.object({
    /** Aggregation name */
    aggregationName: z.string(),

    /** Window information */
    window: z.object({
      start: z.number(),
      end: z.number(),
      type: z.enum(['tumbling', 'sliding', 'session']),
    }),

    /** Aggregation type */
    aggregationType: z.enum(['count', 'sum', 'avg', 'min', 'max', 'percentile']),

    /** Aggregated value */
    value: z.number(),

    /** Group by dimensions */
    groupBy: z.record(z.string(), z.string()).default({}),

    /** Sample count */
    sampleCount: z.number(),
  }),
});

export type AnalyticsAggregation = z.infer<typeof AnalyticsAggregationSchema>;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Generate idempotency key from signal and event type
 */
function generateIdempotencyKey(
  signalId: string,
  eventType: string,
  discriminator?: string,
): string {
  const base = `${signalId}:${eventType}`;
  return discriminator ? `${base}:${discriminator}` : base;
}

/**
 * Create a graph entity suggestion from a signal
 */
export function createGraphEntitySuggestion(
  envelope: SignalEnvelope,
  suggestion: {
    entityKind: GraphEntitySuggested['payload']['entityKind'];
    properties: Record<string, unknown>;
    confidence: number;
    extractionMethod: GraphEntitySuggested['payload']['extractionMethod'];
  },
): GraphEntitySuggested {
  const now = Date.now();
  return {
    eventId: crypto.randomUUID(),
    eventType: DownstreamEventType.GRAPH_ENTITY_SUGGESTED,
    tenantId: envelope.metadata.tenantId,
    timestamp: now,
    sourceSignalIds: [envelope.metadata.signalId],
    correlationId: envelope.metadata.correlationId,
    idempotencyKey: generateIdempotencyKey(
      envelope.metadata.signalId,
      DownstreamEventType.GRAPH_ENTITY_SUGGESTED,
      JSON.stringify(suggestion.properties),
    ),
    schemaVersion: '1.0.0',
    payload: {
      entityKind: suggestion.entityKind,
      properties: suggestion.properties,
      confidence: suggestion.confidence,
      extractionMethod: suggestion.extractionMethod,
      policyLabels: envelope.metadata.policyLabels,
      provenance: {
        signalType: envelope.metadata.signalType,
        sourceId: envelope.metadata.source.sourceId,
        timestamp: envelope.metadata.timestamp,
      },
    },
  };
}

/**
 * Create a spacetime event from a signal
 */
export function createSpacetimeEvent(
  envelope: SignalEnvelope,
  event: {
    eventName: string;
    occurredAt?: number;
    durationMs?: number;
    entityIds?: string[];
    properties?: Record<string, unknown>;
    tags?: string[];
  },
): SpacetimeEvent {
  const now = Date.now();
  return {
    eventId: crypto.randomUUID(),
    eventType: DownstreamEventType.SPACETIME_EVENT,
    tenantId: envelope.metadata.tenantId,
    timestamp: now,
    sourceSignalIds: [envelope.metadata.signalId],
    correlationId: envelope.metadata.correlationId,
    idempotencyKey: generateIdempotencyKey(
      envelope.metadata.signalId,
      DownstreamEventType.SPACETIME_EVENT,
      event.eventName,
    ),
    schemaVersion: '1.0.0',
    payload: {
      eventName: event.eventName,
      occurredAt: event.occurredAt ?? envelope.metadata.timestamp,
      durationMs: event.durationMs,
      location: envelope.location
        ? {
            latitude: envelope.location.latitude,
            longitude: envelope.location.longitude,
            altitude: envelope.location.altitude,
            accuracy: envelope.location.accuracy,
          }
        : undefined,
      entityIds: event.entityIds ?? [],
      properties: event.properties,
      tags: event.tags ?? envelope.metadata.tags,
    },
  };
}

/**
 * Create a case task suggestion from an alert
 */
export function createCaseTaskFromAlert(
  alert: Alert,
  options?: {
    caseId?: string;
    investigationId?: string;
    linkedEntityIds?: string[];
  },
): CaseTaskSuggested {
  const now = Date.now();

  const priorityMap: Record<string, CaseTaskSuggested['payload']['priority']> = {
    info: 'low',
    low: 'low',
    medium: 'medium',
    high: 'high',
    critical: 'urgent',
  };

  return {
    eventId: crypto.randomUUID(),
    eventType: DownstreamEventType.CASE_TASK_SUGGESTED,
    tenantId: alert.tenantId,
    timestamp: now,
    sourceSignalIds: alert.signalReferences.map((ref) => ref.signalId),
    sourceAlertId: alert.alertId,
    correlationId: undefined,
    idempotencyKey: `${alert.alertId}:task`,
    schemaVersion: '1.0.0',
    payload: {
      title: `Review: ${alert.title}`,
      description: alert.description,
      priority: priorityMap[alert.severity] ?? 'medium',
      caseId: options?.caseId,
      investigationId: options?.investigationId,
      alertId: alert.alertId,
      linkedEntityIds: options?.linkedEntityIds ?? alert.context.relatedEntities,
      taskType: 'review_alert',
    },
  };
}

/**
 * Create alert notification for Case service
 */
export function createCaseAlertNotification(
  alert: Alert,
  targets: string[],
  channels: CaseAlertNotification['payload']['channels'] = ['in_app'],
): CaseAlertNotification {
  const now = Date.now();
  return {
    eventId: crypto.randomUUID(),
    eventType: DownstreamEventType.CASE_ALERT_NOTIFICATION,
    tenantId: alert.tenantId,
    timestamp: now,
    sourceSignalIds: alert.signalReferences.map((ref) => ref.signalId),
    sourceAlertId: alert.alertId,
    correlationId: undefined,
    idempotencyKey: `${alert.alertId}:notification:${now}`,
    schemaVersion: '1.0.0',
    payload: {
      alertId: alert.alertId,
      severity: alert.severity,
      title: alert.title,
      summary: alert.description.slice(0, 500),
      relatedCaseIds: alert.context.caseId ? [alert.context.caseId] : [],
      relatedInvestigationIds: alert.context.investigationId
        ? [alert.context.investigationId]
        : [],
      targets,
      channels,
    },
  };
}

/**
 * Union type for all downstream events
 */
export type DownstreamEvent =
  | GraphEntitySuggested
  | GraphRelationshipSuggested
  | GraphEnrichment
  | SpacetimeEvent
  | SpacetimeTrack
  | CaseTaskSuggested
  | CaseWatchlistHit
  | CaseAlertNotification
  | AnalyticsMetric
  | AnalyticsAggregation;

/**
 * Validate any downstream event
 */
export function validateDownstreamEvent(
  input: unknown,
): z.SafeParseReturnType<unknown, DownstreamEvent> {
  const base = DownstreamEventBaseSchema.safeParse(input);
  if (!base.success) {
    return base as z.SafeParseReturnType<unknown, DownstreamEvent>;
  }

  const eventType = (input as { eventType?: string }).eventType;

  switch (eventType) {
    case DownstreamEventType.GRAPH_ENTITY_SUGGESTED:
      return GraphEntitySuggestedSchema.safeParse(input);
    case DownstreamEventType.GRAPH_RELATIONSHIP_SUGGESTED:
      return GraphRelationshipSuggestedSchema.safeParse(input);
    case DownstreamEventType.GRAPH_ENRICHMENT:
      return GraphEnrichmentSchema.safeParse(input);
    case DownstreamEventType.SPACETIME_EVENT:
      return SpacetimeEventSchema.safeParse(input);
    case DownstreamEventType.SPACETIME_TRACK:
      return SpacetimeTrackSchema.safeParse(input);
    case DownstreamEventType.CASE_TASK_SUGGESTED:
      return CaseTaskSuggestedSchema.safeParse(input);
    case DownstreamEventType.CASE_WATCHLIST_HIT:
      return CaseWatchlistHitSchema.safeParse(input);
    case DownstreamEventType.CASE_ALERT_NOTIFICATION:
      return CaseAlertNotificationSchema.safeParse(input);
    case DownstreamEventType.ANALYTICS_METRIC:
      return AnalyticsMetricSchema.safeParse(input);
    case DownstreamEventType.ANALYTICS_AGGREGATION:
      return AnalyticsAggregationSchema.safeParse(input);
    default:
      return {
        success: false,
        error: new z.ZodError([
          {
            code: 'custom',
            path: ['eventType'],
            message: `Unknown event type: ${eventType}`,
          },
        ]),
      };
  }
}
