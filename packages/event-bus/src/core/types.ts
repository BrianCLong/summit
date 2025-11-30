/**
 * Event-Driven Architecture - Core Types
 *
 * Comprehensive type definitions for the distributed event bus platform
 */

export interface MessageMetadata {
  messageId: string;
  correlationId?: string;
  causationId?: string;
  timestamp: Date;
  source: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  version: string;
  contentType?: string;
  headers?: Record<string, string>;
}

export interface Message<T = any> {
  metadata: MessageMetadata;
  payload: T;
  topic?: string;
  queue?: string;
  routingKey?: string;
  priority?: number;
  ttl?: number;
  delayed?: number;
}

export interface MessageEnvelope<T = any> extends Message<T> {
  deliveryInfo: {
    attempt: number;
    firstAttemptedAt: Date;
    lastAttemptedAt?: Date;
    nextRetryAt?: Date;
  };
}

export enum DeliveryGuarantee {
  AT_MOST_ONCE = 'at-most-once',
  AT_LEAST_ONCE = 'at-least-once',
  EXACTLY_ONCE = 'exactly-once'
}

export enum MessageStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead-letter'
}

export interface SubscriptionOptions {
  guarantee?: DeliveryGuarantee;
  maxRetries?: number;
  retryBackoff?: 'linear' | 'exponential';
  retryDelay?: number;
  deadLetterQueue?: string;
  prefetchCount?: number;
  priority?: number;
  filter?: MessageFilter;
  ordered?: boolean;
}

export interface MessageFilter {
  headers?: Record<string, string | string[]>;
  contentType?: string[];
  source?: string[];
  custom?: (message: Message) => boolean;
}

export interface PublishOptions {
  guarantee?: DeliveryGuarantee;
  persistent?: boolean;
  compressed?: boolean;
  encrypted?: boolean;
  priority?: number;
  ttl?: number;
  delayed?: number;
}

export type MessageHandler<T = any> = (
  message: MessageEnvelope<T>
) => Promise<void> | void;

export interface Subscription {
  id: string;
  topic?: string;
  queue?: string;
  handler: MessageHandler;
  options: SubscriptionOptions;
  unsubscribe: () => Promise<void>;
}

export interface EventBusConfig {
  name: string;
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
  kafka?: {
    brokers: string[];
    clientId?: string;
    ssl?: boolean;
    sasl?: {
      mechanism: string;
      username: string;
      password: string;
    };
  };
  defaultGuarantee?: DeliveryGuarantee;
  maxRetries?: number;
  retryDelay?: number;
  enableMetrics?: boolean;
  enableTracing?: boolean;
}

export interface EventBusMetrics {
  messagesPublished: number;
  messagesConsumed: number;
  messagesFailed: number;
  messagesDeadLettered: number;
  averageLatency: number;
  activeSubscriptions: number;
  queueDepth: number;
}

export interface TopicStats {
  topic: string;
  subscribers: number;
  messageCount: number;
  messageRate: number;
  errorRate: number;
}

export interface QueueStats {
  queue: string;
  depth: number;
  consumers: number;
  messageRate: number;
  processingRate: number;
  averageWaitTime: number;
}
