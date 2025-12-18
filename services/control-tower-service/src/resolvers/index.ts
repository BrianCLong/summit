/**
 * Control Tower GraphQL Resolvers
 * @module @intelgraph/control-tower-service/resolvers
 */

import { PubSub } from 'graphql-subscriptions';
import type { EventService, SituationService, HealthScoreService, AlertService } from '../services/index.js';
import type {
  OperationalEvent,
  Situation,
  HealthScore,
  Alert,
  AlertRule,
  EventFilterInput,
  CreateSituationInput,
  UpdateSituationInput,
  PerformActionInput,
  CreateAlertRuleInput,
  UpdateAlertRuleInput,
  SearchInput,
  ServiceContext,
  KeyMetric,
  TeamPulse,
  EventStatus,
  Priority,
  SituationStatus,
  Severity,
  AlertStatus,
  TrendDirection,
  ComponentStatus,
} from '../types/index.js';

// PubSub for subscriptions
const pubsub = new PubSub();

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

export interface ResolverContext {
  eventService: EventService;
  situationService: SituationService;
  healthScoreService: HealthScoreService;
  alertService: AlertService;
  user: ServiceContext['user'];
  tenantId: string;
  requestId: string;
}

export const resolvers = {
  Query: {
    // Health Score
    healthScore: async (_: unknown, __: unknown, ctx: ResolverContext): Promise<HealthScore> => {
      return ctx.healthScoreService.calculateHealthScore(getServiceContext(ctx));
    },

    // Key Metrics
    keyMetrics: async (_: unknown, args: { metricIds?: string[] }, ctx: ResolverContext): Promise<KeyMetric[]> => {
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
    teamPulse: async (_: unknown, __: unknown, ctx: ResolverContext): Promise<TeamPulse[]> => {
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
    activeSituations: async (
      _: unknown,
      args: { first?: number; after?: string; priority?: Priority[]; status?: SituationStatus[] },
      ctx: ResolverContext,
    ) => {
      return ctx.situationService.getActiveSituations(
        args.first ?? 10,
        args.after,
        args.priority,
        args.status,
        getServiceContext(ctx),
      );
    },

    situation: async (_: unknown, args: { id: string }, ctx: ResolverContext): Promise<Situation | null> => {
      return ctx.situationService.getSituation(args.id, getServiceContext(ctx));
    },

    // Events
    eventTimeline: async (
      _: unknown,
      args: { first?: number; after?: string; filter?: EventFilterInput },
      ctx: ResolverContext,
    ) => {
      return ctx.eventService.getEventTimeline(
        args.filter ?? {},
        args.first ?? 50,
        args.after,
        getServiceContext(ctx),
      );
    },

    event: async (_: unknown, args: { id: string }, ctx: ResolverContext): Promise<OperationalEvent | null> => {
      return ctx.eventService.getEvent(args.id, getServiceContext(ctx));
    },

    correlatedEvents: async (
      _: unknown,
      args: { eventId: string; depth?: number },
      ctx: ResolverContext,
    ): Promise<OperationalEvent[]> => {
      return ctx.eventService.getCorrelatedEvents(args.eventId, args.depth ?? 1, getServiceContext(ctx));
    },

    eventContextGraph: async (
      _: unknown,
      args: { eventId: string; depth?: number; entityTypes?: string[] },
      ctx: ResolverContext,
    ) => {
      return ctx.eventService.getEventContextGraph(
        args.eventId,
        args.depth ?? 2,
        args.entityTypes,
        getServiceContext(ctx),
      );
    },

    // Alerts
    alerts: async (
      _: unknown,
      args: { first?: number; after?: string; status?: AlertStatus[]; severity?: Severity[] },
      ctx: ResolverContext,
    ) => {
      return ctx.alertService.getAlerts(
        args.first ?? 20,
        args.after,
        args.status,
        args.severity,
        getServiceContext(ctx),
      );
    },

    alert: async (_: unknown, args: { id: string }, ctx: ResolverContext): Promise<Alert | null> => {
      return ctx.alertService.getAlert(args.id, getServiceContext(ctx));
    },

    alertRules: async (_: unknown, args: { enabled?: boolean }, ctx: ResolverContext): Promise<AlertRule[]> => {
      return ctx.alertService.getAlertRules(args.enabled, getServiceContext(ctx));
    },

    alertRule: async (_: unknown, args: { id: string }, ctx: ResolverContext): Promise<AlertRule | null> => {
      return ctx.alertService.getAlertRule(args.id, getServiceContext(ctx));
    },

    // Playbooks
    playbooks: async (_: unknown, args: { category?: string }, ctx: ResolverContext) => {
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

    playbook: async (_: unknown, args: { id: string }, ctx: ResolverContext) => {
      return null; // Implement actual lookup
    },

    // Search
    search: async (_: unknown, args: { input: SearchInput }, ctx: ResolverContext) => {
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
    eventSources: async (_: unknown, __: unknown, ctx: ResolverContext) => {
      return [
        { id: 'stripe', name: 'Stripe', type: 'payment', enabled: true, eventCount: 1234 },
        { id: 'zendesk', name: 'Zendesk', type: 'support', enabled: true, eventCount: 5678 },
        { id: 'salesforce', name: 'Salesforce', type: 'crm', enabled: true, eventCount: 890 },
        { id: 'datadog', name: 'Datadog', type: 'monitoring', enabled: true, eventCount: 2345 },
        { id: 'github', name: 'GitHub', type: 'development', enabled: false, eventCount: 0 },
      ];
    },

    // Event Categories
    eventCategories: async (_: unknown, args: { timeRange?: string }, ctx: ResolverContext) => {
      return ctx.eventService.getEventCategories(args.timeRange ?? '24h', getServiceContext(ctx));
    },

    // Current User
    me: async (_: unknown, __: unknown, ctx: ResolverContext) => {
      return ctx.user;
    },
  },

  Mutation: {
    // Event Mutations
    acknowledgeEvent: async (
      _: unknown,
      args: { eventId: string; notes?: string },
      ctx: ResolverContext,
    ): Promise<OperationalEvent> => {
      const result = await ctx.eventService.acknowledgeEvent(args.eventId, args.notes, getServiceContext(ctx));
      pubsub.publish(EVENTS.EVENT_UPDATED, { eventUpdated: result });
      return result;
    },

    updateEventStatus: async (
      _: unknown,
      args: { eventId: string; status: EventStatus; notes?: string },
      ctx: ResolverContext,
    ): Promise<OperationalEvent> => {
      const result = await ctx.eventService.updateEventStatus(
        args.eventId,
        args.status,
        args.notes,
        getServiceContext(ctx),
      );
      pubsub.publish(EVENTS.EVENT_UPDATED, { eventUpdated: result });
      return result;
    },

    assignEvent: async (
      _: unknown,
      args: { eventId: string; userId: string },
      ctx: ResolverContext,
    ): Promise<OperationalEvent> => {
      const result = await ctx.eventService.assignEvent(args.eventId, args.userId, getServiceContext(ctx));
      pubsub.publish(EVENTS.EVENT_UPDATED, { eventUpdated: result });
      return result;
    },

    // Situation Mutations
    createSituation: async (
      _: unknown,
      args: { input: CreateSituationInput },
      ctx: ResolverContext,
    ): Promise<Situation> => {
      const result = await ctx.situationService.createSituation(args.input, getServiceContext(ctx));
      pubsub.publish(EVENTS.SITUATION_UPDATED, { situationUpdated: result });
      return result;
    },

    updateSituation: async (
      _: unknown,
      args: { id: string; input: UpdateSituationInput },
      ctx: ResolverContext,
    ): Promise<Situation> => {
      const result = await ctx.situationService.updateSituation(args.id, args.input, getServiceContext(ctx));
      pubsub.publish(EVENTS.SITUATION_UPDATED, { situationUpdated: result });
      return result;
    },

    linkEventToSituation: async (
      _: unknown,
      args: { eventId: string; situationId: string },
      ctx: ResolverContext,
    ): Promise<Situation> => {
      const result = await ctx.situationService.linkEventToSituation(
        args.eventId,
        args.situationId,
        getServiceContext(ctx),
      );
      pubsub.publish(EVENTS.SITUATION_UPDATED, { situationUpdated: result });
      return result;
    },

    unlinkEventFromSituation: async (
      _: unknown,
      args: { eventId: string; situationId: string },
      ctx: ResolverContext,
    ): Promise<Situation> => {
      const result = await ctx.situationService.unlinkEventFromSituation(
        args.eventId,
        args.situationId,
        getServiceContext(ctx),
      );
      pubsub.publish(EVENTS.SITUATION_UPDATED, { situationUpdated: result });
      return result;
    },

    resolveSituation: async (
      _: unknown,
      args: { id: string; resolution: string },
      ctx: ResolverContext,
    ): Promise<Situation> => {
      const result = await ctx.situationService.resolveSituation(args.id, args.resolution, getServiceContext(ctx));
      pubsub.publish(EVENTS.SITUATION_UPDATED, { situationUpdated: result });
      return result;
    },

    // Action Mutations
    performAction: async (
      _: unknown,
      args: { input: PerformActionInput },
      ctx: ResolverContext,
    ) => {
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

    executePlaybook: async (
      _: unknown,
      args: { playbookId: string; targetId: string; targetType: string },
      ctx: ResolverContext,
    ) => {
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
    acknowledgeAlert: async (
      _: unknown,
      args: { alertId: string },
      ctx: ResolverContext,
    ): Promise<Alert> => {
      return ctx.alertService.acknowledgeAlert(args.alertId, getServiceContext(ctx));
    },

    snoozeAlert: async (
      _: unknown,
      args: { alertId: string; durationMinutes: number },
      ctx: ResolverContext,
    ): Promise<Alert> => {
      return ctx.alertService.snoozeAlert(args.alertId, args.durationMinutes, getServiceContext(ctx));
    },

    dismissAlert: async (
      _: unknown,
      args: { alertId: string; reason?: string },
      ctx: ResolverContext,
    ): Promise<Alert> => {
      return ctx.alertService.dismissAlert(args.alertId, args.reason, getServiceContext(ctx));
    },

    // Alert Rule Mutations
    createAlertRule: async (
      _: unknown,
      args: { input: CreateAlertRuleInput },
      ctx: ResolverContext,
    ): Promise<AlertRule> => {
      return ctx.alertService.createAlertRule(args.input, getServiceContext(ctx));
    },

    updateAlertRule: async (
      _: unknown,
      args: { id: string; input: UpdateAlertRuleInput },
      ctx: ResolverContext,
    ): Promise<AlertRule> => {
      return ctx.alertService.updateAlertRule(args.id, args.input, getServiceContext(ctx));
    },

    deleteAlertRule: async (
      _: unknown,
      args: { id: string },
      ctx: ResolverContext,
    ): Promise<boolean> => {
      return ctx.alertService.deleteAlertRule(args.id, getServiceContext(ctx));
    },

    // User Status
    updateMyStatus: async (
      _: unknown,
      args: { status?: string; currentActivity?: string; availableForAssignment?: boolean },
      ctx: ResolverContext,
    ) => {
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
    addComment: async (
      _: unknown,
      args: { targetId: string; targetType: string; content: string },
      ctx: ResolverContext,
    ) => {
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
      subscribe: (_: unknown, args: { filter?: EventFilterInput }) => {
        return pubsub.asyncIterator([EVENTS.EVENT_CREATED]);
      },
    },

    eventUpdated: {
      subscribe: (_: unknown, args: { eventId?: string }) => {
        return pubsub.asyncIterator([EVENTS.EVENT_UPDATED]);
      },
    },

    situationUpdated: {
      subscribe: (_: unknown, args: { situationId?: string }) => {
        return pubsub.asyncIterator([EVENTS.SITUATION_UPDATED]);
      },
    },

    alertTriggered: {
      subscribe: (_: unknown, args: { severity?: Severity[] }) => {
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
      subscribe: (_: unknown, args: { metricIds?: string[] }) => {
        return pubsub.asyncIterator([EVENTS.METRICS_UPDATED]);
      },
    },
  },

  // Type resolvers for connections
  OperationalEvent: {
    situation: async (event: OperationalEvent, _: unknown, ctx: ResolverContext) => {
      if (!event.situationId) return null;
      return ctx.situationService.getSituation(event.situationId, getServiceContext(ctx));
    },
  },

  Situation: {
    events: async (
      situation: Situation,
      args: { first?: number; after?: string; severity?: Severity[]; status?: EventStatus[] },
      ctx: ResolverContext,
    ) => {
      return ctx.eventService.getEventTimeline(
        { situationId: situation.id, severity: args.severity, status: args.status },
        args.first ?? 20,
        args.after,
        getServiceContext(ctx),
      );
    },
  },
};

function getServiceContext(ctx: ResolverContext): ServiceContext {
  return {
    user: ctx.user,
    tenantId: ctx.tenantId,
    requestId: ctx.requestId,
  };
}

export { pubsub };
