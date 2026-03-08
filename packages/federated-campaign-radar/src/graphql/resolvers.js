"use strict";
/**
 * GraphQL Resolvers for Federated Campaign Radar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENTS = exports.pubsub = exports.resolvers = void 0;
const graphql_subscriptions_1 = require("graphql-subscriptions");
const graphql_1 = require("graphql");
const types_1 = require("../core/types");
// PubSub instance for subscriptions
const pubsub = new graphql_subscriptions_1.PubSub();
exports.pubsub = pubsub;
// Subscription event names
const EVENTS = {
    ALERT_CREATED: 'ALERT_CREATED',
    CLUSTER_UPDATED: 'CLUSTER_UPDATED',
    CROSS_TENANT_SPIKE: 'CROSS_TENANT_SPIKE',
    FEDERATION_EVENT: 'FEDERATION_EVENT',
};
exports.EVENTS = EVENTS;
// Custom scalars
const DateTimeScalar = new graphql_1.GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime custom scalar type',
    serialize(value) {
        if (value instanceof Date) {
            return value.toISOString();
        }
        return String(value);
    },
    parseValue(value) {
        if (typeof value === 'string' || typeof value === 'number') {
            return new Date(value);
        }
        throw new Error('Invalid DateTime value');
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING || ast.kind === graphql_1.Kind.INT) {
            return new Date(ast.kind === graphql_1.Kind.INT ? ast.value : ast.value);
        }
        return null;
    },
});
const JSONScalar = new graphql_1.GraphQLScalarType({
    name: 'JSON',
    description: 'JSON custom scalar type',
    serialize(value) {
        return value;
    },
    parseValue(value) {
        return value;
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING) {
            try {
                return JSON.parse(ast.value);
            }
            catch {
                return ast.value;
            }
        }
        return null;
    },
});
exports.resolvers = {
    // Scalars
    DateTime: DateTimeScalar,
    JSON: JSONScalar,
    // ============================================================================
    // Query Resolvers
    // ============================================================================
    Query: {
        getClusters: async (_parent, args, context) => {
            let clusters = context.clusteringEngine.getActiveClusters(args.filters?.minThreatLevel);
            // Apply filters
            if (args.filters) {
                if (args.filters.status) {
                    clusters = clusters.filter((c) => args.filters.status.includes(c.status));
                }
                if (args.filters.minSignalCount) {
                    clusters = clusters.filter((c) => c.signalCount >= args.filters.minSignalCount);
                }
                if (args.filters.minCrossTenantConfidence) {
                    clusters = clusters.filter((c) => c.crossTenantConfidence >=
                        args.filters.minCrossTenantConfidence);
                }
                if (args.filters.temporalRange) {
                    const { start, end } = args.filters.temporalRange;
                    clusters = clusters.filter((c) => c.temporalRange.end >= start && c.temporalRange.start <= end);
                }
            }
            // Apply pagination
            const offset = args.offset || 0;
            const limit = args.limit || 50;
            return clusters.slice(offset, offset + limit);
        },
        getCluster: async (_parent, args, context) => {
            return context.clusteringEngine.getCluster(args.clusterId);
        },
        getClusterHistory: async (_parent, args, context) => {
            return context.clusteringEngine.getClusterHistory(args.clusterId);
        },
        getAlerts: async (_parent, args, context) => {
            let alerts = context.alertEngine.getActiveAlerts();
            // Apply filters
            if (args.filters) {
                if (args.filters.severity) {
                    alerts = alerts.filter((a) => args.filters.severity.includes(a.severity));
                }
                if (args.filters.status) {
                    alerts = alerts.filter((a) => args.filters.status.includes(a.status));
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
        getAlert: async (_parent, args, context) => {
            return context.alertEngine.getAlert(args.alertId);
        },
        getAggregatedStats: async (_parent, args, context) => {
            return context.federationService.queryAggregatedStats(args.signalType, args.windowHours || 24);
        },
        getCrossTenantOverlap: async (_parent, _args, context) => {
            return context.clusteringEngine.computeCrossTenantOverlap();
        },
        getPrivacyBudget: async (_parent, _args, context) => {
            return context.federationService.getPrivacyBudgetStatus();
        },
        getParticipants: async (_parent, args, _context) => {
            // Would fetch from federation service
            return [];
        },
        getSharingAgreements: async (_parent, _args, _context) => {
            // Would fetch from federation service
            return [];
        },
        getAlertMetrics: async (_parent, _args, context) => {
            return context.alertEngine.getMetrics();
        },
        getEvaluationMetrics: async (_parent, _args, _context) => {
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
        submitSignal: async (_parent, args, context) => {
            try {
                let signal;
                // Normalize based on signal type
                switch (args.input.signalType) {
                    case types_1.SignalType.NARRATIVE:
                    case types_1.SignalType.CLAIM:
                        signal = await context.signalNormalizer.normalizeNarrative({
                            text: args.input.content.text || '',
                            platform: args.input.channelMetadata.platform,
                        });
                        break;
                    case types_1.SignalType.URL:
                        signal = await context.signalNormalizer.normalizeURL({
                            url: args.input.content.url || '',
                        });
                        break;
                    case types_1.SignalType.ACCOUNT_HANDLE:
                        signal = await context.signalNormalizer.normalizeAccount({
                            platform: args.input.channelMetadata.platform,
                            handle: args.input.content.accountHandle || '',
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
            }
            catch (error) {
                return {
                    success: false,
                    error: error.message,
                };
            }
        },
        performClustering: async (_parent, args, context) => {
            const clusters = await context.clusteringEngine.performClustering();
            // Evaluate each cluster for alerts
            const previousStates = new Map();
            await context.alertEngine.evaluateClusters(clusters, previousStates);
            // Publish cluster updates
            for (const cluster of clusters) {
                pubsub.publish(EVENTS.CLUSTER_UPDATED, { clusterUpdated: cluster });
            }
            return clusters;
        },
        acknowledgeAlert: async (_parent, args, context) => {
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
        resolveAlert: async (_parent, args, context) => {
            const success = context.alertEngine.resolveAlert(args.alertId, context.participantId, {
                resolutionType: args.input.resolutionType,
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
        generateResponsePack: async (_parent, args, context) => {
            const pack = await context.alertEngine.generateResponsePack(args.alertId);
            if (!pack) {
                throw new Error(`Failed to generate response pack for alert: ${args.alertId}`);
            }
            return pack;
        },
        registerParticipant: async (_parent, args, context) => {
            return context.federationService.registerParticipant(context.participantId, args.publicKey, args.capabilities);
        },
        createSharingAgreement: async (_parent, args, context) => {
            return context.federationService.createSharingAgreement(args.input.participantIds, args.input.signalTypes, args.input.privacyLevels, args.input.validDays);
        },
        initiateSecureAggregation: async (_parent, args, context) => {
            return context.federationService.initiateSecureAggregation(args.aggregationType, args.participantIds);
        },
    },
    // ============================================================================
    // Subscription Resolvers
    // ============================================================================
    Subscription: {
        alertCreated: {
            subscribe: (0, graphql_subscriptions_1.withFilter)(() => pubsub.asyncIterator([EVENTS.ALERT_CREATED]), (payload, variables) => {
                if (!variables.minSeverity)
                    return true;
                const severityOrder = [
                    types_1.AlertSeverity.INFO,
                    types_1.AlertSeverity.LOW,
                    types_1.AlertSeverity.MEDIUM,
                    types_1.AlertSeverity.HIGH,
                    types_1.AlertSeverity.CRITICAL,
                ];
                const alertIndex = severityOrder.indexOf(payload.alertCreated.severity);
                const minIndex = severityOrder.indexOf(variables.minSeverity);
                return alertIndex >= minIndex;
            }),
        },
        clusterUpdated: {
            subscribe: (0, graphql_subscriptions_1.withFilter)(() => pubsub.asyncIterator([EVENTS.CLUSTER_UPDATED]), (payload, variables) => {
                if (!variables.minThreatLevel)
                    return true;
                const threatOrder = [
                    types_1.ThreatLevel.INFORMATIONAL,
                    types_1.ThreatLevel.LOW,
                    types_1.ThreatLevel.MEDIUM,
                    types_1.ThreatLevel.HIGH,
                    types_1.ThreatLevel.CRITICAL,
                ];
                const clusterIndex = threatOrder.indexOf(payload.clusterUpdated.threatLevel);
                const minIndex = threatOrder.indexOf(variables.minThreatLevel);
                return clusterIndex >= minIndex;
            }),
        },
        crossTenantSpike: {
            subscribe: () => pubsub.asyncIterator([EVENTS.CROSS_TENANT_SPIKE]),
        },
        federationEvent: {
            subscribe: () => pubsub.asyncIterator([EVENTS.FEDERATION_EVENT]),
        },
    },
};
exports.default = exports.resolvers;
