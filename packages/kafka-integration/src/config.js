"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicNames = exports.defaultConsumerConfig = exports.defaultEOSProducerConfig = exports.defaultKafkaConfig = void 0;
exports.getTopicName = getTopicName;
/**
 * Default Kafka cluster configuration for high-throughput production use
 */
exports.defaultKafkaConfig = {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'intelgraph-streaming',
    connectionTimeout: 30000,
    requestTimeout: 30000,
    retry: {
        maxRetryTime: 30000,
        initialRetryTime: 300,
        factor: 0.2,
        multiplier: 2,
        retries: 5,
    },
};
/**
 * Default EOS producer configuration
 */
exports.defaultEOSProducerConfig = {
    idempotent: true,
    maxInFlightRequests: 5,
    acks: -1,
    compression: 'snappy',
    batchSize: 16384,
    lingerMs: 10,
};
/**
 * Default consumer configuration
 */
exports.defaultConsumerConfig = {
    sessionTimeout: 30000,
    rebalanceTimeout: 60000,
    heartbeatInterval: 3000,
    maxBytesPerPartition: 1048576,
    minBytes: 1,
    maxBytes: 10485760,
    maxWaitTimeInMs: 5000,
    autoCommit: false,
};
/**
 * Topic naming conventions
 */
exports.TopicNames = {
    EVENTS: 'intelgraph.events',
    ENTITIES: 'intelgraph.entities',
    RELATIONSHIPS: 'intelgraph.relationships',
    ALERTS: 'intelgraph.alerts',
    METRICS: 'intelgraph.metrics',
    ANALYTICS: 'intelgraph.analytics',
    ML_FEATURES: 'intelgraph.ml.features',
    ML_PREDICTIONS: 'intelgraph.ml.predictions',
    AUDIT: 'intelgraph.audit',
    DLQ: 'intelgraph.dlq',
};
/**
 * Get topic name with environment prefix
 */
function getTopicName(topic) {
    const env = process.env.NODE_ENV || 'development';
    return `${env}.${topic}`;
}
