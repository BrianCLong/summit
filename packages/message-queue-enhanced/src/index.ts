/**
 * Enhanced Message Queue Package
 *
 * Provides enterprise-grade messaging with:
 * - Kafka for high-throughput event streaming
 * - RabbitMQ for reliable task queuing
 * - Dead letter queues for failed messages
 * - Message prioritization and routing
 * - Exactly-once delivery semantics
 * - Event sourcing patterns
 * - Backpressure handling
 */

export { KafkaEventStream } from './KafkaEventStream';
export { RabbitMQQueue } from './RabbitMQQueue';
export { DeadLetterQueue } from './DeadLetterQueue';
export { EventSourcingStore } from './EventSourcingStore';
export { MessageRouter } from './MessageRouter';
export * from './types';
