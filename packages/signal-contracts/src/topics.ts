/**
 * Kafka Topic Definitions
 *
 * Defines all Kafka topics used by the Signal Bus streaming pipeline.
 * Topics are partitioned by tenant + signal type for ordered processing.
 *
 * @module topics
 */

import { SignalCategory, SignalTypeId, type SignalTypeIdType } from './signal-types.js';

/**
 * Topic naming convention:
 * - Format: {namespace}.{domain}.{name}.{version}
 * - Example: intelgraph.signals.raw.v1
 */
export const TopicNamespace = 'intelgraph' as const;

/**
 * Signal Bus topic names
 */
export const SignalTopics = {
  // Ingestion topics (raw signals from connectors)
  RAW_SIGNALS: `${TopicNamespace}.signals.raw.v1`,
  RAW_SIGNALS_DLQ: `${TopicNamespace}.signals.raw.v1.dlq`,

  // Validated and normalized signals
  VALIDATED_SIGNALS: `${TopicNamespace}.signals.validated.v1`,
  VALIDATED_SIGNALS_DLQ: `${TopicNamespace}.signals.validated.v1.dlq`,

  // Enriched signals (after GeoIP, device lookup, etc.)
  ENRICHED_SIGNALS: `${TopicNamespace}.signals.enriched.v1`,

  // Category-specific topics for parallel processing
  SIGNALS_SENSOR: `${TopicNamespace}.signals.sensor.v1`,
  SIGNALS_TELEMETRY: `${TopicNamespace}.signals.telemetry.v1`,
  SIGNALS_COMMS: `${TopicNamespace}.signals.comms.v1`,
  SIGNALS_LOG: `${TopicNamespace}.signals.log.v1`,
  SIGNALS_SYSTEM: `${TopicNamespace}.signals.system.v1`,

  // Alert topics
  ALERTS: `${TopicNamespace}.alerts.v1`,
  ALERTS_HIGH_PRIORITY: `${TopicNamespace}.alerts.high-priority.v1`,
  ALERTS_DLQ: `${TopicNamespace}.alerts.v1.dlq`,

  // Downstream integration topics
  DOWNSTREAM_GRAPH: `${TopicNamespace}.downstream.graph.v1`,
  DOWNSTREAM_SPACETIME: `${TopicNamespace}.downstream.spacetime.v1`,
  DOWNSTREAM_CASE: `${TopicNamespace}.downstream.case.v1`,
  DOWNSTREAM_ANALYTICS: `${TopicNamespace}.downstream.analytics.v1`,

  // Internal topics
  RULE_UPDATES: `${TopicNamespace}.internal.rule-updates.v1`,
  CONNECTOR_STATUS: `${TopicNamespace}.internal.connector-status.v1`,
  METRICS: `${TopicNamespace}.internal.metrics.v1`,
} as const;

export type SignalTopicType = (typeof SignalTopics)[keyof typeof SignalTopics];

/**
 * Topic configuration defaults
 */
export interface TopicConfig {
  name: string;
  partitions: number;
  replicationFactor: number;
  retentionMs: number;
  cleanupPolicy: 'delete' | 'compact' | 'compact,delete';
  maxMessageBytes: number;
  minInsyncReplicas: number;
}

/**
 * Default topic configurations by topic type
 */
export const TopicConfigs: Record<string, TopicConfig> = {
  [SignalTopics.RAW_SIGNALS]: {
    name: SignalTopics.RAW_SIGNALS,
    partitions: 32,
    replicationFactor: 3,
    retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    cleanupPolicy: 'delete',
    maxMessageBytes: 1048576, // 1MB
    minInsyncReplicas: 2,
  },
  [SignalTopics.RAW_SIGNALS_DLQ]: {
    name: SignalTopics.RAW_SIGNALS_DLQ,
    partitions: 8,
    replicationFactor: 3,
    retentionMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    cleanupPolicy: 'delete',
    maxMessageBytes: 1048576,
    minInsyncReplicas: 2,
  },
  [SignalTopics.VALIDATED_SIGNALS]: {
    name: SignalTopics.VALIDATED_SIGNALS,
    partitions: 32,
    replicationFactor: 3,
    retentionMs: 3 * 24 * 60 * 60 * 1000, // 3 days
    cleanupPolicy: 'delete',
    maxMessageBytes: 1048576,
    minInsyncReplicas: 2,
  },
  [SignalTopics.ENRICHED_SIGNALS]: {
    name: SignalTopics.ENRICHED_SIGNALS,
    partitions: 32,
    replicationFactor: 3,
    retentionMs: 3 * 24 * 60 * 60 * 1000, // 3 days
    cleanupPolicy: 'delete',
    maxMessageBytes: 2097152, // 2MB (enriched payloads larger)
    minInsyncReplicas: 2,
  },
  [SignalTopics.ALERTS]: {
    name: SignalTopics.ALERTS,
    partitions: 16,
    replicationFactor: 3,
    retentionMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    cleanupPolicy: 'delete',
    maxMessageBytes: 1048576,
    minInsyncReplicas: 2,
  },
  [SignalTopics.ALERTS_HIGH_PRIORITY]: {
    name: SignalTopics.ALERTS_HIGH_PRIORITY,
    partitions: 8,
    replicationFactor: 3,
    retentionMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    cleanupPolicy: 'delete',
    maxMessageBytes: 1048576,
    minInsyncReplicas: 2,
  },
  [SignalTopics.DOWNSTREAM_GRAPH]: {
    name: SignalTopics.DOWNSTREAM_GRAPH,
    partitions: 16,
    replicationFactor: 3,
    retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    cleanupPolicy: 'delete',
    maxMessageBytes: 1048576,
    minInsyncReplicas: 2,
  },
  [SignalTopics.DOWNSTREAM_SPACETIME]: {
    name: SignalTopics.DOWNSTREAM_SPACETIME,
    partitions: 16,
    replicationFactor: 3,
    retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    cleanupPolicy: 'delete',
    maxMessageBytes: 1048576,
    minInsyncReplicas: 2,
  },
  [SignalTopics.DOWNSTREAM_CASE]: {
    name: SignalTopics.DOWNSTREAM_CASE,
    partitions: 8,
    replicationFactor: 3,
    retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    cleanupPolicy: 'delete',
    maxMessageBytes: 1048576,
    minInsyncReplicas: 2,
  },
  [SignalTopics.DOWNSTREAM_ANALYTICS]: {
    name: SignalTopics.DOWNSTREAM_ANALYTICS,
    partitions: 16,
    replicationFactor: 3,
    retentionMs: 3 * 24 * 60 * 60 * 1000, // 3 days
    cleanupPolicy: 'delete',
    maxMessageBytes: 1048576,
    minInsyncReplicas: 2,
  },
  [SignalTopics.RULE_UPDATES]: {
    name: SignalTopics.RULE_UPDATES,
    partitions: 1,
    replicationFactor: 3,
    retentionMs: -1, // Infinite (compacted)
    cleanupPolicy: 'compact',
    maxMessageBytes: 1048576,
    minInsyncReplicas: 2,
  },
};

/**
 * Consumer group IDs
 */
export const ConsumerGroups = {
  // Core processing groups
  SIGNAL_VALIDATOR: `${TopicNamespace}.signal-validator`,
  SIGNAL_ENRICHER: `${TopicNamespace}.signal-enricher`,
  SIGNAL_ROUTER: `${TopicNamespace}.signal-router`,
  RULE_ENGINE: `${TopicNamespace}.rule-engine`,
  ALERT_PROCESSOR: `${TopicNamespace}.alert-processor`,

  // Downstream consumer groups
  GRAPH_CONSUMER: `${TopicNamespace}.graph-consumer`,
  SPACETIME_CONSUMER: `${TopicNamespace}.spacetime-consumer`,
  CASE_CONSUMER: `${TopicNamespace}.case-consumer`,
  ANALYTICS_CONSUMER: `${TopicNamespace}.analytics-consumer`,

  // Monitoring groups
  METRICS_AGGREGATOR: `${TopicNamespace}.metrics-aggregator`,
  DEAD_LETTER_PROCESSOR: `${TopicNamespace}.dlq-processor`,
} as const;

export type ConsumerGroupType = (typeof ConsumerGroups)[keyof typeof ConsumerGroups];

/**
 * Get the category topic for a signal type
 */
export function getCategoryTopic(signalType: SignalTypeIdType): string {
  const category = signalType.split('.')[0];

  switch (category) {
    case SignalCategory.SENSOR:
      return SignalTopics.SIGNALS_SENSOR;
    case SignalCategory.TELEMETRY:
      return SignalTopics.SIGNALS_TELEMETRY;
    case SignalCategory.COMMS:
      return SignalTopics.SIGNALS_COMMS;
    case SignalCategory.LOG:
      return SignalTopics.SIGNALS_LOG;
    case SignalCategory.SYSTEM:
      return SignalTopics.SIGNALS_SYSTEM;
    case SignalCategory.ALERT:
      return SignalTopics.ALERTS;
    default:
      return SignalTopics.VALIDATED_SIGNALS;
  }
}

/**
 * Get partition key for signal routing
 * Ensures signals from the same tenant/type go to the same partition
 */
export function getSignalPartitionKey(tenantId: string, signalType: string): string {
  return `${tenantId}:${signalType}`;
}

/**
 * Get partition key for alert routing
 * Partitions by tenant for ordered processing per tenant
 */
export function getAlertPartitionKey(tenantId: string): string {
  return tenantId;
}

/**
 * Get downstream topic for event type
 */
export function getDownstreamTopic(eventType: string): string {
  const domain = eventType.split('.')[0];

  switch (domain) {
    case 'graph':
      return SignalTopics.DOWNSTREAM_GRAPH;
    case 'spacetime':
      return SignalTopics.DOWNSTREAM_SPACETIME;
    case 'case':
      return SignalTopics.DOWNSTREAM_CASE;
    case 'analytics':
      return SignalTopics.DOWNSTREAM_ANALYTICS;
    default:
      throw new Error(`Unknown downstream domain: ${domain}`);
  }
}

/**
 * Check if alert should go to high-priority topic
 */
export function isHighPriorityAlert(severity: string): boolean {
  return severity === 'critical' || severity === 'high';
}

/**
 * Get all topic names for initialization
 */
export function getAllTopicNames(): string[] {
  return Object.values(SignalTopics);
}

/**
 * Get all topic configs for initialization
 */
export function getAllTopicConfigs(): TopicConfig[] {
  return Object.values(TopicConfigs);
}

/**
 * Topic health check configuration
 */
export interface TopicHealthCheck {
  topic: string;
  expectedPartitions: number;
  maxLagThreshold: number;
  criticalLagThreshold: number;
}

/**
 * Health check configurations for monitoring
 */
export const TopicHealthChecks: TopicHealthCheck[] = [
  {
    topic: SignalTopics.RAW_SIGNALS,
    expectedPartitions: 32,
    maxLagThreshold: 10000,
    criticalLagThreshold: 100000,
  },
  {
    topic: SignalTopics.VALIDATED_SIGNALS,
    expectedPartitions: 32,
    maxLagThreshold: 5000,
    criticalLagThreshold: 50000,
  },
  {
    topic: SignalTopics.ENRICHED_SIGNALS,
    expectedPartitions: 32,
    maxLagThreshold: 5000,
    criticalLagThreshold: 50000,
  },
  {
    topic: SignalTopics.ALERTS,
    expectedPartitions: 16,
    maxLagThreshold: 1000,
    criticalLagThreshold: 10000,
  },
  {
    topic: SignalTopics.ALERTS_HIGH_PRIORITY,
    expectedPartitions: 8,
    maxLagThreshold: 100,
    criticalLagThreshold: 1000,
  },
];
