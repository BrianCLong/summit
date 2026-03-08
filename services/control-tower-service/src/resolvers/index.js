"use strict";
/**
 * Control Tower GraphQL Resolvers
 * @module @intelgraph/control-tower-service/resolvers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pubsub = exports.resolvers = void 0;
const graphql_subscriptions_1 = require("graphql-subscriptions");
// PubSub for subscriptions
const pubsub = new graphql_subscriptions_1.PubSub();
exports.pubsub = pubsub;
// Subscription event names
const EVENTS = {
    EVENT_CREATED: 'EVENT_CREATED',
    EVENT_UPDATED: 'EVENT_UPDATED',
    SITUATION_UPDATED: 'SITUATION_UPDATED',
    ALERT_TRIGGERED: 'ALERT_TRIGGERED',
    HEALTH_SCORE_UPDATED: 'HEALTH_SCORE_UPDATED',
    TEAM_PULSE_UPDATED: 'TEAM_PULSE_UPDATED',
    METRICS_UPDATED: 'METRICS_UPDATED',
};
exports.resolvers = {
    Query: {
        // Health Score
        healthScore: async (_, __, ctx) => {
            return ctx.healthScoreService.calculateHealthScore(getServiceContext(ctx));
        },
        // Key Metrics
        keyMetrics: async (_, args, ctx) => {
            // Return sample metrics - in production, fetch from metrics service
            return [
                {
                    id: 'open_tickets',
                    name: 'Open Tickets',
                    value: 127,
                    formattedValue: '127',
                    trend: TrendDirection.UP,
                    change: 23,
                    changePercent: 22.1,
                    status: ComponentStatus.WARNING,
                    sparkline: [100, 105, 98, 110, 115, 120, 127],
                },
                {
                    id: 'support_csat',
                    name: 'Support CSAT',
                    value: 94.2,
                    unit: '%',
                    formattedValue: '94.2%',
                    trend: TrendDirection.DOWN,
                    change: -1.2,
                    changePercent: -1.3,
                    status: ComponentStatus.HEALTHY,
                    sparkline: [95.4, 95.1, 94.8, 94.5, 94.3, 94.2, 94.2],
                },
                {
                    id: 'mrr_at_risk',
                    name: 'MRR at Risk',
                    value: 45200,
                    unit: '$',
                    formattedValue: '$45.2K',
                    trend: TrendDirection.STABLE,
                    change: 0,
                    status: ComponentStatus.WARNING,
                },
                {
                    id: 'deploys_today',
                    name: 'Deploys Today',
                    value: 12,
                    formattedValue: '12',
                    trend: TrendDirection.UP,
                    change: 4,
                    status: ComponentStatus.HEALTHY,
                },
                {
                    id: 'active_users',
                    name: 'Active Users',
                    value: 8234,
                    formattedValue: '8,234',
                    trend: TrendDirection.UP,
                    change: 12,
                    changePercent: 12,
                    status: ComponentStatus.HEALTHY,
                },
                {
                    id: 'nps',
                    name: 'NPS',
                    value: 67,
                    formattedValue: '67',
                    trend: TrendDirection.UP,
                    change: 4,
                    status: ComponentStatus.HEALTHY,
                },
            ];
        },
        // Team Pulse
        teamPulse: async (_, __, ctx) => {
            // Return sample team pulse - in production, fetch from user service
            return [
                {
                    user: { id: '1', name: 'Sarah Chen', email: 'sarah@example.com' },
                    status: { online: true, statusMessage: 'Working on Acme escalation', availableForAssignment: false, lastSeen: new Date() },
                    currentAssignment: 'Acme escalation',
                    activeSituationsCount: 2,
                    eventsAssignedToday: 5,
                },
                {
                    user: { id: '2', name: 'Mike Johnson', email: 'mike@example.com' },
                    status: { online: true, statusMessage: 'Working on Payment P1', availableForAssignment: false, lastSeen: new Date() },
                    currentAssignment: 'Payment P1',
                    activeSituationsCount: 1,
                    eventsAssignedToday: 3,
                },
                {
                    user: { id: '3', name: 'Alex Rivera', email: 'alex@example.com' },
                    status: { online: true, availableForAssignment: true, lastSeen: new Date() },
                    activeSituationsCount: 0,
                    eventsAssignedToday: 2,
                },
                {
                    user: { id: '4', name: 'Jordan Lee', email: 'jordan@example.com' },
                    status: { online: true, statusMessage: 'In meeting until 2pm', availableForAssignment: false, lastSeen: new Date() },
                    currentAssignment: 'Q4 planning',
                    activeSituationsCount: 1,
                    eventsAssignedToday: 1,
                },
            ];
        },
        // Situations
        activeSituations: async (_, args, ctx) => {
            return ctx.situationService.getActiveSituations(args.first ?? 10, args.after, args.priority, args.status, getServiceContext(ctx));
        },
        situation: async (_, args, ctx) => {
            return ctx.situationService.getSituation(args.id, getServiceContext(ctx));
        },
        // Events
        eventTimeline: async (_, args, ctx) => {
            return ctx.eventService.getEventTimeline(args.filter ?? {}, args.first ?? 50, args.after, getServiceContext(ctx));
        },
        event: async (_, args, ctx) => {
            return ctx.eventService.getEvent(args.id, getServiceContext(ctx));
        },
        correlatedEvents: async (_, args, ctx) => {
            return ctx.eventService.getCorrelatedEvents(args.eventId, args.depth ?? 1, getServiceContext(ctx));
        },
        eventContextGraph: async (_, args, ctx) => {
            return ctx.eventService.getEventContextGraph(args.eventId, args.depth ?? 2, args.entityTypes, getServiceContext(ctx));
        },
        // Alerts
        alerts: async (_, args, ctx) => {
            return ctx.alertService.getAlerts(args.first ?? 20, args.after, args.status, args.severity, getServiceContext(ctx));
        },
        alert: async (_, args, ctx) => {
            return ctx.alertService.getAlert(args.id, getServiceContext(ctx));
        },
        alertRules: async (_, args, ctx) => {
            return ctx.alertService.getAlertRules(args.enabled, getServiceContext(ctx));
        },
        alertRule: async (_, args, ctx) => {
            return ctx.alertService.getAlertRule(args.id, getServiceContext(ctx));
        },
        // Playbooks
        playbooks: async (_, args, ctx) => {
            // Return sample playbooks
            return [
                {
                    id: '1',
                    name: 'Payment Debug',
                    description: 'Automated diagnostic for payment integration issues',
                    steps: [
                        { order: 1, name: 'Check API Status', type: 'http_check', config: { url: 'https://status.stripe.com' } },
                        { order: 2, name: 'Verify Credentials', type: 'credential_check', config: {} },
                        { order: 3, name: 'Test Webhook', type: 'webhook_test', config: {} },
                    ],
                    estimatedTimeMinutes: 5,
                    successRate: 0.73,
                    executionCount: 42,
                },
                {
                    id: '2',
                    name: 'Customer Notification',
                    description: 'Send proactive notification to affected customers',
                    steps: [
                        { order: 1, name: 'Identify Recipients', type: 'query', config: {} },
                        { order: 2, name: 'Generate Message', type: 'template', config: {} },
                        { order: 3, name: 'Send Notifications', type: 'notify', config: {} },
                    ],
                    estimatedTimeMinutes: 2,
                    successRate: 0.98,
                    executionCount: 156,
                },
            ];
        },
        playbook: async (_, args, ctx) => {
            return null; // Implement actual lookup
        },
        // Search
        search: async (_, args, ctx) => {
            const { query, types, limit = 20 } = args.input;
            // Sample search results - in production, use search service
            return [
                {
                    type: 'event',
                    id: '1',
                    title: 'Payment webhook failures',
                    description: 'Stripe webhook endpoint returning 500 errors',
                    score: 0.95,
                    highlights: [`Payment <em>webhook</em> failures detected`],
                },
                {
                    type: 'situation',
                    id: '2',
                    title: 'P1: Payment Processing',
                    description: 'Critical payment processing issue affecting checkout',
                    score: 0.88,
                    highlights: [`P1: <em>Payment</em> Processing`],
                },
                {
                    type: 'customer',
                    id: '3',
                    title: 'Acme Corp',
                    description: 'Enterprise customer - $45K ARR',
                    score: 0.72,
                },
            ];
        },
        // Event Sources
        eventSources: async (_, __, ctx) => {
            return [
                { id: 'stripe', name: 'Stripe', type: 'payment', enabled: true, eventCount: 1234 },
                { id: 'zendesk', name: 'Zendesk', type: 'support', enabled: true, eventCount: 5678 },
                { id: 'salesforce', name: 'Salesforce', type: 'crm', enabled: true, eventCount: 890 },
                { id: 'datadog', name: 'Datadog', type: 'monitoring', enabled: true, eventCount: 2345 },
                { id: 'github', name: 'GitHub', type: 'development', enabled: false, eventCount: 0 },
            ];
        },
        // Event Categories
        eventCategories: async (_, args, ctx) => {
            return ctx.eventService.getEventCategories(args.timeRange ?? '24h', getServiceContext(ctx));
        },
        // Current User
        me: async (_, __, ctx) => {
            return ctx.user;
        },
    },
    Mutation: {
        // Event Mutations
        acknowledgeEvent: async (_, args, ctx) => {
            const result = await ctx.eventService.acknowledgeEvent(args.eventId, args.notes, getServiceContext(ctx));
            pubsub.publish(EVENTS.EVENT_UPDATED, { eventUpdated: result });
            return result;
        },
        updateEventStatus: async (_, args, ctx) => {
            const result = await ctx.eventService.updateEventStatus(args.eventId, args.status, args.notes, getServiceContext(ctx));
            pubsub.publish(EVENTS.EVENT_UPDATED, { eventUpdated: result });
            return result;
        },
        assignEvent: async (_, args, ctx) => {
            const result = await ctx.eventService.assignEvent(args.eventId, args.userId, getServiceContext(ctx));
            pubsub.publish(EVENTS.EVENT_UPDATED, { eventUpdated: result });
            return result;
        },
        // Situation Mutations
        createSituation: async (_, args, ctx) => {
            const result = await ctx.situationService.createSituation(args.input, getServiceContext(ctx));
            pubsub.publish(EVENTS.SITUATION_UPDATED, { situationUpdated: result });
            return result;
        },
        updateSituation: async (_, args, ctx) => {
            const result = await ctx.situationService.updateSituation(args.id, args.input, getServiceContext(ctx));
            pubsub.publish(EVENTS.SITUATION_UPDATED, { situationUpdated: result });
            return result;
        },
        linkEventToSituation: async (_, args, ctx) => {
            const result = await ctx.situationService.linkEventToSituation(args.eventId, args.situationId, getServiceContext(ctx));
            pubsub.publish(EVENTS.SITUATION_UPDATED, { situationUpdated: result });
            return result;
        },
        unlinkEventFromSituation: async (_, args, ctx) => {
            const result = await ctx.situationService.unlinkEventFromSituation(args.eventId, args.situationId, getServiceContext(ctx));
            pubsub.publish(EVENTS.SITUATION_UPDATED, { situationUpdated: result });
            return result;
        },
        resolveSituation: async (_, args, ctx) => {
            const result = await ctx.situationService.resolveSituation(args.id, args.resolution, getServiceContext(ctx));
            pubsub.publish(EVENTS.SITUATION_UPDATED, { situationUpdated: result });
            return result;
        },
        // Action Mutations
        performAction: async (_, args, ctx) => {
            // Implement action execution logic
            return {
                id: 'action-1',
                type: args.input.type,
                status: 'COMPLETED',
                performedBy: ctx.user,
                initiatedAt: new Date(),
                completedAt: new Date(),
                result: { success: true, message: 'Action completed successfully' },
            };
        },
        executePlaybook: async (_, args, ctx) => {
            // Implement playbook execution
            return {
                id: 'exec-1',
                playbook: { id: args.playbookId, name: 'Playbook', steps: [], executionCount: 0 },
                status: 'IN_PROGRESS',
                stepsCompleted: 0,
                totalSteps: 3,
                startedAt: new Date(),
            };
        },
        // Alert Mutations
        acknowledgeAlert: async (_, args, ctx) => {
            return ctx.alertService.acknowledgeAlert(args.alertId, getServiceContext(ctx));
        },
        snoozeAlert: async (_, args, ctx) => {
            return ctx.alertService.snoozeAlert(args.alertId, args.durationMinutes, getServiceContext(ctx));
        },
        dismissAlert: async (_, args, ctx) => {
            return ctx.alertService.dismissAlert(args.alertId, args.reason, getServiceContext(ctx));
        },
        // Alert Rule Mutations
        createAlertRule: async (_, args, ctx) => {
            return ctx.alertService.createAlertRule(args.input, getServiceContext(ctx));
        },
        updateAlertRule: async (_, args, ctx) => {
            return ctx.alertService.updateAlertRule(args.id, args.input, getServiceContext(ctx));
        },
        deleteAlertRule: async (_, args, ctx) => {
            return ctx.alertService.deleteAlertRule(args.id, getServiceContext(ctx));
        },
        // User Status
        updateMyStatus: async (_, args, ctx) => {
            // Update user status
            return {
                ...ctx.user,
                status: {
                    online: true,
                    statusMessage: args.status,
                    availableForAssignment: args.availableForAssignment ?? true,
                    lastSeen: new Date(),
                },
                currentActivity: args.currentActivity,
            };
        },
        // Comments
        addComment: async (_, args, ctx) => {
            return {
                id: 'comment-1',
                content: args.content,
                author: ctx.user,
                createdAt: new Date(),
            };
        },
    },
    Subscription: {
        eventCreated: {
            subscribe: (_, args) => {
                return pubsub.asyncIterator([EVENTS.EVENT_CREATED]);
            },
        },
        eventUpdated: {
            subscribe: (_, args) => {
                return pubsub.asyncIterator([EVENTS.EVENT_UPDATED]);
            },
        },
        situationUpdated: {
            subscribe: (_, args) => {
                return pubsub.asyncIterator([EVENTS.SITUATION_UPDATED]);
            },
        },
        alertTriggered: {
            subscribe: (_, args) => {
                return pubsub.asyncIterator([EVENTS.ALERT_TRIGGERED]);
            },
        },
        healthScoreUpdated: {
            subscribe: () => pubsub.asyncIterator([EVENTS.HEALTH_SCORE_UPDATED]),
        },
        teamPulseUpdated: {
            subscribe: () => pubsub.asyncIterator([EVENTS.TEAM_PULSE_UPDATED]),
        },
        metricsUpdated: {
            subscribe: (_, args) => {
                return pubsub.asyncIterator([EVENTS.METRICS_UPDATED]);
            },
        },
    },
    // Type resolvers for connections
    OperationalEvent: {
        situation: async (event, _, ctx) => {
            if (!event.situationId)
                return null;
            return ctx.situationService.getSituation(event.situationId, getServiceContext(ctx));
        },
    },
    Situation: {
        events: async (situation, args, ctx) => {
            return ctx.eventService.getEventTimeline({ situationId: situation.id, severity: args.severity, status: args.status }, args.first ?? 20, args.after, getServiceContext(ctx));
        },
    },
};
function getServiceContext(ctx) {
    return {
        user: ctx.user,
        tenantId: ctx.tenantId,
        requestId: ctx.requestId,
    };
}
