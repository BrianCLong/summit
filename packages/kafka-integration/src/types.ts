import { z } from 'zod';
import { KafkaConfig, ProducerConfig, ConsumerConfig } from 'kafkajs';

/**
 * Message metadata schema
 */
export const MessageMetadataSchema = z.object({
  eventId: z.string(),
  eventType: z.string(),
  timestamp: z.number(),
  source: z.string(),
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  version: z.string().default('1.0'),
  schemaVersion: z.string().optional(),
});

export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;

/**
 * Stream message envelope
 */
export interface StreamMessage<T = unknown> {
  metadata: MessageMetadata;
  payload: T;
  headers?: Record<string, string>;
}

/**
 * Partition strategy types
 */
export enum PartitionStrategy {
  ROUND_ROBIN = 'round_robin',
  MURMUR2 = 'murmur2',
  CONSISTENT_HASH = 'consistent_hash',
  CUSTOM = 'custom',
}

/**
 * Kafka cluster configuration
 */
export interface KafkaClusterConfig {
  brokers: string[];
  clientId: string;
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512' | 'aws';
    username?: string;
    password?: string;
  };
  connectionTimeout?: number;
  requestTimeout?: number;
  retry?: {
    maxRetryTime?: number;
    initialRetryTime?: number;
    factor?: number;
    multiplier?: number;
    retries?: number;
  };
}

/**
 * Producer configuration with EOS
 */
export interface EOSProducerConfig extends ProducerConfig {
  transactionalId: string;
  idempotent: true;
  maxInFlightRequests: 1 | 5;
  acks: -1;
  compression?: 'gzip' | 'snappy' | 'lz4' | 'zstd';
  batchSize?: number;
  lingerMs?: number;
}

/**
 * Consumer group configuration
 */
export interface ConsumerGroupConfig extends ConsumerConfig {
  groupId: string;
  sessionTimeout?: number;
  rebalanceTimeout?: number;
  heartbeatInterval?: number;
  maxBytesPerPartition?: number;
  minBytes?: number;
  maxBytes?: number;
  maxWaitTimeInMs?: number;
  autoCommit?: boolean;
  autoCommitInterval?: number;
  autoCommitThreshold?: number;
}

/**
 * Dead letter queue configuration
 */
export interface DLQConfig {
  enabled: boolean;
  topic: string;
  maxRetries: number;
  retryDelayMs: number;
  includeOriginalMessage: boolean;
  includeError: boolean;
}

/**
 * Topic configuration
 */
export interface TopicConfig {
  name: string;
  numPartitions: number;
  replicationFactor: number;
  retentionMs?: number;
  cleanupPolicy?: 'delete' | 'compact';
  compressionType?: 'gzip' | 'snappy' | 'lz4' | 'zstd' | 'uncompressed';
  minInsyncReplicas?: number;
  segmentMs?: number;
  segmentBytes?: number;
}

/**
 * Schema registry configuration
 */
export interface SchemaRegistryConfig {
  host: string;
  auth?: {
    username: string;
    password: string;
  };
  clientId?: string;
}

/**
 * Message serialization format
 */
export enum SerializationFormat {
  JSON = 'json',
  AVRO = 'avro',
  PROTOBUF = 'protobuf',
  STRING = 'string',
}

/**
 * Processing result
 */
export interface ProcessingResult {
  success: boolean;
  error?: Error;
  retryable: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Watermark for late data handling
 */
export interface Watermark {
  timestamp: number;
  maxOutOfOrderness: number;
}

/**
 * Backpressure metrics
 */
export interface BackpressureMetrics {
  queueSize: number;
  maxQueueSize: number;
  currentThroughput: number;
  targetThroughput: number;
  isBackpressureActive: boolean;
}
