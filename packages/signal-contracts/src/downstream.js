"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsAggregationSchema = exports.AnalyticsMetricSchema = exports.CaseAlertNotificationSchema = exports.CaseWatchlistHitSchema = exports.CaseTaskSuggestedSchema = exports.SpacetimeTrackSchema = exports.SpacetimeEventSchema = exports.GraphEnrichmentSchema = exports.GraphRelationshipSuggestedSchema = exports.GraphEntitySuggestedSchema = exports.DownstreamEventBaseSchema = exports.DownstreamEventType = void 0;
exports.createGraphEntitySuggestion = createGraphEntitySuggestion;
exports.createSpacetimeEvent = createSpacetimeEvent;
exports.createCaseTaskFromAlert = createCaseTaskFromAlert;
exports.createCaseAlertNotification = createCaseAlertNotification;
exports.validateDownstreamEvent = validateDownstreamEvent;
const zod_1 = require("zod");
/**
 * Event types for downstream routing
 */
exports.DownstreamEventType = {
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
};
/**
 * Base downstream event envelope
 */
exports.DownstreamEventBaseSchema = zod_1.z.object({
    /** Unique event ID */
    eventId: zod_1.z.string().uuid(),
    /** Event type for routing */
    eventType: zod_1.z.string(),
    /** Tenant ID */
    tenantId: zod_1.z.string().min(1),
    /** Timestamp when event was created */
    timestamp: zod_1.z.number(),
    /** Source signal ID(s) that generated this event */
    sourceSignalIds: zod_1.z.array(zod_1.z.string().uuid()),
    /** Source alert ID if from an alert */
    sourceAlertId: zod_1.z.string().uuid().optional(),
    /** Correlation ID for tracing */
    correlationId: zod_1.z.string().optional(),
    /** Idempotency key for exactly-once processing */
    idempotencyKey: zod_1.z.string(),
    /** Schema version */
    schemaVersion: zod_1.z.string().default('1.0.0'),
});
// ============================================================================
// Graph Core Events
// ============================================================================
/**
 * Suggested entity for Graph Core to create
 */
exports.GraphEntitySuggestedSchema = exports.DownstreamEventBaseSchema.extend({
    eventType: zod_1.z.literal(exports.DownstreamEventType.GRAPH_ENTITY_SUGGESTED),
    payload: zod_1.z.object({
        /** Suggested entity kind */
        entityKind: zod_1.z.enum([
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
        properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
        /** Confidence score for this suggestion */
        confidence: zod_1.z.number().min(0).max(1),
        /** Extraction method */
        extractionMethod: zod_1.z.enum(['rule', 'ml', 'pattern', 'manual']),
        /** Policy labels to apply */
        policyLabels: zod_1.z.array(zod_1.z.string()).default([]),
        /** Provenance information */
        provenance: zod_1.z.object({
            signalType: zod_1.z.string(),
            sourceId: zod_1.z.string(),
            timestamp: zod_1.z.number(),
        }),
    }),
});
/**
 * Suggested relationship for Graph Core to create
 */
exports.GraphRelationshipSuggestedSchema = exports.DownstreamEventBaseSchema.extend({
    eventType: zod_1.z.literal(exports.DownstreamEventType.GRAPH_RELATIONSHIP_SUGGESTED),
    payload: zod_1.z.object({
        /** Relationship type */
        relationshipType: zod_1.z.enum([
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
        sourceEntity: zod_1.z.object({
            entityId: zod_1.z.string().optional(),
            entityKind: zod_1.z.string(),
            identifiers: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
        }),
        /** Target entity reference */
        targetEntity: zod_1.z.object({
            entityId: zod_1.z.string().optional(),
            entityKind: zod_1.z.string(),
            identifiers: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
        }),
        /** Relationship properties */
        properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        /** Confidence score */
        confidence: zod_1.z.number().min(0).max(1),
        /** Temporal bounds if known */
        temporal: zod_1.z
            .object({
            start: zod_1.z.number().optional(),
            end: zod_1.z.number().optional(),
        })
            .optional(),
    }),
});
/**
 * Enrichment data for existing graph entities
 */
exports.GraphEnrichmentSchema = exports.DownstreamEventBaseSchema.extend({
    eventType: zod_1.z.literal(exports.DownstreamEventType.GRAPH_ENRICHMENT),
    payload: zod_1.z.object({
        /** Target entity ID */
        entityId: zod_1.z.string(),
        /** Enrichment type */
        enrichmentType: zod_1.z.enum([
            'geoip',
            'device_profile',
            'risk_score',
            'classification',
            'attributes',
        ]),
        /** Enrichment data */
        data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
        /** Confidence in enrichment accuracy */
        confidence: zod_1.z.number().min(0).max(1),
        /** Enrichment source */
        source: zod_1.z.string(),
    }),
});
// ============================================================================
// Spacetime Events
// ============================================================================
/**
 * Temporal event for Spacetime service
 */
exports.SpacetimeEventSchema = exports.DownstreamEventBaseSchema.extend({
    eventType: zod_1.z.literal(exports.DownstreamEventType.SPACETIME_EVENT),
    payload: zod_1.z.object({
        /** Event type name */
        eventName: zod_1.z.string(),
        /** Precise timestamp */
        occurredAt: zod_1.z.number(),
        /** Duration in milliseconds (if applicable) */
        durationMs: zod_1.z.number().optional(),
        /** Location if spatial */
        location: zod_1.z
            .object({
            latitude: zod_1.z.number(),
            longitude: zod_1.z.number(),
            altitude: zod_1.z.number().optional(),
            accuracy: zod_1.z.number().optional(),
            placeName: zod_1.z.string().optional(),
        })
            .optional(),
        /** Associated entity IDs */
        entityIds: zod_1.z.array(zod_1.z.string()).default([]),
        /** Event properties */
        properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        /** Tags for filtering */
        tags: zod_1.z.array(zod_1.z.string()).default([]),
    }),
});
/**
 * Track update for Spacetime service (movement/trajectory)
 */
exports.SpacetimeTrackSchema = exports.DownstreamEventBaseSchema.extend({
    eventType: zod_1.z.literal(exports.DownstreamEventType.SPACETIME_TRACK),
    payload: zod_1.z.object({
        /** Track identifier */
        trackId: zod_1.z.string(),
        /** Associated entity ID */
        entityId: zod_1.z.string().optional(),
        /** Track point */
        point: zod_1.z.object({
            timestamp: zod_1.z.number(),
            latitude: zod_1.z.number(),
            longitude: zod_1.z.number(),
            altitude: zod_1.z.number().optional(),
            heading: zod_1.z.number().optional(),
            speed: zod_1.z.number().optional(),
            accuracy: zod_1.z.number().optional(),
        }),
        /** Track metadata */
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    }),
});
// ============================================================================
// Case Service Events
// ============================================================================
/**
 * Suggested task for Case service
 */
exports.CaseTaskSuggestedSchema = exports.DownstreamEventBaseSchema.extend({
    eventType: zod_1.z.literal(exports.DownstreamEventType.CASE_TASK_SUGGESTED),
    payload: zod_1.z.object({
        /** Task title */
        title: zod_1.z.string(),
        /** Task description */
        description: zod_1.z.string(),
        /** Priority */
        priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']),
        /** Due date suggestion */
        suggestedDueDate: zod_1.z.number().optional(),
        /** Associated case ID (if known) */
        caseId: zod_1.z.string().optional(),
        /** Associated investigation ID */
        investigationId: zod_1.z.string().optional(),
        /** Source alert ID */
        alertId: zod_1.z.string().optional(),
        /** Entity IDs to link */
        linkedEntityIds: zod_1.z.array(zod_1.z.string()).default([]),
        /** Task type */
        taskType: zod_1.z.enum([
            'review_alert',
            'investigate_entity',
            'verify_relationship',
            'follow_up',
            'escalate',
        ]),
    }),
});
/**
 * Watchlist hit notification
 */
exports.CaseWatchlistHitSchema = exports.DownstreamEventBaseSchema.extend({
    eventType: zod_1.z.literal(exports.DownstreamEventType.CASE_WATCHLIST_HIT),
    payload: zod_1.z.object({
        /** Watchlist ID that was hit */
        watchlistId: zod_1.z.string(),
        /** Watchlist name */
        watchlistName: zod_1.z.string(),
        /** Matched entity/value */
        matchedValue: zod_1.z.string(),
        /** Match type */
        matchType: zod_1.z.enum(['exact', 'fuzzy', 'pattern', 'range']),
        /** Confidence score */
        confidence: zod_1.z.number().min(0).max(1),
        /** Context about the hit */
        context: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        /** Suggested actions */
        suggestedActions: zod_1.z.array(zod_1.z.string()).default([]),
    }),
});
/**
 * Alert notification for Case service
 */
exports.CaseAlertNotificationSchema = exports.DownstreamEventBaseSchema.extend({
    eventType: zod_1.z.literal(exports.DownstreamEventType.CASE_ALERT_NOTIFICATION),
    payload: zod_1.z.object({
        /** Alert ID */
        alertId: zod_1.z.string().uuid(),
        /** Alert severity */
        severity: zod_1.z.enum(['info', 'low', 'medium', 'high', 'critical']),
        /** Alert title */
        title: zod_1.z.string(),
        /** Alert summary */
        summary: zod_1.z.string(),
        /** Related case/investigation IDs */
        relatedCaseIds: zod_1.z.array(zod_1.z.string()).default([]),
        relatedInvestigationIds: zod_1.z.array(zod_1.z.string()).default([]),
        /** Notification targets (user IDs, group IDs) */
        targets: zod_1.z.array(zod_1.z.string()).default([]),
        /** Notification channel preferences */
        channels: zod_1.z.array(zod_1.z.enum(['in_app', 'email', 'sms', 'webhook'])).default(['in_app']),
    }),
});
// ============================================================================
// Analytics Events
// ============================================================================
/**
 * Metric event for Analytics service
 */
exports.AnalyticsMetricSchema = exports.DownstreamEventBaseSchema.extend({
    eventType: zod_1.z.literal(exports.DownstreamEventType.ANALYTICS_METRIC),
    payload: zod_1.z.object({
        /** Metric name */
        metricName: zod_1.z.string(),
        /** Metric value */
        value: zod_1.z.number(),
        /** Metric unit */
        unit: zod_1.z.string().optional(),
        /** Dimensions for aggregation */
        dimensions: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
        /** Metric type */
        metricType: zod_1.z.enum(['counter', 'gauge', 'histogram', 'summary']),
        /** Timestamp of measurement */
        measuredAt: zod_1.z.number(),
    }),
});
/**
 * Pre-aggregated data for Analytics service
 */
exports.AnalyticsAggregationSchema = exports.DownstreamEventBaseSchema.extend({
    eventType: zod_1.z.literal(exports.DownstreamEventType.ANALYTICS_AGGREGATION),
    payload: zod_1.z.object({
        /** Aggregation name */
        aggregationName: zod_1.z.string(),
        /** Window information */
        window: zod_1.z.object({
            start: zod_1.z.number(),
            end: zod_1.z.number(),
            type: zod_1.z.enum(['tumbling', 'sliding', 'session']),
        }),
        /** Aggregation type */
        aggregationType: zod_1.z.enum(['count', 'sum', 'avg', 'min', 'max', 'percentile']),
        /** Aggregated value */
        value: zod_1.z.number(),
        /** Group by dimensions */
        groupBy: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
        /** Sample count */
        sampleCount: zod_1.z.number(),
    }),
});
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Generate idempotency key from signal and event type
 */
function generateIdempotencyKey(signalId, eventType, discriminator) {
    const base = `${signalId}:${eventType}`;
    return discriminator ? `${base}:${discriminator}` : base;
}
/**
 * Create a graph entity suggestion from a signal
 */
function createGraphEntitySuggestion(envelope, suggestion) {
    const now = Date.now();
    return {
        eventId: crypto.randomUUID(),
        eventType: exports.DownstreamEventType.GRAPH_ENTITY_SUGGESTED,
        tenantId: envelope.metadata.tenantId,
        timestamp: now,
        sourceSignalIds: [envelope.metadata.signalId],
        correlationId: envelope.metadata.correlationId,
        idempotencyKey: generateIdempotencyKey(envelope.metadata.signalId, exports.DownstreamEventType.GRAPH_ENTITY_SUGGESTED, JSON.stringify(suggestion.properties)),
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
function createSpacetimeEvent(envelope, event) {
    const now = Date.now();
    return {
        eventId: crypto.randomUUID(),
        eventType: exports.DownstreamEventType.SPACETIME_EVENT,
        tenantId: envelope.metadata.tenantId,
        timestamp: now,
        sourceSignalIds: [envelope.metadata.signalId],
        correlationId: envelope.metadata.correlationId,
        idempotencyKey: generateIdempotencyKey(envelope.metadata.signalId, exports.DownstreamEventType.SPACETIME_EVENT, event.eventName),
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
function createCaseTaskFromAlert(alert, options) {
    const now = Date.now();
    const priorityMap = {
        info: 'low',
        low: 'low',
        medium: 'medium',
        high: 'high',
        critical: 'urgent',
    };
    return {
        eventId: crypto.randomUUID(),
        eventType: exports.DownstreamEventType.CASE_TASK_SUGGESTED,
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
function createCaseAlertNotification(alert, targets, channels = ['in_app']) {
    const now = Date.now();
    return {
        eventId: crypto.randomUUID(),
        eventType: exports.DownstreamEventType.CASE_ALERT_NOTIFICATION,
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
 * Validate any downstream event
 */
function validateDownstreamEvent(input) {
    const base = exports.DownstreamEventBaseSchema.safeParse(input);
    if (!base.success) {
        return base;
    }
    const eventType = input.eventType;
    switch (eventType) {
        case exports.DownstreamEventType.GRAPH_ENTITY_SUGGESTED:
            return exports.GraphEntitySuggestedSchema.safeParse(input);
        case exports.DownstreamEventType.GRAPH_RELATIONSHIP_SUGGESTED:
            return exports.GraphRelationshipSuggestedSchema.safeParse(input);
        case exports.DownstreamEventType.GRAPH_ENRICHMENT:
            return exports.GraphEnrichmentSchema.safeParse(input);
        case exports.DownstreamEventType.SPACETIME_EVENT:
            return exports.SpacetimeEventSchema.safeParse(input);
        case exports.DownstreamEventType.SPACETIME_TRACK:
            return exports.SpacetimeTrackSchema.safeParse(input);
        case exports.DownstreamEventType.CASE_TASK_SUGGESTED:
            return exports.CaseTaskSuggestedSchema.safeParse(input);
        case exports.DownstreamEventType.CASE_WATCHLIST_HIT:
            return exports.CaseWatchlistHitSchema.safeParse(input);
        case exports.DownstreamEventType.CASE_ALERT_NOTIFICATION:
            return exports.CaseAlertNotificationSchema.safeParse(input);
        case exports.DownstreamEventType.ANALYTICS_METRIC:
            return exports.AnalyticsMetricSchema.safeParse(input);
        case exports.DownstreamEventType.ANALYTICS_AGGREGATION:
            return exports.AnalyticsAggregationSchema.safeParse(input);
        default:
            return {
                success: false,
                error: new zod_1.z.ZodError([
                    {
                        code: 'custom',
                        path: ['eventType'],
                        message: `Unknown event type: ${eventType}`,
                    },
                ]),
            };
    }
}
