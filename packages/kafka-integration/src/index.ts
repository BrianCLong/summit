/**
 * Kafka Integration Layer
 *
 * Enterprise-grade Kafka integration with:
 * - Exactly-once semantics (EOS)
 * - Schema registry integration
 * - Multi-topic partitioning strategies
 * - Dead letter queues
 * - Message compression and batching
 * - High-throughput optimization
 */

export * from './producer.js';
export * from './consumer.js';
export * from './admin.js';
export * from './schema-registry.js';
export * from './partitioner.js';
export * from './dlq.js';
export * from './config.js';
export * from './types.js';
