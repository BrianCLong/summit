/**
 * Core types for distributed streaming infrastructure
 */

export interface StreamMessage {
  key: string | null;
  value: Buffer | string;
  headers?: Record<string, string>;
  timestamp: number;
  offset: number;
  partition: number;
  topic: string;
}

export interface TopicConfig {
  name: string;
  partitions: number;
  replicationFactor: number;
  retentionMs?: number;
  retentionBytes?: number;
  segmentMs?: number;
  segmentBytes?: number;
  compressionType?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
  minInSyncReplicas?: number;
  cleanupPolicy?: 'delete' | 'compact' | 'compact,delete';
  maxMessageBytes?: number;
}

export interface BrokerConfig {
  brokerId: number;
  host: string;
  port: number;
  dataDir: string;
  logDirs: string[];
  numNetworkThreads?: number;
  numIoThreads?: number;
  socketSendBufferBytes?: number;
  socketReceiveBufferBytes?: number;
  socketRequestMaxBytes?: number;
  logRetentionHours?: number;
  logSegmentBytes?: number;
  logRetentionCheckIntervalMs?: number;
  autoCreateTopics?: boolean;
  defaultReplicationFactor?: number;
  numPartitions?: number;
}

export interface ProducerConfig {
  clientId: string;
  bootstrapServers: string[];
  acks?: 'all' | 0 | 1;
  retries?: number;
  batchSize?: number;
  lingerMs?: number;
  bufferMemory?: number;
  compressionType?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
  maxInFlightRequestsPerConnection?: number;
  idempotence?: boolean;
  transactionalId?: string;
}

export interface ConsumerConfig {
  groupId: string;
  clientId: string;
  bootstrapServers: string[];
  autoOffsetReset?: 'earliest' | 'latest' | 'none';
  enableAutoCommit?: boolean;
  autoCommitIntervalMs?: number;
  sessionTimeoutMs?: number;
  heartbeatIntervalMs?: number;
  maxPollRecords?: number;
  maxPollIntervalMs?: number;
  isolationLevel?: 'read_uncommitted' | 'read_committed';
}

export interface Partition {
  topic: string;
  partition: number;
  leader: number;
  replicas: number[];
  isr: number[]; // In-Sync Replicas
  offlineReplicas: number[];
}

export interface PartitionMetadata {
  partition: number;
  leader: number;
  replicas: number[];
  isr: number[];
  highWaterMark: number;
  logStartOffset: number;
  logEndOffset: number;
}

export interface ProducerRecord {
  topic: string;
  partition?: number;
  key?: string | Buffer;
  value: Buffer | string;
  headers?: Record<string, string>;
  timestamp?: number;
}

export interface ProducerResult {
  topic: string;
  partition: number;
  offset: number;
  timestamp: number;
}

export interface ConsumerRecord extends StreamMessage {
  checksum?: string;
}

export interface OffsetCommitRequest {
  groupId: string;
  topic: string;
  partition: number;
  offset: number;
  metadata?: string;
}

export interface ReplicationConfig {
  minInSyncReplicas: number;
  replicaLagTimeMaxMs: number;
  replicaLagMaxMessages: number;
  replicaFetchMaxBytes: number;
  replicaFetchWaitMaxMs: number;
}

export type SerializationFormat = 'json' | 'avro' | 'protobuf' | 'msgpack';

export interface StreamMetrics {
  messagesInPerSec: number;
  messagesOutPerSec: number;
  bytesInPerSec: number;
  bytesOutPerSec: number;
  producerRequestRate: number;
  consumerRequestRate: number;
  replicationBytesInPerSec: number;
  replicationBytesOutPerSec: number;
  underReplicatedPartitions: number;
  offlinePartitionsCount: number;
  activeControllerCount: number;
  leaderElectionRate: number;
  uncleanLeaderElectionsPerSec: number;
}
