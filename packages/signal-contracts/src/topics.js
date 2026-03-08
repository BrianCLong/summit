"use strict";
/**
 * Kafka Topic Definitions
 *
 * Defines all Kafka topics used by the Signal Bus streaming pipeline.
 * Topics are partitioned by tenant + signal type for ordered processing.
 *
 * @module topics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicHealthChecks = exports.ConsumerGroups = exports.TopicConfigs = exports.SignalTopics = exports.TopicNamespace = void 0;
exports.getCategoryTopic = getCategoryTopic;
exports.getSignalPartitionKey = getSignalPartitionKey;
exports.getAlertPartitionKey = getAlertPartitionKey;
exports.getDownstreamTopic = getDownstreamTopic;
exports.isHighPriorityAlert = isHighPriorityAlert;
exports.getAllTopicNames = getAllTopicNames;
exports.getAllTopicConfigs = getAllTopicConfigs;
const signal_types_js_1 = require("./signal-types.js");
/**
 * Topic naming convention:
 * - Format: {namespace}.{domain}.{name}.{version}
 * - Example: intelgraph.signals.raw.v1
 */
exports.TopicNamespace = 'intelgraph';
/**
 * Signal Bus topic names
 */
exports.SignalTopics = {
    // Ingestion topics (raw signals from connectors)
    RAW_SIGNALS: `${exports.TopicNamespace}.signals.raw.v1`,
    RAW_SIGNALS_DLQ: `${exports.TopicNamespace}.signals.raw.v1.dlq`,
    // Validated and normalized signals
    VALIDATED_SIGNALS: `${exports.TopicNamespace}.signals.validated.v1`,
    VALIDATED_SIGNALS_DLQ: `${exports.TopicNamespace}.signals.validated.v1.dlq`,
    // Enriched signals (after GeoIP, device lookup, etc.)
    ENRICHED_SIGNALS: `${exports.TopicNamespace}.signals.enriched.v1`,
    // Category-specific topics for parallel processing
    SIGNALS_SENSOR: `${exports.TopicNamespace}.signals.sensor.v1`,
    SIGNALS_TELEMETRY: `${exports.TopicNamespace}.signals.telemetry.v1`,
    SIGNALS_COMMS: `${exports.TopicNamespace}.signals.comms.v1`,
    SIGNALS_LOG: `${exports.TopicNamespace}.signals.log.v1`,
    SIGNALS_SYSTEM: `${exports.TopicNamespace}.signals.system.v1`,
    // Alert topics
    ALERTS: `${exports.TopicNamespace}.alerts.v1`,
    ALERTS_HIGH_PRIORITY: `${exports.TopicNamespace}.alerts.high-priority.v1`,
    ALERTS_DLQ: `${exports.TopicNamespace}.alerts.v1.dlq`,
    // Downstream integration topics
    DOWNSTREAM_GRAPH: `${exports.TopicNamespace}.downstream.graph.v1`,
    DOWNSTREAM_SPACETIME: `${exports.TopicNamespace}.downstream.spacetime.v1`,
    DOWNSTREAM_CASE: `${exports.TopicNamespace}.downstream.case.v1`,
    DOWNSTREAM_ANALYTICS: `${exports.TopicNamespace}.downstream.analytics.v1`,
    // Internal topics
    RULE_UPDATES: `${exports.TopicNamespace}.internal.rule-updates.v1`,
    CONNECTOR_STATUS: `${exports.TopicNamespace}.internal.connector-status.v1`,
    METRICS: `${exports.TopicNamespace}.internal.metrics.v1`,
};
/**
 * Default topic configurations by topic type
 */
exports.TopicConfigs = {
    [exports.SignalTopics.RAW_SIGNALS]: {
        name: exports.SignalTopics.RAW_SIGNALS,
        partitions: 32,
        replicationFactor: 3,
        retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
        cleanupPolicy: 'delete',
        maxMessageBytes: 1048576, // 1MB
        minInsyncReplicas: 2,
    },
    [exports.SignalTopics.RAW_SIGNALS_DLQ]: {
        name: exports.SignalTopics.RAW_SIGNALS_DLQ,
        partitions: 8,
        replicationFactor: 3,
        retentionMs: 30 * 24 * 60 * 60 * 1000, // 30 days
        cleanupPolicy: 'delete',
        maxMessageBytes: 1048576,
        minInsyncReplicas: 2,
    },
    [exports.SignalTopics.VALIDATED_SIGNALS]: {
        name: exports.SignalTopics.VALIDATED_SIGNALS,
        partitions: 32,
        replicationFactor: 3,
        retentionMs: 3 * 24 * 60 * 60 * 1000, // 3 days
        cleanupPolicy: 'delete',
        maxMessageBytes: 1048576,
        minInsyncReplicas: 2,
    },
    [exports.SignalTopics.ENRICHED_SIGNALS]: {
        name: exports.SignalTopics.ENRICHED_SIGNALS,
        partitions: 32,
        replicationFactor: 3,
        retentionMs: 3 * 24 * 60 * 60 * 1000, // 3 days
        cleanupPolicy: 'delete',
        maxMessageBytes: 2097152, // 2MB (enriched payloads larger)
        minInsyncReplicas: 2,
    },
    [exports.SignalTopics.ALERTS]: {
        name: exports.SignalTopics.ALERTS,
        partitions: 16,
        replicationFactor: 3,
        retentionMs: 30 * 24 * 60 * 60 * 1000, // 30 days
        cleanupPolicy: 'delete',
        maxMessageBytes: 1048576,
        minInsyncReplicas: 2,
    },
    [exports.SignalTopics.ALERTS_HIGH_PRIORITY]: {
        name: exports.SignalTopics.ALERTS_HIGH_PRIORITY,
        partitions: 8,
        replicationFactor: 3,
        retentionMs: 30 * 24 * 60 * 60 * 1000, // 30 days
        cleanupPolicy: 'delete',
        maxMessageBytes: 1048576,
        minInsyncReplicas: 2,
    },
    [exports.SignalTopics.DOWNSTREAM_GRAPH]: {
        name: exports.SignalTopics.DOWNSTREAM_GRAPH,
        partitions: 16,
        replicationFactor: 3,
        retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
        cleanupPolicy: 'delete',
        maxMessageBytes: 1048576,
        minInsyncReplicas: 2,
    },
    [exports.SignalTopics.DOWNSTREAM_SPACETIME]: {
        name: exports.SignalTopics.DOWNSTREAM_SPACETIME,
        partitions: 16,
        replicationFactor: 3,
        retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
        cleanupPolicy: 'delete',
        maxMessageBytes: 1048576,
        minInsyncReplicas: 2,
    },
    [exports.SignalTopics.DOWNSTREAM_CASE]: {
        name: exports.SignalTopics.DOWNSTREAM_CASE,
        partitions: 8,
        replicationFactor: 3,
        retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
        cleanupPolicy: 'delete',
        maxMessageBytes: 1048576,
        minInsyncReplicas: 2,
    },
    [exports.SignalTopics.DOWNSTREAM_ANALYTICS]: {
        name: exports.SignalTopics.DOWNSTREAM_ANALYTICS,
        partitions: 16,
        replicationFactor: 3,
        retentionMs: 3 * 24 * 60 * 60 * 1000, // 3 days
        cleanupPolicy: 'delete',
        maxMessageBytes: 1048576,
        minInsyncReplicas: 2,
    },
    [exports.SignalTopics.RULE_UPDATES]: {
        name: exports.SignalTopics.RULE_UPDATES,
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
exports.ConsumerGroups = {
    // Core processing groups
    SIGNAL_VALIDATOR: `${exports.TopicNamespace}.signal-validator`,
    SIGNAL_ENRICHER: `${exports.TopicNamespace}.signal-enricher`,
    SIGNAL_ROUTER: `${exports.TopicNamespace}.signal-router`,
    RULE_ENGINE: `${exports.TopicNamespace}.rule-engine`,
    ALERT_PROCESSOR: `${exports.TopicNamespace}.alert-processor`,
    // Downstream consumer groups
    GRAPH_CONSUMER: `${exports.TopicNamespace}.graph-consumer`,
    SPACETIME_CONSUMER: `${exports.TopicNamespace}.spacetime-consumer`,
    CASE_CONSUMER: `${exports.TopicNamespace}.case-consumer`,
    ANALYTICS_CONSUMER: `${exports.TopicNamespace}.analytics-consumer`,
    // Monitoring groups
    METRICS_AGGREGATOR: `${exports.TopicNamespace}.metrics-aggregator`,
    DEAD_LETTER_PROCESSOR: `${exports.TopicNamespace}.dlq-processor`,
};
/**
 * Get the category topic for a signal type
 */
function getCategoryTopic(signalType) {
    const category = signalType.split('.')[0];
    switch (category) {
        case signal_types_js_1.SignalCategory.SENSOR:
            return exports.SignalTopics.SIGNALS_SENSOR;
        case signal_types_js_1.SignalCategory.TELEMETRY:
            return exports.SignalTopics.SIGNALS_TELEMETRY;
        case signal_types_js_1.SignalCategory.COMMS:
            return exports.SignalTopics.SIGNALS_COMMS;
        case signal_types_js_1.SignalCategory.LOG:
            return exports.SignalTopics.SIGNALS_LOG;
        case signal_types_js_1.SignalCategory.SYSTEM:
            return exports.SignalTopics.SIGNALS_SYSTEM;
        case signal_types_js_1.SignalCategory.ALERT:
            return exports.SignalTopics.ALERTS;
        default:
            return exports.SignalTopics.VALIDATED_SIGNALS;
    }
}
/**
 * Get partition key for signal routing
 * Ensures signals from the same tenant/type go to the same partition
 */
function getSignalPartitionKey(tenantId, signalType) {
    return `${tenantId}:${signalType}`;
}
/**
 * Get partition key for alert routing
 * Partitions by tenant for ordered processing per tenant
 */
function getAlertPartitionKey(tenantId) {
    return tenantId;
}
/**
 * Get downstream topic for event type
 */
function getDownstreamTopic(eventType) {
    const domain = eventType.split('.')[0];
    switch (domain) {
        case 'graph':
            return exports.SignalTopics.DOWNSTREAM_GRAPH;
        case 'spacetime':
            return exports.SignalTopics.DOWNSTREAM_SPACETIME;
        case 'case':
            return exports.SignalTopics.DOWNSTREAM_CASE;
        case 'analytics':
            return exports.SignalTopics.DOWNSTREAM_ANALYTICS;
        default:
            throw new Error(`Unknown downstream domain: ${domain}`);
    }
}
/**
 * Check if alert should go to high-priority topic
 */
function isHighPriorityAlert(severity) {
    return severity === 'critical' || severity === 'high';
}
/**
 * Get all topic names for initialization
 */
function getAllTopicNames() {
    return Object.values(exports.SignalTopics);
}
/**
 * Get all topic configs for initialization
 */
function getAllTopicConfigs() {
    return Object.values(exports.TopicConfigs);
}
/**
 * Health check configurations for monitoring
 */
exports.TopicHealthChecks = [
    {
        topic: exports.SignalTopics.RAW_SIGNALS,
        expectedPartitions: 32,
        maxLagThreshold: 10000,
        criticalLagThreshold: 100000,
    },
    {
        topic: exports.SignalTopics.VALIDATED_SIGNALS,
        expectedPartitions: 32,
        maxLagThreshold: 5000,
        criticalLagThreshold: 50000,
    },
    {
        topic: exports.SignalTopics.ENRICHED_SIGNALS,
        expectedPartitions: 32,
        maxLagThreshold: 5000,
        criticalLagThreshold: 50000,
    },
    {
        topic: exports.SignalTopics.ALERTS,
        expectedPartitions: 16,
        maxLagThreshold: 1000,
        criticalLagThreshold: 10000,
    },
    {
        topic: exports.SignalTopics.ALERTS_HIGH_PRIORITY,
        expectedPartitions: 8,
        maxLagThreshold: 100,
        criticalLagThreshold: 1000,
    },
];
