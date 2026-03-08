"use strict";
/**
 * Event Service - Handles operational events
 * @module @intelgraph/control-tower-service/services/EventService
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventService = void 0;
const uuid_1 = require("uuid");
class EventService {
    repository;
    graphService;
    aiService;
    constructor(repository, graphService, aiService) {
        this.repository = repository;
        this.graphService = graphService;
        this.aiService = aiService;
    }
    /**
     * Get event by ID with full details
     */
    async getEvent(id, context) {
        const event = await this.repository.findById(id);
        if (!event) {
            return null;
        }
        // Enrich with related entities
        event.relatedEntities = await this.graphService.getRelatedEntities(id, 1);
        // Get AI suggestions
        event.suggestions = await this.aiService.getSuggestions(event);
        return event;
    }
    /**
     * Get event timeline with filtering and pagination
     */
    async getEventTimeline(filter, first, after, context) {
        // Apply default time range if not specified
        const effectiveFilter = {
            ...filter,
            startTime: filter.startTime ?? new Date(Date.now() - 24 * 60 * 60 * 1000),
            endTime: filter.endTime ?? new Date(),
        };
        return this.repository.findMany(effectiveFilter, first, after);
    }
    /**
     * Get correlated events for pattern detection
     */
    async getCorrelatedEvents(eventId, depth = 1, context) {
        return this.repository.findCorrelated(eventId, depth);
    }
    /**
     * Get context graph for visualization
     */
    async getEventContextGraph(eventId, depth = 2, entityTypes, context) {
        return this.graphService.getContextGraph(eventId, depth, entityTypes);
    }
    /**
     * Acknowledge an event
     */
    async acknowledgeEvent(eventId, notes, context) {
        const event = await this.repository.findById(eventId);
        if (!event) {
            throw new Error(`Event not found: ${eventId}`);
        }
        if (event.status === EventStatus.RESOLVED || event.status === EventStatus.DISMISSED) {
            throw new Error(`Cannot acknowledge event in status: ${event.status}`);
        }
        return this.repository.update(eventId, {
            status: EventStatus.ACKNOWLEDGED,
            acknowledgedBy: context.user,
            acknowledgedAt: new Date(),
            updatedAt: new Date(),
        });
    }
    /**
     * Update event status
     */
    async updateEventStatus(eventId, status, notes, context) {
        const event = await this.repository.findById(eventId);
        if (!event) {
            throw new Error(`Event not found: ${eventId}`);
        }
        // Validate status transition
        this.validateStatusTransition(event.status, status);
        const updates = {
            status,
            updatedAt: new Date(),
        };
        // Auto-set acknowledgedBy if transitioning to acknowledged
        if (status === EventStatus.ACKNOWLEDGED && !event.acknowledgedBy) {
            updates.acknowledgedBy = context.user;
            updates.acknowledgedAt = new Date();
        }
        return this.repository.update(eventId, updates);
    }
    /**
     * Assign event to user
     */
    async assignEvent(eventId, userId, context) {
        const event = await this.repository.findById(eventId);
        if (!event) {
            throw new Error(`Event not found: ${eventId}`);
        }
        // In a real implementation, we'd look up the user
        const assignee = {
            id: userId,
            name: 'Assigned User',
            email: 'user@example.com',
        };
        return this.repository.update(eventId, {
            assignedTo: assignee,
            updatedAt: new Date(),
        });
    }
    /**
     * Ingest a new event from external source
     */
    async ingestEvent(source, payload, context) {
        // Transform external payload to internal format
        const event = this.transformExternalEvent(source, payload);
        // Create the event
        const created = await this.repository.create(event);
        // Trigger async enrichment
        this.enrichEventAsync(created.id).catch(console.error);
        return created;
    }
    /**
     * Get event count by category
     */
    async getEventCategories(timeRange = '24h', context) {
        const startTime = this.parseTimeRange(timeRange);
        // This would be a database aggregation in real implementation
        return [
            { category: 'PAYMENT', count: 12, criticalCount: 2 },
            { category: 'SUPPORT', count: 47, criticalCount: 1 },
            { category: 'SALES', count: 8, criticalCount: 0 },
            { category: 'PRODUCT', count: 15, criticalCount: 3 },
            { category: 'INFRASTRUCTURE', count: 5, criticalCount: 1 },
        ];
    }
    // ============================================================================
    // Private Methods
    // ============================================================================
    validateStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            [EventStatus.ACTIVE]: [EventStatus.ACKNOWLEDGED, EventStatus.INVESTIGATING, EventStatus.RESOLVED, EventStatus.DISMISSED],
            [EventStatus.ACKNOWLEDGED]: [EventStatus.INVESTIGATING, EventStatus.RESOLVED, EventStatus.DISMISSED],
            [EventStatus.INVESTIGATING]: [EventStatus.RESOLVED, EventStatus.DISMISSED],
            [EventStatus.RESOLVED]: [], // Terminal state
            [EventStatus.DISMISSED]: [], // Terminal state
        };
        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
        }
    }
    transformExternalEvent(source, payload) {
        // Source-specific transformation logic
        const transformers = {
            stripe: this.transformStripeEvent.bind(this),
            zendesk: this.transformZendeskEvent.bind(this),
            salesforce: this.transformSalesforceEvent.bind(this),
            datadog: this.transformDatadogEvent.bind(this),
        };
        const transformer = transformers[source.toLowerCase()];
        const transformed = transformer ? transformer(payload) : {};
        return {
            title: payload.title || 'Unknown Event',
            description: payload.description,
            severity: this.inferSeverity(payload),
            status: EventStatus.ACTIVE,
            category: this.inferCategory(source, payload),
            source,
            sourceId: payload.id,
            sourceUrl: payload.url,
            occurredAt: new Date(payload.occurred_at || Date.now()),
            receivedAt: new Date(),
            payload,
            metadata: this.extractMetadata(payload),
            relatedEntities: [],
            correlatedEvents: [],
            actions: [],
            suggestions: [],
            governance: this.createGovernanceInfo(source),
            ...transformed,
        };
    }
    transformStripeEvent(payload) {
        const type = payload.type;
        const data = payload.data;
        return {
            title: `Stripe: ${type?.replace(/_/g, ' ')}`,
            category: 'PAYMENT',
            metadata: {
                tags: ['payment', 'stripe'],
                properties: data,
                impactEstimate: {
                    revenueAtRisk: data?.amount || 0,
                },
            },
        };
    }
    transformZendeskEvent(payload) {
        return {
            title: `Support Ticket: ${payload.subject || 'No subject'}`,
            category: 'SUPPORT',
            metadata: {
                tags: ['support', 'zendesk'],
                properties: payload,
            },
        };
    }
    transformSalesforceEvent(payload) {
        return {
            title: `Sales: ${payload.type || 'Activity'}`,
            category: 'SALES',
            metadata: {
                tags: ['sales', 'salesforce'],
                properties: payload,
                impactEstimate: {
                    revenueAtRisk: payload.amount || 0,
                },
            },
        };
    }
    transformDatadogEvent(payload) {
        return {
            title: `Infrastructure: ${payload.title || 'Alert'}`,
            category: 'INFRASTRUCTURE',
            metadata: {
                tags: ['infrastructure', 'datadog'],
                properties: payload,
                errorDetails: {
                    code: payload.error_code,
                    message: payload.message,
                },
            },
        };
    }
    inferSeverity(payload) {
        const severity = payload.severity?.toUpperCase();
        const priority = payload.priority?.toUpperCase();
        if (severity === 'CRITICAL' || priority === 'P1' || priority === 'URGENT') {
            return Severity.CRITICAL;
        }
        if (severity === 'WARNING' || severity === 'HIGH' || priority === 'P2') {
            return Severity.WARNING;
        }
        if (severity === 'INFO' || severity === 'LOW') {
            return Severity.INFO;
        }
        if (severity === 'SUCCESS' || payload.status === 'success') {
            return Severity.SUCCESS;
        }
        return Severity.NORMAL;
    }
    inferCategory(source, payload) {
        const sourceCategories = {
            stripe: 'PAYMENT',
            zendesk: 'SUPPORT',
            salesforce: 'SALES',
            datadog: 'INFRASTRUCTURE',
            github: 'PRODUCT',
            pagerduty: 'INFRASTRUCTURE',
            churnzero: 'CUSTOMER_HEALTH',
        };
        return sourceCategories[source.toLowerCase()] || 'GENERAL';
    }
    extractMetadata(payload) {
        return {
            tags: payload.tags || [],
            properties: payload.metadata,
            impactEstimate: payload.impact,
            errorDetails: payload.error,
        };
    }
    createGovernanceInfo(source) {
        return {
            origin: source,
            sensitivity: 'INTERNAL',
            clearance: 'STANDARD',
            legalBasis: 'LEGITIMATE_INTEREST',
            retentionClass: 'OPERATIONAL_90D',
            policyLabels: ['ops-events-standard'],
            provenanceChain: [
                {
                    id: (0, uuid_1.v4)(),
                    timestamp: new Date(),
                    transformType: 'INGEST',
                    actorId: 'control-tower-service',
                    config: { source },
                },
            ],
        };
    }
    async enrichEventAsync(eventId) {
        // Async enrichment: correlations, AI suggestions, entity linking
        // This would be implemented with a job queue in production
    }
    parseTimeRange(timeRange) {
        const match = timeRange.match(/^(\d+)([hdwm])$/);
        if (!match) {
            return new Date(Date.now() - 24 * 60 * 60 * 1000);
        }
        const value = parseInt(match[1], 10);
        const unit = match[2];
        const multipliers = {
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
            w: 7 * 24 * 60 * 60 * 1000,
            m: 30 * 24 * 60 * 60 * 1000,
        };
        return new Date(Date.now() - value * multipliers[unit]);
    }
}
exports.EventService = EventService;
