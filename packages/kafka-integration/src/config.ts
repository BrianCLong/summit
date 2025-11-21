import { KafkaClusterConfig, EOSProducerConfig, ConsumerGroupConfig } from './types';

/**
 * Default Kafka cluster configuration for high-throughput production use
 */
export const defaultKafkaConfig: KafkaClusterConfig = {
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
export const defaultEOSProducerConfig: Partial<EOSProducerConfig> = {
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
export const defaultConsumerConfig: Partial<ConsumerGroupConfig> = {
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
export const TopicNames = {
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
} as const;

/**
 * Get topic name with environment prefix
 */
export function getTopicName(topic: string): string {
  const env = process.env.NODE_ENV || 'development';
  return `${env}.${topic}`;
}
