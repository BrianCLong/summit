"use strict";
/**
 * Signal Router
 *
 * Routes processed signals and alerts to appropriate downstream topics.
 * Handles:
 * - Topic selection based on signal type and category
 * - Partition key generation for ordered processing
 * - Priority routing for high-severity alerts
 * - Downstream event fan-out
 *
 * @module signal-router
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalRouterService = void 0;
exports.createSignalRouter = createSignalRouter;
const signal_contracts_1 = require("@intelgraph/signal-contracts");
/**
 * Default router configuration
 */
const defaultConfig = {
    enableCategoryRouting: true,
    enablePriorityRouting: true,
    customRoutes: [],
    defaultTopic: signal_contracts_1.SignalTopics.VALIDATED_SIGNALS,
};
/**
 * Signal Router class
 */
class SignalRouterService {
    config;
    logger;
    stats = {
        signalsRouted: 0,
        alertsRouted: 0,
        downstreamEventsRouted: 0,
        byTopic: new Map(),
    };
    constructor(logger, config) {
        this.logger = logger.child({ component: 'signal-router' });
        this.config = { ...defaultConfig, ...config };
    }
    /**
     * Route a signal to appropriate topics
     */
    routeSignal(signal) {
        const topics = [];
        const appliedRoutes = [];
        // Always add to validated signals topic
        topics.push(signal_contracts_1.SignalTopics.VALIDATED_SIGNALS);
        appliedRoutes.push('validated');
        // Category-based routing
        if (this.config.enableCategoryRouting) {
            const categoryTopic = (0, signal_contracts_1.getCategoryTopic)(signal.metadata.signalType);
            if (categoryTopic && !topics.includes(categoryTopic)) {
                topics.push(categoryTopic);
                appliedRoutes.push('category');
            }
        }
        // Custom routes
        for (const route of this.config.customRoutes) {
            try {
                if (route.condition(signal)) {
                    for (const topic of route.topics) {
                        if (!topics.includes(topic)) {
                            topics.push(topic);
                        }
                    }
                    appliedRoutes.push(route.name);
                }
            }
            catch (error) {
                this.logger.warn({ error, route: route.name }, 'Custom route condition evaluation failed');
            }
        }
        // Generate partition key
        const partitionKey = (0, signal_contracts_1.getSignalPartitionKey)(signal.metadata.tenantId, signal.metadata.signalType);
        // Update stats
        this.stats.signalsRouted++;
        for (const topic of topics) {
            const count = this.stats.byTopic.get(topic) ?? 0;
            this.stats.byTopic.set(topic, count + 1);
        }
        return {
            signalId: signal.metadata.signalId,
            topics,
            partitionKey,
            applied_routes: appliedRoutes,
        };
    }
    /**
     * Route an alert to appropriate topics
     */
    routeAlert(alert) {
        const topics = [signal_contracts_1.SignalTopics.ALERTS];
        // Priority routing for high-severity alerts
        if (this.config.enablePriorityRouting && (0, signal_contracts_1.isHighPriorityAlert)(alert.severity)) {
            topics.push(signal_contracts_1.SignalTopics.ALERTS_HIGH_PRIORITY);
        }
        const partitionKey = (0, signal_contracts_1.getAlertPartitionKey)(alert.tenantId);
        // Update stats
        this.stats.alertsRouted++;
        for (const topic of topics) {
            const count = this.stats.byTopic.get(topic) ?? 0;
            this.stats.byTopic.set(topic, count + 1);
        }
        return {
            alert,
            routing: {
                topics,
                partitionKey,
                priority: (0, signal_contracts_1.isHighPriorityAlert)(alert.severity) ? 'high' : 'normal',
            },
        };
    }
    /**
     * Route a downstream event
     */
    routeDownstreamEvent(event) {
        const topic = (0, signal_contracts_1.getDownstreamTopic)(event.eventType);
        const partitionKey = event.tenantId;
        // Update stats
        this.stats.downstreamEventsRouted++;
        const count = this.stats.byTopic.get(topic) ?? 0;
        this.stats.byTopic.set(topic, count + 1);
        return {
            event,
            routing: {
                topic,
                partitionKey,
            },
        };
    }
    /**
     * Route multiple signals in batch
     */
    routeSignalBatch(signals) {
        return signals.map((signal) => this.routeSignal(signal));
    }
    /**
     * Route multiple alerts in batch
     */
    routeAlertBatch(alerts) {
        return alerts.map((alert) => this.routeAlert(alert));
    }
    /**
     * Route multiple downstream events in batch
     */
    routeDownstreamEventBatch(events) {
        return events.map((event) => this.routeDownstreamEvent(event));
    }
    /**
     * Add a custom routing rule
     */
    addCustomRoute(route) {
        this.config.customRoutes.push(route);
        this.logger.info({ route: route.name }, 'Added custom routing rule');
    }
    /**
     * Remove a custom routing rule
     */
    removeCustomRoute(routeName) {
        const index = this.config.customRoutes.findIndex((r) => r.name === routeName);
        if (index >= 0) {
            this.config.customRoutes.splice(index, 1);
            this.logger.info({ route: routeName }, 'Removed custom routing rule');
            return true;
        }
        return false;
    }
    /**
     * Get all topics that could receive signals
     */
    getAllTargetTopics() {
        const topics = new Set([
            signal_contracts_1.SignalTopics.VALIDATED_SIGNALS,
            signal_contracts_1.SignalTopics.ENRICHED_SIGNALS,
            signal_contracts_1.SignalTopics.SIGNALS_SENSOR,
            signal_contracts_1.SignalTopics.SIGNALS_TELEMETRY,
            signal_contracts_1.SignalTopics.SIGNALS_COMMS,
            signal_contracts_1.SignalTopics.SIGNALS_LOG,
            signal_contracts_1.SignalTopics.SIGNALS_SYSTEM,
            signal_contracts_1.SignalTopics.ALERTS,
            signal_contracts_1.SignalTopics.ALERTS_HIGH_PRIORITY,
            signal_contracts_1.SignalTopics.DOWNSTREAM_GRAPH,
            signal_contracts_1.SignalTopics.DOWNSTREAM_SPACETIME,
            signal_contracts_1.SignalTopics.DOWNSTREAM_CASE,
            signal_contracts_1.SignalTopics.DOWNSTREAM_ANALYTICS,
        ]);
        // Add custom route topics
        for (const route of this.config.customRoutes) {
            for (const topic of route.topics) {
                topics.add(topic);
            }
        }
        return Array.from(topics);
    }
    /**
     * Get routing statistics
     */
    getStats() {
        return {
            signalsRouted: this.stats.signalsRouted,
            alertsRouted: this.stats.alertsRouted,
            downstreamEventsRouted: this.stats.downstreamEventsRouted,
            byTopic: Object.fromEntries(this.stats.byTopic),
        };
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            signalsRouted: 0,
            alertsRouted: 0,
            downstreamEventsRouted: 0,
            byTopic: new Map(),
        };
    }
}
exports.SignalRouterService = SignalRouterService;
/**
 * Create a signal router instance
 */
function createSignalRouter(logger, config) {
    return new SignalRouterService(logger, config);
}
