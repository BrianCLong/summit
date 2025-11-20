export interface Message<T = any> {
  id: string;
  topic: string;
  payload: T;
  headers?: Record<string, string>;
  timestamp: number;
  priority?: 'high' | 'normal' | 'low';
  retryCount?: number;
  maxRetries?: number;
  deadLetterAfter?: number;
}

export interface MessageHandler<T = any> {
  (message: Message<T>): Promise<void>;
}

export interface QueueConfig {
  name: string;
  durable?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  deadLetterExchange?: string;
  maxLength?: number;
  ttl?: number;
  priority?: boolean;
}

export interface KafkaConfig {
  clientId: string;
  brokers: string[];
  groupId?: string;
  fromBeginning?: boolean;
  maxBytesPerPartition?: number;
  sessionTimeout?: number;
}

export interface RabbitMQConfig {
  url: string;
  vhost?: string;
  heartbeat?: number;
  prefetch?: number;
}

export interface EventSourcedAggregate {
  id: string;
  version: number;
  events: DomainEvent[];
}

export interface DomainEvent<T = any> {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  data: T;
  metadata?: Record<string, any>;
  version: number;
  timestamp: number;
}

export interface EventStore {
  append(event: DomainEvent): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>;
  getAllEvents(fromPosition?: number): Promise<DomainEvent[]>;
}

export interface MessageStats {
  total: number;
  success: number;
  failed: number;
  retried: number;
  deadLettered: number;
  avgProcessingTime: number;
}
