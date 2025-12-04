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

import {
  type SignalEnvelope,
  type Alert,
  type DownstreamEvent,
  SignalTopics,
  getCategoryTopic,
  getSignalPartitionKey,
  getAlertPartitionKey,
  getDownstreamTopic,
  isHighPriorityAlert,
  type SignalTypeIdType,
} from '@intelgraph/signal-contracts';
import type { Logger } from 'pino';

import type { RoutedAlert, RoutedDownstreamEvent } from '../types.js';

/**
 * Router configuration
 */
export interface RouterConfig {
  /** Enable category-based routing */
  enableCategoryRouting: boolean;
  /** Enable priority routing for high-severity alerts */
  enablePriorityRouting: boolean;
  /** Custom routing rules */
  customRoutes: CustomRoute[];
  /** Default topic for unknown types */
  defaultTopic: string;
}

/**
 * Custom routing rule
 */
export interface CustomRoute {
  name: string;
  condition: (signal: SignalEnvelope) => boolean;
  topics: string[];
  priority?: 'normal' | 'high';
}

/**
 * Routing result for a signal
 */
export interface SignalRoutingResult {
  signalId: string;
  topics: string[];
  partitionKey: string;
  applied_routes: string[];
}

/**
 * Default router configuration
 */
const defaultConfig: RouterConfig = {
  enableCategoryRouting: true,
  enablePriorityRouting: true,
  customRoutes: [],
  defaultTopic: SignalTopics.VALIDATED_SIGNALS,
};

/**
 * Signal Router class
 */
export class SignalRouterService {
  private config: RouterConfig;
  private logger: Logger;
  private stats = {
    signalsRouted: 0,
    alertsRouted: 0,
    downstreamEventsRouted: 0,
    byTopic: new Map<string, number>(),
  };

  constructor(logger: Logger, config?: Partial<RouterConfig>) {
    this.logger = logger.child({ component: 'signal-router' });
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Route a signal to appropriate topics
   */
  routeSignal(signal: SignalEnvelope): SignalRoutingResult {
    const topics: string[] = [];
    const appliedRoutes: string[] = [];

    // Always add to validated signals topic
    topics.push(SignalTopics.VALIDATED_SIGNALS);
    appliedRoutes.push('validated');

    // Category-based routing
    if (this.config.enableCategoryRouting) {
      const categoryTopic = getCategoryTopic(signal.metadata.signalType as SignalTypeIdType);
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
      } catch (error) {
        this.logger.warn(
          { error, route: route.name },
          'Custom route condition evaluation failed',
        );
      }
    }

    // Generate partition key
    const partitionKey = getSignalPartitionKey(
      signal.metadata.tenantId,
      signal.metadata.signalType,
    );

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
  routeAlert(alert: Alert): RoutedAlert {
    const topics: string[] = [SignalTopics.ALERTS];

    // Priority routing for high-severity alerts
    if (this.config.enablePriorityRouting && isHighPriorityAlert(alert.severity)) {
      topics.push(SignalTopics.ALERTS_HIGH_PRIORITY);
    }

    const partitionKey = getAlertPartitionKey(alert.tenantId);

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
        priority: isHighPriorityAlert(alert.severity) ? 'high' : 'normal',
      },
    };
  }

  /**
   * Route a downstream event
   */
  routeDownstreamEvent(event: DownstreamEvent): RoutedDownstreamEvent {
    const topic = getDownstreamTopic(event.eventType);
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
  routeSignalBatch(signals: SignalEnvelope[]): SignalRoutingResult[] {
    return signals.map((signal) => this.routeSignal(signal));
  }

  /**
   * Route multiple alerts in batch
   */
  routeAlertBatch(alerts: Alert[]): RoutedAlert[] {
    return alerts.map((alert) => this.routeAlert(alert));
  }

  /**
   * Route multiple downstream events in batch
   */
  routeDownstreamEventBatch(events: DownstreamEvent[]): RoutedDownstreamEvent[] {
    return events.map((event) => this.routeDownstreamEvent(event));
  }

  /**
   * Add a custom routing rule
   */
  addCustomRoute(route: CustomRoute): void {
    this.config.customRoutes.push(route);
    this.logger.info({ route: route.name }, 'Added custom routing rule');
  }

  /**
   * Remove a custom routing rule
   */
  removeCustomRoute(routeName: string): boolean {
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
  getAllTargetTopics(): string[] {
    const topics = new Set<string>([
      SignalTopics.VALIDATED_SIGNALS,
      SignalTopics.ENRICHED_SIGNALS,
      SignalTopics.SIGNALS_SENSOR,
      SignalTopics.SIGNALS_TELEMETRY,
      SignalTopics.SIGNALS_COMMS,
      SignalTopics.SIGNALS_LOG,
      SignalTopics.SIGNALS_SYSTEM,
      SignalTopics.ALERTS,
      SignalTopics.ALERTS_HIGH_PRIORITY,
      SignalTopics.DOWNSTREAM_GRAPH,
      SignalTopics.DOWNSTREAM_SPACETIME,
      SignalTopics.DOWNSTREAM_CASE,
      SignalTopics.DOWNSTREAM_ANALYTICS,
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
  getStats(): {
    signalsRouted: number;
    alertsRouted: number;
    downstreamEventsRouted: number;
    byTopic: Record<string, number>;
  } {
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
  resetStats(): void {
    this.stats = {
      signalsRouted: 0,
      alertsRouted: 0,
      downstreamEventsRouted: 0,
      byTopic: new Map(),
    };
  }
}

/**
 * Create a signal router instance
 */
export function createSignalRouter(
  logger: Logger,
  config?: Partial<RouterConfig>,
): SignalRouterService {
  return new SignalRouterService(logger, config);
}
