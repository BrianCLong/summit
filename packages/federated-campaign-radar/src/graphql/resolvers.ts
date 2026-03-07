/**
 * GraphQL Resolvers for Federated Campaign Radar
 */

import { PubSub, withFilter } from "graphql-subscriptions";
import { GraphQLScalarType, Kind } from "graphql";
import {
  CampaignSignal,
  CampaignCluster,
  FederatedAlert,
  SignalType,
  PrivacyLevel,
  ThreatLevel,
  ClusterStatus,
  AlertSeverity,
  AlertStatus,
  ParticipantStatus,
} from "../core/types";
import { SignalNormalizer } from "../core/SignalNormalizer";
import { FederationService } from "../federation/FederationService";
import { ClusteringEngine } from "../clustering/ClusteringEngine";
import { AlertEngine } from "../alerts/AlertEngine";

// PubSub instance for subscriptions
const pubsub = new PubSub();

// Subscription event names
const EVENTS = {
  ALERT_CREATED: "ALERT_CREATED",
  CLUSTER_UPDATED: "CLUSTER_UPDATED",
  CROSS_TENANT_SPIKE: "CROSS_TENANT_SPIKE",
  FEDERATION_EVENT: "FEDERATION_EVENT",
};

/**
 * Resolver context type
 */
export interface ResolverContext {
  signalNormalizer: SignalNormalizer;
  federationService: FederationService;
  clusteringEngine: ClusteringEngine;
  alertEngine: AlertEngine;
  participantId: string;
  organizationId: string;
}

// Custom scalars
const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "DateTime custom scalar type",
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  },
  parseValue(value: unknown): Date {
    if (typeof value === "string" || typeof value === "number") {
      return new Date(value);
    }
    throw new Error("Invalid DateTime value");
  },
  parseLiteral(ast): Date | null {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
      return new Date(ast.kind === Kind.INT ? ast.value : ast.value);
    }
    return null;
  },
});

const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "JSON custom scalar type",
  serialize(value: unknown): unknown {
    return value;
  },
  parseValue(value: unknown): unknown {
    return value;
  },
  parseLiteral(ast): unknown {
    if (ast.kind === Kind.STRING) {
      try {
        return JSON.parse(ast.value);
      } catch {
        return ast.value;
      }
    }
    return null;
  },
});

export const resolvers = {
  // Scalars
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  // ============================================================================
  // Query Resolvers
  // ============================================================================

  Query: {
    getClusters: async (
      _parent: unknown,
      args: {
        filters?: {
          minThreatLevel?: ThreatLevel;
          status?: ClusterStatus[];
          signalTypes?: SignalType[];
          minSignalCount?: number;
          minCrossTenantConfidence?: number;
          temporalRange?: { start: Date; end: Date };
        };
        limit?: number;
        offset?: number;
      },
      context: ResolverContext
    ): Promise<CampaignCluster[]> => {
      let clusters = context.clusteringEngine.getActiveClusters(args.filters?.minThreatLevel);

      // Apply filters
      if (args.filters) {
        if (args.filters.status) {
          clusters = clusters.filter((c) => args.filters!.status!.includes(c.status));
        }
        if (args.filters.minSignalCount) {
          clusters = clusters.filter((c) => c.signalCount >= args.filters!.minSignalCount!);
        }
        if (args.filters.minCrossTenantConfidence) {
          clusters = clusters.filter(
            (c) => c.crossTenantConfidence >= args.filters!.minCrossTenantConfidence!
          );
        }
        if (args.filters.temporalRange) {
          const { start, end } = args.filters.temporalRange;
          clusters = clusters.filter(
            (c) => c.temporalRange.end >= start && c.temporalRange.start <= end
          );
        }
      }

      // Apply pagination
      const offset = args.offset || 0;
      const limit = args.limit || 50;
      return clusters.slice(offset, offset + limit);
    },

    getCluster: async (
      _parent: unknown,
      args: { clusterId: string },
      context: ResolverContext
    ): Promise<CampaignCluster | undefined> => {
      return context.clusteringEngine.getCluster(args.clusterId);
    },

    getClusterHistory: async (
      _parent: unknown,
      args: { clusterId: string },
      context: ResolverContext
    ): Promise<CampaignCluster[]> => {
      return context.clusteringEngine.getClusterHistory(args.clusterId);
    },

    getAlerts: async (
      _parent: unknown,
      args: {
        filters?: {
          severity?: AlertSeverity[];
          type?: string[];
          status?: AlertStatus[];
          crossTenantOnly?: boolean;
        };
        limit?: number;
        offset?: number;
      },
      context: ResolverContext
    ): Promise<FederatedAlert[]> => {
      let alerts = context.alertEngine.getActiveAlerts();

      // Apply filters
      if (args.filters) {
        if (args.filters.severity) {
          alerts = alerts.filter((a) => args.filters!.severity!.includes(a.severity));
        }
        if (args.filters.status) {
          alerts = alerts.filter((a) => args.filters!.status!.includes(a.status));
        }
        if (args.filters.crossTenantOnly) {
          alerts = alerts.filter((a) => a.crossTenantSignal);
        }
      }

      // Apply pagination
      const offset = args.offset || 0;
      const limit = args.limit || 50;
      return alerts.slice(offset, offset + limit);
    },

    getAlert: async (
      _parent: unknown,
      args: { alertId: string },
      context: ResolverContext
    ): Promise<FederatedAlert | undefined> => {
      return context.alertEngine.getAlert(args.alertId);
    },

    getAggregatedStats: async (
      _parent: unknown,
      args: { signalType: SignalType; windowHours?: number },
      context: ResolverContext
    ) => {
      return context.federationService.queryAggregatedStats(
        args.signalType,
        args.windowHours || 24
      );
    },

    getCrossTenantOverlap: async (_parent: unknown, _args: unknown, context: ResolverContext) => {
      return context.clusteringEngine.computeCrossTenantOverlap();
    },

    getPrivacyBudget: async (_parent: unknown, _args: unknown, context: ResolverContext) => {
      return context.federationService.getPrivacyBudgetStatus();
    },

    getParticipants: async (
      _parent: unknown,
      args: { status?: ParticipantStatus },
      _context: ResolverContext
    ) => {
      // Would fetch from federation service
      return [];
    },

    getSharingAgreements: async (_parent: unknown, _args: unknown, _context: ResolverContext) => {
      // Would fetch from federation service
      return [];
    },

    getAlertMetrics: async (_parent: unknown, _args: unknown, context: ResolverContext) => {
      return context.alertEngine.getMetrics();
    },

    getEvaluationMetrics: async (_parent: unknown, _args: unknown, _context: ResolverContext) => {
      // Would compute from historical data
      return {
        timeToDetect: {
          mean: 300000, // 5 minutes in ms
          median: 240000,
          p95: 600000,
          p99: 900000,
        },
        falseAttributionRate: 0.05,
        truePositiveRate: 0.92,
        precision: 0.88,
        recall: 0.91,
        f1Score: 0.895,
        containmentDelta: 0.35,
        federationCoverage: 0.75,
        privacyBudgetUtilization: 0.45,
      };
    },
  },

  // ============================================================================
  // Mutation Resolvers
  // ============================================================================

  Mutation: {
    submitSignal: async (
      _parent: unknown,
      args: {
        input: {
          signalType: SignalType;
          privacyLevel: PrivacyLevel;
          content: {
            text?: string;
            mediaHash?: string;
            url?: string;
            accountHandle?: string;
          };
          channelMetadata: {
            platform: string;
            channelType?: string;
            reach?: string;
          };
          coordinationFeatures?: Array<{
            featureType: string;
            value: string;
            confidence: number;
          }>;
        };
      },
      context: ResolverContext
    ) => {
      try {
        let signal: CampaignSignal;

        // Normalize based on signal type
        switch (args.input.signalType) {
          case SignalType.NARRATIVE:
          case SignalType.CLAIM:
            signal = await context.signalNormalizer.normalizeNarrative({
              text: args.input.content.text || "",
              platform: args.input.channelMetadata.platform,
            });
            break;

          case SignalType.URL:
            signal = await context.signalNormalizer.normalizeURL({
              url: args.input.content.url || "",
            });
            break;

          case SignalType.ACCOUNT_HANDLE:
            signal = await context.signalNormalizer.normalizeAccount({
              platform: args.input.channelMetadata.platform,
              handle: args.input.content.accountHandle || "",
            });
            break;

          default:
            throw new Error(`Unsupported signal type: ${args.input.signalType}`);
        }

        // Submit to federation
        const result = await context.federationService.submitSignal(signal);

        // Add to clustering engine
        context.clusteringEngine.addSignal(signal);

        return {
          success: true,
          signalId: signal.id,
          federatedSignalId: result.federatedSignalId,
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
        };
      }
    },

    performClustering: async (
      _parent: unknown,
      args: { signalType?: SignalType; windowHours?: number },
      context: ResolverContext
    ): Promise<CampaignCluster[]> => {
      const clusters = await context.clusteringEngine.performClustering();

      // Evaluate each cluster for alerts
      const previousStates = new Map<string, CampaignCluster>();
      await context.alertEngine.evaluateClusters(clusters, previousStates);

      // Publish cluster updates
      for (const cluster of clusters) {
        pubsub.publish(EVENTS.CLUSTER_UPDATED, { clusterUpdated: cluster });
      }

      return clusters;
    },

    acknowledgeAlert: async (
      _parent: unknown,
      args: { alertId: string },
      context: ResolverContext
    ): Promise<FederatedAlert> => {
      const success = context.alertEngine.acknowledgeAlert(args.alertId, context.participantId);

      if (!success) {
        throw new Error(`Alert not found: ${args.alertId}`);
      }

      const alert = context.alertEngine.getAlert(args.alertId);
      if (!alert) {
        throw new Error(`Alert not found: ${args.alertId}`);
      }

      return alert;
    },

    resolveAlert: async (
      _parent: unknown,
      args: {
        alertId: string;
        input: {
          resolutionType: string;
          notes: string;
          lessonsLearned?: string[];
        };
      },
      context: ResolverContext
    ): Promise<FederatedAlert> => {
      const success = context.alertEngine.resolveAlert(args.alertId, context.participantId, {
        resolutionType: args.input.resolutionType as
          | "MITIGATED"
          | "EXPIRED"
          | "FALSE_POSITIVE"
          | "ESCALATED",
        notes: args.input.notes,
        lessonsLearned: args.input.lessonsLearned,
      });

      if (!success) {
        throw new Error(`Alert not found: ${args.alertId}`);
      }

      // Alert is now in history, need to retrieve differently
      const alert = context.alertEngine.getAlert(args.alertId);
      if (!alert) {
        throw new Error(`Alert not found after resolution: ${args.alertId}`);
      }

      return alert;
    },

    generateResponsePack: async (
      _parent: unknown,
      args: { alertId: string },
      context: ResolverContext
    ) => {
      const pack = await context.alertEngine.generateResponsePack(args.alertId);

      if (!pack) {
        throw new Error(`Failed to generate response pack for alert: ${args.alertId}`);
      }

      return pack;
    },

    registerParticipant: async (
      _parent: unknown,
      args: { publicKey: string; capabilities: string[] },
      context: ResolverContext
    ) => {
      return context.federationService.registerParticipant(
        context.participantId,
        args.publicKey,
        args.capabilities
      );
    },

    createSharingAgreement: async (
      _parent: unknown,
      args: {
        input: {
          participantIds: string[];
          signalTypes: SignalType[];
          privacyLevels: PrivacyLevel[];
          validDays: number;
        };
      },
      context: ResolverContext
    ) => {
      return context.federationService.createSharingAgreement(
        args.input.participantIds,
        args.input.signalTypes,
        args.input.privacyLevels,
        args.input.validDays
      );
    },

    initiateSecureAggregation: async (
      _parent: unknown,
      args: { aggregationType: string; participantIds: string[] },
      context: ResolverContext
    ) => {
      return context.federationService.initiateSecureAggregation(
        args.aggregationType as "SUM" | "MEAN" | "COUNT",
        args.participantIds
      );
    },
  },

  // ============================================================================
  // Subscription Resolvers
  // ============================================================================

  Subscription: {
    alertCreated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([EVENTS.ALERT_CREATED]),
        (payload, variables) => {
          if (!variables.minSeverity) return true;

          const severityOrder = [
            AlertSeverity.INFO,
            AlertSeverity.LOW,
            AlertSeverity.MEDIUM,
            AlertSeverity.HIGH,
            AlertSeverity.CRITICAL,
          ];

          const alertIndex = severityOrder.indexOf(payload.alertCreated.severity);
          const minIndex = severityOrder.indexOf(variables.minSeverity);

          return alertIndex >= minIndex;
        }
      ),
    },

    clusterUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([EVENTS.CLUSTER_UPDATED]),
        (payload, variables) => {
          if (!variables.minThreatLevel) return true;

          const threatOrder = [
            ThreatLevel.INFORMATIONAL,
            ThreatLevel.LOW,
            ThreatLevel.MEDIUM,
            ThreatLevel.HIGH,
            ThreatLevel.CRITICAL,
          ];

          const clusterIndex = threatOrder.indexOf(payload.clusterUpdated.threatLevel);
          const minIndex = threatOrder.indexOf(variables.minThreatLevel);

          return clusterIndex >= minIndex;
        }
      ),
    },

    crossTenantSpike: {
      subscribe: () => pubsub.asyncIterator([EVENTS.CROSS_TENANT_SPIKE]),
    },

    federationEvent: {
      subscribe: () => pubsub.asyncIterator([EVENTS.FEDERATION_EVENT]),
    },
  },
};

// Export pubsub for use by services
export { pubsub, EVENTS };

export default resolvers;
